'use server';

/**
 * @fileOverview An AI agent that processes a business prompt, evaluates it against a set of rules, and returns the triggered actions.
 *
 * - processBusinessPrompt - A function that processes the business prompt.
 */

import { ai } from '@/ai/genkit';
import { getRulesByCategory } from '@/lib/actions';
import { ProcessBusinessPromptInput, ProcessBusinessPromptInputSchema, ProcessBusinessPromptOutput, ProcessBusinessPromptOutputSchema, Rule, RuleSchema } from '@/lib/types';
import { z } from 'genkit';


// Exported wrapper function
export async function processBusinessPrompt(input: ProcessBusinessPromptInput): Promise<ProcessBusinessPromptOutput> {
  return processBusinessPromptFlow(input);
}

// Step 1: Infer business categories
const categoryInferencePrompt = ai.definePrompt({
  name: 'categoryInferencePrompt',
  input: { schema: z.object({ prompt: z.string() }) },
  output: { schema: z.object({ categories: z.array(z.string()) }) },
  prompt: `
    Based on the user prompt below, identify the top three most relevant business categories from the following list.
    The categories should be ordered from most relevant to least relevant.

    - Sales & Finance
    - Controlling & Costing
    - Asset Management
    - Treasury & Risk Management
    - Accounts Payable
    - Accounts Receivable
    - Logistics & Shipping
    - Procurement & Sourcing
    - Inventory & Warehouse Management
    - Production Planning
    - Quality Management
    - Plant Maintenance
    - Human Capital Management (HCM)
    - Recruitment & Talent Management
    - Time Management
    - Master Data Governance
    - Project Systems
    - Customer Service

    If the prompt does not clearly match any of the categories, respond with "Unknown" in the array.
    Respond with only the category names in the correct JSON format.

    Prompt:
    {{{prompt}}}
  `,
});

// Step 2.1: Select the best rule
const ruleSelectionPrompt = ai.definePrompt({
  name: 'ruleSelectionPrompt',
  input: { schema: z.object({
    prompt: z.string(),
    rules: z.array(z.object({ id: z.string(), name: z.string(), description: z.string() }))
  })},
  output: { schema: z.object({ bestRuleId: z.string() })},
  prompt: `
    From the list of business rules provided below, identify the single best rule that should be used to process the user's prompt.
    Consider the rule's name and description to make your selection.
    Respond with only the ID of the best matching rule in the required JSON format.

    User Prompt:
    "{{{prompt}}}"

    Available Rules:
    {{#each rules}}
    - ID: {{this.id}}, Name: "{{this.name}}", Description: "{{this.description}}"
    {{/each}}
  `,
});


// Step 3: Extract structured data from prompt based on a specific rule's needs
const dataExtractionPrompt = ai.definePrompt({
  name: 'dataExtractionPrompt',
  input: { schema: z.object({
    prompt: z.string(),
    ruleName: z.string(),
    fieldsToExtract: z.array(z.string()),
  })},
  prompt: `
      Based on the user's prompt, extract the key-value pairs for the following fields.
      These fields are required to evaluate a business rule named "{{ruleName}}".

      User Prompt:
      "{{{prompt}}}"

      Fields to Extract and their meanings:
      {{#each fieldsToExtract}}
      - {{this}}
      {{/each}}

      It is critical that the keys in your JSON output **exactly match** the field names listed above.

      For example, if the prompt says "the stock for 'Material 123' is 50" and a requested field is "material.currentStock", you must extract '{"material.currentStock": 50}'.

      Respond with only the raw JSON object. Do not include any formatting, markdown, or explanatory text.
      Your response must start with { and end with }.
    `,
});


// Step 4: Helper function to evaluate rules against extracted data
async function evaluateRule(
  promptData: Record<string, any>,
  rule: Rule
): Promise<{ matched: boolean; log: string[] }> {
  const evaluationLog: string[] = [];
  
  evaluationLog.push(`Evaluating rule: "${rule.name}"`);
  let allConditionsMet = true;

  for (const condition of rule.conditions) {
    const promptValue = promptData[condition.field];

    // Resolve the rule value (it could be a constant or a formula object)
    let resolvedRuleValue = condition.value;
    let ruleValueDescription = JSON.stringify(condition.value);

    // Check if value is a Formula object
    if (typeof condition.value === 'object' && condition.value !== null && !Array.isArray(condition.value)) {
      const formula = condition.value as { field: string; operator: string; value: number };
      const baseValue = promptData[formula.field];

      if (baseValue === undefined) {
        evaluationLog.push(`- Condition for field "${condition.field}" SKIPPED: Base field "${formula.field}" for formula not found in prompt data.`);
        allConditionsMet = false;
        break;
      }

      if (typeof baseValue !== 'number') {
        evaluationLog.push(`- Condition for field "${condition.field}" SKIPPED: Base field "${formula.field}" is not a number (Value: ${baseValue}).`);
        allConditionsMet = false;
        break;
      }

      const multiplier = Number(formula.value);
      if (formula.operator === '*') {
        resolvedRuleValue = baseValue * multiplier;
        ruleValueDescription = `Formula[ ${formula.field}(${baseValue}) * ${multiplier} = ${resolvedRuleValue} ]`;
      } else if (formula.operator === '+') {
        resolvedRuleValue = baseValue + multiplier;
        ruleValueDescription = `Formula[ ${formula.field}(${baseValue}) + ${multiplier} = ${resolvedRuleValue} ]`;
      } else if (formula.operator === '-') {
        resolvedRuleValue = baseValue - multiplier;
        ruleValueDescription = `Formula[ ${formula.field}(${baseValue}) - ${multiplier} = ${resolvedRuleValue} ]`;
      } else if (formula.operator === '/') {
        resolvedRuleValue = baseValue / multiplier;
        ruleValueDescription = `Formula[ ${formula.field}(${baseValue}) / ${multiplier} = ${resolvedRuleValue} ]`;
      } else {
        evaluationLog.push(`- Condition for field "${condition.field}" SKIPPED: Unsupported formula operator "${formula.operator}".`);
        allConditionsMet = false;
        break;
      }
    }

    let conditionMet = false;

    if (promptValue === undefined) {
      evaluationLog.push(`- Condition for field "${condition.field}" SKIPPED: Field not found in prompt data.`);
      allConditionsMet = false;
      break;
    }

    switch (condition.operator) {
      case '==': conditionMet = promptValue == resolvedRuleValue; break;
      case '!=': conditionMet = promptValue != resolvedRuleValue; break;
      case '>': conditionMet = promptValue > resolvedRuleValue; break;
      case '<': conditionMet = promptValue < resolvedRuleValue; break;
      case '>=': conditionMet = promptValue >= resolvedRuleValue; break;
      case '<=': conditionMet = promptValue <= resolvedRuleValue; break;
      case 'in':
        if (Array.isArray(resolvedRuleValue)) {
          conditionMet = resolvedRuleValue.includes(promptValue);
        } else {
          evaluationLog.push(`- Operator "in" for field "${condition.field}" requires the rule value to be an array.`);
          conditionMet = false;
        }
        break;
      default:
        evaluationLog.push(`- Unsupported operator "${condition.operator}" for field "${condition.field}"`);
        conditionMet = false;
    }

    evaluationLog.push(
      `- Condition: \`${condition.field} ${condition.operator} ${ruleValueDescription}\` (Prompt Value: ${promptValue}). Result: ${conditionMet ? 'MET' : 'NOT MET'}`
    );

    if (!conditionMet) {
      allConditionsMet = false;
      break;
    }
  }

  if (allConditionsMet) {
    evaluationLog.push(`SUCCESS: All conditions met for rule "${rule.name}".`);
  } else {
    evaluationLog.push(`FAILURE: Not all conditions met for rule "${rule.name}".`);
  }

  return { matched: allConditionsMet, log: evaluationLog };
}

// Main Orchestration Flow
const processBusinessPromptFlow = ai.defineFlow(
  {
    name: 'processBusinessPromptFlow',
    inputSchema: ProcessBusinessPromptInputSchema,
    outputSchema: ProcessBusinessPromptOutputSchema,
  },
  async ({ prompt }) => {
    let evaluationLog: string[] = [];
    try {
      // Step 1: Infer business categories
      const categoryResponse = await categoryInferencePrompt({ prompt });
      const inferredCategories = categoryResponse.output!.categories.filter(c => c !== 'Unknown');
      evaluationLog.push(`Step 1: Inferred Categories - ${inferredCategories.length > 0 ? inferredCategories.join(', ') : 'None'}`);

      if (!inferredCategories || inferredCategories.length === 0) {
          throw new Error('Could not infer any specific business categories from the prompt.');
      }

      // Step 2: Get rules for all inferred categories
      let candidateRules: Rule[] = [];
      for (const category of inferredCategories) {
          const rulesForCategory = await getRulesByCategory(category);
          candidateRules.push(...rulesForCategory);
      }
      evaluationLog.push(`Step 2: Found ${candidateRules.length} candidate rules for the inferred categories.`);
      
      const activeRules = candidateRules.filter(rule => rule.status === 'active');
      if (activeRules.length === 0) {
        return {
          inferredCategories,
          extractedData: {},
          evaluationLog,
          recommendedActions: [],
          error: `No active rules found for the inferred categories: "${inferredCategories.join(', ')}".`
        };
      }
      
      const uniqueRules = Array.from(new Map(activeRules.map(rule => [rule.id, rule])).values());

      // Step 2.1: Identify the one best rule from the subset
      const ruleSelectionResponse = await ruleSelectionPrompt({
        prompt,
        rules: uniqueRules.map(r => ({ id: r.id!, name: r.name, description: r.description }))
      });
      const bestRuleId = ruleSelectionResponse.output?.bestRuleId;
      if (!bestRuleId) {
        throw new Error("AI could not select a suitable rule to process the prompt.");
      }
      const ruleToProcess = uniqueRules.find(r => r.id === bestRuleId);
      if (!ruleToProcess) {
        throw new Error(`Internal error: AI selected rule ID "${bestRuleId}" which was not found.`);
      }
      evaluationLog.push(`Step 2.1: AI selected rule "${ruleToProcess.name}" as the best match.`);


      // Step 3: Extract structured data specifically for the chosen rule
      // Collect all validation fields: direct condition fields AND formula base fields
      const fieldsToExtract = new Set<string>();
      ruleToProcess.conditions.forEach(c => {
        fieldsToExtract.add(c.field);
        if (typeof c.value === 'object' && c.value !== null && !Array.isArray(c.value)) {
          const formula = c.value as { field: string; };
          if (formula.field) {
            fieldsToExtract.add(formula.field);
          }
        }
      });

      const extractionResponse = await dataExtractionPrompt({
        prompt,
        ruleName: ruleToProcess.name,
        fieldsToExtract: Array.from(fieldsToExtract)
      });

      const jsonString = extractionResponse.text?.trim() ?? '';
      if(!jsonString) {
        throw new Error('Could not extract any data from the prompt for the selected rule.');
      }
      evaluationLog.push(`Step 3: Extracting data for rule "${ruleToProcess.name}".`);

      let extractedData: Record<string, any> = {};
      try {
        const cleanedJsonString = jsonString.replace(/```json\n?/, '').replace(/```$/, '');
        extractedData = JSON.parse(cleanedJsonString);
      } catch (e) {
        console.error("Failed to parse JSON:", jsonString);
        throw new Error('AI returned invalid JSON for extracted data.');
      }
      
      if(Object.keys(extractedData).length === 0) {
        throw new Error('Could not extract any key-value pairs from the prompt.');
      }
      evaluationLog.push(`- Extracted Data: ${JSON.stringify(extractedData)}`);

      // Step 4: Evaluate conditions for the single chosen rule
      const { matched, log } = await evaluateRule(extractedData, ruleToProcess);
      evaluationLog.push(...log);

      if (matched) {
        return {
          inferredCategories,
          extractedData,
          evaluationLog,
          matchedRule: ruleToProcess,
          recommendedActions: ruleToProcess.actions,
        };
      } else {
        return {
          inferredCategories,
          extractedData,
          evaluationLog,
          recommendedActions: [],
          error: `The conditions for the most relevant rule ("${ruleToProcess.name}") were not met based on the provided prompt.`,
        };
      }
    } catch (e) {
      const error = e as Error;
      console.error("Error in processBusinessPromptFlow: ", error);
      evaluationLog.push(`ERROR: ${error.message}`);
      return {
        inferredCategories: [],
        extractedData: {},
        evaluationLog,
        recommendedActions: [],
        error: error.message,
      };
    }
  }
);
