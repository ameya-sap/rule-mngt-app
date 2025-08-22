'use server';

/**
 * @fileOverview An AI agent that processes a business prompt, evaluates it against a set of rules, and returns the triggered actions.
 *
 * - processBusinessPrompt - A function that processes the business prompt.
 */

import { ai } from '@/ai/genkit';
import { getRulesByCategory } from '@/lib/actions';
import { ProcessBusinessPromptInput, ProcessBusinessPromptInputSchema, ProcessBusinessPromptOutput, ProcessBusinessPromptOutputSchema, Rule } from '@/lib/types';
import { z } from 'genkit';


// Exported wrapper function
export async function processBusinessPrompt(input: ProcessBusinessPromptInput): Promise<ProcessBusinessPromptOutput> {
  return processBusinessPromptFlow(input);
}

// Category Inference Prompt
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

    If the prompt does not clearly match any of the categories, respond with an empty array.
    Respond with only the category names in the correct JSON format.

    Prompt:
    {{{prompt}}}
  `,
});

// Data Extraction Prompt
const dataExtractionPrompt = ai.definePrompt({
  name: 'dataExtractionPrompt',
  prompt: `
      Extract all key-value pairs from the user's prompt. The keys should be in camelCase.
      Infer the most likely data type (e.g., number, string, boolean) for each value.
      For example, if the prompt says "the stock for 'Material 123' is 50", you should extract '{"materialId": "Material 123", "currentStock": 50}'.

      Prompt:
      {{{prompt}}}

      Respond with only the raw JSON object. Do not include any formatting, markdown, or explanatory text.
      Your response must start with { and end with }.
      Example: {"orderId":"INV-78901","customerClass":"Gold","invoiceAmount":1250,"customerNumber":"CUST-45739","invoiceType":"Sale"}
    `,
});


// Helper function to evaluate rules against extracted data
async function evaluateRules(
  promptData: Record<string, any>,
  rules: Rule[]
): Promise<{ matchedRule: Rule | null; evaluationLog: string[] }> {
  const evaluationLog: string[] = [];

  for (const rule of rules) {
    if (rule.status !== 'active') {
      evaluationLog.push(`Skipping inactive rule: "${rule.name}"`);
      continue;
    }

    evaluationLog.push(`Evaluating rule: "${rule.name}"`);
    let allConditionsMet = true;

    for (const condition of rule.conditions) {
      const promptValue = promptData[condition.field];
      const ruleValue = condition.value;
      let conditionMet = false;

      if (promptValue === undefined) {
        evaluationLog.push(`- Condition for field "${condition.field}" SKIPPED: Field not found in prompt data.`);
        allConditionsMet = false;
        break; 
      }

      switch (condition.operator) {
        case '==': conditionMet = promptValue == ruleValue; break;
        case '!=': conditionMet = promptValue != ruleValue; break;
        case '>': conditionMet = promptValue > ruleValue; break;
        case '<': conditionMet = promptValue < ruleValue; break;
        case '>=': conditionMet = promptValue >= ruleValue; break;
        case '<=': conditionMet = promptValue <= ruleValue; break;
        default:
          evaluationLog.push(`- Unsupported operator "${condition.operator}" for field "${condition.field}"`);
          conditionMet = false;
      }

      evaluationLog.push(
        `- Condition: \`${condition.field} ${condition.operator} ${ruleValue}\` (Prompt Value: ${promptValue}). Result: ${conditionMet ? 'MET' : 'NOT MET'}`
      );

      if (!conditionMet) {
        allConditionsMet = false;
        break;
      }
    }

    if (allConditionsMet) {
      evaluationLog.push(`SUCCESS: All conditions met for rule "${rule.name}".`);
      return { matchedRule: rule, evaluationLog };
    } else {
      evaluationLog.push(`FAILURE: Not all conditions met for rule "${rule.name}".`);
    }
  }

  return { matchedRule: null, evaluationLog };
}

// Main Orchestration Flow
const processBusinessPromptFlow = ai.defineFlow(
  {
    name: 'processBusinessPromptFlow',
    inputSchema: ProcessBusinessPromptInputSchema,
    outputSchema: ProcessBusinessPromptOutputSchema,
  },
  async ({ prompt }) => {
    try {
      // Step 1: Infer business categories
      const categoryResponse = await categoryInferencePrompt({ prompt });
      const inferredCategories = categoryResponse.output!.categories;
      if (!inferredCategories || inferredCategories.length === 0) {
          throw new Error('Could not infer any specific business categories from the prompt.');
      }

      // Step 2: Get rules for all inferred categories
      let allRules: Rule[] = [];
      for (const category of inferredCategories) {
          const rulesForCategory = await getRulesByCategory(category);
          allRules.push(...rulesForCategory);
      }
      
      if (allRules.length === 0) {
        return {
          inferredCategories,
          extractedData: {},
          evaluationLog: [`No active rules found for the inferred categories: "${inferredCategories.join(', ')}"`],
          recommendedActions: [],
          error: `No active rules were found for the inferred business categories "${inferredCategories.join(', ')}".`
        };
      }
      
      // Remove duplicate rules if a rule belongs to multiple inferred categories
      const uniqueRules = Array.from(new Map(allRules.map(rule => [rule.id, rule])).values());


      // Step 3: Extract structured data from prompt
      const extractionResponse = await dataExtractionPrompt({ prompt });
      const jsonString = extractionResponse.text?.trim() ?? '';
      if(!jsonString) {
        throw new Error('Could not extract any data from the prompt.');
      }

      let extractedData: Record<string, any> = {};
      try {
        // A simple regex to remove markdown fences if they exist
        const cleanedJsonString = jsonString.replace(/```json\n?/, '').replace(/```$/, '');
        extractedData = JSON.parse(cleanedJsonString);
      } catch (e) {
        console.error("Failed to parse JSON:", jsonString);
        throw new Error('AI returned invalid JSON for extracted data.');
      }
      
      if(Object.keys(extractedData).length === 0) {
        throw new Error('Could not extract any key-value pairs from the prompt.');
      }

      // Step 4: Evaluate conditions (in code, not AI)
      const { matchedRule, evaluationLog } = await evaluateRules(extractedData, uniqueRules);

      if (matchedRule) {
        return {
          inferredCategories,
          extractedData,
          evaluationLog,
          matchedRule,
          recommendedActions: matchedRule.actions,
        };
      } else {
        return {
          inferredCategories,
          extractedData,
          evaluationLog,
          recommendedActions: [],
          error: 'No rules were matched based on the provided prompt.',
        };
      }
    } catch (e) {
      const error = e as Error;
      console.error("Error in processBusinessPromptFlow: ", error);
      return {
        inferredCategories: [],
        extractedData: {},
        evaluationLog: [error.message],
        recommendedActions: [],
        error: error.message,
      };
    }
  }
);
