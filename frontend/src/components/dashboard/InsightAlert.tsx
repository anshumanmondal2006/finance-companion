import { cn } from '@/lib/utils';
import type { Insight } from '@/types/finance';
import { Lightbulb, AlertTriangle, Trophy } from 'lucide-react';

const icons = { tip: Lightbulb, warning: AlertTriangle, achievement: Trophy };
const styles = {
  tip: 'border-primary/20 bg-primary/5',
  warning: 'border-amber/20 bg-amber/5',
  achievement: 'border-emerald/20 bg-emerald/5',
};
const iconStyles = {
  tip: 'text-primary',
  warning: 'text-amber',
  achievement: 'text-emerald',
};

const InsightAlert = ({ insight }: { insight: Insight }) => {
  const Icon = icons[insight.type];
  return (
    <div className={cn('flex gap-3 rounded-lg border p-4', styles[insight.type])}>
      <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', iconStyles[insight.type])} />
      <div>
        <div className="font-medium text-sm">{insight.title}</div>
        <div className="text-sm text-muted-foreground mt-0.5">{insight.message}</div>
      </div>
    </div>
  );
};

export default InsightAlert;
