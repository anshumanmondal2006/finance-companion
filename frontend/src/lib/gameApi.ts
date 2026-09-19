import { useStore } from '@/store/useStore';

export interface Game {
  _id: string;
  title: string;
  description: string;
  ageGroup: 'fresh-graduate' | 'middle-age' | 'elderly';
  category: string;
  icon: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number;
  instructions: string;
  questions?: Question[];
  isMastered?: boolean; // New field: true if user already scored 100% on this game
}

export interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface GameResult {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  feedback: Array<{
    question: string;
    userAnswer: number;
    correctAnswer: number;
    isCorrect: boolean;
    explanation: string;
  }>;
  passed: boolean;
  mastered: boolean;
}

export interface GamesResponse {
  games: Game[];
  totalGames: number;
  masteredCount: number;
  allMastered: boolean;
}

const API_BASE_URL = 'http://localhost:5000/api/games';

// Get games for a specific age group
export const getGamesByAgeGroup = async (ageGroup: 'fresh-graduate' | 'middle-age' | 'elderly'): Promise<GamesResponse> => {
  try {
    const token = useStore.getState().authToken;
    const url = `${API_BASE_URL}/age-group/${ageGroup}`;
    console.log(`🔍 Calling API: ${url}`);
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    console.log(`✅ API Response:`, data);
    return {
      games: data.games || [],
      totalGames: data.totalGames || 0,
      masteredCount: data.masteredCount || 0,
      allMastered: data.allMastered || false,
    };
  } catch (error) {
    console.error('❌ Failed to fetch games:', error);
    return {
      games: [],
      totalGames: 0,
      masteredCount: 0,
      allMastered: false,
    };
  }
};

// Get a specific game with full details
export const getGameById = async (gameId: string): Promise<Game | null> => {
  try {
    const token = useStore.getState().authToken;
    const res = await fetch(`${API_BASE_URL}/${gameId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      console.error('Failed to fetch game');
      return null;
    }

    const data = await res.json();
    return data.game;
  } catch (error) {
    console.error('Failed to fetch game:', error);
    return null;
  }
};

// Submit game answers and get score
export const submitGameAnswers = async (gameId: string, answers: number[]): Promise<GameResult | null> => {
  try {
    const token = useStore.getState().authToken;
    const res = await fetch(`${API_BASE_URL}/${gameId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ answers }),
    });

    if (!res.ok) {
      console.error('Failed to submit answers');
      return null;
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Failed to submit answers:', error);
    return null;
  }
};
