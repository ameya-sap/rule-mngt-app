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
import { Library, Loader2, Plus, Trash2 } from 'lucide-react';
import type { ExamplePrompt } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';

type ExamplePromptsDialogProps = {
  onSelectPrompt: (prompt: string) => void;
  getPrompts: () => Promise<ExamplePrompt[]>;
  deletePrompt: (id: string) => Promise<{ success: boolean; error?: string }>;
  dialogTitle: string;
  dialogDescription: string;
};

export function ExamplePromptsDialog({
  onSelectPrompt,
  getPrompts,
  deletePrompt,
  dialogTitle,
  dialogDescription
}: ExamplePromptsDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [prompts, setPrompts] = React.useState<ExamplePrompt[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

  const fetchPrompts = async () => {
    setIsLoading(true);
    const fetchedPrompts = await getPrompts();
    setPrompts(fetchedPrompts);
    setIsLoading(false);
  };
  
  React.useEffect(() => {
    if (isOpen) {
      fetchPrompts();
    }
  }, [isOpen]);

  const handleSelect = (prompt: string) => {
    onSelectPrompt(prompt);
    setIsOpen(false);
  };

  const handleDelete = async (id: string) => {
    const result = await deletePrompt(id);
    if (result.success) {
      toast({ title: 'Success', description: 'Example prompt deleted.' });
      fetchPrompts(); // Refresh list
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Library className="mr-2 h-4 w-4" />
          Browse Examples
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {dialogDescription}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0">
            <ScrollArea className="h-full">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : prompts.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        No example prompts saved yet.
                    </div>
                ) : (
                    <div className="space-y-2 p-1">
                    {prompts.map((p) => (
                        <div key={p.id} className="flex items-start gap-2 rounded-lg border p-3">
                            <pre className="flex-1 whitespace-pre-wrap break-words font-sans text-sm">{p.prompt}</pre>
                            <div className='flex flex-col gap-1'>
                                <Button size="sm" variant="outline" onClick={() => handleSelect(p.prompt)}>
                                    <Plus className="mr-2 h-4 w-4" /> Use
                                </Button>
                                <Button size="sm" variant="destructive-outline" onClick={() => handleDelete(p.id)}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </Button>
                            </div>
                        </div>
                    ))}
                    </div>
                )}
            </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
