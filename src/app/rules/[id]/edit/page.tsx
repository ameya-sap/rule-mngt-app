import { getRule } from '@/lib/actions';
import { RuleForm } from '@/components/RuleForm';
import { notFound } from 'next/navigation';

type EditRulePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditRulePage(props: EditRulePageProps) {
  const params = await props.params;
  const rule = await getRule(params.id);

  if (!rule) {
    notFound();
  }

  return <RuleForm rule={rule} />;
}
