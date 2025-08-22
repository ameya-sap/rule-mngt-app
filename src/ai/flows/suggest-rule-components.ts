'use server';

/**
 * @fileOverview An AI agent that suggests conditions and actions for business rules based on existing rules and patterns.
 *
 * - suggestRuleComponents - A function that suggests rule components.
 */

import {ai} from '@/ai/genkit';
import { SuggestRuleComponentsInput, SuggestRuleComponentsInputSchema, SuggestRuleComponentsOutput, SuggestRuleComponentsOutputSchema } from '@/lib/types';


export async function suggestRuleComponents(input: SuggestRuleComponentsInput): Promise<SuggestRuleComponentsOutput> {
  return suggestRuleComponentsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestRuleComponentsPrompt',
  input: {schema: SuggestRuleComponentsInputSchema},
  output: {schema: SuggestRuleComponentsOutputSchema},
  prompt: `You are an AI assistant that helps users define business rules by suggesting conditions and actions.

  Based on the following existing rules and the provided rule description, suggest possible conditions and actions for the new rule.

  Existing Rules:
  {{#each existingRules}}
  Rule Name: {{this.name}}
  Business Category: {{this.businessCategory}}
  Description: {{this.description}}
  Conditions:
  {{#each this.conditions}}
  - Field: {{this.field}}, Operator: {{this.operator}}, Value: {{this.value}}
  {{/each}}
  Actions:
  {{#each this.actions}}
  - Type: {{this.type}}, Function: {{this.function}}, Description: {{this.description}}, Parameters: {{JSONstringify this.parameters}}
  {{/each}}
  {{/each}}

  Rule Description: {{{ruleDescription}}}

  Please provide the suggestions in JSON format.
  Do not provide any explanation, justification, or preamble. Only the JSON object is acceptable. Adhere strictly to the output schema.
`,
});

const suggestRuleComponentsFlow = ai.defineFlow(
  {
    name: 'suggestRuleComponentsFlow',
    inputSchema: SuggestRuleComponentsInputSchema,
    outputSchema: SuggestRuleComponentsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
