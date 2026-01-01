'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getRuleExplanation } from '@/lib/actions';
import { Loader2, MessageSquareText } from 'lucide-react';
import type { Rule } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';

type RuleExplanationDialogProps = {
  rule: Rule;
};

export function RuleExplanationDialog({ rule }: RuleExplanationDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [explanation, setExplanation] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

  const handleFetchExplanation = async () => {
    if (!isOpen) return; // Only fetch when opening
    
    setIsLoading(true);
    setExplanation('');

    const result = await getRuleExplanation(rule);

    if (result.success && result.explanation) {
      setExplanation(result.explanation);
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.error,
      });
      setIsOpen(false); // Close dialog on error
    }
    setIsLoading(false);
  };
  
  React.useEffect(() => {
    handleFetchExplanation();
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
            <MessageSquareText className="h-4 w-4" />
            <span className="sr-only">Explain Rule</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Rule Explanation: <span className="text-primary">{rule.name}</span></DialogTitle>
          <DialogDescription>
            An AI-generated summary of what this rule does in plain English.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 min-h-[150px]">
            {isLoading ? (
                <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <p className="text-sm leading-relaxed text-foreground bg-secondary/50 p-4 rounded-md">
                    {explanation}
                </p>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
