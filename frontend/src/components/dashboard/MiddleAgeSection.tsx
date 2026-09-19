import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, GraduationCap, Landmark } from 'lucide-react';

const netWorthData = [
  { month: 'Jan', value: 120000 }, { month: 'Feb', value: 125000 }, { month: 'Mar', value: 122000 },
  { month: 'Apr', value: 130000 }, { month: 'May', value: 138000 }, { month: 'Jun', value: 145000 },
];

const MiddleAgeSection = () => {
  const retirementTarget = 1000000;
  const retirementCurrent = 340000;
  const educationTarget = 80000;
  const educationCurrent = 22000;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <Landmark className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Retirement Readiness</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${(retirementCurrent / 1000).toFixed(0)}K</div>
          <p className="text-xs text-muted-foreground mb-3">of ${(retirementTarget / 1000000).toFixed(1)}M target</p>
          <Progress value={(retirementCurrent / retirementTarget) * 100} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">{Math.round((retirementCurrent / retirementTarget) * 100)}% on track</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <GraduationCap className="h-4 w-4 text-emerald" />
          <CardTitle className="text-sm font-medium">Education Fund</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${(educationCurrent / 1000).toFixed(0)}K</div>
          <p className="text-xs text-muted-foreground mb-3">of ${(educationTarget / 1000).toFixed(0)}K target</p>
          <Progress value={(educationCurrent / educationTarget) * 100} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">{Math.round((educationCurrent / educationTarget) * 100)}% funded</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow md:col-span-2 lg:col-span-1">
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Net Worth Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={netWorthData}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip formatter={(v: number) => [`$${(v / 1000).toFixed(0)}K`, 'Net Worth']} />
              <Line type="monotone" dataKey="value" stroke="hsl(217, 71%, 45%)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default MiddleAgeSection;
