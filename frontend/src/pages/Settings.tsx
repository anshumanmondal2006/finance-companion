import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/store/useStore";
import { useMemo, useState } from "react";
import type {
  EmploymentStatus,
  GoalType,
  OnboardingData,
} from "@/types/finance";
import { updateProfileRequest } from "@/lib/authApi";
import { analyzeFinances } from "@/lib/api";

const toDateInputValue = (value?: string) => {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toISOString().split("T")[0];
};

const RISK_QUESTIONS = [
  {
    q: "How long do you plan to invest this money?",
    opts: ["< 3 years", "3-5 years", "5-10 years", "> 10 years"],
  },
  {
    q: "If your investment drops 20%, what will you do?",
    opts: ["Sell everything", "Sell some", "Hold and wait", "Invest more"],
  },
  {
    q: "How stable is your income?",
    opts: ["Unstable", "Moderately stable", "Stable salary", "Very stable"],
  },
  {
    q: "How many months of expenses are saved?",
    opts: ["< 1 month", "1-3 months", "3-6 months", "> 6 months"],
  },
  {
    q: "How familiar are you with investing?",
    opts: ["Beginner", "Basic", "Some experience", "Advanced"],
  },
];

const SettingsPage = () => {
  const {
    user,
    onboardingData,
    authToken,
    login,
    setOnboardingData,
    setAnalysisData,
  } = useStore();

  const initialData = useMemo<OnboardingData>(
    () => ({
      profile: {
        name: onboardingData?.profile.name || user?.name || "",
        dob: toDateInputValue(onboardingData?.profile.dob),
        employmentStatus:
          onboardingData?.profile.employmentStatus || "employed",
      },
      financial: {
        monthlyIncome: onboardingData?.financial.monthlyIncome || 0,
        fixedExpenses: onboardingData?.financial.fixedExpenses || 0,
        variableExpenses: onboardingData?.financial.variableExpenses || 0,
      },
      goal: {
        goalType: onboardingData?.goal.goalType || "wealth",
        targetAmount: onboardingData?.goal.targetAmount || 0,
        timelineMonths: onboardingData?.goal.timelineMonths || 12,
      },
      risk_answers: onboardingData?.risk_answers || [1, 1, 1, 1, 1],
    }),
    [onboardingData, user?.name],
  );

  const [form, setForm] = useState<OnboardingData>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | null>(
    null,
  );

  const handleRiskChange = (index: number, value: number) => {
    const updated = [...form.risk_answers];
    updated[index] = value;
    setForm({ ...form, risk_answers: updated });
  };

  const handleSave = async () => {
    if (!authToken || !user) {
      setStatusType("error");
      setStatus("You are not authenticated. Please log in again.");
      return;
    }

    if (!form.profile.name.trim() || !form.profile.dob) {
      setStatusType("error");
      setStatus("Name and date of birth are required.");
      return;
    }

    setIsSaving(true);
    setStatus(null);
    setStatusType(null);

    try {
      const updatedUser = await updateProfileRequest(authToken, {
        name: form.profile.name,
        dob: form.profile.dob,
        employmentStatus: form.profile.employmentStatus,
        monthlyIncome: form.financial.monthlyIncome,
        fixedExpenses: form.financial.fixedExpenses,
        variableExpenses: form.financial.variableExpenses,
        goalType: form.goal.goalType,
        targetAmount: form.goal.targetAmount,
        timelineMonths: form.goal.timelineMonths,
        risk_answers: form.risk_answers,
      });

      setOnboardingData(form);

      // Keep auth user details in sync for UI that reads from store.user
      login(
        {
          id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role || user.role,
        },
        authToken,
      );

      // Refresh dashboard analysis with updated profile inputs
      const analysis = await analyzeFinances(form);
      setAnalysisData(analysis);

      setStatusType("success");
      setStatus("Profile updated successfully.");
    } catch (error) {
      setStatusType("error");
      setStatus(
        error instanceof Error ? error.message : "Failed to update profile.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-6xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Profile Settings</h2>
        <p className="text-muted-foreground">
          Update your onboarding profile details
        </p>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-base">Profile Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={form.profile.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  profile: { ...form.profile, name: e.target.value },
                })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled />
          </div>

          <div className="space-y-2">
            <Label>Date of Birth</Label>
            <Input
              type="date"
              value={form.profile.dob}
              onChange={(e) =>
                setForm({
                  ...form,
                  profile: { ...form.profile, dob: e.target.value },
                })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Employment Status</Label>
            <Select
              value={form.profile.employmentStatus}
              onValueChange={(v) =>
                setForm({
                  ...form,
                  profile: {
                    ...form.profile,
                    employmentStatus: v as EmploymentStatus,
                  },
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employed">Employed</SelectItem>
                <SelectItem value="self-employed">Self-Employed</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="unemployed">Unemployed</SelectItem>
                <SelectItem value="retired">Retired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Monthly Income</Label>
              <Input
                type="number"
                value={form.financial.monthlyIncome || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    financial: {
                      ...form.financial,
                      monthlyIncome: Number(e.target.value) || 0,
                    },
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Fixed Expenses</Label>
              <Input
                type="number"
                value={form.financial.fixedExpenses || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    financial: {
                      ...form.financial,
                      fixedExpenses: Number(e.target.value) || 0,
                    },
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Variable Expenses</Label>
              <Input
                type="number"
                value={form.financial.variableExpenses || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    financial: {
                      ...form.financial,
                      variableExpenses: Number(e.target.value) || 0,
                    },
                  })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

            <div className="space-y-2">
              <Label>Target Amount</Label>
              <Input
                type="number"
                value={form.goal.targetAmount || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    goal: {
                      ...form.goal,
                      targetAmount: Number(e.target.value) || 0,
                    },
                  })
                }
                disabled={form.goal.goalType === "wealth"}
              />
            </div>

            <div className="space-y-2">
              <Label>Timeline (months)</Label>
              <Input
                type="number"
                value={form.goal.timelineMonths || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    goal: {
                      ...form.goal,
                      timelineMonths: Number(e.target.value) || 0,
                    },
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Risk Tolerance</Label>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {RISK_QUESTIONS.map((item, idx) => (
                <div key={idx} className="space-y-2">
                  <Label>
                    {idx + 1}. {item.q}
                  </Label>
                  <Select
                    value={String(form.risk_answers[idx] ?? 1)}
                    onValueChange={(value) =>
                      handleRiskChange(idx, Number(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {item.opts.map((option, optionIdx) => (
                        <SelectItem key={option} value={String(optionIdx + 1)}>
                          {optionIdx + 1}. {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          {status && (
            <p
              className={
                statusType === "error"
                  ? "text-sm text-destructive"
                  : "text-sm text-emerald-600"
              }
            >
              {status}
            </p>
          )}

          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
