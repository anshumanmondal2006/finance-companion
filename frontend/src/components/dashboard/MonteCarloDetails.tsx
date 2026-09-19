import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Info } from 'lucide-react';
import { Tooltip as UiTooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { MonteCarloResult, MonteCarloRawData } from '@/types/finance';

interface MonteCarloDetailsProps {
  mcData: MonteCarloResult;
  mcRawData?: MonteCarloRawData;
}

export default function MonteCarloDetails({ mcRawData }: MonteCarloDetailsProps) {
  if (!mcRawData) return null;

  const { summary, percentiles, total_simulations } = mcRawData;

  // Build percentile breakdown data for visualization
  const percentileData = [
    { name: 'P10', value: percentiles.p10 },
    { name: 'P25', value: percentiles.p25 },
    { name: 'P50', value: percentiles.p50 },
    { name: 'P75', value: percentiles.p75 },
    { name: 'P90', value: percentiles.p90 },
  ];

  return (
    <div className="space-y-4">
      {/* Summary Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Simulation Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Mean Final Value</p>
              <p className="text-sm font-semibold">${Math.round(summary.mean).toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Median (P50)</p>
              <p className="text-sm font-semibold">${Math.round(summary.median).toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Standard Deviation</p>
              <p className="text-sm font-semibold">${Math.round(summary.std_dev).toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Success Probability</p>
              <p className="text-sm font-semibold">{Math.round(summary.success_probability * 100)}%</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Worst Case (P10)</p>
              <p className="text-sm font-semibold">${Math.round(summary.worst_case).toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Best Case (P90)</p>
              <p className="text-sm font-semibold">${Math.round(summary.best_case).toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total Simulations</p>
              <p className="text-sm font-semibold">{total_simulations.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Percentile Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base inline-flex items-center gap-1.5">
            Confidence Levels Breakdown
            <UiTooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground hover:text-foreground" aria-label="Confidence Levels Breakdown help">
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" align="start" className="max-w-xs text-xs">
                Percentile bars of final wealth: P10 (stress), P50 (median), and P90 (upside).
              </TooltipContent>
            </UiTooltip>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={percentileData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Final Value']} />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Simulation Explanation */}
      <Card className="bg-muted/30 border-none shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">How To Interpret This Simulation</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-3 text-muted-foreground">
          <p>
            <strong>Confidence levels:</strong> P10 is the stress-case outcome, P50 is the midpoint outcome, and P90 is the upside outcome. These are not guarantees, they are probability-based ranges.
          </p>
          <p>
            <strong>Success probability:</strong> Out of {total_simulations.toLocaleString()} simulated market paths, this is the percentage that reached your inflation-adjusted goal by the end of the timeline.
          </p>
          <p>
            <strong>How to improve outcomes:</strong> Increase monthly SIP, extend timeline, reduce target, or lower expected inflation assumptions. Even small changes can materially improve probability.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
