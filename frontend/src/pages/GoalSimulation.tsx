import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useStore } from "@/store/useStore";
import { Navigate, useLocation } from "react-router-dom";
import { recommendInvestments } from "@/lib/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import MonteCarloDetails from "@/components/dashboard/MonteCarloDetails";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  BarChart3,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Info,
  CheckCircle2,
  RotateCcw,
  Zap,
  Lightbulb,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { MonteCarloResult, MonteCarloRawData } from "@/types/finance";

type SimulationRunResult = {
  newMC: MonteCarloResult;
  rawMC: MonteCarloRawData;
};

type ProfileDefaults = {
  monthlyIncome?: number;
  fixedExpenses?: number;
  variableExpenses?: number;
  timelineMonths?: number;
  targetAmount?: number;
};

type InvestmentDefaults = {
  expectedReturnPct?: number;
  volatilityPct?: number;
};

type SimulationPrefillState = {
  prefill?: {
    contribution?: number;
    expectedReturns?: number;
    timeline?: number;
    targetAmount?: number;
    inflation?: number;
    source?: "investment" | "retirement";
  };
};

let activeSimulationPromise: Promise<SimulationRunResult> | null = null;

// Helper for animated counters
const AnimatedValue = ({
  value,
  label = "",
  prefix = "",
  suffix = "",
}: {
  value: number;
  label?: string;
  prefix?: string;
  suffix?: string;
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) return;

    const totalDuration = 1000;
    const increment = end / (totalDuration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <div className="flex flex-col">
      {label && <p className="text-xs text-muted-foreground">{label}</p>}
      <p className="text-2xl font-bold">
        {prefix}
        {displayValue.toLocaleString()}
        {suffix}
      </p>
    </div>
  );
};

const GoalSimulation = () => {
  const {
    onboardingData,
    authToken,
    analysisData,
    setAnalysisData,
    user,
    userEmail,
  } = useStore();
  const location = useLocation();
  const isMountedRef = useRef(true);
  const didHydrateFromProfileRef = useRef(false);
  const didHydrateFromInvestmentRef = useRef(false);
  const didApplyDefaultSipRef = useRef(false);
  const didCalibrateSipRef = useRef(false);
  const didAutoRunRef = useRef(false);
  const [profileDefaults, setProfileDefaults] =
    useState<ProfileDefaults | null>(null);
  const [investmentDefaults, setInvestmentDefaults] =
    useState<InvestmentDefaults | null>(null);

  // Default values
  const defaultContribution = onboardingData
    ? Math.round(
        (onboardingData.financial.monthlyIncome -
          onboardingData.financial.fixedExpenses -
          onboardingData.financial.variableExpenses) *
          0.5,
      )
    : 500;
  const defaultTimeline = onboardingData?.goal.timelineMonths || 24;
  const defaultReturns = 10;
  const defaultVolatility = 15;
  const defaultSimulations = 1000;
  const defaultInflation = 6;
  const defaultTargetAmount =
    onboardingData?.goal.targetAmount && onboardingData.goal.targetAmount > 0
      ? onboardingData.goal.targetAmount
      : 20000;

  // State
  const [contribution, setContribution] = useState(defaultContribution);
  const [timeline, setTimeline] = useState(defaultTimeline);
  const [expectedReturns, setExpectedReturns] = useState(defaultReturns);
  const [volatility, setVolatility] = useState(defaultVolatility);
  const [simulations, setSimulations] = useState(defaultSimulations);
  const [inflation, setInflation] = useState(defaultInflation);
  const [targetAmount, setTargetAmount] = useState(defaultTargetAmount);

  const [currentMC, setCurrentMC] = useState<MonteCarloResult | undefined>(
    undefined,
  );
  const [rawMCData, setRawMCData] = useState<MonteCarloRawData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const prefill = (location.state as SimulationPrefillState | null)?.prefill;
  const hasPrefill = Boolean(prefill);

  const persistMonteCarloResult = useCallback(
    (mc: MonteCarloResult) => {
      if (!analysisData) return;
      setAnalysisData({ ...analysisData, monteCarlo: mc });
    },
    [analysisData, setAnalysisData],
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (hasPrefill) {
      didHydrateFromProfileRef.current = true;
      return;
    }

    if (!authToken) {
      return;
    }

    const APP_API_BASE_URL =
      import.meta.env.VITE_APP_BACKEND_URL || "http://localhost:5000";

    fetch(`${APP_API_BASE_URL}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Profile fetch failed");
        }
        return res.json();
      })
      .then((data) => {
        if (!isMountedRef.current) return;
        const u = data?.user ?? {};
        setProfileDefaults({
          monthlyIncome:
            typeof u.monthlyIncome === "number" ? u.monthlyIncome : undefined,
          fixedExpenses:
            typeof u.fixedExpenses === "number" ? u.fixedExpenses : undefined,
          variableExpenses:
            typeof u.variableExpenses === "number"
              ? u.variableExpenses
              : undefined,
          timelineMonths:
            typeof u.timelineMonths === "number" ? u.timelineMonths : undefined,
          targetAmount:
            typeof u.targetAmount === "number" ? u.targetAmount : undefined,
        });
      })
      .catch(() => {
        // Keep onboarding defaults when profile fetch is unavailable.
      });
  }, [authToken, hasPrefill]);

  useEffect(() => {
    if (hasPrefill) {
      didHydrateFromInvestmentRef.current = true;
      return;
    }

    if (!authToken || didHydrateFromInvestmentRef.current) {
      return;
    }

    const identity = user?.id || userEmail || "anonymous";
    const recommendationStorageKey = `investment_recommendation:${identity}`;

    const normalizePercent = (
      value: number | undefined,
    ): number | undefined => {
      if (typeof value !== "number" || Number.isNaN(value)) return undefined;
      return value <= 1 ? value * 100 : value;
    };

    const loadFromStoredRecommendation = (): boolean => {
      try {
        const raw = localStorage.getItem(recommendationStorageKey);
        if (!raw) return false;

        const parsed = JSON.parse(raw) as {
          expected_return?: number;
          portfolio_volatility?: number;
        };
        const expectedReturnPct = normalizePercent(parsed?.expected_return);
        const volatilityPct = normalizePercent(parsed?.portfolio_volatility);

        if (typeof expectedReturnPct === "number") {
          setInvestmentDefaults({ expectedReturnPct, volatilityPct });
          didHydrateFromInvestmentRef.current = true;
          return true;
        }
      } catch {
        // Ignore malformed local storage and fallback to API.
      }

      return false;
    };

    if (loadFromStoredRecommendation()) {
      return;
    }

    recommendInvestments(authToken)
      .then((res) => {
        if (!isMountedRef.current) return;
        const expectedReturnPct = normalizePercent(res.expected_return);
        const volatilityPct = normalizePercent(res.portfolio_volatility);

        if (typeof expectedReturnPct === "number") {
          setInvestmentDefaults({ expectedReturnPct, volatilityPct });
          didHydrateFromInvestmentRef.current = true;
        }
      })
      .catch(() => {
        // Keep baseline defaults if investment forecast is not available.
        didHydrateFromInvestmentRef.current = true;
      });
  }, [authToken, user?.id, userEmail, hasPrefill]);

  useEffect(() => {
    if (hasPrefill) {
      didHydrateFromProfileRef.current = true;
      return;
    }

    if (!profileDefaults || didHydrateFromProfileRef.current) {
      return;
    }

    const monthlyIncome =
      profileDefaults.monthlyIncome ??
      onboardingData?.financial.monthlyIncome ??
      0;
    const fixedExpenses =
      profileDefaults.fixedExpenses ??
      onboardingData?.financial.fixedExpenses ??
      0;
    const variableExpenses =
      profileDefaults.variableExpenses ??
      onboardingData?.financial.variableExpenses ??
      0;
    const inferredContribution = Math.max(
      0,
      Math.round((monthlyIncome - fixedExpenses - variableExpenses) * 0.5),
    );

    if (inferredContribution > 0) {
      setContribution(inferredContribution);
    }
    if ((profileDefaults.timelineMonths ?? 0) > 0) {
      setTimeline(profileDefaults.timelineMonths as number);
    }
    if ((profileDefaults.targetAmount ?? 0) > 0) {
      setTargetAmount(profileDefaults.targetAmount as number);
    }

    didHydrateFromProfileRef.current = true;
  }, [profileDefaults, onboardingData, hasPrefill]);

  useEffect(() => {
    if (!prefill) {
      return;
    }

    const normalizePercent = (
      value: number | undefined,
    ): number | undefined => {
      if (typeof value !== "number" || Number.isNaN(value)) return undefined;
      return value <= 1 ? value * 100 : value;
    };

    if (typeof prefill.contribution === "number") {
      setContribution(Math.max(0, Math.round(prefill.contribution)));
    }

    const expectedReturnPct = normalizePercent(prefill.expectedReturns);
    if (typeof expectedReturnPct === "number" && expectedReturnPct > 0) {
      setExpectedReturns(Number(expectedReturnPct.toFixed(2)));
    }

    const inflationPct = normalizePercent(prefill.inflation);
    if (typeof inflationPct === "number" && inflationPct >= 0) {
      setInflation(Number(inflationPct.toFixed(2)));
    }

    if (typeof prefill.timeline === "number" && prefill.timeline > 0) {
      setTimeline(Math.round(prefill.timeline));
    }

    if (typeof prefill.targetAmount === "number" && prefill.targetAmount > 0) {
      setTargetAmount(Math.round(prefill.targetAmount));
    }

    // Keep redirected values intact instead of auto-overwriting SIP for this run.
    didApplyDefaultSipRef.current = true;
    didCalibrateSipRef.current = true;
  }, [prefill]);

  useEffect(() => {
    if (hasPrefill) {
      return;
    }

    if (!investmentDefaults) {
      return;
    }

    if (
      typeof investmentDefaults.expectedReturnPct === "number" &&
      investmentDefaults.expectedReturnPct > 0
    ) {
      setExpectedReturns(
        Number(investmentDefaults.expectedReturnPct.toFixed(2)),
      );
    }

    if (
      typeof investmentDefaults.volatilityPct === "number" &&
      investmentDefaults.volatilityPct >= 0
    ) {
      setVolatility(Number(investmentDefaults.volatilityPct.toFixed(2)));
    }
  }, [investmentDefaults, hasPrefill]);

  useEffect(() => {
    if (didApplyDefaultSipRef.current) {
      return;
    }

    if (authToken && !didHydrateFromInvestmentRef.current) {
      return;
    }

    if (timeline <= 0 || targetAmount <= 0) {
      return;
    }

    const annualInflation = Math.max(0, inflation) / 100;
    const annualReturn = Math.max(0, expectedReturns) / 100;
    const annualVolatility = Math.max(0, volatility) / 100;
    const years = timeline / 12;
    const adjustedTarget = targetAmount * Math.pow(1 + annualInflation, years);

    const monthlyRate = annualReturn / 12;
    const baseRequiredSip =
      monthlyRate > 0
        ? (adjustedTarget * monthlyRate) /
          (Math.pow(1 + monthlyRate, timeline) - 1)
        : adjustedTarget / timeline;

    // Buffer SIP by volatility to target very high default success probability.
    const safetyMultiplier = 1 + Math.min(0.6, annualVolatility * 0.9) + 0.1;
    const highConfidenceSip = Math.ceil(
      Math.max(0, baseRequiredSip) * safetyMultiplier,
    );

    setContribution(Math.max(1, highConfidenceSip));
    didApplyDefaultSipRef.current = true;
  }, [
    timeline,
    targetAmount,
    inflation,
    expectedReturns,
    volatility,
    authToken,
  ]);

  useEffect(() => {
    if (didCalibrateSipRef.current || !didApplyDefaultSipRef.current) {
      return;
    }

    if (
      timeline <= 0 ||
      targetAmount <= 0 ||
      expectedReturns < 0 ||
      volatility < 0
    ) {
      return;
    }

    let cancelled = false;

    const calibrateSipToHighProbability = async () => {
      const MODEL_API_URL =
        import.meta.env.VITE_MODEL_API_URL || "http://localhost:8000";
      let sip = Math.max(1, Math.round(contribution));

      for (let i = 0; i < 8; i += 1) {
        const payload = {
          monthly_sip: sip,
          expected_return: expectedReturns,
          volatility,
          timeline_months: timeline,
          target_amount: targetAmount,
          simulations: 1000,
          inflation,
          initial_investment: 0,
        };

        try {
          const res = await fetch(`${MODEL_API_URL}/api/goal-simulation`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!res.ok) break;

          const simulation: MonteCarloRawData = await res.json();
          const probability =
            typeof simulation.probability === "number"
              ? simulation.probability
              : (simulation.summary?.success_probability ?? 0) * 100;

          if (probability >= 99.5) {
            break;
          }

          const requiredIncrease =
            simulation.failure_analysis?.required_sip_increase ?? 0;
          if (requiredIncrease > 0) {
            sip = Math.ceil(sip + requiredIncrease * 1.4);
          } else {
            sip = Math.ceil(sip * 1.2 + 50);
          }
        } catch {
          break;
        }
      }

      if (!cancelled && isMountedRef.current) {
        setContribution(Math.max(1, sip));
        didCalibrateSipRef.current = true;
      }
    };

    void calibrateSipToHighProbability();

    return () => {
      cancelled = true;
    };
  }, [
    contribution,
    expectedReturns,
    volatility,
    timeline,
    targetAmount,
    inflation,
  ]);

  // Validation
  const conservativeProjectedSavings = contribution * timeline;
  const isGoalAggressive =
    targetAmount > 0 && targetAmount > conservativeProjectedSavings * 2.5;
  const isImpossibleGoal =
    contribution * timeline * (1 + expectedReturns / 100) < targetAmount * 0.7;

  const handleReset = useCallback(() => {
    setContribution(defaultContribution);
    setTimeline(defaultTimeline);
    setExpectedReturns(defaultReturns);
    setVolatility(defaultVolatility);
    setSimulations(defaultSimulations);
    setInflation(defaultInflation);
    setTargetAmount(defaultTargetAmount);
    setError(null);
  }, [
    defaultContribution,
    defaultTimeline,
    defaultReturns,
    defaultVolatility,
    defaultSimulations,
    defaultInflation,
    defaultTargetAmount,
  ]);

  const handleRerunSimulation = useCallback(async () => {
    if (isLoading && !activeSimulationPromise) {
      return;
    }

    if (!onboardingData) {
      return;
    }

    // If a simulation is already running, attach to it so progress survives page switches.
    if (activeSimulationPromise) {
      setIsLoading(true);
      setLoadingProgress((prev) => Math.max(prev, 85));

      try {
        const { newMC, rawMC } = await activeSimulationPromise;
        if (isMountedRef.current) {
          setCurrentMC(newMC);
          setRawMCData(rawMC);
          setLoadingProgress(100);
          setIsLoading(false);
        }
        persistMonteCarloResult(newMC);
      } catch {
        if (isMountedRef.current) {
          setError("Failed to update simulation. Please try again.");
          setIsLoading(false);
        }
      }
      return;
    }

    setError(null);
    setIsLoading(true);
    setLoadingProgress(0);

    // Simulated progress for better UX
    const progressInterval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 90) return prev;
        return Math.min(90, prev + Math.random() * 15);
      });
    }, 150);

    try {
      const MODEL_API_URL =
        import.meta.env.VITE_MODEL_API_URL || "http://localhost:8000";

      const payload = {
        monthly_sip: contribution,
        expected_return: expectedReturns,
        volatility,
        timeline_months: timeline,
        target_amount: targetAmount,
        simulations: simulations,
        inflation,
        initial_investment: 0,
      };

      activeSimulationPromise = (async () => {
        const res = await fetch(`${MODEL_API_URL}/api/goal-simulation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const detail = await res.text();
          throw new Error(detail || `API returned ${res.status}`);
        }

        const mcAnalysis: MonteCarloRawData = await res.json();

        if (!mcAnalysis) throw new Error("Analysis failed");

        const trajectory =
          mcAnalysis.trajectory ??
          mcAnalysis.graph_data?.months.map((m, i) => ({
            month: m,
            p10: mcAnalysis.graph_data?.p10[i] ?? 0,
            p50: mcAnalysis.graph_data?.p50[i] ?? 0,
            p90: mcAnalysis.graph_data?.p90[i] ?? 0,
          })) ??
          [];

        const successProbability =
          typeof mcAnalysis.probability === "number"
            ? mcAnalysis.probability
            : (mcAnalysis.summary?.success_probability ?? 0) * 100;

        const p10 =
          mcAnalysis.p10 ??
          mcAnalysis.percentiles?.p10 ??
          mcAnalysis.percentiles?.["10"] ??
          mcAnalysis.summary?.worst_case ??
          0;
        const p50 =
          mcAnalysis.p50 ??
          mcAnalysis.percentiles?.p50 ??
          mcAnalysis.percentiles?.["50"] ??
          mcAnalysis.summary?.median ??
          0;
        const p90 =
          mcAnalysis.p90 ??
          mcAnalysis.percentiles?.p90 ??
          mcAnalysis.percentiles?.["90"] ??
          mcAnalysis.summary?.best_case ??
          0;

        const newMC: MonteCarloResult = {
          successProbability: Math.round(successProbability),
          projectedValues: trajectory.map((pt) => ({
            month: pt.month,
            p10: Math.round(pt.p10),
            p50: Math.round(pt.p50),
            p90: Math.round(pt.p90),
          })),
          scenarios: [
            {
              name: "Worst Case (10th Percentile)",
              probability: 10,
              finalAmount: Math.round(p10),
            },
            {
              name: "Expected (Median)",
              probability: 50,
              finalAmount: Math.round(p50),
            },
            {
              name: "Best Case (90th Percentile)",
              probability: 90,
              finalAmount: Math.round(p90),
            },
          ],
          failureAnalysis: mcAnalysis.failure_analysis,
        };

        return { newMC, rawMC: mcAnalysis };
      })();

      const { newMC, rawMC } = await activeSimulationPromise;

      // Finish progress animation
      if (isMountedRef.current) {
        setLoadingProgress(100);
        setTimeout(() => {
          if (!isMountedRef.current) return;
          setCurrentMC(newMC);
          setRawMCData(rawMC);
          setIsLoading(false);
        }, 300);
      }
      persistMonteCarloResult(newMC);
    } catch {
      if (isMountedRef.current) {
        setError("Failed to update simulation. Please try again.");
        setIsLoading(false);
      }
    } finally {
      clearInterval(progressInterval);
      activeSimulationPromise = null;
    }
  }, [
    onboardingData,
    timeline,
    contribution,
    expectedReturns,
    volatility,
    simulations,
    inflation,
    targetAmount,
    isLoading,
    persistMonteCarloResult,
  ]);

  useEffect(() => {
    if (!activeSimulationPromise) {
      return;
    }

    setIsLoading(true);
    setLoadingProgress((prev) => Math.max(prev, 85));

    activeSimulationPromise
      .then(({ newMC, rawMC }) => {
        if (!isMountedRef.current) return;
        setCurrentMC(newMC);
        setRawMCData(rawMC);
        setLoadingProgress(100);
        setIsLoading(false);
        persistMonteCarloResult(newMC);
      })
      .catch(() => {
        if (!isMountedRef.current) return;
        setError("Failed to update simulation. Please try again.");
        setIsLoading(false);
      });
  }, [persistMonteCarloResult]);

  useEffect(() => {
    if (didAutoRunRef.current || isLoading || currentMC) {
      return;
    }

    // Skip auto-run if data is prefilled from redirect
    if (hasPrefill) {
      didAutoRunRef.current = true;
      return;
    }

    if (!didApplyDefaultSipRef.current || !didCalibrateSipRef.current) {
      return;
    }

    if (authToken && !didHydrateFromInvestmentRef.current) {
      return;
    }

    didAutoRunRef.current = true;
    void handleRerunSimulation();
  }, [authToken, isLoading, currentMC, handleRerunSimulation, hasPrefill]);

  // Early return after all hooks have been called
  if (!onboardingData) {
    return <Navigate to="/onboarding" replace />;
  }

  const mc = currentMC;
  const medianResult = (() => {
    if (!mc) return 0;

    const p50FromChart =
      mc.projectedValues.length > 0
        ? mc.projectedValues[mc.projectedValues.length - 1]?.p50
        : undefined;
    const p50FromScenario = mc.scenarios.find(
      (scenario) => scenario.probability === 50,
    )?.finalAmount;
    const p50FromRaw =
      rawMCData?.p50 ??
      rawMCData?.percentiles?.p50 ??
      rawMCData?.percentiles?.["50"] ??
      rawMCData?.summary?.median;

    const resolved = p50FromChart ?? p50FromScenario ?? p50FromRaw ?? 0;
    return Number.isFinite(resolved) ? Math.max(0, Math.round(resolved)) : 0;
  })();

  const probabilityLabel =
    mc && mc.successProbability < 40
      ? "Very Low"
      : mc && mc.successProbability < 60
        ? "Risky"
        : mc && mc.successProbability < 80
          ? "Moderate"
          : "Strong";

  return (
    <TooltipProvider>
      <div className="space-y-6 max-w-7xl pb-10 animate-in fade-in duration-700">
        {hasPrefill && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3 animate-in slide-in-from-top-2 duration-500">
            <Lightbulb className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-blue-900">
                {prefill?.source === "retirement"
                  ? "Retirement Plan Loaded"
                  : prefill?.source === "investment"
                    ? "Investment Plan Loaded"
                    : "Portfolio Loaded"}
              </p>
              <p className="text-sm text-blue-800">
                We've loaded your{" "}
                {prefill?.source === "retirement" ? "retirement" : "investment"}{" "}
                portfolio data. Click{" "}
                <span className="font-semibold">"Run Simulation"</span> to run
                the Monte Carlo analysis. After that feel free to adjust the
                parameters and see how they impact your financial future!
              </p>
            </div>
          </div>
        )}
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">
              Goal Simulation
            </h2>
            <p className="text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              AI-Powered Monte Carlo projection for your financial future
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isLoading}
              className="transition-transform hover:scale-105 active:scale-95"
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Reset
            </Button>
            <Button
              size="sm"
              onClick={handleRerunSimulation}
              className="transition-all hover:scale-105 active:scale-95 shadow-md hover:shadow-primary/20"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Run Simulation
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column: Inputs */}
          <Card className="lg:col-span-1 shadow-sm border-muted/60 bg-white/50 backdrop-blur-sm transition-all hover:shadow-md animate-in slide-in-from-left-4 duration-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                Simulation Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 group">
                <Label className="text-xs font-medium group-focus-within:text-primary transition-colors flex items-center gap-1.5">
                  Monthly SIP ($)
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Monthly SIP help"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Monthly amount you invest toward this goal.
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  type="number"
                  value={contribution}
                  min={0}
                  onChange={(e) =>
                    setContribution(Math.max(0, +e.target.value || 0))
                  }
                  className="h-9 transition-all focus:border-primary"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  Expected Return (%)
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Expected return help"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Your estimated annual return before inflation.
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  min={0}
                  value={expectedReturns}
                  onChange={(e) =>
                    setExpectedReturns(Math.max(0, +e.target.value || 0))
                  }
                  className="h-9 focus:border-primary transition-all"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  Timeline (months)
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Timeline help"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      How long you plan to invest before reaching your target.
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={timeline}
                  onChange={(e) =>
                    setTimeline(Math.max(1, +e.target.value || 1))
                  }
                  className="h-9 focus:border-primary transition-all"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  Target Amount ($)
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Target amount help"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                      </TooltipTrigger>
                    <TooltipContent>
                      Personal simulation target. This is independent from
                      onboarding defaults.
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={targetAmount}
                  onChange={(e) =>
                    setTargetAmount(Math.max(0, +e.target.value || 0))
                  }
                  className="h-9 focus:border-primary transition-all"
                  disabled={isLoading}
                />
                {isGoalAggressive && (
                  <p className="text-[10px] text-amber-700 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Goal looks aggressive
                    for current SIP and timeline. Consider increasing SIP or
                    timeline.
                  </p>
                )}
                {isImpossibleGoal && (
                  <p className="text-[10px] text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Goal cannot be
                    achieved with current inputs.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  Inflation Rate (%)
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Inflation rate help"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Expected annual rise in prices used to adjust your target.
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  min={0}
                  value={inflation}
                  onChange={(e) =>
                    setInflation(Math.max(0, +e.target.value || 0))
                  }
                  className="h-9 focus:border-primary transition-all"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2 pt-2">
                <Label className="text-xs flex justify-between font-medium items-center">
                  <span className="inline-flex items-center gap-1.5">
                    Simulations
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="Simulations help"
                        >
                          <Info className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Number of Monte Carlo trials. More trials give smoother
                        estimates.
                      </TooltipContent>
                    </Tooltip>
                  </span>
                  <span className="text-primary font-bold">{simulations}</span>
                </Label>
                <input
                  type="range"
                  min="1000"
                  max="10000"
                  step="1000"
                  value={simulations}
                  onChange={(e) =>
                    setSimulations(
                      Math.min(10000, Math.max(1000, +e.target.value || 1000)),
                    )
                  }
                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={isLoading}
                />
              </div>

              <div className="text-[11px] text-muted-foreground leading-relaxed border-t pt-3">
                <p>
                  Monte Carlo simulation models thousands of possible market
                  outcomes using randomness. It helps estimate how likely you
                  are to reach your goal.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded text-[10px] leading-tight flex items-start gap-2 animate-in zoom-in-95">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-2">
                <p className="text-[11px] font-semibold text-primary inline-flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" /> Simulation Insights
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Expected return defaults are synced from your Investments
                  recommendation when available.
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Increase probability by improving SIP, extending timeline, or
                  lowering target.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Right Column: Visualization & Results */}
          <div className="lg:col-span-3 space-y-6">
            {isLoading ? (
              <Card className="h-[500px] flex flex-col items-center justify-center p-12 text-center bg-white/50 backdrop-blur-sm border-muted/60">
                <div className="relative h-20 w-20 mb-8">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                  <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
                  <div className="absolute inset-4 flex items-center justify-center">
                    <BarChart3 className="h-8 w-8 text-primary/50" />
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-4 animate-pulse">
                  Running {simulations.toLocaleString()} Parallel Scenarios...
                </h3>
                <div className="w-full max-w-md space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Calculating Market Volatility</span>
                    <span>{Math.round(loadingProgress)}%</span>
                  </div>
                  <Progress
                    value={loadingProgress}
                    className="h-2 transition-all duration-300"
                  />
                </div>
              </Card>
            ) : !mc ? (
              <Card className="h-[500px] flex flex-col items-center justify-center p-12 text-center border-dashed border-2 hover:border-primary/50 transition-colors bg-muted/5 animate-in zoom-in-95 duration-500">
                <div className="bg-primary/10 p-6 rounded-full mb-6 animate-bounce">
                  <BarChart3 className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-2 tracking-tight">
                  Simulate Your Financial Future
                </h3>
                <p className="text-muted-foreground mb-8 max-w-md">
                  Configure your financial goals and parameters on the left,
                  then click run to see your future wealth trajectory.
                </p>
                <Button
                  onClick={handleRerunSimulation}
                  size="lg"
                  className="rounded-full px-8 hover:scale-105 active:scale-95 transition-all"
                >
                  Run Simulation
                </Button>
              </Card>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000 fill-mode-both">
                {/* Success Probability Hero */}
                <div className="grid gap-6 md:grid-cols-4 mb-6">
                  <Card className="md:col-span-2 flex flex-col justify-center p-6 bg-primary/5 border-primary/20 relative overflow-hidden transition-all hover:scale-[1.01] hover:shadow-lg group before:absolute before:inset-0 before:pointer-events-none before:bg-gradient-to-br before:from-primary/10 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity">
                    <div className="absolute top-0 right-0 p-4 transition-transform group-hover:rotate-12 duration-500">
                      <CheckCircle2
                        className={`h-12 w-12 ${mc.successProbability > 70 ? "text-green-500/20" : "text-orange-500/20"}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                          Success Probability
                        </p>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground"
                              aria-label="Success probability help"
                            >
                              <Info className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="bottom"
                            align="start"
                            className="z-[120] max-w-xs text-xs leading-relaxed"
                          >
                            This is calculated using Monte Carlo simulation:
                            <br />
                            <br />• We simulate {simulations} market scenarios •
                            Each scenario applies random returns based on
                            expected return and volatility • Final wealth is
                            compared against your inflation-adjusted goal
                            <br />
                            <br />
                            Success Probability = percent of scenarios where you
                            achieve your goal.
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span
                          className={`text-6xl font-black tracking-tight ${
                            mc.successProbability > 70
                              ? "text-green-600"
                              : mc.successProbability > 40
                                ? "text-orange-500"
                                : "text-red-600"
                          }`}
                        >
                          {mc.successProbability}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {probabilityLabel} probability of success
                      </p>
                    </div>
                    <div className="mt-6 space-y-2">
                      <Progress
                        value={mc.successProbability}
                        className={`h-2.5 ${mc.successProbability > 70 ? "[&>div]:bg-green-600" : mc.successProbability > 40 ? "[&>div]:bg-orange-600" : "[&>div]:bg-destructive"}`}
                      />
                      <p className="text-xs text-muted-foreground font-medium">
                        Target:{" "}
                        <span className="text-foreground">
                          ${targetAmount.toLocaleString()}
                        </span>
                        {inflation > 0 &&
                          ` (Inflation-adjusted: $${Math.round(mc.failureAnalysis?.future_target_inflation_adjusted || 0).toLocaleString()})`}
                      </p>
                    </div>
                  </Card>

                  <div className="md:col-span-2 grid gap-4 grid-cols-2">
                    <Card className="p-4 hover:scale-105 transition-transform duration-300 flex flex-col justify-center">
                      <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                        Expected Return
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground"
                              aria-label="Expected Return help"
                            >
                              <Info className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="bottom"
                            align="start"
                            className="max-w-xs text-xs"
                          >
                            Annual portfolio return assumption used for
                            simulation paths.
                          </TooltipContent>
                        </Tooltip>
                      </p>
                      <AnimatedValue
                        value={Math.round(expectedReturns)}
                        suffix="%"
                      />
                    </Card>
                    <Card className="p-4 hover:scale-105 transition-transform duration-300 flex flex-col justify-center">
                      <AnimatedValue
                        label="Timeline"
                        value={timeline}
                        suffix="m"
                      />
                    </Card>
                    <Card className="p-4 hover:scale-105 transition-transform duration-300 flex flex-col justify-center bg-blue-50/30">
                      <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                        Median Result
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground"
                              aria-label="Median Result help"
                            >
                              <Info className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="bottom"
                            align="start"
                            className="max-w-xs text-xs"
                          >
                            P50 final value: half of simulated outcomes finish
                            above this value and half below.
                          </TooltipContent>
                        </Tooltip>
                      </p>
                      <AnimatedValue value={medianResult} prefix="$" />
                    </Card>
                    <Card className="p-4 hover:scale-105 transition-transform duration-300 flex flex-col justify-center">
                      <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                        Volatility
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground"
                              aria-label="Volatility help"
                            >
                              <Info className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="bottom"
                            align="start"
                            className="max-w-xs text-xs"
                          >
                            Annual variability in returns. Higher volatility
                            means a wider range of possible outcomes.
                          </TooltipContent>
                        </Tooltip>
                      </p>
                      <AnimatedValue
                        value={Math.round(volatility)}
                        suffix="%"
                      />
                    </Card>
                  </div>
                </div>

                <Card
                  className={`mb-6 ${mc.successProbability > 80 ? "bg-green-50 border-green-200" : mc.successProbability >= 60 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"}`}
                >
                  <CardContent className="p-4">
                    <p className="text-sm font-semibold">
                      { mc.successProbability < 60
                          ? "Recommendation: Increase SIP"
                          : mc.successProbability <= 80
                            ? "Recommendation: Slight adjustment needed"
                            : "Recommendation: On track"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {mc.successProbability < 60
                        ? "Your probability is below 60%. Increasing monthly SIP or extending timeline can materially improve outcomes."
                        : mc.successProbability <= 80
                          ? "You are close. A small SIP increase, slightly lower inflation assumption, or a longer horizon can strengthen confidence."
                          : "Your plan has a strong probability of success. Continue regular contributions and review assumptions periodically."}
                    </p>
                  </CardContent>
                </Card>

                {/* Main Graph */}
                <Card className="mb-6 hover:shadow-xl transition-shadow duration-700 animate-in slide-in-from-bottom-8">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Wealth Trajectory Projection
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Range of possible final amounts across{" "}
                      {simulations.toLocaleString()} scenarios
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={380}>
                      <LineChart
                        data={mc.projectedValues}
                        margin={{ top: 10, right: 30, left: 20, bottom: 20 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="hsl(var(--muted)/0.5)"
                        />
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 11 }}
                          stroke="hsl(var(--muted-foreground))"
                        />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          stroke="hsl(var(--muted-foreground))"
                          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                        />
                        <RechartsTooltip
                          cursor={{
                            stroke: "hsl(var(--primary))",
                            strokeWidth: 1,
                            strokeDasharray: "5 5",
                          }}
                          formatter={(v: number) => [
                            `$${v.toLocaleString()}`,
                            "",
                          ]}
                          contentStyle={{
                            borderRadius: "12px",
                            border: "none",
                            boxShadow:
                              "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
                            background: "rgba(255,255,255,0.95)",
                            backdropFilter: "blur(4px)",
                          }}
                        />
                        <Legend
                          verticalAlign="top"
                          height={36}
                          iconType="circle"
                        />
                        <Line
                          name="Optimistic (90th)"
                          type="monotone"
                          dataKey="p90"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={false}
                          strokeDasharray="5 5"
                          isAnimationActive={true}
                          animationDuration={2500}
                        />
                        <Line
                          name="Median Outcome"
                          type="monotone"
                          dataKey="p50"
                          stroke="#3b82f6"
                          strokeWidth={4}
                          dot={false}
                          isAnimationActive={true}
                          animationDuration={3500}
                        />
                        <Line
                          name="Worst Case (10th)"
                          type="monotone"
                          dataKey="p10"
                          stroke="#ef4444"
                          strokeWidth={2}
                          dot={false}
                          strokeDasharray="5 5"
                          isAnimationActive={true}
                          animationDuration={2000}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Summary Table */}
                <Card className="overflow-hidden hover:shadow-md transition-shadow duration-700 animate-in slide-in-from-bottom-6 delay-200">
                  <CardHeader className="bg-muted/30">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" /> Probabilistic Outcomes
                      Table
                    </CardTitle>
                  </CardHeader>
                  <div className="rounded-b-md">
                    <Table>
                      <TableHeader className="bg-muted/10">
                        <TableRow>
                          <TableHead>Scenario Name</TableHead>
                          <TableHead>Interpretation</TableHead>
                          <TableHead className="text-right">
                            Final Wealth
                          </TableHead>
                          <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow className="hover:bg-destructive/5 transition-colors">
                          <TableCell className="font-medium inline-flex items-center gap-1.5">
                            Worst Case (10th)
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="text-muted-foreground hover:text-foreground"
                                  aria-label="Worst Case help"
                                >
                                  <Info className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                align="start"
                                className="max-w-xs text-xs"
                              >
                                P10 outcome. About 90% of simulations finish
                                above this value.
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="text-xs">
                            Difficult market conditions
                          </TableCell>
                          <TableCell className="text-right font-semibold text-destructive">
                            ${mc.scenarios[0].finalAmount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {mc.scenarios[0].finalAmount >=
                            (mc.failureAnalysis
                              ?.future_target_inflation_adjusted || 0) ? (
                              <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">
                                ACHIEVED
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold">
                                MISSED
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                        <TableRow className="bg-primary/5 hover:bg-primary/10 transition-colors">
                          <TableCell className="font-semibold text-primary inline-flex items-center gap-1.5">
                            Median Projection
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="text-muted-foreground hover:text-foreground"
                                  aria-label="Median Projection help"
                                >
                                  <Info className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                align="start"
                                className="max-w-xs text-xs"
                              >
                                P50 outcome. This is the central estimate and
                                most likely long-run range midpoint.
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="text-xs font-medium">
                            Most likely outcomes
                          </TableCell>
                          <TableCell className="text-right font-black text-primary">
                            ${medianResult.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {medianResult >=
                            (mc.failureAnalysis
                              ?.future_target_inflation_adjusted || 0) ? (
                              <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">
                                ACHIEVED
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold">
                                MISSED
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-green-50/50 transition-colors">
                          <TableCell className="font-medium inline-flex items-center gap-1.5">
                            Best Case (90th)
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="text-muted-foreground hover:text-foreground"
                                  aria-label="Best Case help"
                                >
                                  <Info className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                align="start"
                                className="max-w-xs text-xs"
                              >
                                P90 outcome. About 10% of simulations perform
                                better than this value.
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="text-xs">
                            Optimistic bull market
                          </TableCell>
                          <TableCell className="text-right font-semibold text-green-600">
                            ${mc.scenarios[2].finalAmount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {mc.scenarios[2].finalAmount >=
                            (mc.failureAnalysis
                              ?.future_target_inflation_adjusted || 0) ? (
                              <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">
                                ACHIEVED
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold">
                                MISSED
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </Card>

                {/* Detailed Breakdown */}
                {rawMCData && (
                  <div className="pt-8 animate-in fade-in duration-1000">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="h-px flex-1 bg-muted" />
                      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap inline-flex items-center gap-1.5">
                        Deep Dive Statistics
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground"
                              aria-label="Deep Dive Statistics help"
                            >
                              <Info className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            align="center"
                            className="max-w-xs text-xs"
                          >
                            Advanced distribution metrics and confidence buckets
                            from the same Monte Carlo run.
                          </TooltipContent>
                        </Tooltip>
                      </h3>
                      <div className="h-px flex-1 bg-muted" />
                    </div>
                    <MonteCarloDetails mcData={mc} mcRawData={rawMCData} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

function calculateAge(dob: string): number {
  if (!dob) return 30;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age;
}

export default GoalSimulation;