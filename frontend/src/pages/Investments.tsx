import { useStore } from "@/store/useStore";
import { Navigate, useNavigate } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ScatterChart,
  Scatter,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getSavedInvestmentRecommendation,
  recommendInvestments,
  type RecommendResponse,
} from "@/lib/api";
import {
  Briefcase,
  Clock,
  Loader2,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const MODEL_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

/** Portfolio-level asset mix (matches model-backend keys). */
const ASSET_CLASS_ORDER = ["equity", "bonds", "gold", "cash"] as const;
const ASSET_CLASS_LABELS: Record<(typeof ASSET_CLASS_ORDER)[number], string> = {
  equity: "Equity",
  bonds: "Bonds",
  gold: "Gold",
  cash: "Cash",
};
const ASSET_CLASS_COLORS: Record<(typeof ASSET_CLASS_ORDER)[number], string> = {
  equity: "#3b82f6",
  bonds: "#10b981",
  gold: "#eab308",
  cash: "#94a3b8",
};

const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;

const getRiskColor = (risk: string) => {
  const normalized = risk.toLowerCase();
  if (normalized === "low")
    return "bg-green-100 text-green-700 border-green-200";
  if (normalized === "medium" || normalized === "moderate") {
    return "bg-yellow-100 text-yellow-700 border-yellow-200";
  }
  if (normalized === "high" || normalized === "aggressive") {
    return "bg-red-100 text-red-700 border-red-200";
  }
  return "bg-slate-100 text-slate-700 border-slate-200";
};

const Investments = () => {
  const { analysisData, authToken, onboardingData, user, userEmail } = useStore();
  const navigate = useNavigate();
  const [recommendation, setRecommendation] =
    useState<RecommendResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingSavedRecommendation, setIsLoadingSavedRecommendation] =
    useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const chartData = useMemo(() => {
    if (!recommendation) return [];

    return Object.entries(recommendation.allocation)
      .filter(([_, allocation]) => allocation > 0)
      .map(([name, allocation], i) => ({
        name,
        value: Number(allocation.toFixed(2)),
        color: MODEL_COLORS[i % MODEL_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [recommendation]);

  const assetChartData = useMemo(() => {
    if (!recommendation?.asset_allocation) return [];

    const aa = recommendation.asset_allocation;
    return ASSET_CLASS_ORDER.filter((key) => (aa[key] ?? 0) > 0).map((key) => ({
      name: ASSET_CLASS_LABELS[key],
      value: Number((aa[key] ?? 0).toFixed(2)),
      color: ASSET_CLASS_COLORS[key],
    }));
  }, [recommendation]);

  const sectorChartData = useMemo(() => {
    if (!recommendation?.sector_allocation) return [];

    return Object.entries(recommendation.sector_allocation)
      .map(([name, allocation], i) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: Number(allocation.toFixed(2)),
        color: MODEL_COLORS[i % MODEL_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [recommendation]);

  const stockPriceLineData = useMemo(() => {
    if (!recommendation?.stock_price_history?.data) return [];

    return recommendation.stock_price_history.data.map((pt) => ({
      date: pt.date,
      ...pt.prices,
    }));
  }, [recommendation]);

  const stockRiskReturnPoints = useMemo(() => {
    return recommendation?.stock_risk_return_points ?? [];
  }, [recommendation]);

  const stockCorrelation = recommendation?.stock_correlation;

  const timelineYears = onboardingData
    ? Math.max(1, Math.ceil(onboardingData.goal.timelineMonths / 12))
    : null;

  const canSimulateGoal =
    !!recommendation && onboardingData?.goal.goalType === "target";

  useEffect(() => {
    let isCancelled = false;

    if (!authToken) {
      setRecommendation(null);
      setRequestError(null);
      setIsLoadingSavedRecommendation(false);
      return;
    }

    setIsLoadingSavedRecommendation(true);

    getSavedInvestmentRecommendation(authToken)
      .then((savedRecommendation) => {
        if (isCancelled) return;
        setRecommendation(savedRecommendation);
        setRequestError(null);
      })
      .catch((error) => {
        if (isCancelled) return;
        setRequestError(
          error instanceof Error
            ? error.message
            : "Failed to load saved recommendation. Please try again.",
        );
      })
      .finally(() => {
        if (isCancelled) return;
        setIsLoadingSavedRecommendation(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [authToken]);

  // Early return after all hooks have been initialized


  useEffect(() => {
    let isCancelled = false;

    if (!authToken) {
      setRecommendation(null);
      setRequestError(null);
      setIsLoadingSavedRecommendation(false);
      return;
    }

    setIsLoadingSavedRecommendation(true);

    getSavedInvestmentRecommendation(authToken)
      .then((savedRecommendation) => {
        if (isCancelled) return;
        setRecommendation(savedRecommendation);
        setRequestError(null);
      })
      .catch((error) => {
        if (isCancelled) return;
        setRequestError(
          error instanceof Error
            ? error.message
            : "Failed to load saved recommendation. Please try again.",
        );
      })
      .finally(() => {
        if (isCancelled) return;
        setIsLoadingSavedRecommendation(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [authToken]);

  if (!analysisData) return <Navigate to="/dashboard" replace />;

  const handleGenerateRecommendation = async () => {
    if (!authToken || isGenerating) return;

    setRequestError(null);
    setIsGenerating(true);

    try {
      const response = await recommendInvestments(authToken);
      setRecommendation(response);

      // Persist to local storage so report download can use the latest page data
      const identity = user?.id || userEmail || "anonymous";
      const recommendationStorageKey = `investment_recommendation:${identity}`;
      localStorage.setItem(recommendationStorageKey, JSON.stringify(response));
    } catch (error) {
      setRequestError(
        error instanceof Error
          ? error.message
          : "Failed to generate recommendation. Please try again.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSimulateGoal = () => {
    if (!onboardingData || !recommendation) return;

    const savings =
      onboardingData.financial.monthlyIncome -
      onboardingData.financial.fixedExpenses -
      onboardingData.financial.variableExpenses;

    navigate("/dashboard/simulation", {
      state: {
        prefill: {
          contribution: Math.max(0, savings),
          expectedReturns: recommendation.expected_return,
          timeline: onboardingData.goal.timelineMonths,
          targetAmount: onboardingData.goal.targetAmount,
          source: "investment",
        },
      },
    });
  };

  return (
    <div className="space-y-6 max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Your AI Investment Plan
          </h2>
          <p className="text-slate-500">
            Personalized allocation, return expectations, and AI rationale.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {recommendation && (
            <div
              className={`px-4 py-1.5 rounded-full border text-sm font-semibold flex items-center gap-2 ${getRiskColor(recommendation.risk_profile)}`}
            >
              <ShieldAlert size={16} />
              {recommendation.risk_profile.charAt(0).toUpperCase() +
                recommendation.risk_profile.slice(1)}{" "}
              Risk Profile
            </div>
          )}
          {canSimulateGoal && (
            <Button
              variant="outline"
              onClick={handleSimulateGoal}
              disabled={isGenerating}
            >
              Simulate Goal
            </Button>
          )}
          <Button
            onClick={handleGenerateRecommendation}
            disabled={!authToken || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : recommendation ? (
              "Regenerate Response"
            ) : (
              "Generate Response"
            )}
          </Button>
        </div>
      </div>

      {(isGenerating || isLoadingSavedRecommendation) && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              {isGenerating
                ? "We are generating your response and saving it to your account. The model can take some time, so you can come back later and check this page."
                : "Loading your saved recommendation from your account."}
            </p>
          </CardContent>
        </Card>
      )}

      {!authToken && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Please log in to generate recommendation from your saved profile.
            </p>
          </CardContent>
        </Card>
      )}

      {requestError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{requestError}</p>
          </CardContent>
        </Card>
      )}

      {!recommendation &&
        !isGenerating &&
        !isLoadingSavedRecommendation &&
        !requestError &&
        authToken && (
          <Card className="border-slate-200">
            <CardContent className="pt-8 pb-8">
              <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
                <img
                  src="https://static.vecteezy.com/system/resources/previews/017/012/634/non_2x/illustration-design-for-finance-investment-and-digital-banking-or-cashless-money-that-comes-out-of-wallet-and-flies-to-smartphone-can-be-used-for-web-website-posters-apps-brochures-free-vector.jpg"
                  alt="Investment planning illustration"
                  className="h-auto w-full max-w-2xl rounded-xl object-contain"
                  loading="lazy"
                />
                <p className="mt-4 text-sm text-muted-foreground">
                  Your investment plan will appear here. Click Generate Response
                  to create your personalized recommendation.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

      {recommendation && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <TrendingUp size={20} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">
                  Expected Annual Return
                </p>
                <h3 className="text-2xl font-bold text-emerald-600">
                  {formatPercent(recommendation.expected_return)}
                </h3>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <Briefcase size={20} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">
                  Strategy Theme
                </p>
                <h3 className="text-xl font-bold text-slate-900 capitalize">
                  {recommendation.recommended_portfolio ?? "N/A"}
                </h3>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Clock size={20} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">
                  Investment Horizon
                </p>
                <h3 className="text-2xl font-bold text-slate-900">
                  {timelineYears ? `${timelineYears} Years` : "N/A"}
                </h3>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Sparkles size={20} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">
                  Assets Selected
                </p>
                <h3 className="text-2xl font-bold text-slate-900">
                  {recommendation.stocks.length}
                </h3>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6 flex flex-col">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden order-3">
                <div className="p-5 border-b border-slate-100">
                  <h3 className="font-bold text-lg text-slate-900">
                    Stock allocation
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Weights within your equity sleeve (selected stocks).
                  </p>
                </div>

                {chartData.length > 0 ? (
                  <div className="flex flex-col md:flex-row items-center p-6 gap-8">
                    <div className="h-64 w-full md:w-1/2 relative flex justify-center items-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={3}
                            dataKey="value"
                            stroke="none"
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            formatter={(value: number) => [
                              `${value.toFixed(2)}%`,
                              "Allocation",
                            ]}
                          />
                        </PieChart>
                      </ResponsiveContainer>

                      <div className="absolute flex flex-col items-center justify-center text-center">
                        <span className="text-sm text-slate-500 font-medium">
                          Return
                        </span>
                        <span className="text-xl font-bold text-slate-900">
                          {formatPercent(recommendation.expected_return)}
                        </span>
                      </div>
                    </div>

                    <div className="w-full md:w-1/2 flex flex-col gap-3">
                      {chartData.map((item, idx) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor:
                                  MODEL_COLORS[idx % MODEL_COLORS.length],
                              }}
                            />
                            <span className="font-medium text-slate-700">
                              {item.name}
                            </span>
                          </div>
                          <span className="font-semibold text-slate-900">
                            {item.value.toFixed(2)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-6">
                    <p className="text-sm text-slate-500">
                      Generate response to view allocation chart.
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden order-1">
                <div className="p-5 border-b border-slate-100">
                  <h3 className="font-bold text-lg text-slate-900">
                    Asset allocation
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Full portfolio mix: equity, bonds, gold, and cash.
                  </p>
                </div>

                {assetChartData.length > 0 ? (
                  <div className="flex flex-col md:flex-row items-center p-6 gap-8">
                    <div className="h-64 w-full md:w-1/2 relative flex justify-center items-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={assetChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={3}
                            dataKey="value"
                            stroke="none"
                          >
                            {assetChartData.map((entry, index) => (
                              <Cell key={`asset-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            formatter={(value: number) => [
                              `${value.toFixed(2)}%`,
                              "Allocation",
                            ]}
                          />
                        </PieChart>
                      </ResponsiveContainer>

                      <div className="absolute flex flex-col items-center justify-center text-center">
                        <span className="text-sm text-slate-500 font-medium">
                          Mix
                        </span>
                        <span className="text-xl font-bold text-slate-900">
                          100%
                        </span>
                      </div>
                    </div>

                    <div className="w-full md:w-1/2 flex flex-col gap-3">
                      {assetChartData.map((item) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="font-medium text-slate-700">
                              {item.name}
                            </span>
                          </div>
                          <span className="font-semibold text-slate-900">
                            {item.value.toFixed(2)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-6">
                    <p className="text-sm text-slate-500">
                      Asset mix will appear here after you regenerate your plan
                      (model returns equity, bonds, gold, and cash weights).
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden order-2">
                <div className="p-5 border-b border-slate-100">
                  <h3 className="font-bold text-lg text-slate-900">
                    Sector allocation
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Distribution across industry sectors.
                  </p>
                </div>

                {sectorChartData.length > 0 ? (
                  <div className="flex flex-col md:flex-row items-center p-6 gap-8">
                    <div className="h-64 w-full md:w-1/2 relative flex justify-center items-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={sectorChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={3}
                            dataKey="value"
                            stroke="none"
                          >
                            {sectorChartData.map((entry, index) => (
                              <Cell key={`sector-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            formatter={(value: number) => [
                              `${value.toFixed(2)}%`,
                              "Allocation",
                            ]}
                          />
                        </PieChart>
                      </ResponsiveContainer>

                      <div className="absolute flex flex-col items-center justify-center text-center">
                        <span className="text-sm text-slate-500 font-medium">
                          Coverage
                        </span>
                        <span className="text-xl font-bold text-slate-900">
                          100%
                        </span>
                      </div>
                    </div>

                    <div className="w-full md:w-1/2 flex flex-col gap-3">
                      {sectorChartData.map((item, idx) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor:
                                  MODEL_COLORS[idx % MODEL_COLORS.length],
                              }}
                            />
                            <span className="font-medium text-slate-700">
                              {item.name}
                            </span>
                          </div>
                          <span className="font-semibold text-slate-900">
                            {item.value.toFixed(2)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-6">
                    <p className="text-sm text-slate-500">
                      Sector allocation will appear here after you regenerate
                      your plan.
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden order-4">
                <div className="p-5 border-b border-slate-100">
                  <h3 className="font-bold text-lg text-slate-900">
                    Closing prices (selected stocks)
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Historical adjusted-close series used for analytics.
                  </p>
                </div>

                {recommendation?.stock_price_history?.data?.length ? (
                  <div className="p-6">
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={stockPriceLineData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <RechartsTooltip />
                        {recommendation.stock_price_history.tickers.map(
                          (t, idx) => (
                            <Line
                              key={t}
                              type="monotone"
                              dataKey={t}
                              stroke={MODEL_COLORS[idx % MODEL_COLORS.length]}
                              dot={false}
                            />
                          ),
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="p-6">
                    <p className="text-sm text-slate-500">
                      Generate response to view closing price charts.
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden order-5">
                <div className="p-5 border-b border-slate-100">
                  <h3 className="font-bold text-lg text-slate-900">
                    Risk vs return scatter
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Expected forecast return vs historical volatility
                    (annualized).
                  </p>
                </div>

                {stockRiskReturnPoints.length ? (
                  <div className="p-6">
                    <ResponsiveContainer width="100%" height={320}>
                      <ScatterChart>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="expected_return"
                          name="Expected return"
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) => `${Number(v).toFixed(2)}%`}
                        />
                        <YAxis
                          dataKey="volatility"
                          name="Volatility"
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) => `${Number(v).toFixed(2)}`}
                        />
                        <RechartsTooltip
                          formatter={(value: number, name: string, props: { payload: Record<string, number> }) => {
                            const payload = props?.payload ?? {};
                            if (name === "expected_return") {
                              return [
                                `${Number(value).toFixed(2)}%`,
                                "Expected return",
                              ];
                            }
                            if (name === "volatility") {
                              return [
                                `${Number(value).toFixed(2)}`,
                                "Volatility",
                              ];
                            }
                            return [value, name];
                          }}
                        />
                        <Scatter data={stockRiskReturnPoints} fill="#3b82f6" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="p-6">
                    <p className="text-sm text-slate-500">
                      Generate response to view the scatter plot.
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden order-6">
                <div className="p-5 border-b border-slate-100">
                  <h3 className="font-bold text-lg text-slate-900">
                    Correlation heatmap
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Correlation of daily log-returns across selected stocks.
                  </p>
                </div>

                {stockCorrelation?.tickers?.length &&
                stockCorrelation?.matrix?.length ? (
                  <div className="p-6 overflow-x-auto">
                    {(() => {
                      const tickers = stockCorrelation.tickers;
                      const matrix = stockCorrelation.matrix;
                      const n = tickers.length;
                      const cellW = 56;
                      const headerH = 72;

                      const gridTemplateColumns = `${120}px repeat(${n}, ${cellW}px)`;

                      const cellColor = (v: number) => {
                        const a = Math.min(1, Math.abs(v));
                        if (v >= 0) {
                          return `rgba(16,185,129,${a})`; // green
                        }
                        return `rgba(239,68,68,${a})`; // red
                      };

                      return (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: gridTemplateColumns,
                            gap: 4,
                          }}
                        >
                          {/* Header row */}
                          <div style={{ height: headerH }} />
                          {tickers.map((t, j) => (
                            <div
                              key={t}
                              style={{
                                height: headerH,
                                display: "flex",
                                alignItems: "flex-end",
                                justifyContent: "center",
                                fontSize: 12,
                                fontWeight: 600,
                                background: "#f1f5f9",
                                borderRadius: 6,
                              }}
                            >
                              <span
                                style={{
                                  display: "inline-block",
                                  transform: "rotate(-35deg)",
                                  transformOrigin: "bottom center",
                                  whiteSpace: "nowrap",
                                  marginBottom: 6,
                                }}
                              >
                                {t}
                              </span>
                            </div>
                          ))}

                          {/* Cells */}
                          {tickers.map((rowTicker, i) => (
                            <div
                              key={`row-${rowTicker}`}
                              style={{ display: "contents" }}
                            >
                              <div
                                style={{
                                  height: cellW,
                                  display: "flex",
                                  alignItems: "center",
                                  paddingLeft: 8,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  background: "#f8fafc",
                                  borderRadius: 6,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {rowTicker}
                              </div>
                              {tickers.map((_, j) => {
                                const v = matrix?.[i]?.[j] ?? 0;
                                const color = cellColor(v);
                                return (
                                  <div
                                    key={`cell-${rowTicker}-${j}`}
                                    style={{
                                      width: cellW,
                                      height: cellW,
                                      background: color,
                                      borderRadius: 6,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: 11,
                                      fontWeight: 700,
                                      color: "#0f172a",
                                      border: "1px solid rgba(15,23,42,0.08)",
                                    }}
                                    title={`Corr(${rowTicker}, ${tickers[j]}) = ${v.toFixed(2)}`}
                                  >
                                    {v.toFixed(2)}
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="p-6">
                    <p className="text-sm text-slate-500">
                      Generate response to view the correlation heatmap.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-gradient-to-b from-blue-50 to-indigo-50/30 border border-blue-100 rounded-2xl p-6 h-full shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-blue-800">
                  <Sparkles size={20} className="text-blue-600" />
                  <h3 className="font-bold text-lg">AI Rationale</h3>
                </div>

                <div className="space-y-4 text-slate-700 leading-relaxed text-sm">
                  {recommendation.ai_explanation
                    .split("\n\n")
                    .filter((paragraph) => paragraph.trim() !== "")
                    .map((paragraph, idx) => {
                      if (paragraph.trim().startsWith("*")) {
                        const bullets = paragraph
                          .split("\n")
                          .filter((bullet) => bullet.trim() !== "");

                        return (
                          <ul
                            key={idx}
                            className="list-disc pl-5 space-y-2 marker:text-blue-400"
                          >
                            {bullets.map((bullet, bulletIdx) => (
                              <li key={bulletIdx}>
                                {bullet.replace("*", "").trim()}
                              </li>
                            ))}
                          </ul>
                        );
                      }

                      return <p key={idx}>{paragraph}</p>;
                    })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Investments;
