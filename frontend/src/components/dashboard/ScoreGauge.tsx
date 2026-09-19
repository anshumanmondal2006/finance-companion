import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

interface ScoreGaugeProps {
  score: number;
  size?: number;
}

const ScoreGauge = ({ score, size = 180 }: ScoreGaugeProps) => {
  const color = score >= 80 ? 'hsl(160, 60%, 45%)' : score >= 60 ? 'hsl(38, 92%, 50%)' : 'hsl(0, 72%, 51%)';
  const data = [
    { value: score, fill: color },
    { value: 100 - score, fill: 'hsl(210, 15%, 93%)' },
  ];

  const getHealthStatus = (score: number): string => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    return 'Needs Improvement';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative flex items-center justify-center cursor-help" style={{ width: size, height: size }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius="70%" outerRadius="90%" startAngle={90} endAngle={-270} stroke="none">
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center">
              <div className="text-3xl font-bold">{score}</div>
              <div className="text-xs text-muted-foreground">Health Score</div>
              <Info className="w-3 h-3 mt-1 text-muted-foreground" />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-2">
            <p className="font-semibold">Financial Health Score</p>
            <p className="text-sm">Your score ({getHealthStatus(score)}): <strong>{score}/100</strong></p>
            <div className="text-sm space-y-1 mt-2">
              <p className="font-medium">Calculated based on:</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs">
                <li>Savings rate (% of income saved)</li>
                <li>Expense-to-income ratio</li>
                <li>Budget allocation efficiency</li>
                <li>Financial goal progress</li>
              </ul>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Higher scores indicate better financial health and stability.
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ScoreGauge;
