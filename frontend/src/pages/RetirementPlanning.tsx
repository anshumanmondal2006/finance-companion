import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchRetirementPlan,
  generateRetirementPlan,
} from "../lib/retirementApi";
import RetirementOnboarding from "../components/dashboard/RetirementOnboarding";
import RetirementDashboard from "../components/dashboard/RetirementDashboard";
import { useStore } from "../store/useStore";

const RetirementPlanning = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [planData, setPlanData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // NEW: State to control when to show the form vs the dashboard
  const [showForm, setShowForm] = useState(false);

  const { authToken } = useStore();

  const handleSimulateGoal = () => {
    if (!planData) return;

    const income = Number(planData?.inputsUsed?.income ?? 0);
    const expenses = Number(planData?.inputsUsed?.monthlyExpenses ?? 0);
    const savings = Math.max(0, income - expenses);

    navigate("/dashboard/simulation", {
      state: {
        prefill: {
          contribution: savings,
          expectedReturns: Number(planData?.portfolio?.expected_return ?? 0),
          // ONLY THIS LINE CHANGED: Converts years to retirement into months
          timeline: Number(planData?.years_to_retirement ?? 0) * 12,
          targetAmount: Number(planData?.retirement_corpus ?? 0),
          inflation: 0,
          source: "retirement",
        },
      },
    });
  };

  useEffect(() => {
    if (!authToken) return;

    const loadData = async () => {
      try {
        setIsLoading(true);
        const response = await fetchRetirementPlan();

        if (response.hasPlan) {
          setPlanData(response.data);
          setShowForm(false); // We have a plan, hide the form
        } else {
          setPlanData(null);
          setShowForm(true); // No plan exists, show the form
        }
      } catch (err: any) {
        setError(err.message || "An error occurred while fetching your data.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [authToken]);

  // Handle the form submission from the Onboarding component
  const handleGeneratePlan = async (formData: any) => {
    setIsGenerating(true);
    setError(null);

    try {
      const newPlan = await generateRetirementPlan(formData);
      setPlanData(newPlan.data);
      setShowForm(false); // Generation successful, switch back to dashboard!
    } catch (err: any) {
      setError(
        err.message || "Failed to generate your plan. Please try again.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // State A: Initial Page Load
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-500 font-medium">
          Loading your financial profile...
        </p>
      </div>
    );
  }

  // State B: Show Error if something broke
  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="bg-red-50 text-red-600 p-4 rounded-xl inline-block">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // State C: Show Onboarding Form
  // (Triggered if no plan exists, or if the user clicked 'Edit & Regenerate')
  if (showForm || !planData) {
    return (
      <div className="animate-in fade-in zoom-in-95 duration-500">
        <RetirementOnboarding
          onSubmitPlan={handleGeneratePlan}
          isGenerating={isGenerating}
          // PRO TIP: If your RetirementOnboarding form accepts an 'initialData' prop,
          // you can pass planData.inputsUsed here so their old answers are pre-filled!
        />
      </div>
    );
  }

  // State D: Plan Exists and user is NOT editing -> Show Dashboard
  return (
    <div className="animate-in fade-in duration-500 max-w-7xl mx-auto w-full">
      <RetirementDashboard
        data={planData}
        onSimulateGoal={handleSimulateGoal}
        onRegenerate={() => setShowForm(true)} // Toggles the form back on
      />
    </div>
  );
};

export default RetirementPlanning;
