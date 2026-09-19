# FinancePRO — Smart Personal Finance & Investment Advisor

A personalized AI-powered wealth mentor that adapts to every stage of life — built with React, FastAPI, and Groq AI.

---

## Overview

FinancePRO is a full-stack personal finance platform that combines:

- profile-aware investment recommendation,
- goal planning with Monte Carlo simulation,
- contextual AI assistance, and
- user-friendly visual analytics.

The product is designed for three life-stage segments:

- **Fresh Graduate**: growth and habit-building focus
- **Middle-Age**: risk-return balance and goal consolidation
- **Elderly**: capital preservation and stable planning

---

## Core Features

### 1) Authentication and Profile Persistence
- Secure sign-up/login with profile persistence in app backend.
- Returning users can resume from saved profile and recommendation context.

### 2) Multi-Step Onboarding
- Captures personal profile, income/expenses, goals, and risk questionnaire.
- Maps each user to `fresh-graduate`, `middle-age`, or `elderly`.

### 3) Dashboard Overview
- Shows financial health indicators and budget insights.
- Includes savings, risk profile, and actionable recommendations.

### 4) AI Investment Recommendation
- Generates stock-level, sector-level, and asset-class allocation.
- Provides expected return/volatility and AI explanation.

### 5) Goal Simulation (Monte Carlo)
- Allows what-if analysis for SIP, return, volatility, inflation, and timeline.
- Returns probability of success with P10/P50/P90 outcomes.

### 6) Retirement Planning
- Computes inflation-aware retirement corpus and portfolio guidance.

### 7) FinanceBot (AI Chat)
- Persistent floating chatbot available on all pages.
- Uses current page and user context for personalized responses.

### 8) Report Export
- Supports financial report generation for dashboard/recommendation context.

---

## Project Structure

```text
finance-companion/
├── frontend/          # React + Vite + TypeScript (UI)
    ├──src
       ├──components
          ├──dashboard
          └── ui
       ├──hooks
       ├──lib
       ├──pages
       ├──store
       ├──test
       ├──types
       ├──App.tsx
       └──main.tsx
├── model-backend/     # FastAPI + ML + Groq AI services
    ├──api
    ├──config
    ├──ml
    ├──models
    ├──schemas
    └──services

└── app-backend/      # Node.js + Express + MongoDB (Auth/Persistence)
    ├──src
       ├──config
       ├──controllers
       ├──middleware
       ├──models
       ├──routes
       └──scripts
    ├──app.js
    └──server.js
```

---

## Prerequisites

Install the following before setup:

| Tool | Version | Check |
|------|---------|-------|
| Node.js | **18+** | `node --version` |
| nvm | any | `nvm --version` |
| Python | **3.12.3** | `python --version` (Windows), `python3 --version` (Linux/macOS) |
| pip | any | `pip --version` |
| Git | any | `git --version` |

---

## Start Here (Quick Setup)

After cloning and pulling latest changes:

1. Configure Python (`3.12.3`) and Node (`18+`).
2. Set up model backend dependencies and `.env`.
3. Set up frontend dependencies and `.env`.
4. Run all three services:
   - Frontend (`frontend`)
   - Model backend (`model-backend`)
   - App backend (`app-backend`)

Use the detailed steps in the next sections.

---

## Environment Setup

### 1) Model Backend Environment

Create `model-backend/.env`:

```env
GROQ_API_KEY=your_groq_api_key_here
NEWS_API_KEY=your_news_api_key_here
```

- Groq key: [https://console.groq.com](https://console.groq.com)
- News key: [https://newsapi.org/register](https://newsapi.org/register)

### 2) Frontend Environment

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_MODEL_API_URL=http://localhost:8000
```

### 3) App Backend Environment

Create `app-backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=finance_companion
JWT_SECRET=replace_with_a_secure_secret
JWT_EXPIRES_IN=7d
MODEL_API_URL=http://localhost:8000
PYTHON_API_URL=http://localhost:8000
CORS_ORIGIN=http://localhost:8080
```

> `MONGODB_URI` and `JWT_SECRET` are required for app-backend startup.

---

## Running the Project

Run **3 terminals** in parallel.

### Terminal 1 — Frontend

```bash
cd finance-companion/frontend
npm install
npm run dev
```

Default: `http://localhost:8080`

### Terminal 2 — Model Backend (FastAPI)

```bash
cd finance-companion/model-backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Linux/macOS
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

Default: `http://localhost:8000`

### Terminal 3 — App Backend (Node + MongoDB)

```bash
cd finance-companion/app-backend
npm install
npm start
```

Default: `http://localhost:5000`

### Open the App

Once all services are running, open:

- `http://localhost:8080`

---

## Using the AI Chatbot

1. Complete onboarding first.
2. Click the floating blue chat bubble at bottom-right.
3. Ask context-based questions such as:
   - "What does my health score mean?"
   - "How can I improve my savings rate?"
   - "Explain my investment allocation."
   - "What if I invest 5000 more per month?"

FinanceBot automatically uses:

- current page context,
- age-group context,
- profile + goal + risk context.

---

## User Flow 

The UI is built around a guided flow. Add screenshots under `docs/screenshots/` and update these links.

1. **Auth + Onboarding**
   - User signs in and completes profile, goal, and risk setup.
   - <img width="1498" height="844" alt="image" src="https://github.com/user-attachments/assets/717fefe4-e8f6-4498-9dd2-8c44942dafcb" />
   - <img width="580" height="541" alt="image" src="https://github.com/user-attachments/assets/8c846ece-c86d-40ec-875b-49364fc2f1ee" />


2. **Dashboard**
   - User sees health score, budget insights, and quick actions.
   - <img width="1661" height="1237" alt="image" src="https://github.com/user-attachments/assets/981626e9-ff5b-414f-9ad5-048cc8430592" />


3. **Investments**
   - User generates AI portfolio recommendation and explanation.
   - <img width="765" height="885" alt="image" src="https://github.com/user-attachments/assets/5cc9367d-a0d3-46a7-bf22-bd95768c9a83" />

4. **Goal Simulation**
   - User runs Monte Carlo simulation with custom assumptions.
   - <img width="1646" height="2250" alt="image" src="https://github.com/user-attachments/assets/9b86a7e4-12d5-4fae-b447-af60a6781d03" />


5. **FinanceBot**
   - User asks context-aware financial questions in chat.
   - <img width="398" height="559" alt="image" src="https://github.com/user-attachments/assets/506cc9c7-814a-4336-b12e-4cb67c1d9fa0" />


6. **Report Export**
   - User downloads summary report for review/tracking.
   - <img width="557" height="793" alt="image" src="https://github.com/user-attachments/assets/415b4dda-6082-4296-a6d7-2c44b4883ec0" />
   - <img width="555" height="785" alt="image" src="https://github.com/user-attachments/assets/6f5a66de-47ca-4d2d-984a-04b9929efc1b" />



7. **Finance Education**
   - User can gain knowledge through games, docs and videos.
   - <img width="1657" height="1599" alt="image" src="https://github.com/user-attachments/assets/749b189e-524e-43a5-b1c7-bbe11c9b604b" />

   - <img width="892" height="405" alt="image" src="https://github.com/user-attachments/assets/d0d53064-a751-4e67-989b-af48286ed51e" />


8. **Retirement Planning (for Middle age users)**
   - User can generate a retirment plan
   - <img width="1660" height="1540" alt="image" src="https://github.com/user-attachments/assets/bab59f42-eecd-44f2-a815-6907376f44bd" />


9. **Legacy and Nomination Manager (for Elderly users)**
    - User can store his nominees
    - <img width="487" height="424" alt="s1" src="https://github.com/user-attachments/assets/26491ce9-27ce-4c13-8af5-94df1a73f9ff" />



---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| State Management | Zustand |
| Charts | Recharts |
| Model Backend | FastAPI (Python), Groq AI |
| App Backend | Node.js, Express, MongoDB |
| ML/Finance | NumPy, SciPy, scikit-learn, Markowitz, Monte Carlo |

---

## API Endpoints

Some APIs are core to the current UI flow, while some are auxiliary/admin/feature-specific.

### Model Backend APIs (`http://localhost:8000/api`)

| Method | Endpoint | Used In UI | Description |
|--------|----------|------------|-------------|
| `GET` | `/health` | Yes | Health check |
| `POST` | `/recommend` | Yes | Investment recommendation |
| `POST` | `/goal-simulation` | Yes | Monte Carlo simulation |
| `POST` | `/chat` | Yes | FinanceBot response |
| `GET` | `/news` | Yes | Financial news feed |
| `POST` | `/retirement-plan` | Yes | Retirement planning |

### App Backend APIs (`http://localhost:5000/api`)

| Method | Endpoint | Used In UI | Description |
|--------|----------|------------|-------------|
| `POST` | `/auth/register` | Yes | User registration |
| `POST` | `/auth/login` | Yes | User login |
| `GET` | `/auth/me` | Yes | Current authenticated user |
| `GET` | `/users/me` | Yes | User profile |
| `PATCH` | `/users/me` | Partial | Update user profile |
| `POST` | `/users/onboarding` | Yes | Save onboarding data |
| `POST` | `/investments/recommend` | Yes | Save/retrieve recommendation workflow |
| `GET` | `/investments/recommendation` | Yes | Fetch saved recommendation |
| `GET` | `/retirement-plan/` | Feature-specific | Get saved retirement plan |
| `POST` | `/retirement-plan/generate` | Feature-specific | Generate retirement plan |
| `POST` | `/nominations/add` | Feature-specific | Add or update nomination |
| `GET` | `/nominations/` | Feature-specific | Get nomination |
| `DELETE` | `/nominations/` | Feature-specific | Delete nomination |
| `POST` | `/nominations/check-inactivity` | Admin/utility | Inactivity notification check |
| `POST` | `/nominations/acknowledge` | Feature-specific | Acknowledge nomination |
| `GET` | `/games/age-group/:ageGroup` | Feature-specific | Get games by age group |
| `GET` | `/games/:gameId` | Feature-specific | Get game details |
| `POST` | `/games/:gameId/submit` | Feature-specific | Submit game answers |
| `POST` | `/games/create` | Admin/dev | Create a game |

> Note: Not every endpoint is used in every UI path. Some are optional features, admin utilities, or segment-specific modules.

### Chat Request Example

```json
POST /api/chat
{
  "messages": [
    { "role": "user", "content": "What does my health score mean?" }
  ],
  "page_context": "dashboard",
  "user_context": {
    "name": "Kajal",
    "age_group": "fresh-graduate",
    "monthly_income": 50000,
    "risk_profile": "Moderate",
    "health_score": 72
  }
}
```

---

## Common Issues

### Node version mismatch

If you see `vite: not found` or crypto-related errors, switch to Node 18:

```bash
nvm use 18
```

### Chatbot fallback response

- Ensure `GROQ_API_KEY` is set in `model-backend/.env`.
- Restart model backend after updating environment.

### Port already in use

Use available ports or stop conflicting processes before startup.

---

## Security Notes

- Never commit `.env` files.
- Keep API keys private.
- Add stronger auth/rate limits before production exposure.

---

## Future Enhancements

- Experiment tracking and model performance dashboards
- Tax-aware planning and richer retirement drawdown strategy
- Expanded asset classes and scenario stress testing
- Better production observability and governance
