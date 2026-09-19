import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Landmark, FileText, HeartPulse } from 'lucide-react';

const estateItems = [
  { label: 'Will updated', checked: true },
  { label: 'Power of attorney assigned', checked: true },
  { label: 'Beneficiaries reviewed', checked: false },
  { label: 'Healthcare directive filed', checked: false },
];

const ElderlySection = ({ ageGroup }: { ageGroup?: string }) => {
  const withdrawalRate = 3.8;
  const sustainabilityYears = 28;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <Landmark className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Withdrawal Strategy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{withdrawalRate}%</div>
          <p className="text-xs text-muted-foreground mb-3">annual withdrawal rate</p>
          <div className="rounded-lg bg-emerald/10 p-3">
            <p className="text-sm text-emerald font-medium">✓ Within safe range</p>
            <p className="text-xs text-muted-foreground mt-1">Recommended: 3-4% for sustainability</p>
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <FileText className="h-4 w-4 text-amber" />
          <CardTitle className="text-sm font-medium">Estate Planning</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {estateItems.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <Checkbox checked={item.checked} disabled />
              <span className="text-sm text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow md:col-span-2 lg:col-span-1">
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <HeartPulse className="h-4 w-4 text-emerald" />
          <CardTitle className="text-sm font-medium">Income Sustainability</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{sustainabilityYears} years</div>
          <p className="text-xs text-muted-foreground mb-3">estimated portfolio lifespan</p>
          <Progress value={Math.min(100, (sustainabilityYears / 35) * 100)} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">{Math.round((sustainabilityYears / 35) * 100)}% of 35-year target</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ElderlySection;
