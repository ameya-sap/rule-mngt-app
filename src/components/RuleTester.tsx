'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { generateExamplePrompt, testBusinessRule } from '@/lib/actions';
import { Loader2, Sparkles, AlertTriangle, Wand2, Info } from 'lucide-react';
import { Badge } from './ui/badge';
import type { Action } from '@/lib/types';

const examplePrompt = `Please process an invoice for an order with the following details:
orderId: INV-78901
customerClass: Gold
invoiceAmount: 1250
customerNumber: CUST-45739
invoiceType: Sale`;

export function RuleTester() {
  const [prompt, setPrompt] = React.useState('');
  const [result, setResult] = React.useState<any>(null);
  const [isProcessing, startProcessing] = React.useTransition();
  const [isGenerating, startGenerating] = React.useTransition();
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!prompt.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Prompt cannot be empty.',
      });
      return;
    }

    startProcessing(async () => {
      setResult(null);
      const response = await testBusinessRule(prompt);
      if (response.success) {
        setResult(response.result);
        toast({
          title: 'Success',
          description: 'Prompt processed successfully.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Processing Failed',
          description: response.error,
        });
      }
    });
  };

  const handleUseExample = () => {
    setPrompt(examplePrompt);
  };
  
  const handleGenerateExample = () => {
    startGenerating(async () => {
        const response = await generateExamplePrompt();
        if (response.success && response.prompt) {
            setPrompt(response.prompt);
            toast({
                title: 'Success',
                description: 'Example prompt generated.',
            });
        } else {
            toast({
                variant: 'destructive',
                title: 'Generation Failed',
                description: response.error,
            });
        }
    });
  };

  const isPending = isProcessing || isGenerating;

  const renderResult = () => {
    if (!result) return null;
    
    const renderInferredCategories = () => {
        if (result.inferredCategories && result.inferredCategories.length > 0) {
            return (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 p-4 text-sm text-blue-800">
                  <Info className="h-5 w-5" />
                  <div>
                    <span className="font-semibold">Inferred Categories: </span>
                    {result.inferredCategories.join(', ')}
                  </div>
                </div>
            )
        }
        return null
    }

    if (result.error) {
      return (
        <>
            {renderInferredCategories()}
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
            <AlertTriangle className="h-5 w-5" />
            <p>{result.error}</p>
            </div>
        </>
      );
    }
    
    if (result.matchedRule) {
      return (
        <>
        {renderInferredCategories()}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Rule Matched: <span className="text-primary">{result.matchedRule.name}</span></CardTitle>
            <CardDescription>{result.matchedRule.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <h4 className="font-semibold mb-2">Recommended Next Actions:</h4>
            <div className="space-y-3">
              {result.recommendedActions.map((action: Action, index: number) => (
                <div key={index} className="p-3 border rounded-lg bg-background">
                  <span className="text-sm font-medium"><Badge variant="secondary">{action.function}</Badge></span>
                  <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
                  <pre className="mt-2 text-xs bg-muted p-2 rounded-md font-mono">
                    {JSON.stringify(action.parameters, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        </>
      );
    }

    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <CardTitle>Test Your Rules with AI</CardTitle>
        </div>
        <CardDescription>
          Enter a business scenario in plain text. The AI will find the relevant rules, evaluate them, and suggest the next steps.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Textarea
            placeholder="Describe a business event, like processing an invoice or flagging a transaction..."
            className="h-40"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isPending}
          />
          <div className="flex justify-between items-center gap-4">
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Process Prompt'
              )}
            </Button>
            <div className='flex items-center'>
            <Button
                type="button"
                variant="outline"
                onClick={handleGenerateExample}
                disabled={isPending}
            >
                {isGenerating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Wand2 className="mr-2 h-4 w-4" />
                )}
                Generate example with AI
            </Button>
            <Button
              type="button"
              variant="link"
              onClick={handleUseExample}
              disabled={isPending}
              className="text-muted-foreground"
            >
              Use an example
            </Button>
            </div>
          </div>
        </div>
        {renderResult()}
      </CardContent>
    </Card>
  );
}
