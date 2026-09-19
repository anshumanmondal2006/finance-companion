from fastapi import APIRouter, HTTPException
from schemas.request_schema import RecommendationRequest, ChatRequest, RetirementRequest, GoalSimulationRequest
from services.retirement_service import generate_retirement_plan
from services.recommendation_engine import recommend_plan
from services.monte_carlo_simulator import MonteCarloService
from services.chat_service import get_chat_response
from services.news_service import get_financial_news
from services.response_sanitizer import clean_nan


router = APIRouter()


@router.post("/recommend")
def recommend(data: RecommendationRequest):

    try:
        if data.goal_type == "target" and data.target is None:
            raise HTTPException(
                status_code=400,
                detail="Target amount must be provided for target goals.",
            )

        result = recommend_plan(
            age=data.age,
            income=data.income,
            expenses=data.expenses,
            risk_answers=data.risk_answers,
            goal_type=data.goal_type,
            timeline=data.timeline,
            target=data.target,
            monthly_contribution=data.monthly_contribution,
            mc_expected_return=data.expected_return,
            mc_volatility=data.volatility,
            mc_simulations=data.simulations,
            mc_inflation=data.inflation,
        )
        return clean_nan(result)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/goal-simulation")
def goal_simulation(data: GoalSimulationRequest):
    try:
        simulator = MonteCarloService(
            monthly_investment=data.monthly_sip,
            years=float(data.timeline_months) / 12.0,
            expected_return=float(data.expected_return),
            volatility=float(data.volatility),
            target_amount=float(data.target_amount),
            initial_investment=float(data.initial_investment),
            simulations=int(data.simulations),
            inflation_rate=float(data.inflation),
        )
        return simulator.run()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat")
async def chat(data: ChatRequest):
    try:
        response = await get_chat_response(
            messages=data.messages,
            user_context=data.user_context,
            page_context=data.page_context,
        )
        return {"reply": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/news")
def news():
    """Real-time financial news (from NewsAPI.org when NEWS_API_KEY is set)."""
    return {"articles": get_financial_news()}

@router.post("/retirement-plan")
def retirement_plan(data: RetirementRequest):

    result = generate_retirement_plan(data)

    return clean_nan(result)
