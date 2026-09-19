import type { AnalysisResponse, OnboardingData } from "@/types/finance";
import type { RecommendResponse } from "@/lib/api";

interface FinancialHealthReportPayload {
  userName?: string;
  generatedAt?: Date;
  onboardingData: OnboardingData;
  analysisData: AnalysisResponse | null;
  recommendation: RecommendResponse | null;
}

type JsPdfDoc = import("jspdf").jsPDF;

const THEME = {
  brand: [15, 76, 129] as const,
  brandSoft: [232, 243, 251] as const,
  ink: [17, 24, 39] as const,
  muted: [100, 116, 139] as const,
  border: [226, 232, 240] as const,
  success: [16, 185, 129] as const,
  warning: [234, 179, 8] as const,
  danger: [239, 68, 68] as const,
};

const PAGE = {
  left: 14,
  right: 196,
  top: 14,
  bottom: 282,
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const formatPct = (value: number) => `${Number(value).toFixed(2)}%`;

const ensureSpace = (doc: JsPdfDoc, y: number, needed: number) => {
  if (y + needed <= PAGE.bottom) return y;
  doc.addPage();
  return 22;
};

const drawRoundedCard = (
  doc: JsPdfDoc,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: readonly [number, number, number],
) => {
  doc.setDrawColor(...THEME.border);
  doc.setFillColor(...fill);
  doc.roundedRect(x, y, w, h, 2, 2, "FD");
};

const drawHeader = (doc: JsPdfDoc, name: string, generatedAt: Date) => {
  doc.setFillColor(...THEME.brand);
  doc.roundedRect(PAGE.left, PAGE.top, PAGE.right - PAGE.left, 33, 3, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(21);
  doc.text("Financial Health Report", PAGE.left + 4, PAGE.top + 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.text(
    "Portfolio, goals, and recommendation summary",
    PAGE.left + 4,
    PAGE.top + 19,
  );
  doc.text(`Prepared for ${name}`, PAGE.left + 4, PAGE.top + 26);

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(PAGE.right - 62, PAGE.top + 7, 56, 18, 2, 2, "F");
  doc.setTextColor(...THEME.brand);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Generated", PAGE.right - 58, PAGE.top + 13);
  doc.setFont("helvetica", "normal");
  doc.text(generatedAt.toLocaleDateString(), PAGE.right - 58, PAGE.top + 19);

  return PAGE.top + 42;
};

const drawSectionTitle = (doc: JsPdfDoc, y: number, title: string) => {
  doc.setFillColor(...THEME.brandSoft);
  doc.roundedRect(PAGE.left, y - 5, PAGE.right - PAGE.left, 9, 1.5, 1.5, "F");
  doc.setTextColor(...THEME.brand);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(title, PAGE.left + 3, y + 1);
  return y + 8;
};

const drawKeyValueRow = (
  doc: JsPdfDoc,
  y: number,
  label: string,
  value: string,
) => {
  doc.setTextColor(...THEME.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(label, PAGE.left + 1, y);

  doc.setTextColor(...THEME.ink);
  doc.setFont("helvetica", "bold");
  doc.text(value, PAGE.right - 1, y, { align: "right" });
};

const drawParagraph = (
  doc: JsPdfDoc,
  y: number,
  text: string,
  maxWidth = 176,
) => {
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...THEME.ink);
  doc.setFontSize(10.5);
  const wrapped = doc.splitTextToSize(text, maxWidth) as string[];
  let currentY = y;

  wrapped.forEach((line) => {
    currentY = ensureSpace(doc, currentY, 8);
    doc.text(line, PAGE.left + 2, currentY);
    currentY += 5.3;
  });

  return currentY;
};

const getWrappedLineCount = (doc: JsPdfDoc, text: string, maxWidth: number) =>
  (doc.splitTextToSize(text, maxWidth) as string[]).length;

const drawBulletList = (
  doc: JsPdfDoc,
  y: number,
  items: string[],
  maxWidth = 166,
) => {
  let currentY = y;

  items.forEach((item) => {
    const wrapped = doc.splitTextToSize(item, maxWidth) as string[];
    currentY = ensureSpace(doc, currentY, Math.max(8, wrapped.length * 5));

    doc.setTextColor(...THEME.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text("•", PAGE.left + 2, currentY);

    doc.setTextColor(...THEME.ink);
    doc.text(wrapped, PAGE.left + 6, currentY);
    currentY += Math.max(6, wrapped.length * 4.9);
  });

  return currentY;
};

const drawKpiCards = (
  doc: JsPdfDoc,
  y: number,
  cards: Array<{
    label: string;
    value: string;
    tone?: "good" | "warn" | "bad";
  }>,
) => {
  const gap = 4;
  const cardW = (PAGE.right - PAGE.left - gap * 3) / 4;
  const cardH = 20;

  cards.forEach((card, i) => {
    const x = PAGE.left + i * (cardW + gap);
    drawRoundedCard(doc, x, y, cardW, cardH, [255, 255, 255]);

    const toneColor: readonly [number, number, number] =
      card.tone === "good"
        ? THEME.success
        : card.tone === "warn"
          ? THEME.warning
          : card.tone === "bad"
            ? THEME.danger
            : THEME.brand;

    doc.setFillColor(...toneColor);
    doc.roundedRect(x + 1.5, y + 1.5, cardW - 3, 1.3, 0.6, 0.6, "F");

    doc.setTextColor(...THEME.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(card.label, x + 3, y + 8);

    doc.setTextColor(...THEME.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(card.value, x + 3, y + 15);
  });

  return y + cardH + 5;
};

const drawAllocationBar = (
  doc: JsPdfDoc,
  y: number,
  label: string,
  pct: number,
  color: readonly [number, number, number],
) => {
  const bounded = Math.max(0, Math.min(100, pct));
  doc.setTextColor(...THEME.ink);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(label, PAGE.left + 1, y);
  doc.text(`${bounded.toFixed(2)}%`, PAGE.right - 1, y, { align: "right" });

  const trackY = y + 2;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(
    PAGE.left + 1,
    trackY,
    PAGE.right - PAGE.left - 2,
    4,
    1.5,
    1.5,
    "F",
  );

  const fillW = ((PAGE.right - PAGE.left - 2) * bounded) / 100;
  doc.setFillColor(...color);
  doc.roundedRect(PAGE.left + 1, trackY, fillW, 4, 1.5, 1.5, "F");

  return y + 10;
};

export const downloadFinancialHealthReport = async (
  payload: FinancialHealthReportPayload,
) => {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const generatedAt = payload.generatedAt ?? new Date();
  const { onboardingData, analysisData, recommendation, userName } = payload;

  const income = onboardingData.financial.monthlyIncome;
  const expenses =
    onboardingData.financial.fixedExpenses +
    onboardingData.financial.variableExpenses;
  const savings = income - expenses;
  const savingsRate = income > 0 ? (savings / income) * 100 : 0;

  const userDisplayName = userName || onboardingData.profile.name || "User";
  let y = drawHeader(doc, userDisplayName, generatedAt);

  y = drawKpiCards(doc, y, [
    { label: "Income", value: formatCurrency(income) },
    {
      label: "Expenses",
      value: formatCurrency(expenses),
      tone: savings < 0 ? "bad" : undefined,
    },
    {
      label: "Savings Rate",
      value: formatPct(savingsRate),
      tone: savingsRate >= 20 ? "good" : savingsRate >= 10 ? "warn" : "bad",
    },
    {
      label: "Health Score",
      value: analysisData?.healthScore
        ? `${analysisData.healthScore}/100`
        : "N/A",
      tone:
        (analysisData?.healthScore ?? 0) >= 70
          ? "good"
          : (analysisData?.healthScore ?? 0) >= 45
            ? "warn"
            : "bad",
    },
  ]);

  y = ensureSpace(doc, y, 48);
  y = drawSectionTitle(doc, y, "Financial Snapshot");
  drawRoundedCard(
    doc,
    PAGE.left,
    y - 2,
    PAGE.right - PAGE.left,
    34,
    [255, 255, 255],
  );
  y += 5;
  drawKeyValueRow(
    doc,
    y,
    "Risk profile",
    analysisData?.riskProfile ?? "Not available",
  );
  y += 6;
  drawKeyValueRow(
    doc,
    y,
    "Monthly fixed expenses",
    formatCurrency(onboardingData.financial.fixedExpenses),
  );
  y += 6;
  drawKeyValueRow(
    doc,
    y,
    "Monthly variable expenses",
    formatCurrency(onboardingData.financial.variableExpenses),
  );
  y += 6;
  drawKeyValueRow(doc, y, "Monthly savings", formatCurrency(savings));
  y += 10;

  y = ensureSpace(doc, y, 32);
  y = drawSectionTitle(doc, y, "Goals Summary");
  drawRoundedCard(
    doc,
    PAGE.left,
    y - 2,
    PAGE.right - PAGE.left,
    20,
    [255, 255, 255],
  );
  y += 5;
  drawKeyValueRow(doc, y, "Goal type", onboardingData.goal.goalType);
  y += 6;
  drawKeyValueRow(
    doc,
    y,
    "Target amount",
    formatCurrency(onboardingData.goal.targetAmount),
  );
  y += 6;
  drawKeyValueRow(
    doc,
    y,
    "Timeline",
    `${onboardingData.goal.timelineMonths} months`,
  );
  y += 8;

  y = ensureSpace(doc, y, 58);
  y = drawSectionTitle(doc, y, "Portfolio Allocation");
  drawRoundedCard(
    doc,
    PAGE.left,
    y - 2,
    PAGE.right - PAGE.left,
    46,
    [255, 255, 255],
  );
  y += 5;

  if (recommendation?.asset_allocation) {
    // Ensure percentages are consistent and non-negative.
    const assetAlloc = {
      equity: Math.max(0, recommendation.asset_allocation.equity ?? 0),
      bonds: Math.max(0, recommendation.asset_allocation.bonds ?? 0),
      gold: Math.max(0, recommendation.asset_allocation.gold ?? 0),
      cash: Math.max(0, recommendation.asset_allocation.cash ?? 0),
    };
    const sum =
      assetAlloc.equity + assetAlloc.bonds + assetAlloc.gold + assetAlloc.cash;
    const normalize = (v: number) => (sum > 0 ? (v / sum) * 100 : 0);

    y = drawAllocationBar(
      doc,
      y,
      "Equity",
      normalize(assetAlloc.equity),
      THEME.brand,
    );
    y = drawAllocationBar(
      doc,
      y,
      "Bonds",
      normalize(assetAlloc.bonds),
      THEME.success,
    );
    y = drawAllocationBar(
      doc,
      y,
      "Gold",
      normalize(assetAlloc.gold),
      THEME.warning,
    );
    y = drawAllocationBar(
      doc,
      y,
      "Cash",
      normalize(assetAlloc.cash),
      [148, 163, 184],
    );

    if (recommendation?.sector_allocation) {
      y = ensureSpace(doc, y, 20);
      y = drawSectionTitle(doc, y, "Sector Allocation");
      drawRoundedCard(doc, PAGE.left, y - 2, PAGE.right - PAGE.left, 46, [255, 255, 255]);
      y += 5;
      const sectorEntries = Object.entries(recommendation.sector_allocation)
        .filter(([_, pct]) => pct > 0)
        .sort((a, b) => b[1] - a[1]);
      sectorEntries.forEach(([name, pct]) => {
        y = drawAllocationBar(doc, y, name, pct, THEME.brandSoft);
      });
    }
  } else if (analysisData?.investmentAllocation?.length) {
    const colors: Array<readonly [number, number, number]> = [
      THEME.brand,
      THEME.success,
      THEME.warning,
      [236, 72, 153],
    ];
    analysisData.investmentAllocation.slice(0, 4).forEach((item, idx) => {
      y = drawAllocationBar(
        doc,
        y,
        item.name,
        item.allocation,
        colors[idx % colors.length],
      );
    });
  } else {
    doc.setTextColor(...THEME.muted);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.text(
      "Portfolio allocation is not available yet.",
      PAGE.left + 3,
      y + 5,
    );
    y += 14;
  }

  y = ensureSpace(doc, y, 62);
  y = drawSectionTitle(doc, y, "Recommendation Summary");

  if (recommendation) {
    y = ensureSpace(doc, y, 34);
    drawRoundedCard(
      doc,
      PAGE.left,
      y - 2,
      PAGE.right - PAGE.left,
      28,
      [255, 255, 255],
    );
    y += 5;

    drawKeyValueRow(
      doc,
      y,
      "Strategy theme",
      recommendation.recommended_portfolio ?? "N/A",
    );
    y += 6;
    drawKeyValueRow(doc, y, "Model risk profile", recommendation.risk_profile);
    y += 6;
    drawKeyValueRow(
      doc,
      y,
      "Expected annual return",
      formatPct(recommendation.expected_return * 100),
    );
    y += 6;
    drawKeyValueRow(
      doc,
      y,
      "Projected future value",
      recommendation.future_value
        ? formatCurrency(recommendation.future_value)
        : "Not available",
    );
    y += 8;

    const topStocks = recommendation.stocks.slice(0, 4).map((stock) => {
      const alloc = recommendation.allocation[stock.ticker] ?? 0;
      return `${stock.ticker} (${formatPct(alloc)} | exp ${formatPct(stock.expected_return * 100)})`;
    });

    const topPickLineCount = topStocks.reduce(
      (acc, item) => acc + getWrappedLineCount(doc, item, 166),
      0,
    );
    const topPicksCardHeight = Math.max(18, 9 + topPickLineCount * 4.9);

    y = ensureSpace(doc, y, topPicksCardHeight + 4);
    drawRoundedCard(
      doc,
      PAGE.left,
      y - 2,
      PAGE.right - PAGE.left,
      topPicksCardHeight,
      [255, 255, 255],
    );

    doc.setTextColor(...THEME.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("Top picks", PAGE.left + 2, y);
    y += 5;
    y = drawBulletList(doc, y, topStocks);

    y += 4;
    y = ensureSpace(doc, y, 12);
    doc.setTextColor(...THEME.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("AI rationale", PAGE.left + 2, y);
    y += 5;

    y = drawParagraph(doc, y, recommendation.ai_explanation);
  } else {
    y = ensureSpace(doc, y, 18);
    drawRoundedCard(
      doc,
      PAGE.left,
      y - 2,
      PAGE.right - PAGE.left,
      14,
      [255, 255, 255],
    );
    doc.setTextColor(...THEME.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const fallback =
      "No generated recommendation found. Visit Investments and generate a response to include model-backed recommendations in this report.";
    y = drawParagraph(doc, y + 1, fallback);
  }

  y = ensureSpace(doc, y + 2, 44);
  y = drawSectionTitle(doc, y, "Key Insights");

  const insights = analysisData?.insights ?? [];
  if (!insights.length) {
    drawRoundedCard(
      doc,
      PAGE.left,
      y - 2,
      PAGE.right - PAGE.left,
      14,
      [255, 255, 255],
    );
    doc.setTextColor(...THEME.muted);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.text("Insights are currently unavailable.", PAGE.left + 3, y + 5);
  } else {
    insights.slice(0, 5).forEach((insight) => {
      y = ensureSpace(doc, y, 22);
      drawRoundedCard(
        doc,
        PAGE.left,
        y - 2,
        PAGE.right - PAGE.left,
        16,
        [255, 255, 255],
      );

      doc.setTextColor(...THEME.brand);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.text(insight.title, PAGE.left + 3, y + 4);

      doc.setTextColor(...THEME.ink);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      const wrapped = doc.splitTextToSize(insight.message, 172) as string[];
      doc.text(wrapped, PAGE.left + 3, y + 9);
      y += Math.max(18, 8 + wrapped.length * 4.4);
    });
  }

  const dateSuffix = generatedAt.toISOString().slice(0, 10);
  doc.save(`financial-health-report-${dateSuffix}.pdf`);
};
