'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { FormRuleSchema, Rule } from '@/lib/types';
import { PlusCircle, Trash2, Wand2 } from 'lucide-react';
import { saveRule } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { RuleSuggestions } from './RuleSuggestions';
import { useState } from 'react';

type RuleFormProps = {
  rule?: Rule;
};

// This helper converts the parameter object in the rule data to a formatted JSON string for the form's textarea.
const transformRuleDataToFormData = (rule?: Rule) => {
  if (!rule) return undefined;
  return {
    ...rule,
    actions: rule.actions.map((action) => ({
      ...action,
      parameters: JSON.stringify(action.parameters, null, 2),
    })),
  };
};

export function RuleForm({ rule }: RuleFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const isEditMode = !!rule;

  const form = useForm<z.infer<typeof FormRuleSchema>>({
    resolver: zodResolver(FormRuleSchema),
    defaultValues: transformRuleDataToFormData(rule) || {
      name: '',
      description: '',
      businessCategory: '',
      conditions: [{ field: '', operator: '==', value: '' }],
      actions: [{ type: '', function: '', description: '', parameters: '{}' }],
      status: 'inactive',
    },
  });

  const {
    fields: conditionFields,
    append: appendCondition,
    remove: removeCondition,
  } = useFieldArray({
    control: form.control,
    name: 'conditions',
  });

  const {
    fields: actionFields,
    append: appendAction,
    remove: removeAction,
  } = useFieldArray({
    control: form.control,
    name: 'actions',
  });

  async function onSubmit(data: z.infer<typeof FormRuleSchema>) {
    try {
      const result = await saveRule(data);
      if (result.success && result.id) {
        toast({
          title: 'Success',
          description: `Rule "${data.name}" has been saved.`,
        });
        router.push('/');
        router.refresh();
      } else {
        throw new Error(result.error || 'An unknown error occurred.');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error saving rule',
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>{isEditMode ? 'Edit Rule' : 'Create New Rule'}</CardTitle>
            <CardDescription>
              Define the details of your business rule below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rule Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Gold Customer Discount" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="businessCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Category</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Sales & Finance" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Textarea placeholder="Describe what this rule does..." {...field} />
                    </FormControl>
                    <RuleSuggestions
                      description={form.watch('description')}
                      onSelectCondition={(c) => appendCondition(c)}
                      onSelectAction={(a) => appendAction({ ...a, parameters: JSON.stringify(a.parameters, null, 2) })}
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conditions</CardTitle>
            <CardDescription>
              These conditions must be met for the rule's actions to trigger.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {conditionFields.map((field, index) => (
              <div key={field.id} className="flex flex-col md:flex-row gap-4 items-start p-4 border rounded-lg relative">
                <div className="grid md:grid-cols-3 gap-4 flex-1 w-full">
                  <FormField
                    control={form.control}
                    name={`conditions.${index}.field`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Field</FormLabel>
                        <FormControl>
                          <Input placeholder="customer.tier" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`conditions.${index}.operator`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Operator</FormLabel>
                        <FormControl>
                          <Input placeholder="==" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`conditions.${index}.value`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Value</FormLabel>
                        <FormControl>
                          <Input placeholder="Gold" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => removeCondition(index)}
                  className="mt-4 md:mt-0"
                  aria-label="Remove condition"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => appendCondition({ field: '', operator: '==', value: '' })}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Condition
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>
              These actions will be executed when all conditions are met.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {actionFields.map((field, index) => (
              <div key={field.id} className="p-4 border rounded-lg space-y-4">
                <div className="flex gap-4 items-start">
                  <div className="grid md:grid-cols-3 gap-4 flex-1">
                     <FormField
                        control={form.control}
                        name={`actions.${index}.type`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type</FormLabel>
                            <FormControl>
                              <Input placeholder="discount" {...field} />
                            </FormControl>
                             <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`actions.${index}.function`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Function</FormLabel>
                            <FormControl>
                              <Input placeholder="apply_discount" {...field} />
                            </FormControl>
                             <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name={`actions.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Input placeholder="Applies a discount" {...field} />
                            </FormControl>
                             <FormMessage />
                          </FormItem>
                        )}
                      />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => removeAction(index)}
                    aria-label="Remove action"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                 <FormField
                    control={form.control}
                    name={`actions.${index}.parameters`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parameters (JSON)</FormLabel>
                        <FormControl>
                          <Textarea placeholder='{ "amount": 0.1 }' {...field} className="font-mono" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => appendAction({ type: '', function: '', description: '', parameters: '{}' })}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Action
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push('/')}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving...' : 'Save Rule'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
