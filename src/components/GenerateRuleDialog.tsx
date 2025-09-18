'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { generateRuleFromPrompt, saveRule, addGenerateRuleExamplePrompt, getGenerateRuleExamplePrompts, deleteGenerateRuleExamplePrompt } from '@/lib/actions';
import { Bot, Loader2, Plus, Library } from 'lucide-react';
import type { Rule, Condition, Action } from '@/lib/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExamplePromptsDialog } from './ExamplePromptsDialog';

function GeneratedRuleDisplay({ rule }: { rule: Rule }) {
  return (
    <Tabs defaultValue="formatted">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="formatted">Formatted</TabsTrigger>
        <TabsTrigger value="raw">Raw JSON</TabsTrigger>
      </TabsList>
      <TabsContent value="formatted">
        <Card className="max-h-[40vh] overflow-y-auto">
          <CardHeader className="pb-4">
            <h4 className="font-semibold text-lg text-primary">{rule.name}</h4>
            <p className="text-sm text-muted-foreground">{rule.description}</p>
            <Badge variant="outline" className="w-fit">{rule.businessCategory}</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
                <h5 className="font-semibold mb-2">Conditions</h5>
                <div className="space-y-2">
                {rule.conditions.map((condition: Condition, index: number) => (
                    <div key={`cond-${index}`} className="flex items-center gap-2 flex-wrap text-sm border p-2 rounded-md bg-secondary/30">
                        <Badge variant="secondary">{condition.field}</Badge>
                        <span className="font-mono">{condition.operator}</span>
                        <Badge variant="outline">{String(condition.value)}</Badge>
                    </div>
                ))}
                </div>
            </div>
            <Separator />
            <div>
            <h5 className="font-semibold mb-2">Actions</h5>
                <div className="space-y-3">
                {rule.actions.map((action: Action, index: number) => (
                    <div key={`act-${index}`} className="p-3 border rounded-lg bg-secondary/30">
                    <div className='flex items-center gap-2'>
                        <span className="text-sm font-medium"><Badge variant="secondary">{action.function}</Badge></span>
                        <span className="text-xs font-mono text-muted-foreground">({action.type})</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 mb-2">{action.description}</p>
                    <pre className="text-xs bg-muted p-2 rounded-md font-mono">
                        {JSON.stringify(action.parameters, null, 2)}
                    </pre>
                    </div>
                ))}
                </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="raw">
         <Card className="max-h-[40vh] overflow-y-auto">
            <CardContent className="p-0">
                 <pre className="text-xs bg-muted p-4 rounded-md font-mono whitespace-pre-wrap break-all">
                    {JSON.stringify(rule, null, 2)}
                </pre>
            </CardContent>
         </Card>
      </TabsContent>
    </Tabs>
  )
}

export function GenerateRuleDialog() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [prompt, setPrompt] = React.useState('');
  const [generatedRule, setGeneratedRule] = React.useState<Rule | null>(null);
  const [isGenerating, startGenerating] = React.useTransition();
  const [isSaving, startSaving] = React.useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter a description for the rule you want to generate.',
      });
      return;
    }

    startGenerating(async () => {
      setGeneratedRule(null);
      const result = await generateRuleFromPrompt(prompt);
      if (result.success && result.rule) {
        setGeneratedRule(result.rule as Rule);
        toast({
          title: 'Rule Generated',
          description: 'Review the generated rule below.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Generation Failed',
          description: result.error || 'An unexpected error occurred.',
        });
      }
    });
  };

  const handleAddRule = () => {
    if (!generatedRule) return;

    startSaving(async () => {
        // The generated rule fits the Rule schema, but saveRule expects parameters to be a string.
        const formData = {
            ...generatedRule,
            actions: generatedRule.actions.map((a: any) => ({
                ...a,
                parameters: JSON.stringify(a.parameters, null, 2)
            }))
        }

      const result = await saveRule(formData);
      if (result.success) {
        toast({
          title: 'Success!',
          description: 'The generated rule has been added to your repository.',
        });
        setIsOpen(false);
        setPrompt('');
        setGeneratedRule(null);
        router.refresh();
      } else {
        toast({
          variant: 'destructive',
          title: 'Failed to Save Rule',
          description: result.error,
        });
      }
    });
  };
  
  const handleAddAsExample = async () => {
    if (!prompt.trim()) return;
    const result = await addGenerateRuleExamplePrompt(prompt);
     if (result.success) {
        toast({
          title: 'Success',
          description: 'Prompt added to examples.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error,
        });
      }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Bot className="mr-2 h-4 w-4" />
          Generate Rule
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Generate Rule with AI</DialogTitle>
          <DialogDescription>
            Describe the business logic you want to automate in plain English. The AI will convert it into a structured rule for you.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea
            placeholder="e.g., If a customer's total purchase value exceeds $1,000 in a month, upgrade them to Gold status."
            className="h-32"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isGenerating || isSaving}
          />
          <div className="flex justify-end items-center gap-2">
            <ExamplePromptsDialog 
              onSelectPrompt={setPrompt}
              getPrompts={getGenerateRuleExamplePrompts}
              deletePrompt={deleteGenerateRuleExamplePrompt}
              dialogTitle="Browse Rule Generation Examples"
              dialogDescription="Select an example business logic description to generate a rule."
            />
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || isSaving}
            >
              {isGenerating ? (
                  <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                  </>
              ) : (
                  'Generate'
              )}
            </Button>
          </div>
        </div>

        {generatedRule && (
          <div className="space-y-4">
            <h4 className="font-semibold">Generated Rule</h4>
            <GeneratedRuleDisplay rule={generatedRule} />
          </div>
        )}
        
        <DialogFooter>
         {generatedRule && (
            <Button
                variant="secondary"
                onClick={handleAddAsExample}
                disabled={isSaving || isGenerating}
            >
                <Plus className="mr-2 h-4 w-4" />
                Add as Example
            </Button>
          )}
          <Button
            type="button"
            onClick={handleAddRule}
            disabled={!generatedRule || isSaving || isGenerating}
          >
            {isSaving ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                </>
            ): (
                <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add to Rules
                </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
