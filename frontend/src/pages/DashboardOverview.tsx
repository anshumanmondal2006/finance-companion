import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { DollarSign, TrendingUp, Wallet, Shield, Download } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useStore } from "@/store/useStore";
import { analyzeFinances } from "@/lib/api";
import type { RecommendResponse } from "@/lib/api";
import { downloadFinancialHealthReport } from "@/lib/report";

import StatCard from "@/components/dashboard/StatCard";
import ChartCard from "@/components/dashboard/ChartCard";
import ScoreGauge from "@/components/dashboard/ScoreGauge";
import InsightAlert from "@/components/dashboard/InsightAlert";
import FinancialNews from "@/components/dashboard/FinancialNews";
import GettingStarted from "@/components/dashboard/GettingStarted";
import NominationManager from "@/components/dashboard/NominationManager";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

// Helper function to check if user is old age (60+)
const isElderly = (dobString: string): boolean => {
  const dob = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  
  return age >= 60;
};

const DashboardOverview = () => {
  const {
    analysisData,
    isLoading,
    onboardingData,
    setOnboardingData,
    authToken,
    user,
    userEmail,
    isHydrated,
    setIsHydrated,
  } = useStore();

  const [isReportDownloading, setIsReportDownloading] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      // 1. If we already have data in the store, we're done
      if (onboardingData) {
        setIsHydrated(true);
        return;
      }

      // 2. If there's no token, we can't fetch, so we're done
      if (!authToken) {
        setIsHydrated(true);
        return;
      }

      try {
        const res = await fetch("http://localhost:5000/api/users/me", {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        const { user } = await res.json();

        // 3. Only restore if the user has actually completed onboarding
        if (user && user.monthlyIncome) {
          const restoredData = {
            profile: {
              name: user.name,
              dob: user.dob,
              employmentStatus: user.employmentStatus,
            },
            financial: {
              monthlyIncome: user.monthlyIncome,
              fixedExpenses: user.fixedExpenses,
              variableExpenses: user.variableExpenses,
            },
            goal: {
              goalType: user.goalType,
              targetAmount: user.targetAmount,
              timelineMonths: user.timelineMonths,
            },
            risk_answers: user.risk_answers || [1, 1, 1, 1, 1],
          };

          setOnboardingData(restoredData);

          // Trigger the AI analysis so the dashboard isn't empty
          const analysis = await analyzeFinances(restoredData);
          useStore.getState().setAnalysisData(analysis);
        }
      } catch (err) {
        console.error("Session restoration failed:", err);
      } finally {
        // 4. This is the "Switch" that allows the dashboard to show
        setIsHydrated(true);
      }
    };

    loadUser();
  }, [authToken, onboardingData, setOnboardingData, setIsHydrated]);
  const {
    analysisData: currentAnalysis,
    isLoading: loading,
    onboardingData: currentOnboarding,
  } = useStore();

  const handleDownloadReport = async () => {
    if (!currentOnboarding) return;

    const recommendationStorageKey = `investment_recommendation:${user?.id || userEmail || "anonymous"}`;
    let recommendation: RecommendResponse | null = null;

    try {
      const storedRecommendation = localStorage.getItem(
        recommendationStorageKey,
      );
      if (storedRecommendation) {
        recommendation = JSON.parse(storedRecommendation) as RecommendResponse;
      }
    } catch {
      recommendation = null;
    }

    try {
      setIsReportDownloading(true);
      await downloadFinancialHealthReport({
        userName: user?.name || currentOnboarding.profile.name,
        onboardingData: currentOnboarding,
        analysisData: currentAnalysis,
        recommendation,
      });
    } finally {
      setIsReportDownloading(false);
    }
  };

  // if (!currentOnboarding) return <Navigate to="/onboarding" replace />;
  // A. First check: Are we still waiting for the backend?
  if (!isHydrated) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading your profile...
          </p>
        </div>
      </div>
    );
  }

  // B. Second check: We are done loading, but is the data actually there?
  // If not, NOW it is safe to redirect to onboarding.
  if (!onboardingData) {
    return <Navigate to="/onboarding" replace />;
  }

  const income = currentOnboarding.financial.monthlyIncome || 0;

  const expenses =
    (currentOnboarding.financial.fixedExpenses || 0) +
    (currentOnboarding.financial.variableExpenses || 0);

  const savings = income - expenses;

  const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;

  const savingsForChart = Math.max(savings, 0);
  const totalForChart = income + Math.max(expenses, 0) + savingsForChart || 1;

  const budgetChartData =
    totalForChart > 0
      ? [
          {
            name: "Income",
            percentage: Math.round((income / totalForChart) * 100),
            color: "hsl(217, 71%, 45%)",
          },
          {
            name: "Expenses",
            percentage: Math.round(
              (Math.max(expenses, 0) / totalForChart) * 100,
            ),
            color: "hsl(340, 60%, 50%)",
          },
          {
            name: "Savings",
            percentage: Math.round((savingsForChart / totalForChart) * 100),
            color: "hsl(160, 60%, 45%)",
          },
        ]
      : [];
  const calculateProfileFromAnswers = (answers: number[]) => {
    const avg = answers.reduce((a, b) => a + b, 0) / answers.length;
    if (avg <= 1.5) return "Conservative";
    if (avg <= 3) return "Moderate";
    return "Aggressive";
  };
  // Risk Profile determination
  const riskProfile =
    currentAnalysis?.riskProfile ??
    (currentOnboarding?.risk_answers
      ? calculateProfileFromAnswers(currentOnboarding.risk_answers)
      : "Moderate");

  if (loading && !currentAnalysis) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const analysis = currentAnalysis;

  if (!analysis) {
    // If we still don't have analysis, keep showing the basic stats
    // and CTA but skip charts/insights
  }

  // Determine if user is elderly (51+) for nomination manager
  const showNominationManager = currentOnboarding?.profile?.dob 
    ? isElderly(currentOnboarding.profile.dob) 
    : false;

   return (
  <div className="w-full pl-4 md:pl-8 pr-4 md:pr-6 py-6 min-h-screen">
      
      {/* ===== UNIFIED TOP BAR (5 COLUMNS) ===== */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 mb-8 items-stretch">
        <StatCard
          title="Monthly Income"
          value={`$${income.toLocaleString()}`}
          icon={DollarSign}
        />
        <StatCard
          title="Total Expenses"
          value={`$${expenses.toLocaleString()}`}
          icon={Wallet}
          subtitle={
            income > 0
              ? `${Math.round((expenses / income) * 100)}% of income`
              : undefined
          }
        />
        <StatCard
          title="Savings Rate"
          value={`${savingsRate}%`}
          icon={TrendingUp}
          subtitle={`$${savings.toLocaleString()} saved`}
        />
        <StatCard title="Risk Profile" value={riskProfile} icon={Shield} />

      
     <Button
  onClick={handleDownloadReport}
  disabled={isReportDownloading || !currentOnboarding}
  className="
    flex flex-row items-center justify-center gap-2 
    h-14 w-full min-h-0
    bg-white text-[#2563eb] font-bold
    rounded-full border-none 
    shadow-[0_0_20px_rgba(139,92,246,0.25)] 
    hover:shadow-[0_0_25px_rgba(139,92,246,0.45)] 
    /* Force background to stay pure white on hover */
    hover:bg-white 
    transition-all duration-300
    lg:m-auto
    overflow-hidden px-4
  "
>
  {isReportDownloading ? (
    <>
      <Loader2 className="h-5 w-5 animate-spin text-[#2563eb] shrink-0" />
      <span className="text-sm font-bold text-[#2563eb]">Preparing...</span>
    </>
  ) : (
    <>
      <Download className="h-5 w-5 text-[#2563eb] shrink-0" />
      <span className="
        text-xs sm:text-sm md:text-base 
        font-bold text-[#2563eb] 
        tracking-tight text-center leading-tight 
        line-clamp-2 break-words flex-1
      ">
        Download Financial Health Report
      </span>
    </>
  )}
</Button>
      </div>

      {/* Main Layout Grid - Starts Here */}
      <div className="space-y-6 md:grid md:grid-cols-3 md:gap-6">
        
        {/* Main Content Area (Left 2 Columns) */}
        <div className="space-y-6 md:col-span-2">

          {/* ===== RUN ANALYSIS CTA ===== */}
          {!analysis && (
            <div className="bg-muted rounded-lg p-6 border flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-lg">
                  Run AI Portfolio Analysis
                </h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Generate personalized portfolio allocation and financial
                  insights.
                </p>
              </div>
              <button className="px-4 py-2 bg-primary text-white rounded-md">
                Run Analysis
              </button>
            </div>
          )}

          {/* ===== CHARTS (ONLY AFTER ANALYSIS) ===== */}
          {analysis && budgetChartData.length > 0 && (
            <>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
    
    {/* Left Column: Health Score Card */}
    <div className="bg-white rounded-xl border p-6 flex flex-col items-center justify-center shadow-sm h-full">
      <div className="w-full flex justify-between items-center mb-4">
        <h3 className="font-bold text-md text-gray-700">Financial Health</h3>
      </div>
      {/* <div className="flex-grow flex items-center justify-center py-4">
        <ScoreGauge score={analysis.healthScore} />
      </div> */}
      <div className="flex-grow flex items-center justify-center py-8">
    <div className="scale-125 transform transition-transform duration-500 hover:scale-[1.55]">
      <ScoreGauge score={analysis.healthScore} />
    </div>
  </div>
      <p className="text-xs text-muted-foreground mt-2 text-center">
        Your score is based on your current savings and risk profile.
      </p>
    </div>

    {/* Right Column: Budget Allocation Card */}
    <ChartCard
      title="Budget Allocation"
      subtitle="Income vs expenses vs savings"
      className="h-full"
    >
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={budgetChartData}
              dataKey="percentage"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={85}
              paddingAngle={5}
              stroke="none"
            >
              {budgetChartData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {budgetChartData.map((cat) => (
          <div key={cat.name} className="flex items-center gap-1.5 text-xs">
            <div
              className="h-3 w-3 rounded-full shrink-0"
              style={{ background: cat.color }}
            />
            <span className="font-medium text-gray-600">
              {cat.name} ({cat.percentage}%)
            </span>
          </div>
        ))}
      </div>
    </ChartCard>
  </div>

              {/* Insights Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4">AI Insights</h3>
                <div className="grid gap-3 md:grid-cols-3">
                  {analysis.insights.map((insight, i) => (
                    <InsightAlert key={i} insight={insight} />
                  ))}
                </div>
              </div>
            </>
          )}

         {/* ===== GETTING STARTED ===== */}
          <GettingStarted />
        </div>

        {/* ===== SIDEBAR (Right 1 Column) ===== */}
        <div className="space-y-6">
          {/* Nomination Manager for Elderly Users Only */}
          {showNominationManager && (
            <NominationManager ageGroup="elderly" />
          )}
          
          {/* Financial News */}
          <FinancialNews />
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;