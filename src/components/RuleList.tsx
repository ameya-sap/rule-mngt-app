'use client';

import * as React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { FileDown, Edit } from 'lucide-react';
import type { Rule } from '@/lib/types';
import { updateRuleStatus } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DeleteRuleDialog } from './DeleteRuleDialog';

type RuleListProps = {
  initialRules: Rule[];
};

export function RuleList({ initialRules }: RuleListProps) {
  const [rules, setRules] = React.useState(initialRules);
  const [isPending, startTransition] = React.useTransition();
  const { toast } = useToast();
  const router = useRouter();

  React.useEffect(() => {
    setRules(initialRules);
  }, [initialRules]);

  const handleStatusChange = (ruleId: string, currentStatus: 'active' | 'inactive') => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

    // Optimistic update
    setRules((prevRules) =>
      prevRules.map((rule) =>
        rule.id === ruleId ? { ...rule, status: newStatus } : rule
      )
    );

    startTransition(async () => {
      const result = await updateRuleStatus(ruleId, newStatus);
      if (!result.success) {
        // Revert optimistic update on failure
        setRules((prevRules) =>
          prevRules.map((rule) =>
            rule.id === ruleId ? { ...rule, status: currentStatus } : rule
          )
        );
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error,
        });
      } else {
        toast({
          title: 'Success',
          description: 'Rule status updated.',
        });
        router.refresh();
      }
    });
  };

  const handleExport = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(rules, null, 2))}`;
    const link = document.createElement('a');
    link.href = jsonString;
    link.download = 'rules.json';
    link.click();
  };
  
  if (rules.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        <p className="text-lg">No rules found.</p>
        <p>
          <Link href="/rules/new" className="text-primary hover:underline">Create your first rule</Link> to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" onClick={handleExport}>
          <FileDown className="mr-2 h-4 w-4" />
          Export All
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell className="font-medium">{rule.name}</TableCell>
                <TableCell className="hidden md:table-cell max-w-sm truncate">
                  {rule.description}
                </TableCell>
                <TableCell>
                  <Badge variant={rule.status === 'active' ? 'default' : 'secondary'}>
                    {rule.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={rule.status === 'active'}
                    onCheckedChange={() => handleStatusChange(rule.id!, rule.status)}
                    disabled={isPending}
                    aria-label={`Activate rule ${rule.name}`}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end items-center gap-2">
                    <Button asChild variant="ghost" size="icon">
                      <Link href={`/rules/${rule.id}/edit`}>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit Rule</span>
                      </Link>
                    </Button>
                    <DeleteRuleDialog ruleId={rule.id!} ruleName={rule.name} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
