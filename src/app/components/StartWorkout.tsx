import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ArrowLeft, Calendar, Check, Play, Plus, Trash2, X } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  buildWorkoutSetKey,
  clearStartWorkoutDraft,
  readStartWorkoutDraft,
  saveStartWorkoutDraft,
} from '../lib/startWorkoutSession';

type WorkoutExercise = {
  name: string;
  sets: number;
};

const exerciseOptions = [
  { name: 'Bicep Curl', icon: '💪', difficulty: 'Beginner' },
  { name: 'Dumbbell Lat Raise', icon: '🏋️', difficulty: 'Beginner' },
  { name: 'Push-ups', icon: '🤸', difficulty: 'Beginner' },
  { name: 'Squats', icon: '🦵', difficulty: 'Intermediate' },
];

function buildDefaultWorkoutName() {
  return `Workout ${new Date().toLocaleDateString()}`;
}

type StartWorkoutLocationState = {
  completedSet?: {
    exercise: string;
    setNumber: number;
  };
};

export function StartWorkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state ?? {}) as StartWorkoutLocationState;
  const { user, addCompletedWorkout, addExerciseSession } = useAuth();
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState('Push-ups');
  const [selectedSets, setSelectedSets] = useState('3');
  const [selectedRoutineId, setSelectedRoutineId] = useState('');
  const [endWorkoutOpen, setEndWorkoutOpen] = useState(false);
  const [workoutName, setWorkoutName] = useState(buildDefaultWorkoutName());
  const [isSavingWorkout, setIsSavingWorkout] = useState(false);
  const [completedSetKeys, setCompletedSetKeys] = useState<string[]>([]);
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);

  const exerciseMetaByName = useMemo(
    () => Object.fromEntries(exerciseOptions.map((exercise) => [exercise.name, exercise])),
    [],
  );

  const totalSets = workoutExercises.reduce((sum, exercise) => sum + exercise.sets, 0);

  const syncDraftFromStorage = () => {
    const parsedDraft = readStartWorkoutDraft();
    if (!parsedDraft) {
      setWorkoutExercises([]);
      setWorkoutName(buildDefaultWorkoutName());
      setCompletedSetKeys([]);
      setHasLoadedDraft(true);
      return;
    }
    setWorkoutExercises(parsedDraft.workoutExercises ?? []);
    setWorkoutName(parsedDraft.workoutName ?? buildDefaultWorkoutName());
    setCompletedSetKeys(parsedDraft.completedSetKeys ?? []);
    setHasLoadedDraft(true);
  };

  useEffect(() => {
    syncDraftFromStorage();
  }, []);

  useEffect(() => {
    if (!hasLoadedDraft) {
      return;
    }
    saveStartWorkoutDraft({
      workoutExercises,
      workoutName,
      completedSetKeys,
      setResults: readStartWorkoutDraft()?.setResults ?? {},
    });
  }, [completedSetKeys, hasLoadedDraft, workoutExercises, workoutName]);

  useEffect(() => {
    if (!locationState.completedSet) {
      return;
    }

    const completedKey = buildWorkoutSetKey(locationState.completedSet.exercise, locationState.completedSet.setNumber);
    setCompletedSetKeys((currentKeys) =>
      currentKeys.includes(completedKey) ? currentKeys : [...currentKeys, completedKey],
    );
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, locationState.completedSet, navigate]);

  const isSetCompleted = (exerciseName: string, setNumber: number) =>
    completedSetKeys.includes(buildWorkoutSetKey(exerciseName, setNumber));

  const handleOpenSet = (exerciseName: string, setNumber: number, totalSetsForExercise: number) => {
    saveStartWorkoutDraft({
      workoutExercises,
      workoutName,
      completedSetKeys,
      setResults: readStartWorkoutDraft()?.setResults ?? {},
    });

    navigate('/live-training', {
      state: {
        exercise: exerciseName,
        routineName: 'Current Workout',
        setNumber,
        totalSets: totalSetsForExercise,
        returnToWorkout: true,
      },
    });
  };

  const handleLoadSavedRoutine = () => {
    const selectedRoutine = user?.workoutRoutines.find((routine) => routine.id === selectedRoutineId);
    if (!selectedRoutine) {
      toast.error('Choose a saved routine first.');
      return;
    }

    setWorkoutExercises(selectedRoutine.exercises.map((exercise) => ({
      name: exercise.name,
      sets: exercise.sets,
    })));
    setWorkoutName(selectedRoutine.name);
    setCompletedSetKeys([]);
    saveStartWorkoutDraft({
      workoutExercises: selectedRoutine.exercises.map((exercise) => ({
        name: exercise.name,
        sets: exercise.sets,
      })),
      workoutName: selectedRoutine.name,
      completedSetKeys: [],
      setResults: {},
    });
    toast.success(`Loaded "${selectedRoutine.name}" into the current workout.`);
  };

  const handleAddExercise = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedSets = Math.max(1, Number(selectedSets) || 1);

    setWorkoutExercises((currentExercises) => {
      const existing = currentExercises.find((exercise) => exercise.name === selectedExercise);
      if (existing) {
        return currentExercises.map((exercise) =>
          exercise.name === selectedExercise
            ? { ...exercise, sets: exercise.sets + parsedSets }
            : exercise,
        );
      }
      return [...currentExercises, { name: selectedExercise, sets: parsedSets }];
    });
    toast.success(`Added ${parsedSets} ${parsedSets === 1 ? 'set' : 'sets'} of ${selectedExercise}.`);
  };

  const adjustSets = (exerciseName: string, nextSets: number) => {
    if (nextSets < 1) {
      setWorkoutExercises((currentExercises) => currentExercises.filter((exercise) => exercise.name !== exerciseName));
      return;
    }
    setWorkoutExercises((currentExercises) =>
      currentExercises.map((exercise) =>
        exercise.name === exerciseName ? { ...exercise, sets: nextSets } : exercise,
      ),
    );
  };

  const removeExercise = (exerciseName: string) => {
    setWorkoutExercises((currentExercises) => currentExercises.filter((exercise) => exercise.name !== exerciseName));
    toast.success(`Removed ${exerciseName} from the workout.`);
  };

  const handleOpenEndWorkout = () => {
    if (workoutExercises.length === 0) {
      toast.error('Add at least one exercise before ending the workout.');
      return;
    }
    setWorkoutName(buildDefaultWorkoutName());
    setEndWorkoutOpen(true);
  };

  const handleSaveWorkout = async () => {
    const trimmedName = workoutName.trim();
    if (!trimmedName) {
      toast.error('Enter a workout name.');
      return;
    }

    setIsSavingWorkout(true);
    try {
      let draft = readStartWorkoutDraft();
      const pendingSessionEntries = Object.values(draft?.setResults ?? {}).filter(
        (setResult) => setResult.pendingSession && !setResult.sessionSummarySaved,
      );

      for (const setResult of pendingSessionEntries) {
        if (!setResult.pendingSession) {
          continue;
        }

        await addExerciseSession({
          ...setResult.pendingSession,
          date: new Date(setResult.pendingSession.date),
        });

        draft = readStartWorkoutDraft();
        if (!draft) {
          continue;
        }

        const setKey = buildWorkoutSetKey(setResult.exercise, setResult.setNumber);
        const existingSetResult = draft.setResults?.[setKey];
        if (!existingSetResult) {
          continue;
        }

        saveStartWorkoutDraft({
          ...draft,
          setResults: {
            ...draft.setResults,
            [setKey]: {
              ...existingSetResult,
              sessionSummarySaved: true,
            },
          },
        });
      }

      draft = readStartWorkoutDraft();
      await addCompletedWorkout({
        name: trimmedName,
        exercises: workoutExercises,
        setResults: Object.values(draft?.setResults ?? {}).sort((left, right) => {
          if (left.exercise === right.exercise) {
            return left.setNumber - right.setNumber;
          }
          return left.exercise.localeCompare(right.exercise);
        }),
      });
      toast.success(`Saved "${trimmedName}" to workout history.`);
      clearStartWorkoutDraft();
      navigate('/profile');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save workout history.');
    } finally {
      setIsSavingWorkout(false);
      setEndWorkoutOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-xl">Start Workout</h1>
              <p className="text-sm text-gray-500">Build the current workout session without saving it as a reusable routine.</p>
            </div>
          </div>
          <Button onClick={handleOpenEndWorkout}>
            <Calendar className="mr-2 h-4 w-4" />
            End Workout
          </Button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Workout</CardTitle>
              <CardDescription>{workoutExercises.length} exercises • {totalSets} total sets</CardDescription>
            </CardHeader>
            <CardContent>
              {workoutExercises.length ? (
                <div className="space-y-4">
                  {workoutExercises.map((exercise) => {
                    const meta = exerciseMetaByName[exercise.name];
                    return (
                      <div key={exercise.name} className="rounded-lg border bg-white p-4">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="text-2xl">{meta?.icon ?? '🏋️'}</div>
                            <div>
                              <h3>{exercise.name}</h3>
                              <p className="text-sm text-gray-500">{exercise.sets} sets planned</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{meta?.difficulty ?? 'Workout'}</Badge>
                            <Button variant="outline" size="sm" onClick={() => removeExercise(exercise.name)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove Exercise
                            </Button>
                          </div>
                        </div>

                        <div className="mb-3 flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => adjustSets(exercise.name, exercise.sets - 1)}>
                            <X className="mr-2 h-4 w-4" />
                            Remove Set
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => adjustSets(exercise.name, exercise.sets + 1)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Set
                          </Button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {Array.from({ length: exercise.sets }, (_, index) => (
                            <Button
                              key={`${exercise.name}-set-${index + 1}`}
                              type="button"
                              variant={isSetCompleted(exercise.name, index + 1) ? 'default' : 'outline'}
                              size="sm"
                              className={isSetCompleted(exercise.name, index + 1) ? 'bg-green-600 text-white hover:bg-green-600' : undefined}
                              onClick={() => handleOpenSet(exercise.name, index + 1, exercise.sets)}
                            >
                              {isSetCompleted(exercise.name, index + 1) ? (
                                <Check className="mr-2 h-4 w-4 text-white" />
                              ) : (
                                <Play className="mr-2 h-4 w-4" />
                              )}
                              {isSetCompleted(exercise.name, index + 1) ? `Set ${index + 1} Completed` : `Open Set ${index + 1}`}
                            </Button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed bg-white p-8 text-center">
                  <h3 className="mb-1">No exercises yet</h3>
                  <p className="text-sm text-gray-500">Load a saved workout routine or add exercises manually to build the workout you want to run now.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Use Saved Routine</CardTitle>
              <CardDescription>Start from one of your existing workout routines, then adjust it if needed</CardDescription>
            </CardHeader>
            <CardContent>
              {user?.workoutRoutines.length ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="saved-routine">Saved routine</Label>
                    <Select value={selectedRoutineId} onValueChange={setSelectedRoutineId}>
                      <SelectTrigger id="saved-routine">
                        <SelectValue placeholder="Select a saved routine" />
                      </SelectTrigger>
                      <SelectContent>
                        {user.workoutRoutines.map((routine) => (
                          <SelectItem key={routine.id} value={routine.id}>
                            {routine.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button className="w-full" onClick={handleLoadSavedRoutine}>
                    <Calendar className="mr-2 h-4 w-4" />
                    Load Saved Routine
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-sm text-gray-500">
                  No saved routines yet. Create one from the dashboard or build this workout manually below.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add Exercise Manually</CardTitle>
              <CardDescription>Append exercises and sets to the current workout</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleAddExercise}>
                <div className="space-y-2">
                  <Label htmlFor="exercise-name">Exercise</Label>
                  <Select value={selectedExercise} onValueChange={setSelectedExercise}>
                    <SelectTrigger id="exercise-name">
                      <SelectValue placeholder="Select an exercise" />
                    </SelectTrigger>
                    <SelectContent>
                      {exerciseOptions.map((exercise) => (
                        <SelectItem key={exercise.name} value={exercise.name}>
                          {exercise.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="exercise-sets">Sets</Label>
                  <Input
                    id="exercise-sets"
                    type="number"
                    min={1}
                    max={10}
                    value={selectedSets}
                    onChange={(event) => setSelectedSets(event.target.value)}
                  />
                </div>

                <Button type="submit" className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Add To Workout
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={endWorkoutOpen} onOpenChange={setEndWorkoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Workout To Profile?</DialogTitle>
            <DialogDescription>When you end the workout, you can save this exercise and set breakdown to your workout history.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workout-name">Workout name</Label>
              <Input
                id="workout-name"
                value={workoutName}
                onChange={(event) => setWorkoutName(event.target.value)}
                placeholder="Leg Day"
              />
            </div>
            <div className="rounded-lg border bg-gray-50 p-3 text-sm text-gray-600">
              {workoutExercises.map((exercise) => `${exercise.name} (${exercise.sets} sets)`).join(', ')}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                clearStartWorkoutDraft();
                navigate('/dashboard');
              }}
            >
              End Without Saving
            </Button>
            <Button onClick={handleSaveWorkout} disabled={isSavingWorkout}>
              {isSavingWorkout ? 'Saving...' : 'Save To Profile'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
