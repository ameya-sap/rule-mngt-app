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
import { importRules } from '@/lib/actions';
import { FileUp } from 'lucide-react';

export function ImportRulesDialog() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [jsonInput, setJsonInput] = React.useState('');
  const [isPending, startTransition] = React.useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const handleImport = () => {
    if (!jsonInput.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'JSON input cannot be empty.',
      });
      return;
    }

    startTransition(async () => {
      const result = await importRules(jsonInput);
      if (result.success) {
        toast({
          title: 'Success',
          description: `${result.count} rules imported successfully.`,
        });
        setJsonInput('');
        setIsOpen(false);
        router.refresh();
      } else {
        toast({
          variant: 'destructive',
          title: 'Import Failed',
          description: result.error,
        });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileUp className="mr-2 h-4 w-4" />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Rules</DialogTitle>
          <DialogDescription>
            Paste an array of rules in JSON format below. Existing rules will not be affected.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea
            placeholder='[{"name": "My Rule", ...}]'
            className="h-64"
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            disabled={isPending}
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            onClick={handleImport}
            disabled={isPending}
          >
            {isPending ? 'Importing...' : 'Import Rules'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
