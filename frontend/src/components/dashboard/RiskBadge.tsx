import { cn } from '@/lib/utils';
import type { RiskLevel } from '@/types/finance';
import { Shield } from 'lucide-react';

const colors: Record<RiskLevel, string> = {
  Conservative: 'bg-emerald/10 text-emerald border-emerald/20',
  Moderate: 'bg-amber/10 text-amber border-amber/20',
  Aggressive: 'bg-destructive/10 text-destructive border-destructive/20',
};

const RiskBadge = ({ level }: { level: RiskLevel }) => (
  <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium', colors[level])}>
    <Shield className="h-3.5 w-3.5" />
    {level}
  </span>
);

export default RiskBadge;
