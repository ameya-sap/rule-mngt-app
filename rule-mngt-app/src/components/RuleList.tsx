'use client';

import * as React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { FileDown, Edit } from 'lucide-react';
import type { Rule } from '@/lib/types';
import { updateRuleStatus } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DeleteRuleDialog } from './DeleteRuleDialog';
import { RuleExplanationDialog } from './RuleExplanationDialog';

type RuleListProps = {
  initialRules: Rule[];
};

export function RuleList({ initialRules }: RuleListProps) {
  const [rules, setRules] = React.useState(initialRules);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [isPending, startTransition] = React.useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const ITEMS_PER_PAGE = 10;

  React.useEffect(() => {
    setRules(initialRules);
  }, [initialRules]);

  // Reset page when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredRules = React.useMemo(() => {
    return rules.filter(rule =>
      rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.businessCategory.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [rules, searchTerm]);

  const totalPages = Math.ceil(filteredRules.length / ITEMS_PER_PAGE);
  const paginatedRules = filteredRules.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

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
      <div className="flex justify-between items-center gap-4">
        <div className="relative w-full max-w-sm">
          {/* Placeholder for Search Icon if needed, or just standard input */}
          <Input
            placeholder="Search rules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
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
              <TableHead className="hidden md:table-cell">Category</TableHead>
              <TableHead className="hidden md:table-cell">Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRules.length > 0 ? (
              paginatedRules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.name}</TableCell>
                  <TableCell className="hidden md:table-cell">{rule.businessCategory}</TableCell>
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
                    <div className="flex justify-end items-center gap-1">
                      <RuleExplanationDialog rule={rule} />
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
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
