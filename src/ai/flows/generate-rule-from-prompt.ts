'use server';

/**
 * @fileOverview An AI agent that generates a business rule from a user's natural language prompt.
 * 
 * - generateRuleFromPrompt - A function that generates the rule.
 */

import { ai } from '@/ai/genkit';
import { RuleSchema } from '@/lib/types';
import { z } from 'zod';

// We want to generate a rule, but without the ID and with status as optional.
const GeneratedRuleSchema = RuleSchema.omit({ id: true }).extend({
    status: z.enum(['active', 'inactive']).optional(),
});

export async function generateRuleFromPrompt(prompt: string): Promise<z.infer<typeof GeneratedRuleSchema>> {
  return generateRuleFromPromptFlow(prompt);
}

const promptTemplate = ai.definePrompt({
  name: 'generateRuleFromPrompt',
  input: { schema: z.object({ input: z.string() }) },
  output: { schema: GeneratedRuleSchema },
  model: 'googleai/gemini-pro',
  prompt: `
    You are an expert business analyst responsible for creating structured business rules from user requests.
    Analyze the following user prompt and convert it into a valid JSON business rule object that conforms to the provided output schema.

    User Prompt:
    "{{{input}}}"

    Key tasks:
    1.  **Name and Description**: Create a concise, descriptive name and a brief summary for the rule.
    2.  **Conditions**: Identify all conditions. The 'field' should be in camelCase (e.g., 'order.totalAmount'). The 'value' can be a specific value or refer to another field (e.g., 'customer.creditLimit').
    3.  **Actions**: Define the action to be taken. The 'function' should be a descriptive name for the action (e.g., 'flag_for_review'). The 'parameters' object should contain relevant data for the action.
    4.  **Status**: Set the initial status to 'inactive'.
    5.  **Business Category**: Infer the most relevant business category from the prompt.

    Example:
    - Prompt: "If an order's total is over $1,000 and the customer is not in the 'premium' tier, put the order on hold."
    - Expected Output:
      {
        "name": "High-Value Order Hold",
        "description": "Puts high-value orders on hold for non-premium customers.",
        "businessCategory": "Order Management",
        "conditions": [
          { "field": "order.total", "operator": ">", "value": 1000 },
          { "field": "customer.tier", "operator": "!=", "value": "premium" }
        ],
        "actions": [
          {
            "type": "status_update",
            "function": "set_order_hold",
            "description": "Sets the order status to 'on_hold'.",
            "parameters": { "reason": "High-value order requires review" }
          }
        ],
        "status": "inactive"
      }
    
    If the prompt is empty or nonsensical, you MUST return a default rule object that indicates an error.
    Example for empty prompt:
     {
        "name": "No Rule Extracted",
        "description": "This rule indicates that no specific business logic could be extracted from an empty user prompt. It serves as a placeholder to meet schema requirements.",
        "businessCategory": "System Management",
        "conditions": [
          { "field": "prompt.content", "operator": "is_empty", "value": true }
        ],
        "actions": [
          { 
            "type": "system_notification",
            "function": "log_empty_prompt_rule", 
            "description": "Logs that an empty prompt was processed.",
            "parameters": { "error": "The user prompt was empty." } 
          }
        ],
        "status": "inactive"
      }


    Please provide only the raw JSON object as your response. Do not include any formatting, markdown, or explanatory text.
  `,
});

const generateRuleFromPromptFlow = ai.defineFlow(
  {
    name: 'generateRuleFromPromptFlow',
    inputSchema: z.string(),
    outputSchema: GeneratedRuleSchema,
  },
  async (prompt) => {
    const {output} = await promptTemplate({ input: prompt });
    if (!output) {
      throw new Error('Failed to generate a rule from the prompt. The AI returned an empty response.');
    }
    // Ensure status is set if the model doesn't provide it
    if (!output.status) {
      output.status = 'inactive';
    }
    return output;
  }
);