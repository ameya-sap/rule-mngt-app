import { z } from 'zod';

// Base Schemas
export const ConditionSchema = z.object({
  field: z.string().min(1, 'Field is required.'),
  operator: z.string().min(1, 'Operator is required.'),
  value: z.any(),
});

export const ActionSchema = z.object({
  type: z.string().min(1, 'Type is required.'),
  function: z.string().min(1, 'Function is required.'),
  description: z.string().optional(),
  parameters: z.record(z.any()),
});

export const RuleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Rule name is required.'),
  businessCategory: z.string().min(1, 'Business category is required.'),
  description: z.string().min(1, 'Description is required.'),
  conditions: z.array(ConditionSchema).min(1, 'At least one condition is required.'),
  actions: z.array(ActionSchema).min(1, 'At least one action is required.'),
  status: z.enum(['active', 'inactive']),
});

export type Rule = z.infer<typeof RuleSchema>;
export type Condition = z.infer<typeof ConditionSchema>;
export type Action = z.infer<typeof ActionSchema>;


// Form-specific Schemas
// This is for the RuleForm, where the action's parameters are a JSON string from a textarea.
export const FormActionSchema = ActionSchema.extend({
  parameters: z.string().refine((val) => {
    try {
      JSON.parse(val);
      return true;
    } catch (e) {
      return false;
    }
  }, { message: 'Invalid JSON format in parameters.' }),
});

export const FormRuleSchema = RuleSchema.extend({
  actions: z.array(FormActionSchema).min(1, 'At least one action is required.'),
});


// AI Flow Schemas

// suggest-rule-components.ts
export const SuggestRuleComponentsInputSchema = z.object({
  existingRules: z.array(
    z.object({
      name: z.string(),
      businessCategory: z.string(),
      description: z.string(),
      conditions: z.array(z.object({
        field: z.string(),
        operator: z.string(),
        value: z.any()
      })),
      actions: z.array(z.object({
        type: z.string(),
        function: z.string(),
        description: z.string(),
        parameters: z.record(z.any())
      }))
    })
  ).describe('A list of existing business rules.'),
  ruleDescription: z.string().describe('The description of the new rule for which suggestions are needed.')
});
export type SuggestRuleComponentsInput = z.infer<typeof SuggestRuleComponentsInputSchema>;

export const SuggestRuleComponentsOutputSchema = z.object({
  suggestedConditions: z.array(ConditionSchema).describe('Suggested conditions for the new rule.'),
  suggestedActions: z.array(ActionSchema).describe('Suggested actions for the new rule.')
});
export type SuggestRuleComponentsOutput = z.infer<typeof SuggestRuleComponentsOutputSchema>;


// process-business-prompt.ts
export const ProcessBusinessPromptInputSchema = z.object({
  prompt: z.string().describe('The user-provided business scenario prompt.'),
});
export type ProcessBusinessPromptInput = z.infer<typeof ProcessBusinessPromptInputSchema>;

export const ProcessBusinessPromptOutputSchema = z.object({
  inferredCategories: z.array(z.string()).describe('The business categories inferred from the prompt.'),
  extractedData: z.record(z.any()).describe('Key-value data extracted from the prompt.'),
  evaluationLog: z.array(z.string()).describe('A log of the rule evaluation process.'),
  matchedRule: RuleSchema.optional().describe('The rule that was matched, if any.'),
  recommendedActions: z.array(ActionSchema).describe('The actions to perform based on the matched rule.'),
  error: z.string().optional().describe('Any error message that occurred during processing.'),
});
export type ProcessBusinessPromptOutput = z.infer<typeof ProcessBusinessPromptOutputSchema>;


// generate-example-prompt.ts
export const GenerateExamplePromptInputSchema = RuleSchema;
export type GenerateExamplePromptInput = Rule;

export const GenerateExamplePromptOutputSchema = z.object({
  prompt: z.string().describe('The generated example user prompt.'),
});
export type GenerateExamplePromptOutput = z.infer<typeof GenerateExamplePromptOutputSchema>;


// Example Prompts
export const ExamplePromptSchema = z.object({
    id: z.string(),
    prompt: z.string(),
});
export type ExamplePrompt = z.infer<typeof ExamplePromptSchema>;
