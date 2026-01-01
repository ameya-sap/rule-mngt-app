'use server';

/**
 * @fileOverview An AI agent that explains a business rule in plain English.
 *
 * - explainRule - A function that generates a human-readable explanation of a rule.
 */

import {ai} from '@/ai/genkit';
import { Rule, RuleSchema } from '@/lib/types';
import { z } from 'zod';

const ExplainRuleOutputSchema = z.object({
  explanation: z.string().describe('A clear, human-readable summary of the business rule.'),
});

export type ExplainRuleOutput = z.infer<typeof ExplainRuleOutputSchema>;

export async function explainRule(rule: Rule): Promise<ExplainRuleOutput> {
  return explainRuleFlow(rule);
}

const prompt = ai.definePrompt({
  name: 'explainRulePrompt',
  input: {schema: RuleSchema},
  output: {schema: ExplainRuleOutputSchema},
  prompt: `
    You are an expert business analyst. Your task is to translate a business rule from its technical JSON representation into a clear, human-readable summary.

    The summary should be a concise paragraph that explains what the rule does.
    Start by describing the main condition or trigger. Then, explain the actions that will be performed if the conditions are met.

    For example, for a rule that checks for hazardous materials and creates a shipping label, the summary should be something like:
    "This rule checks if a product is marked as dangerous goods on an outbound delivery. If it is, the system will automatically generate and print a dangerous goods shipping label and create a Safety Data Sheet (SDS) for the shipment."

    Do not just list the conditions and actions. Synthesize them into a natural language paragraph.
    Focus on the business impact and what the rule accomplishes.

    Here is the rule to explain:
    - Name: {{{name}}}
    - Description: {{{description}}}
    - Category: {{{businessCategory}}}
    - Conditions:
    {{#each conditions}}
    - Field: {{this.field}}, Operator: {{this.operator}}, Value: {{this.value}}
    {{/each}}
    - Actions:
    {{#each actions}}
    - Function: {{this.function}}, Description: {{this.description}}, Parameters: {{this.parameters}}
    {{/each}}
  `,
});

const explainRuleFlow = ai.defineFlow(
  {
    name: 'explainRuleFlow',
    inputSchema: RuleSchema,
    outputSchema: ExplainRuleOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
