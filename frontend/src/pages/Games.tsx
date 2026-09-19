import { useState, useEffect } from 'react';
import { Gamepad2 } from 'lucide-react';
import GamesSection from '@/components/dashboard/GamesSection';
import { useStore } from '@/store/useStore';

// Helper function to get age group
const getAgeGroup = (dobString: string): 'fresh-graduate' | 'middle-age' | 'elderly' => {
  const dob = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  
  if (age < 25) return 'fresh-graduate';
  if (age <= 60) return 'middle-age';
  return 'elderly';
};

const GamesPage = () => {
  const { onboardingData, user } = useStore();
  const userId = user?.id;
  const [userAgeGroup, setUserAgeGroup] = useState<'fresh-graduate' | 'middle-age' | 'elderly' | null>(null);
  const [allGamesMastered, setAllGamesMastered] = useState(false);

  // Clear localStorage when user logs out
  useEffect(() => {
    if (!userId) {
      // User logged out, clear ALL game mastered keys from ANY user
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('games_mastered_')) {
          localStorage.removeItem(key);
          console.log(`🔓 Cleared: ${key}`);
        }
      });
      setAllGamesMastered(false);
      console.log(`🔓 All game mastery localStorage cleared for logged-out user`);
    }
  }, [userId]);

  useEffect(() => {
    if (onboardingData?.profile?.dob && userId) {
      const ageGroup = getAgeGroup(onboardingData.profile.dob);
      setUserAgeGroup(ageGroup);
      console.log('🎮 Games Page Load:', { ageGroup, dob: onboardingData.profile.dob, userId });
      
      // Load mastered status from localStorage for instant UI update (user-specific key)
      const storageKey = `games_mastered_${ageGroup}_${userId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved === 'true') {
        setAllGamesMastered(true);
        console.log(`📍 Loaded mastered status for ${ageGroup} from localStorage: true`);
      } else {
        setAllGamesMastered(false);
      }
    }
  }, [onboardingData, userId]);

  const handleAllMastered = () => {
    if (!userAgeGroup || !userId) return;
    setAllGamesMastered(true);
    // Save to localStorage for instant UI update (user-specific key)
    const storageKey = `games_mastered_${userAgeGroup}_${userId}`;
    localStorage.setItem(storageKey, 'true');
    console.log(`✅ Saved mastered status for ${userAgeGroup} to localStorage & MongoDB for user ${userId}`);
  };

  if (!userAgeGroup) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <Gamepad2 className="h-16 w-16 text-primary mb-4 opacity-50" />
        <h1 className="text-2xl font-bold text-white mb-2">Games</h1>
        <p className="text-slate-400">Please complete your profile to see games tailored for you.</p>
      </div>
    );
  }

  const titles: Record<typeof userAgeGroup, string> = {
    'fresh-graduate': '🎓 Financial Learning Games',
    'middle-age': '📈 Wealth Building Games',
    'elderly': '👴 Retirement Planning Games',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Gamepad2 className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-white">{titles[userAgeGroup]}</h1>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/50 p-6">
          <GamesSection 
            ageGroup={userAgeGroup}
            title={titles[userAgeGroup]}
            onAllMastered={handleAllMastered}
          />
        </div>

        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/30">
            <div className="text-3xl mb-2">🎯</div>
            <h3 className="font-semibold text-white mb-1">Learn</h3>
            <p className="text-sm text-slate-400">Test your knowledge with engaging quizzes</p>
          </div>
          <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/30">
            <div className="text-3xl mb-2">📊</div>
            <h3 className="font-semibold text-white mb-1">Practice</h3>
            <p className="text-sm text-slate-400">Apply real-world financial concepts</p>
          </div>
          <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/30">
            <div className="text-3xl mb-2">🏆</div>
            <h3 className="font-semibold text-white mb-1">Improve</h3>
            <p className="text-sm text-slate-400">Track your progress and level up</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamesPage;
