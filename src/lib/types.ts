import { z } from 'zod';

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
  description: z.string().min(1, 'Description is required.'),
  conditions: z.array(ConditionSchema).min(1, 'At least one condition is required.'),
  actions: z.array(ActionSchema).min(1, 'At least one action is required.'),
  status: z.enum(['active', 'inactive']),
});

export type Rule = z.infer<typeof RuleSchema>;
export type Condition = z.infer<typeof ConditionSchema>;
export type Action = z.infer<typeof ActionSchema>;


// Schema for form validation where parameters are a JSON string
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
