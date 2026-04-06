import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Calendar, Dumbbell, Sparkles } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

export function WorkoutHistoryDetails() {
  const navigate = useNavigate();
  const { workoutId } = useParams();
  const { user } = useAuth();

  const workout = useMemo(
    () => user?.workoutHistory.find((entry) => entry.id === workoutId) ?? null,
    [user?.workoutHistory, workoutId],
  );

  if (!workout) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/profile')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <h1 className="text-xl">Workout History</h1>
            </div>
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Card>
            <CardContent className="py-10 text-center text-gray-500">
              Workout history entry not found.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const totalSets = workout.exercises.reduce((sum, exercise) => sum + exercise.sets, 0);
  const totalRecommendations = workout.setResults.filter((setResult) => setResult.coachResponse).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/profile')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl">Workout History Details</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>{workout.name}</CardTitle>
                <CardDescription>Completed {new Date(workout.completedAt).toLocaleString()}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {totalRecommendations ? <Badge variant="secondary">{totalRecommendations} AI recommendations</Badge> : null}
                <Badge variant="outline">{totalSets} total sets</Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exercises</CardTitle>
            <CardDescription>Exercise and set breakdown for this completed workout</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {workout.exercises.map((exercise) => (
                <div key={`${workout.id}-${exercise.name}`} className="rounded-lg border bg-white p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-indigo-100 p-2">
                        <Dumbbell className="h-4 w-4 text-indigo-600" />
                      </div>
                      <div>
                        <h3>{exercise.name}</h3>
                        <p className="text-sm text-gray-500">{exercise.sets} sets completed</p>
                      </div>
                    </div>
                    <Badge variant="secondary">{exercise.sets} sets</Badge>
                  </div>

                  <div className="space-y-3">
                    {Array.from({ length: exercise.sets }, (_, index) => {
                      const setNumber = index + 1;
                      const setResult =
                        workout.setResults.find(
                          (result) => result.exercise === exercise.name && result.setNumber === setNumber,
                        ) ?? null;

                      return (
                        <div key={`${workout.id}-${exercise.name}-set-${setNumber}`} className="rounded-md border bg-gray-50 p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">
                              <Calendar className="mr-1 h-3 w-3" />
                              Set {setNumber}
                            </Badge>
                            {setResult ? <Badge variant="secondary">{setResult.repCount} reps</Badge> : null}
                            {setResult ? <Badge variant="secondary">Quality {Math.round(setResult.currentQuality)}%</Badge> : null}
                          </div>

                          {setResult?.coachResponse ? (
                            <div className="mt-3 min-w-0 rounded-md bg-emerald-50 p-3 text-sm text-emerald-950">
                              <div className="mb-1 flex items-center gap-2 font-medium">
                                <Sparkles className="h-4 w-4" />
                                AI Recommendation
                              </div>
                              <p className="break-words">{setResult.coachResponse.summary}</p>
                              {setResult.coachResponse.cues.length ? (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {setResult.coachResponse.cues.map((cue) => (
                                    <Badge
                                      key={`${workout.id}-${exercise.name}-set-${setNumber}-${cue}`}
                                      variant="outline"
                                      className="max-w-full whitespace-normal break-words bg-white text-left leading-relaxed"
                                    >
                                      {cue}
                                    </Badge>
                                  ))}
                                </div>
                              ) : null}
                              {setResult.coachResponse.safety_note ? (
                                <p className="mt-2 break-words text-xs text-emerald-800">
                                  Safety note: {setResult.coachResponse.safety_note}
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
