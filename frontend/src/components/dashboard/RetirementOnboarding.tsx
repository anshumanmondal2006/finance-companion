import React, { useState } from 'react';
// Changed IndianRupee to DollarSign
import { Target, TrendingDown, Lock, DollarSign, Sparkles, Info } from 'lucide-react';
import { useStore } from '@/store/useStore';

// Helper function to calculate age from DOB string
const calculateAge = (dobString?: string) => {
  if (!dobString) return 30; // Fallback just in case it's missing
  
  const birthday = new Date(dobString);
  const today = new Date();
  
  let age = today.getFullYear() - birthday.getFullYear();
  const m = today.getMonth() - birthday.getMonth();
  
  if (m < 0 || (m === 0 && today.getDate() < birthday.getDate())) {
    age--;
  }
  
  return age;
};

const RetirementOnboarding = ({ onSubmitPlan, isGenerating }) => {
  const [retirementAge, setRetirementAge] = useState(60);
  const [inflationScenario, setInflationScenario] = useState('realistic');

  // Pull REAL data from your Zustand store
  const { onboardingData } = useStore();
  
  // Calculate income and expenses safely, fallback to 0 if missing
  const income = onboardingData?.financial?.monthlyIncome || 0;
  const expenses = (onboardingData?.financial?.fixedExpenses || 0) + (onboardingData?.financial?.variableExpenses || 0);
  
  // Dynamically calculate the user's real age from their DOB
  const age = calculateAge(onboardingData?.profile?.dob); 

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Constructing the payload using the REAL DB fields
    const payload = {
      age: age,
      retirement_age: Number(retirementAge),
      monthly_expenses: expenses,
      inflation_scenario: inflationScenario,
      income: income,
    };

    if (onSubmitPlan) {
      onSubmitPlan(payload);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-2 md:p-6 font-sans animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="mb-10 mt-4 text-left">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-xs font-semibold uppercase tracking-wider mb-4">
          <Sparkles size={14} className="text-blue-500" />
          AI-Powered Strategy
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
          Build Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Retirement</span>
        </h1>
        <p className="text-slate-500 text-lg max-w-2xl leading-relaxed">
          We've securely synced your financial profile. Define your timeline below, and our engine will craft a portfolio designed for your future.
        </p>
      </div>

      <div className="bg-white border border-slate-200/60 shadow-xl shadow-slate-200/20 rounded-3xl p-6 md:p-10">
        <form onSubmit={handleSubmit} className="space-y-10">
          
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2 border-b pb-3">
              <Lock size={18} className="text-slate-400" />
              Synced Profile Data
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-500">Current Age</label>
                <input 
                  type="text" 
                  value={`${age} Years`}
                  disabled
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-xl cursor-not-allowed font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-500">Monthly Income</label>
                <div className="relative">
                  {/* Changed to DollarSign */}
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><DollarSign size={16}/></div>
                  <input 
                    type="text" 
                    value={income.toLocaleString()}
                    disabled
                    className="w-full p-3.5 pl-10 bg-slate-50 border border-slate-200 text-slate-500 rounded-xl cursor-not-allowed font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-500">Monthly Expenses</label>
                <div className="relative">
                  {/* Changed to DollarSign */}
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><DollarSign size={16}/></div>
                  <input 
                    type="text" 
                    value={expenses.toLocaleString()}
                    disabled
                    className="w-full p-3.5 pl-10 bg-slate-50 border border-slate-200 text-slate-500 rounded-xl cursor-not-allowed font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2 border-b pb-3">
              <Target size={18} className="text-blue-600" />
              Your Goals
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-800">Target Retirement Age</label>
                <input 
                  type="number" 
                  min={age + 1} 
                  max="100"
                  value={retirementAge}
                  onChange={(e) => setRetirementAge(e.target.value)}
                  className="w-full p-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all font-medium text-slate-700 bg-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1.5 relative group w-max">
                  <label className="text-sm font-semibold text-slate-800 cursor-help">
                    Expected Inflation Scenario
                  </label>
                  <Info size={15} className="text-slate-400 transition-colors group-hover:text-blue-500 cursor-help" />
                  
                  {/* Tooltip Content (Pure Tailwind CSS) */}
                  <div className="absolute bottom-full left-0 mb-2 w-72 md:w-80 p-3.5 bg-slate-800 text-white text-xs leading-relaxed rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 shadow-xl pointer-events-none">
                    <p className="mb-2">
                      Inflation reduces your purchasing power over time. We use this to estimate what your current expenses will cost when you retire, which dictates your final <strong>Target Corpus</strong>.
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-slate-300">
                      <li><span className="text-white font-semibold">Conservative:</span> Assumes lower inflation.</li>
                      <li><span className="text-white font-semibold">Realistic:</span> Based on historical averages.</li>
                      <li><span className="text-white font-semibold">Pessimistic:</span> Assumes high inflation.</li>
                    </ul>
                    {/* Small CSS Triangle pointing down */}
                    <div className="absolute top-full left-5 -mt-1 border-4 border-transparent border-t-slate-800"></div>
                  </div>
                </div>

                <div className="relative">
                  <select 
                    value={inflationScenario}
                    onChange={(e) => setInflationScenario(e.target.value)}
                    className="w-full p-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all bg-white appearance-none font-medium text-slate-700 cursor-pointer"
                  >
                    <option value="conservative">Conservative</option>
                    <option value="realistic">Realistic</option>
                    <option value="pessimistic">Pessimistic</option>
                  </select>
                  <TrendingDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isGenerating}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-lg rounded-xl shadow-md transition-all active:scale-[0.99] disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing Data...
              </>
            ) : (
              'Generate Retirement Plan'
            )}
          </button>
          
        </form>
      </div>
    </div>
  );
};

export default RetirementOnboarding;