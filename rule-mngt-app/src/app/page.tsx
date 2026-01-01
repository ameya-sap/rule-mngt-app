import { getRules } from '@/lib/actions';
import { RuleList } from '@/components/RuleList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RuleTester } from '@/components/RuleTester';
import { Separator } from '@/components/ui/separator';


export default async function Home() {
  const rules = await getRules();

  return (
    <div className="space-y-8">

      <RuleTester />
      <Card>
        <CardHeader>
          <CardTitle>Business Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <RuleList initialRules={rules} />
        </CardContent>
      </Card>
    </div>
  );
}
