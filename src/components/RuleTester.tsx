'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { generateExamplePrompt, testBusinessRule, addExamplePrompt } from '@/lib/actions';
import { Loader2, Sparkles, AlertTriangle, Wand2, Info, HelpCircle, PlusCircle, Library } from 'lucide-react';
import { Badge } from './ui/badge';
import type { Action, Condition } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { ExamplePromptsDialog } from './ExamplePromptsDialog';

type ResultDisplayProps = {
  result: any;
  onAddAsExample: () => void;
};

function ResultDisplay({ result, onAddAsExample }: ResultDisplayProps) {

  const renderInferredCategories = () => {
    if (result.inferredCategories && result.inferredCategories.length > 0) {
      return (
        <div className="flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 p-4 text-sm text-blue-800">
          <Info className="h-5 w-5" />
          <div>
            <span className="font-semibold">Inferred Categories: </span>
            {result.inferredCategories.join(', ')}
          </div>
        </div>
      );
    }
    return null;
  };
  
  const renderError = () => {
    if (result.error) {
       return (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
                <AlertTriangle className="h-5 w-5" />
                <p>{result.error}</p>
            </div>
       )
    }
    return null
  }

  const renderMatchedRule = () => {
    if (result.matchedRule) {
      return (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Rule Matched: <span className="text-primary">{result.matchedRule.name}</span></CardTitle>
            <CardDescription>{result.matchedRule.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div>
                <h4 className="font-semibold mb-2">Matched Conditions:</h4>
                <div className="space-y-2 text-sm border p-3 rounded-lg bg-background">
                    {result.matchedRule.conditions.map((condition: Condition, index: number) => (
                    <div key={index} className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary">{condition.field}</Badge>
                        <span className="font-mono">{condition.operator}</span>
                        <Badge variant="outline">{String(condition.value)}</Badge>
                        <span className="text-muted-foreground italic">
                        (Prompt Value: {String(result.extractedData[condition.field])})
                        </span>
                    </div>
                    ))}
                </div>
            </div>

            <div>
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
            </div>
          </CardContent>
        </Card>
      );
    }
    return null;
  };

  return (
    <div className="mt-6 space-y-4">
        <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Processing Result</h3>
            <Button variant="outline" size="sm" onClick={onAddAsExample}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add as Example
            </Button>
        </div>
        {renderInferredCategories()}
        {renderError()}
        {renderMatchedRule()}
    </div>
  )
}

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
        setResult(null); // Clear previous results on error
        toast({
          variant: 'destructive',
          title: 'Processing Failed',
          description: response.error,
        });
      }
    });
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

  const handleAddAsExample = async () => {
    if (!prompt.trim()) return;
    const result = await addExamplePrompt(prompt);
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

  const isPending = isProcessing || isGenerating;

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
            <div className="flex items-center gap-2">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
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
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="start">
                            <div className="max-w-sm text-sm p-2">
                            <h4 className="font-bold mb-2">Our 4-Step Process</h4>
                            <ol className="list-decimal list-outside space-y-2 pl-4">
                                <li>
                                <span className="font-semibold">AI Understanding:</span> We use AI to interpret your prompt, identifying the business category and extracting key data.
                                </li>
                                <li>
                                <span className="font-semibold">Rule Filtering:</span> The system intelligently fetches only the rules relevant to the identified category.
                                </li>
                                <li>
                                <span className="font-semibold">Precise Evaluation:</span> Conditions are checked using exact code logic—not AI—to ensure 100% accuracy.
                                </li>
                                <li>
                                <span className="font-semibold">Clear Actions:</span> If a rule matches, we present its pre-defined next actions for you to take.
                                </li>
                            </ol>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                        This button processes your prompt.
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>


            <div className='flex items-center gap-2'>
              <ExamplePromptsDialog onSelectPrompt={(p) => setPrompt(p)} />
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
                  Generate with AI
              </Button>
            </div>
          </div>
        </div>
        {result && <ResultDisplay result={result} onAddAsExample={handleAddAsExample} />}
      </CardContent>
    </Card>
  );
}
