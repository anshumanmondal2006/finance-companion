import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import type { Game, GameResult } from '@/lib/gameApi';
import { submitGameAnswers, getGameById } from '@/lib/gameApi';
import { Loader2 } from 'lucide-react';

interface GamePlayerProps {
  game: Game;
  onClose: () => void;
}

type GameState = 'loading' | 'playing' | 'completed';

const GamePlayer = ({ game: initialGame, onClose }: GamePlayerProps) => {
  const [game, setGame] = useState<Game | null>(initialGame);
  const [gameState, setGameState] = useState<GameState>('loading');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<(number | undefined)[]>([]);
  const [result, setResult] = useState<GameResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAnswerFor, setShowAnswerFor] = useState<Set<number>>(new Set());

  useEffect(() => {
    const loadGame = async () => {
      if (!initialGame.questions) {
        const fullGame = await getGameById(initialGame._id);
        if (fullGame) {
          setGame(fullGame);
        }
      }
      setAnswers(new Array(initialGame.questions?.length || 0).fill(undefined));
      setGameState('playing');
    };

    if (gameState === 'loading') {
      loadGame();
    }
  }, []);

  const handleAnswer = (answerIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = answerIndex;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < (game?.questions?.length || 0) - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const gameResult = await submitGameAnswers(game!._id, answers as number[]);
    if (gameResult) {
      setResult(gameResult);
      setGameState('completed');
    }
    setIsSubmitting(false);
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setAnswers(new Array(game?.questions?.length || 0).fill(undefined));
    setResult(null);
    setGameState('playing');
    setShowAnswerFor(new Set());
  };

  const toggleShowAnswer = (questionIndex: number) => {
    const newSet = new Set(showAnswerFor);
    if (newSet.has(questionIndex)) {
      newSet.delete(questionIndex);
    } else {
      newSet.add(questionIndex);
    }
    setShowAnswerFor(newSet);
  };

  if (gameState === 'loading' || !game) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (gameState === 'completed' && result) {
    return (
      <div className="space-y-6">
        {/* Score Card */}
        <Card
          className={`border-2 ${
            result.mastered 
              ? 'border-yellow-300 bg-yellow-50' 
              : result.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
          }`}
        >
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                {result.mastered ? (
                  <CheckCircle2 className="h-16 w-16 text-yellow-600" />
                ) : result.passed ? (
                  <CheckCircle2 className="h-16 w-16 text-green-600" />
                ) : (
                  <AlertCircle className="h-16 w-16 text-red-600" />
                )}
              </div>
              <h3 className="text-2xl font-bold">
                {result.mastered 
                  ? 'Perfect Score! Game Mastered!' 
                  : result.passed ? 'Congratulations!' : 'Keep Practicing!'}
              </h3>
              <div className="space-y-1">
                <p className="text-4xl font-bold">{result.score}%</p>
                <p className="text-sm text-muted-foreground">
                  {result.correctAnswers} of {result.totalQuestions} correct
                </p>
                {result.mastered && (
                  <p className="text-sm font-medium text-yellow-700 mt-2">
                    This game has been disabled for you as you've mastered it!
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Feedback */}
        <div className="space-y-4">
          <h4 className="font-semibold">Detailed Feedback</h4>
          {result.feedback.map((item, index) => (
            <Card
              key={index}
              className={`${
                item.isCorrect
                  ? 'border-green-200 bg-green-50'
                  : 'border-red-200 bg-red-50'
              }`}
            >
              <CardContent className="pt-4 space-y-3">
                <div className="flex gap-2">
                  {item.isCorrect ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.question}</p>
                  </div>
                </div>

                {/* Show Answer Button */}
                <Button
                  onClick={() => toggleShowAnswer(index)}
                  variant="outline"
                  size="sm"
                  className="ml-7"
                >
                  {showAnswerFor.has(index) ? 'Hide Answer' : 'Show Answer'}
                </Button>

                {/* Answer Details - Only show when user clicks */}
                {showAnswerFor.has(index) && (
                  <>
                    {!item.isCorrect && (
                      <div className="ml-7 space-y-2 text-sm">
                        <p className="text-red-700">
                          <span className="font-medium">Your answer:</span> {game.questions?.[index].options[item.userAnswer]}
                        </p>
                        <p className="text-green-700">
                          <span className="font-medium">Correct answer:</span> {game.questions?.[index].options[item.correctAnswer]}
                        </p>
                      </div>
                    )}
                    <p className="ml-7 text-sm italic text-muted-foreground">{item.explanation}</p>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={handleRestart} variant="outline" className="flex-1">
            Retake Game
          </Button>
          <Button onClick={onClose} className="flex-1">
            Done
          </Button>
        </div>
      </div>
    );
  }

  // Playing State
  const question = game.questions?.[currentQuestion];
  const totalQuestions = game.questions?.length || 0;
  const progress = ((currentQuestion + 1) / totalQuestions) * 100;
  const isAnswered = answers[currentQuestion] !== undefined;
  const isLastQuestion = currentQuestion === totalQuestions - 1;
  const isMastered = initialGame.isMastered || false;

  return (
    <div className="space-y-6">
      {/* Mastered Warning Badge */}
      {isMastered && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-yellow-600" />
              <p className="text-sm font-medium text-yellow-800">
                You have already mastered this game! You can view the questions but cannot submit new answers.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <p className="text-sm">{game.instructions}</p>
        </CardContent>
      </Card>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">Question {currentQuestion + 1} of {totalQuestions}</span>
          <span className="text-muted-foreground">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question */}
      {question && (
        <div className="space-y-4">
          <h3 className="font-medium text-base">{question.question}</h3>

          {/* Options */}
          <RadioGroup
            value={answers[currentQuestion]?.toString() || ''}
            onValueChange={(value) => !isMastered && handleAnswer(parseInt(value))}
            disabled={isMastered}
          >
            <div className="space-y-3">
              {question.options.map((option, index) => (
                <div 
                  key={index} 
                  className={`flex items-center space-x-2 p-3 rounded-lg border transition-colors ${
                    isMastered && showAnswerFor.has(currentQuestion) && index === question.correctAnswer
                      ? 'bg-green-100 border-green-500'
                      : isMastered ? 'opacity-60 cursor-not-allowed' : 'hover:bg-muted cursor-pointer'
                  }`}
                >
                  <RadioGroupItem value={index.toString()} id={`option-${index}`} disabled={isMastered} />
                  <Label htmlFor={`option-${index}`} className={`flex-1 ${isMastered ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                    {option}
                  </Label>
                  {isMastered && showAnswerFor.has(currentQuestion) && index === question.correctAnswer && (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  )}
                </div>
              ))}
            </div>
          </RadioGroup>

          {/* Show Answer Button in View Only Mode */}
          {isMastered && (
            <div className="pt-2">
              <Button
                onClick={() => toggleShowAnswer(currentQuestion)}
                variant="outline"
                size="sm"
                className={showAnswerFor.has(currentQuestion) ? 'bg-green-50 border-green-300 text-green-700' : ''}
              >
                {showAnswerFor.has(currentQuestion) ? '✓ Answer Revealed' : 'Show Answer'}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-2 justify-between">
        <Button
          onClick={handlePrevious}
          disabled={currentQuestion === 0}
          variant="outline"
        >
          Previous
        </Button>

        {isLastQuestion ? (
          <Button
            onClick={handleSubmit}
            disabled={!isAnswered || isSubmitting || isMastered}
            className="flex-1"
            variant={isMastered ? 'outline' : 'default'}
          >
            {isMastered ? (
              <>
                <AlertCircle className="h-4 w-4 mr-2" />
                Cannot Submit (Mastered)
              </>
            ) : isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit'
            )}
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            disabled={!isAnswered && !isMastered}
            className="flex-1"
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
};

export default GamePlayer;
