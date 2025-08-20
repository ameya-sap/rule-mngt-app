import { getRules } from '@/lib/actions';
import { RuleList } from '@/components/RuleList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function Home() {
  const rules = await getRules();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Rules</CardTitle>
      </CardHeader>
      <CardContent>
        <RuleList initialRules={rules} />
      </CardContent>
    </Card>
  );
}
