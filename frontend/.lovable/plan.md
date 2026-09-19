

# FinancePRO — Modern Robo-Advisor Dashboard Redesign

## Design System
- **Color palette**: Blue/emerald trust-focused theme (primary blue for actions, emerald for positive metrics, warm amber for warnings, soft grays for backgrounds)
- **Style**: Clean, minimal, card-based with soft shadows, subtle hover effects, no excessive gradients
- **Typography**: Clear hierarchy — large financial figures, medium section headers, small labels

---

## Screen 1: Landing Page
- Hero section with tagline ("Smart financial planning for every stage of life")
- Three feature highlight cards (Budget, Invest, Simulate)
- Trust indicators (security badges, stats)
- CTA buttons → Login / Get Started

## Screen 2: Login / Register
- Clean centered auth card with tabs (Login / Register)
- Email + password form with validation
- Social login buttons (visual only)
- Note: No real auth backend — will use local state to simulate login flow

## Screen 3: Multi-Step Onboarding
- Step 1: **Personal Info** — Name, DOB (used for age-group detection), employment status
- Step 2: **Income & Expenses** — Monthly income, fixed/variable expenses
- Step 3: **Financial Goal** — Goal type, target amount, timeline
- Step 4: **Risk Tolerance** — Slider or quiz-style selection
- Progress bar at top, back/next navigation
- On completion → calls `/api/analyze` and routes to age-appropriate dashboard

## Screen 4: Dashboard (Shared Core + Age-Specific Sections)

### Sidebar Navigation (all groups)
- Dashboard Overview
- Budget Breakdown
- Investments
- Goal Simulation
- Settings

### Shared Dashboard Components
- **Financial Health Score** — prominent score card at top with colored ring/gauge
- **Risk Badge** — visual indicator (Conservative / Moderate / Aggressive)
- **Budget Breakdown** — donut chart + category list with progress bars
- **Investment Allocation** — donut chart for portfolio split (stocks, bonds, etc.)
- **Insights Section** — styled alert cards with icons (tips, warnings, achievements)
- Loading states, empty states, and tooltips throughout

### Age-Specific Sections
- **Fresh Graduates (18–28)**: Emergency fund tracker, student loan payoff card, "Getting Started" educational tips
- **Middle Age (29–50)**: Retirement readiness gauge, children's education fund card, net worth trend chart
- **Elderly (50+)**: Withdrawal strategy card, estate planning checklist, income sustainability indicator

## Screen 5: Budget Breakdown (Full Page)
- Detailed category-by-category breakdown with bar/donut charts
- Monthly trends line chart
- Comparison vs recommended allocations

## Screen 6: Investment Recommendation (Full Page)
- Portfolio allocation donut chart (large)
- Individual asset class cards with reasoning
- Risk-return scatter or comparison visual

## Screen 7: Goal Simulation / Monte Carlo
- Projection graph (fan chart or histogram) showing probability of reaching goal
- Success probability percentage (large, prominent)
- Adjustable inputs (monthly contribution, timeline) to re-run simulation
- Scenario comparison cards

---

## Technical Approach
- **Zustand** for global state (user profile, onboarding data, API responses, age group)
- **React Router** for all routing (landing → auth → onboarding → dashboard segments)
- **Recharts** for all charts (donut, line, histogram, gauge)
- **Reusable components**: StatCard, ChartCard, InsightAlert, ScoreGauge, RiskBadge
- **API integration**: Fetch calls to your Flask `/api/analyze` endpoint with proper loading/error states
- All Tailwind + shadcn-style components, modular file structure

