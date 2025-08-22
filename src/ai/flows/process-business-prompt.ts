'use server';

/**
 * @fileOverview An AI agent that processes a business prompt, evaluates it against a set of rules, and returns the triggered actions.
 *
 * - processBusinessPrompt - A function that processes the business prompt.
 * - ProcessBusinessPromptInput - The input type for the processBusinessPrompt function.
 * - ProcessBusinessPromptOutput - The return type for the processBusinessPrompt function.
 */

import { ai } from '@/ai/genkit';
import { getRulesByCategory } from '@/lib/actions';
import { Rule, Action } from '@/lib/types';
import { z } from 'genkit';

// Schemas
const ProcessBusinessPromptInputSchema = z.object({
  prompt: z.string().describe('The user-provided business scenario prompt.'),
});
export type ProcessBusinessPromptInput = z.infer<typeof ProcessBusinessPromptInputSchema>;

const ProcessBusinessPromptOutputSchema = z.object({
  inferredCategory: z.string().describe('The business category inferred from the prompt.'),
  extractedData: z.record(z.any()).describe('Key-value data extracted from the prompt.'),
  evaluationLog: z.array(z.string()).describe('A log of the rule evaluation process.'),
  matchedRule: z.custom<Rule>().optional().describe('The rule that was matched, if any.'),
  recommendedActions: z.array(z.custom<Action>()).describe('The actions to perform based on the matched rule.'),
  error: z.string().optional().describe('Any error message that occurred during processing.'),
});
export type ProcessBusinessPromptOutput = z.infer<typeof ProcessBusinessPromptOutputSchema>;

// Exported wrapper function
export async function processBusinessPrompt(input: ProcessBusinessPromptInput): Promise<ProcessBusinessPromptOutput> {
  return processBusinessPromptFlow(input);
}

// Category Inference Prompt
const categoryInferencePrompt = ai.definePrompt({
  name: 'categoryInferencePrompt',
  input: { schema: z.object({ prompt: z.string() }) },
  output: { schema: z.object({ category: z.string() }) },
  prompt: `
    Based on the following user prompt, what is the most likely business category?
    Respond with the category name only. Examples: "Sales & Finance", "Fraud Detection", "Inventory Management".

    Prompt:
    {{{prompt}}}
  `,
});

// Data Extraction Prompt - Corrected to output a JSON string
const dataExtractionPrompt = ai.definePrompt({
  name: 'dataExtractionPrompt',
  input: { schema: z.object({ prompt: z.string() }) },
  prompt: `
      Extract all key-value pairs from the user's prompt. The keys should be in camelCase.
      Make sure to correctly infer the data types (e.g., number, string, boolean).

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
      // Step 1: Infer business category
      const categoryResponse = await categoryInferencePrompt({ prompt });
      const inferredCategory = categoryResponse.output!.category;
      if (!inferredCategory) {
          throw new Error('Could not infer a business category from the prompt.');
      }

      // Step 2: Get rules for that category
      const rules = await getRulesByCategory(inferredCategory);
      if (rules.length === 0) {
        return {
          inferredCategory,
          extractedData: {},
          evaluationLog: [`No active rules found for the inferred category: "${inferredCategory}"`],
          recommendedActions: [],
          error: `No active rules were found for the inferred business category "${inferredCategory}".`
        };
      }

      // Step 3: Extract structured data from prompt
      const extractionResponse = await dataExtractionPrompt({ prompt });
      const jsonString = extractionResponse.text.trim();
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
      const { matchedRule, evaluationLog } = await evaluateRules(extractedData, rules);

      if (matchedRule) {
        return {
          inferredCategory,
          extractedData,
          evaluationLog,
          matchedRule,
          recommendedActions: matchedRule.actions,
        };
      } else {
        return {
          inferredCategory,
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
        inferredCategory: 'unknown',
        extractedData: {},
        evaluationLog: [error.message],
        recommendedActions: [],
        error: error.message,
      };
    }
  }
);
