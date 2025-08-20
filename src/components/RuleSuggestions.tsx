'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getRuleSuggestions } from '@/lib/actions';
import { Action, Condition } from '@/lib/types';
import { Loader2, Plus, Wand2 } from 'lucide-react';
import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';

type SuggestionResponse = {
  suggestedConditions: Condition[];
  suggestedActions: Action[];
};

type RuleSuggestionsProps = {
  description: string;
  onSelectCondition: (condition: Condition) => void;
  onSelectAction: (action: Action) => void;
};

export function RuleSuggestions({ description, onSelectCondition, onSelectAction }: RuleSuggestionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionResponse | null>(null);
  const { toast } = useToast();

  const handleFetchSuggestions = async () => {
    setIsLoading(true);
    setSuggestions(null);
    const result = await getRuleSuggestions(description);
    if (result.success && result.suggestions) {
      setSuggestions(result.suggestions);
    } else {
      toast({
        variant: 'destructive',
        title: 'Suggestion Error',
        description: result.error,
      });
      setIsOpen(false);
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={!description?.trim()}
          onClick={() => {
            setIsOpen(true);
            handleFetchSuggestions();
          }}
          title="Get AI Suggestions"
        >
          <Wand2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>AI-Powered Suggestions</DialogTitle>
          <DialogDescription>
            Based on your description, here are some suggested conditions and actions. Click to add them.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-full">
          <div className="p-1">
          {isLoading ? (
            <div className="flex justify-center items-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Suggested Conditions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {suggestions?.suggestedConditions.map((c, i) => (
                    <div key={`cond-${i}`} className="flex items-center justify-between p-3 border rounded-lg bg-background">
                      <div className="text-sm">
                        <Badge variant="secondary">{c.field}</Badge>
                        <span className="mx-2 font-mono">{c.operator}</span>
                        <Badge variant="outline">{String(c.value)}</Badge>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => onSelectCondition(c)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Suggested Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {suggestions?.suggestedActions.map((a, i) => (
                    <div key={`act-${i}`} className="flex items-center justify-between p-3 border rounded-lg bg-background">
                      <div className="text-sm space-y-1">
                        <p><Badge variant="secondary">{a.function}</Badge></p>
                        <p className="text-muted-foreground">{a.description}</p>
                        <pre className="text-xs bg-muted p-2 rounded-md font-mono">
                          {JSON.stringify(a.parameters, null, 2)}
                        </pre>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => onSelectAction(a)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
