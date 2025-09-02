'use server';

/**
 * @fileOverview An AI agent that generates an example user prompt based on a given business rule.
 *
 * - generateExamplePrompt - A function that generates an example prompt.
 */

import {ai} from '@/ai/genkit';
import { GenerateExamplePromptInput, GenerateExamplePromptInputSchema, GenerateExamplePromptOutput, GenerateExamplePromptOutputSchema } from '@/lib/types';


export async function generateExamplePrompt(input: GenerateExamplePromptInput): Promise<GenerateExamplePromptOutput> {
  return generateExamplePromptFlow(input);
}


const prompt = ai.definePrompt({
    name: 'generateExamplePrompt',
    input: {schema: GenerateExamplePromptInputSchema},
    output: {schema: GenerateExamplePromptOutputSchema},
    config: {
      response: {
        format: 'json',
      },
    },
    prompt: `
      You are an assistant that creates realistic example data.
      Based on the provided business rule, generate a sample user prompt (as plain text) that would trigger this rule.
      The prompt should be written from the perspective of a user trying to perform a business task.
      It must contain all the necessary information and key-value pairs mentioned in the rule's conditions for the rule to be met.
      Do not include any explanation or extra text, only the generated prompt.

      Business Rule:
      - Name: {{{name}}}
      - Description: {{{description}}}
      - Conditions:
      {{#each conditions}}
      - Field: {{this.field}}, Operator: {{this.operator}}, Value: {{this.value}}
      {{/each}}
    `,
  });
  

const generateExamplePromptFlow = ai.defineFlow(
  {
    name: 'generateExamplePromptFlow',
    inputSchema: GenerateExamplePromptInputSchema,
    outputSchema: GenerateExamplePromptOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
