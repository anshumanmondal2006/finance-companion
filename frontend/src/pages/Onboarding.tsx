import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TrendingUp, ArrowLeft, ArrowRight, Loader2, Info } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { analyzeFinances } from '@/lib/api';
import type { EmploymentStatus, GoalType, OnboardingData, UserProfile, FinancialData, GoalData } from '@/types/finance';
import { getAgeGroup } from '@/types/finance';
import { cn } from '@/lib/utils';

const STEPS = ['Personal Info', 'Income & Expenses', 'Financial Goal', 'Risk Tolerance'];

const RISK_QUESTION_DEFINITIONS = [
  {
    id: 0,
    title: "Investment Timeline",
    definition: "Used to determine your risk capacity. Longer time horizons allow recovery from market downturns, supporting higher-risk investments.",
  },
  {
    id: 1,
    title: "Market Reaction",
    definition: "Measures your emotional resilience to market volatility. Indicates whether you can stay invested during downturns—essential for long-term growth.",
  },
  {
    id: 2,
    title: "Income Stability",
    definition: "Assesses your ability to handle market risks. Stable income means you can maintain investments during downturns without forced selling.",
  },
  {
    id: 3,
    title: "Emergency Fund",
    definition: "Evaluates your financial cushion. Adequate emergency savings mean investment funds are truly long-term, supporting higher-risk strategies.",
  },
  {
    id: 4,
    title: "Investment Knowledge",
    definition: "Reflects your ability to understand and manage risk. Greater experience supports confidence in volatile, higher-return investments.",
  }
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { setOnboardingData, setAnalysisData, setAgeGroup, setIsLoading, isLoading } = useStore();
  const today = new Date().toISOString().split('T')[0];
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<UserProfile>({ name: '', dob: '', employmentStatus: 'employed' });
  const [financial, setFinancial] = useState<FinancialData>({ monthlyIncome: 0, fixedExpenses: 0, variableExpenses: 0 });
  const [goal, setGoal] = useState<GoalData>({ goalType: 'wealth',  targetAmount: 0,  timelineMonths: 12});
  const [riskAnswers, setRiskAnswers] = useState<number[]>([1, 1, 1, 1, 1]);

  const RISK_QUESTIONS = [
  { id: 0, q: "How long do you plan to invest this money?", opts: ["< 3 years", "3–5 years", "5–10 years", "> 10 years"] },
  { id: 1, q: "If your investment drops 20%, what will you do?", opts: ["Sell everything", "Sell some", "Hold and wait", "Invest more"] },
  { id: 2, q: "How stable is your income?", opts: ["Unstable", "Moderately stable", "Stable salary", "Very stable"] },
  { id: 3, q: "How many months of expenses are saved?", opts: ["< 1 month", "1–3 months", "3–6 months", "> 6 months"] },
  { id: 4, q: "How familiar are you with investing?", opts: ["Beginner", "Basic", "Some experience", "Advanced"] }
];

  const canNext = () => {
    if (step === 0) return profile.name && profile.dob;
    if (step === 1) return financial.monthlyIncome > 0;
    if (step === 2) return goal.goalType === 'wealth' || goal.targetAmount > 0;
    return true;
  };

  
const handleFinish = async () => {
  const data: OnboardingData = { profile, financial, goal, risk_answers: riskAnswers};

  setOnboardingData(data);

  const ageGroup = getAgeGroup(profile.dob);
  setAgeGroup(ageGroup);
  setIsLoading(true);

  const token = localStorage.getItem("token");

  try {

    await fetch("http://localhost:5000/api/users/onboarding", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        dob: profile.dob,
        employmentStatus: profile.employmentStatus,
        monthlyIncome: financial.monthlyIncome,
        fixedExpenses: financial.fixedExpenses,
        variableExpenses: financial.variableExpenses,
        goalType: goal.goalType,
        targetAmount: goal.targetAmount,
        timelineMonths: goal.timelineMonths,
        risk_answers: riskAnswers
      })
    });

    const analysis = await analyzeFinances(data);
    setAnalysisData(analysis);

  } catch (error) {
    console.error(error);
  } finally {
    setIsLoading(false);
    navigate("/dashboard");
  }
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">FinancePRO</span>
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Step {step + 1} of {STEPS.length}</span>
            <span>{STEPS[step]}</span>
          </div>
          <Progress value={((step + 1) / STEPS.length) * 100} className="h-2" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{STEPS[step]}</CardTitle>
            <CardDescription>
              {step === 0 && "Tell us about yourself so we can personalize your experience."}
              {step === 1 && "Help us understand your current financial situation."}
              {step === 2 && "What are you saving or investing for?"}
              {step === 3 && "How comfortable are you with investment risk?"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 0 && (
              <>
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input placeholder="John Doe" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
        
                  <Input
                  type="date"
                  max={today}
                  value={profile.dob}
                  onChange={(e) =>
                  setProfile({ ...profile, dob: e.target.value })
                  }/>
                  </div>
                 
                {/* <div className="space-y-2">
                  <Label>Employment Status</Label>
                  <Select value={profile.employmentStatus} onValueChange={(v) => setProfile({ ...profile, employmentStatus: v as EmploymentStatus })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employed">Employed</SelectItem>
                      <SelectItem value="self-employed">Self-Employed</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="unemployed">Unemployed</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                    </SelectContent>
                  </Select>
                </div> */}
              </>
            )}

            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label>Monthly Income ($)</Label>
                  <Input type="number" placeholder="5000" value={financial.monthlyIncome || ''} onChange={(e) => setFinancial({ ...financial, monthlyIncome: +e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Fixed Expenses ($)</Label>
                  <Input type="number" placeholder="2000" value={financial.fixedExpenses || ''} onChange={(e) => setFinancial({ ...financial, fixedExpenses: +e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Variable Expenses ($)</Label>
                  <Input type="number" placeholder="800" value={financial.variableExpenses || ''} onChange={(e) => setFinancial({ ...financial, variableExpenses: +e.target.value })} />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-2">
                  <Label>Goal Type</Label>
                  <Select value={goal.goalType} onValueChange={(v) => setGoal({ ...goal, goalType: v as GoalType, targetAmount: v === 'wealth' ? 0 : goal.targetAmount })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wealth">Wealth</SelectItem>
                      <SelectItem value="target">Target</SelectItem>
                     
                    </SelectContent>
                  </Select>
                </div>
                {goal.goalType !== 'wealth' && (
                  <div className="space-y-2">
                    <Label>Target Amount ($)</Label>
                    <Input type="number" placeholder="25000" value={goal.targetAmount || ''} onChange={(e) => setGoal({ ...goal, targetAmount: +e.target.value })} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Timeline (months)</Label>
                  <Input type="number" placeholder="24" value={goal.timelineMonths || ''} onChange={(e) => setGoal({ ...goal, timelineMonths: +e.target.value })} />
                </div>
              </>
            )}

           {step === 3 && (
              <TooltipProvider>
                <div className="space-y-6 py-2 max-h-[450px] overflow-y-auto pr-2">
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                    <p className="text-sm text-blue-900 dark:text-blue-200">
                      <strong>How it works:</strong> Your answers help us understand your financial situation and investment goals. Together, they create a personalized risk profile that guides your portfolio recommendations.
                    </p>
                  </div>
                  {RISK_QUESTIONS.map((item) => (
                    <div key={item.id} className="space-y-3 border-b border-muted pb-6 last:border-0">
                      <div className="flex items-start justify-between gap-2">
                        <Label className="text-sm font-semibold leading-tight flex-1">
                          {item.id + 1}. {item.q}
                        </Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="mt-1 flex-shrink-0">
                              <Info className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs">
                            <div className="space-y-2">
                              <p className="font-semibold">{RISK_QUESTION_DEFINITIONS[item.id].title}</p>
                              <p className="text-sm">{RISK_QUESTION_DEFINITIONS[item.id].definition}</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {item.opts.map((opt, idx) => {
                          const val = idx + 1;
                          const isSelected = riskAnswers[item.id] === val;
                          return (
                            <Button
                              key={idx}
                              type="button"
                              variant={isSelected ? "default" : "outline"}
                              className={cn(
                                "text-xs h-auto py-3 px-3 justify-start text-left whitespace-normal leading-snug",
                                isSelected && "ring-2 ring-primary ring-offset-1"
                              )}
                              onClick={() => {
                                const newAnswers = [...riskAnswers];
                                newAnswers[item.id] = val;
                                setRiskAnswers(newAnswers);
                              }}
                            >
                              <span className="mr-2 font-bold opacity-50">{val}.</span>
                              {opt}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </TooltipProvider>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 0}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button onClick={() => setStep(step + 1)} disabled={!canNext()}>
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleFinish} disabled={isLoading}>
                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</> : 'Get My Analysis'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;