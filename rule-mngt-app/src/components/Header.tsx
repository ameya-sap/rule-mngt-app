import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldCheck, PlusCircle } from 'lucide-react';
import { ImportRulesDialog } from './ImportRulesDialog';
import { GenerateRuleDialog } from './GenerateRuleDialog';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <span className="font-bold sm:inline-block">RuleMaster</span>
        </Link>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <ImportRulesDialog />
          <GenerateRuleDialog />
          <Button asChild>
            <Link href="/rules/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              New Rule
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
