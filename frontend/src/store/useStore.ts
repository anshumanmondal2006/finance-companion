import type { ChatMessage } from "@/lib/api";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware"; // 1. Added persist imports
import type {
  OnboardingData,
  AnalysisResponse,
  AgeGroup,
  MonteCarloResult,
} from "@/types/finance";

const AUTH_STORAGE_KEY = "finance_auth";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
}

interface AppState {
  // Auth
  isAuthenticated: boolean;
  authToken: string | null;
  user: AuthUser | null;
  userEmail: string;
  login: (user: AuthUser, token: string) => void;
  hydrateAuth: () => void;
  logout: () => void;
  isHydrated: boolean;
  setIsHydrated: (val: boolean) => void;

  // Onboarding
  onboardingData: OnboardingData | null;
  setOnboardingData: (data: OnboardingData) => void;
  onboardingStep: number;
  setOnboardingStep: (step: number) => void;

  // Dashboard
  ageGroup: AgeGroup | null;
  setAgeGroup: (group: AgeGroup) => void;
  analysisData: AnalysisResponse | null;
  setAnalysisData: (data: AnalysisResponse) => void;
  setMonteCarloData: (mc: MonteCarloResult) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;

  // Chatbot
  chatMessages: ChatMessage[];
  isChatOpen: boolean;
  isChatLoading: boolean;
  addChatMessage: (msg: ChatMessage) => void;
  setChatOpen: (open: boolean) => void;
  setChatLoading: (loading: boolean) => void;
  clearChat: () => void;
}

// Keep these helper functions outside
const clearAuth = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
};

// 2. Wrapped the entire store in persist()
export const useStore = create<AppState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      authToken: null,
      user: null,
      userEmail: "",
      isHydrated: false,
      setIsHydrated: (val) => set({ isHydrated: val }),

      login: (user, token) => {
        // No need for persistAuth helper anymore, persist middleware handles it
        set({
          isAuthenticated: true,
          authToken: token,
          user,
          userEmail: user.email,
        });
      },

      hydrateAuth: () => {
        // This remains as a fallback for initial mount logic
        const raw = localStorage.getItem("finance-app-storage"); // Match the name below
        if (!raw) {
          set({ isHydrated: true });
          return;
        }
        set({ isHydrated: true });
      },

      logout: () => {
        set({
          isAuthenticated: false,
          authToken: null,
          user: null,
          userEmail: "",
          onboardingData: null,
          analysisData: null,
          ageGroup: null,
          isHydrated: true,
        });
      },

      onboardingData: null,
      setOnboardingData: (data) => set({ onboardingData: data }),
      onboardingStep: 0,
      setOnboardingStep: (step) => set({ onboardingStep: step }),

      ageGroup: null,
      setAgeGroup: (group) => set({ ageGroup: group }),
      analysisData: null,
      setAnalysisData: (data) => set({ analysisData: data }),
      setMonteCarloData: (mc) =>
        set((state) =>
          state.analysisData
            ? { analysisData: { ...state.analysisData, monteCarlo: mc } }
            : {}
        ),
      isLoading: false,
      setIsLoading: (loading) => set({ isLoading: loading }),
      error: null,
      setError: (error) => set({ error }),

      chatMessages: [],
      isChatOpen: false,
      isChatLoading: false,
      addChatMessage: (msg) =>
        set((state) => ({ chatMessages: [...state.chatMessages, msg] })),
      setChatOpen: (open) => set({ isChatOpen: open }),
      setChatLoading: (loading) => set({ isChatLoading: loading }),
      clearChat: () => set({ chatMessages: [] }),
    }),
    {
      name: "finance-app-storage", // 3. This key stores EVERYTHING in LocalStorage
      storage: createJSONStorage(() => localStorage),
      // Only persist these specific fields to keep storage clean
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        authToken: state.authToken,
        user: state.user,
        userEmail: state.userEmail,
        onboardingData: state.onboardingData,
        analysisData: state.analysisData,
      }),
    }
  )
);