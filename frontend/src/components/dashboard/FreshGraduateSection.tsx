import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Lightbulb, GraduationCap, Wallet } from 'lucide-react';

const FreshGraduateSection = () => {
  const emergencyTarget = 10000;
  const emergencyCurrent = 3200;
  const loanBalance = 28000;
  const loanPaid = 12000;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <Wallet className="h-4 w-4 text-emerald" />
          <CardTitle className="text-sm font-medium">Emergency Fund</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${emergencyCurrent.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mb-3">of ${emergencyTarget.toLocaleString()} target</p>
          <Progress value={(emergencyCurrent / emergencyTarget) * 100} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">{Math.round((emergencyCurrent / emergencyTarget) * 100)}% funded</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <GraduationCap className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Student Loan Payoff</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${(loanBalance - loanPaid).toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mb-3">remaining of ${loanBalance.toLocaleString()}</p>
          <Progress value={(loanPaid / loanBalance) * 100} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">{Math.round((loanPaid / loanBalance) * 100)}% paid off</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow md:col-span-2 lg:col-span-1">
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <Lightbulb className="h-4 w-4 text-amber" />
          <CardTitle className="text-sm font-medium">Getting Started Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {['Set up automatic savings transfers', 'Build 3-6 months of expenses in reserves', 'Start investing early — time is your advantage'].map((tip) => (
            <div key={tip} className="flex items-start gap-2 text-sm">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
              <span className="text-muted-foreground">{tip}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default FreshGraduateSection;
