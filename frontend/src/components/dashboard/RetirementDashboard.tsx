import React, { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import {
  Target,
  TrendingUp,
  ShieldAlert,
  Clock,
  Info,
  Briefcase,
  Sparkles,
  Edit2,
} from "lucide-react";

// Define the expected prop structure based on your JSON output
interface PlanData {
  years_to_retirement: number;
  inflation_rate: number;
  retirement_corpus: number;
  portfolio: {
    risk_profile: string;
    recommended_portfolio: string;
    expected_return: number;
    future_value: number | null;
    ai_explanation: string;
    explanation_source: string;
    asset_allocation?: {
      equity: number;
      bonds: number;
      gold: number;
      cash: number;
    };
    stocks: Array<{
      ticker: string;
      expected_return: number;
    }>;
    allocation: Record<string, number>;
  };
}

interface RetirementDashboardProps {
  data: PlanData;
  onRegenerate: () => void;
  onSimulateGoal: () => void;
}

// Colors for the charts
const STOCK_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];
const ASSET_COLORS = ["#6366f1", "#14b8a6", "#f59e0b", "#64748b"]; // Indigo, Teal, Amber, Slate

const RetirementDashboard: React.FC<RetirementDashboardProps> = ({
  data,
  onRegenerate,
  onSimulateGoal,
}) => {
  // 1. Format Currency safely (UPDATED TO DOLLAR)
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // 2. Format Percentages
  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  // 3. Prepare Chart Data for Stocks
  const stockChartData = useMemo(() => {
    if (!data.portfolio.allocation) return [];
    return Object.entries(data.portfolio.allocation)
      .map(([ticker, percentage]) => ({
        name: ticker,
        value: percentage,
      }))
      .sort((a, b) => b.value - a.value); // Sort largest to smallest
  }, [data.portfolio.allocation]);

  // 4. Prepare Chart Data for Asset Allocation
  const assetChartData = useMemo(() => {
    if (!data.portfolio.asset_allocation) return [];
    return Object.entries(data.portfolio.asset_allocation)
      .map(([asset, val]) => ({
        name: asset.charAt(0).toUpperCase() + asset.slice(1), // Capitalize first letter
        value: val,
      }))
      .sort((a, b) => b.value - a.value); // Sort largest to smallest
  }, [data.portfolio.asset_allocation]);

  // 5. Determine Risk Badge Color
  const getRiskColor = (risk: string) => {
    const r = risk?.toLowerCase() || "";
    if (r === "low") return "bg-green-100 text-green-700 border-green-200";
    if (r === "medium" || r === "moderate")
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    if (r === "high" || r === "aggressive")
      return "bg-red-100 text-red-700 border-red-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Your AI Retirement Plan
          </h2>
          <p className="text-slate-500">
            A personalized strategy to reach your target corpus.
          </p>
        </div>

        {/* Button & Badge Container */}
        <div className="flex items-center gap-3">
          <div
            className={`px-4 py-1.5 rounded-full border text-sm font-semibold flex items-center gap-2 ${getRiskColor(data.portfolio?.risk_profile)}`}
          >
            <ShieldAlert size={16} />
            {data.portfolio?.risk_profile
              ? data.portfolio.risk_profile.charAt(0).toUpperCase() +
                data.portfolio.risk_profile.slice(1)
              : "Unknown"}{" "}
            Risk Profile
          </div>

          <button
            onClick={onSimulateGoal}
            className="flex items-center px-4 py-1.5 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-colors shadow-sm"
          >
            Simulate Goal
          </button>

          {/* Edit/Regenerate Button */}
          <button
            onClick={onRegenerate}
            className="flex items-center px-4 py-1.5 rounded-full border-0 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm"
          >
            Regenerate Response
          </button>
        </div>
      </div>

      {/* ===== 4 Top Stat Cards ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Target Corpus */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Target size={20} />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">
              Target Corpus
            </p>
            <h3 className="text-2xl font-bold text-slate-900">
              {formatCurrency(data.retirement_corpus || 0)}
            </h3>
          </div>
        </div>

        {/* Expected Return */}
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
              {formatPercent(data.portfolio?.expected_return || 0)}
            </h3>
          </div>
        </div>

        {/* Timeline */}
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
              {data.years_to_retirement || 0} Years
            </h3>
          </div>
        </div>

        {/* Portfolio Type */}
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
              {data.portfolio?.recommended_portfolio || "N/A"}
            </h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ===== Chart & Table Section (Left Side) ===== */}
        <div className="lg:col-span-2 space-y-6">
          {/* Broad Asset Allocation Chart */}
          {assetChartData.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-lg text-slate-900">
                  Asset Class Allocation
                </h3>
              </div>

              <div className="flex flex-col md:flex-row items-center p-6 gap-8">
                {/* Donut Chart */}
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
                          <Cell
                            key={`cell-${index}`}
                            fill={ASSET_COLORS[index % ASSET_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value: number) => [
                          `${value}%`,
                          "Allocation",
                        ]}
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Text inside Donut */}
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-sm text-slate-500 font-medium">
                      Total
                    </span>
                    <span className="text-xl font-bold text-slate-900">
                      100%
                    </span>
                  </div>
                </div>

                {/* Allocation List / Legend */}
                <div className="w-full md:w-1/2 flex flex-col gap-3">
                  {assetChartData.map((item, idx) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor:
                              ASSET_COLORS[idx % ASSET_COLORS.length],
                          }}
                        ></div>
                        <span className="font-medium text-slate-700">
                          {item.name}
                        </span>
                      </div>
                      <span className="font-semibold text-slate-900">
                        {item.value}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Specific Stock Allocation Chart */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900">
                Equity Composition (Stocks)
              </h3>
            </div>

            <div className="flex flex-col md:flex-row items-center p-6 gap-8">
              {/* Donut Chart */}
              <div className="h-64 w-full md:w-1/2 relative flex justify-center items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stockChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {stockChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={STOCK_COLORS[index % STOCK_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value: number) => [
                        `${value.toFixed(2)}%`,
                        "Allocation",
                      ]}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Text inside Donut */}
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-sm text-slate-500 font-medium">
                    Equity
                  </span>
                  <span className="text-xl font-bold text-slate-900">
                    Split
                  </span>
                </div>
              </div>

              {/* Allocation List / Legend */}
              <div className="w-full md:w-1/2 flex flex-col gap-3">
                {stockChartData.map((item, idx) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor:
                            STOCK_COLORS[idx % STOCK_COLORS.length],
                        }}
                      ></div>
                      <span className="font-medium text-slate-700">
                        {item.name.replace(".NS", "")}
                      </span>
                    </div>
                    <span className="font-semibold text-slate-900">
                      {item.value.toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Detailed Stocks Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">
                Stock Breakdown
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                  <tr>
                    <th className="p-4 font-semibold">Asset / Ticker</th>
                    <th className="p-4 font-semibold text-right">Allocation</th>
                    <th className="p-4 font-semibold text-right">
                      Expected Return
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.portfolio?.stocks &&
                    data.portfolio.stocks.map((stock) => (
                      <tr
                        key={stock.ticker}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="p-4 font-medium text-slate-900 flex items-center gap-2">
                          {stock.ticker.replace(".NS", "")}
                        </td>
                        <td className="p-4 text-right font-medium text-slate-700">
                          {data.portfolio.allocation[stock.ticker]?.toFixed(2)}%
                        </td>
                        <td className="p-4 text-right font-medium text-emerald-600">
                          {formatPercent(stock.expected_return)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ===== AI Explanation (Right Side Sidebar) ===== */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-b from-blue-50 to-indigo-50/30 border border-blue-100 rounded-2xl h-full shadow-sm flex flex-col max-h-[calc(100vh-6rem)] sticky top-6">
            <div className="p-6 pb-4 border-b border-blue-100/50 shrink-0">
              <div className="flex items-center gap-2 text-blue-800">
                <Sparkles size={20} className="text-blue-600" />
                <h3 className="font-bold text-lg">AI Rationale</h3>
              </div>
            </div>

            {/* Scrollable text area */}
            <div className="p-6 overflow-y-auto">
              <div className="prose prose-sm prose-slate max-w-none space-y-4 text-slate-700 leading-relaxed">
                {data.portfolio?.ai_explanation ? (
                  data.portfolio.ai_explanation
                    .split("\n\n")
                    .map((paragraph, idx) => {
                      // If the paragraph starts with a bullet point, format it
                      if (
                        paragraph.trim().startsWith("*") ||
                        paragraph.trim().startsWith("-")
                      ) {
                        const bullets = paragraph
                          .split("\n")
                          .filter((b) => b.trim() !== "");
                        return (
                          <ul
                            key={idx}
                            className="list-disc pl-5 space-y-2 marker:text-blue-400"
                          >
                            {bullets.map((bullet, bIdx) => (
                              <li key={bIdx}>
                                {bullet.replace(/^[-*]\s*/, "").trim()}
                              </li>
                            ))}
                          </ul>
                        );
                      }
                      // Otherwise render as a normal paragraph
                      return <p key={idx}>{paragraph}</p>;
                    })
                ) : (
                  <p className="text-slate-400 italic">
                    No explanation available.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RetirementDashboard;
