import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, CheckCircle2 } from 'lucide-react';
import type { Game } from '@/lib/gameApi';

interface GameCardProps {
  game: Game;
  onPlay: (game: Game) => void;
  isPlaying?: boolean;
}

const GameCard = ({ game, onPlay, isPlaying = false }: GameCardProps) => {
  const difficultyColors: Record<string, string> = {
    easy: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    hard: 'bg-red-100 text-red-800',
  };

  const isMastered = game.isMastered || false;

  return (
    <Card className={`hover:shadow-lg transition-shadow ${isMastered ? 'opacity-75 bg-gray-50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="text-3xl">{game.icon}</div>
            <div>
              <CardTitle className="text-base">{game.title}</CardTitle>
              <CardDescription className="text-xs mt-1">
                {game.category.charAt(0).toUpperCase() + game.category.slice(1)} Challenge
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${difficultyColors[game.difficulty]}`}>
              {game.difficulty}
            </span>
            {isMastered && (
              <span className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold whitespace-nowrap bg-yellow-100 text-yellow-800">
                <CheckCircle2 className="h-3 w-3" />
                Mastered
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{game.description}</p>

        <Button
          onClick={() => onPlay(game)}
          disabled={isPlaying}
          size="sm"
          variant={isMastered ? 'outline' : 'default'}
          className="w-full"
        >
          {isMastered ? (
            <>
              <Lock className="h-4 w-4 mr-2" />
              View Only
            </>
          ) : isPlaying ? (
            'Playing...'
          ) : (
            'Play Game'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default GameCard;
