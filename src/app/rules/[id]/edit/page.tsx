import { getRule } from '@/lib/actions';
import { RuleForm } from '@/components/RuleForm';
import { notFound } from 'next/navigation';

type EditRulePageProps = {
  params: {
    id: string;
  };
};

export default async function EditRulePage({ params }: EditRulePageProps) {
  const rule = await getRule(params.id);

  if (!rule) {
    notFound();
  }

  return <RuleForm rule={rule} />;
}
