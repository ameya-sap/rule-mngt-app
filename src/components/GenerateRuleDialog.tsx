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
import { generateRuleFromPrompt, saveRule } from '@/lib/actions';
import { Bot, Loader2, Plus } from 'lucide-react';
import { Rule } from '@/lib/types';

export function GenerateRuleDialog() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [prompt, setPrompt] = React.useState('');
  const [generatedRule, setGeneratedRule] = React.useState<any | null>(null);
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
        setGeneratedRule(result.rule);
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Bot className="mr-2 h-4 w-4" />
          Generate Rule
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
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

        {generatedRule && (
          <div className="space-y-4">
            <h4 className="font-semibold">Generated Rule</h4>
            <div className="rounded-md bg-muted p-4">
              <pre className="overflow-x-auto text-sm">
                <code>{JSON.stringify(generatedRule, null, 2)}</code>
              </pre>
            </div>
          </div>
        )}
        
        <DialogFooter>
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
