import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import GameCard from './GameCard';
import GamePlayer from './GamePlayer';
import type { Game, GamesResponse } from '@/lib/gameApi';
import { getGamesByAgeGroup } from '@/lib/gameApi';
import { Loader2 } from 'lucide-react';

interface GamesSectionProps {
  ageGroup: 'fresh-graduate' | 'middle-age' | 'elderly';
  title: string;
  onAllMastered?: () => void;
}

const GamesSection = ({ ageGroup, title, onAllMastered }: GamesSectionProps) => {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [isGameDialogOpen, setIsGameDialogOpen] = useState(false);
  const [gamesData, setGamesData] = useState<GamesResponse>({
    games: [],
    totalGames: 0,
    masteredCount: 0,
    allMastered: false,
  });

  useEffect(() => {
    const loadGames = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log(`🎮 Loading games for age group: ${ageGroup}`);
        const response = await getGamesByAgeGroup(ageGroup);
        console.log(`📦 Fetched response:`, response);
        console.log(`📊 Stats - totalGames: ${response.totalGames}, masteredCount: ${response.masteredCount}, allMastered: ${response.allMastered}, availableGames: ${response.games.length}`);
        setGamesData(response);
        setGames(response.games);
        
        // Trigger callback if all games are mastered
        if (response.allMastered && response.totalGames > 0 && onAllMastered) {
          onAllMastered();
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`❌ Failed to load games:`, errorMsg);
        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };

    loadGames();
  }, [ageGroup, onAllMastered]);

  const handlePlayGame = (game: Game) => {
    setSelectedGame(game);
    setIsGameDialogOpen(true);
  };

  const handleCloseGame = async () => {
    setIsGameDialogOpen(false);
    setSelectedGame(null);
    
    // Reload games to remove mastered ones
    try {
      const response = await getGamesByAgeGroup(ageGroup);
      setGamesData(response);
      setGames(response.games);
      console.log(`🔄 Reloaded games:`, response);
      
      // If all games are now mastered, trigger callback
      if (response.allMastered && response.totalGames > 0 && onAllMastered) {
        console.log(`✅ All games mastered! Triggering callback`);
        onAllMastered();
      }
    } catch (err) {
      console.error('Failed to reload games:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-700">
          <strong>Error loading games:</strong> {error}
        </p>
      </div>
    );
  }

  if (games.length === 0) {
    // Distinguish between: no games exist vs all games mastered
    if (gamesData.totalGames > 0 && gamesData.allMastered && gamesData.masteredCount > 0) {
      // User mastered all available games
      return (
        <div className="p-6 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-lg text-center">
          <p className="text-lg font-semibold text-yellow-800 mb-2">
            ⭐ You Passed All Games! 
          </p>
          <p className="text-sm text-yellow-700">
            You've mastered all {gamesData.totalGames} available games for your profile. Amazing work! Check back later for new challenges.
          </p>
        </div>
      );
    }
    
    // No games exist for this age group yet
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-700">
          No games available for your profile yet. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-4">{title}</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {games.map((game) => (
              <GameCard
                key={game._id}
                game={game}
                onPlay={handlePlayGame}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Game Player Dialog */}
      {selectedGame && (
        <Dialog open={isGameDialogOpen} onOpenChange={setIsGameDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedGame.title}</DialogTitle>
              <DialogDescription>{selectedGame.description}</DialogDescription>
            </DialogHeader>
            <GamePlayer game={selectedGame} onClose={handleCloseGame} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default GamesSection;
