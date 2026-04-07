import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ArrowLeft, TrendingUp, Calendar, Award, ChevronDown, Plus, Trash2, X } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

export function Profile() {
  const { user, updateWorkoutRoutine, deleteWorkoutRoutine } = useAuth();
  const navigate = useNavigate();
  const [editingRoutineKey, setEditingRoutineKey] = useState('');
  const [deletingRoutineId, setDeletingRoutineId] = useState('');
  const isPremium = user?.subscription === 'premium';

  // Process exercise data for charts
  const qualityData = user?.exerciseHistory
    .slice(-14)
    .map((session, idx) => ({
      day: `Day ${idx + 1}`,
      quality: Math.round(session.quality),
      drift: Math.round(session.drift)
    })) || [];

  const exerciseBreakdown = user?.exerciseHistory.reduce((acc, session) => {
    acc[session.exercise] = (acc[session.exercise] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const exerciseData = Object.entries(exerciseBreakdown || {}).map(([exercise, count]) => ({
    exercise: exercise.split(' ')[0],
    sessions: count
  }));

  const avgQuality = user?.exerciseHistory.reduce((sum, s) => sum + s.quality, 0) / (user?.exerciseHistory.length || 1);
  const totalSessions = user?.exerciseHistory.length || 0;
  const totalReps = user?.exerciseHistory.reduce((sum, s) => sum + s.reps, 0) || 0;

  const handleAdjustRoutineSets = async (
    routineId: string,
    routineName: string,
    exerciseName: string,
    nextSets: number,
  ) => {
    const routine = user?.workoutRoutines.find((item) => item.id === routineId);
    if (!routine || nextSets < 1) {
      return;
    }

    const requestKey = `${routineId}:${exerciseName}`;
    setEditingRoutineKey(requestKey);
    try {
      await updateWorkoutRoutine(routineId, {
        name: routineName,
        exercises: routine.exercises.map((exercise) =>
          exercise.name === exerciseName ? { ...exercise, sets: nextSets } : exercise,
        ),
      });
      toast.success(`${exerciseName} updated to ${nextSets} ${nextSets === 1 ? 'set' : 'sets'}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update set count.');
    } finally {
      setEditingRoutineKey('');
    }
  };

  const handleRemoveRoutineSet = async (
    routineId: string,
    routineName: string,
    exerciseName: string,
    currentSets: number,
  ) => {
    if (currentSets <= 1) {
      return;
    }

    const routine = user?.workoutRoutines.find((item) => item.id === routineId);
    if (!routine) {
      return;
    }

    const requestKey = `${routineId}:${exerciseName}`;
    setEditingRoutineKey(requestKey);
    try {
      await updateWorkoutRoutine(routineId, {
        name: routineName,
        exercises: routine.exercises.map((exercise) =>
          exercise.name === exerciseName ? { ...exercise, sets: currentSets - 1 } : exercise,
        ),
      });
      toast.success(`${exerciseName} updated to ${currentSets - 1} ${currentSets - 1 === 1 ? 'set' : 'sets'}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to remove the set.');
    } finally {
      setEditingRoutineKey('');
    }
  };

  const handleRemoveRoutineExercise = async (
    routineId: string,
    routineName: string,
    exerciseName: string,
  ) => {
    const routine = user?.workoutRoutines.find((item) => item.id === routineId);
    if (!routine) {
      return;
    }
    if (routine.exercises.length <= 1) {
      toast.error('A routine must keep at least one exercise. Delete the whole routine instead.');
      return;
    }

    const requestKey = `${routineId}:${exerciseName}`;
    setEditingRoutineKey(requestKey);
    try {
      await updateWorkoutRoutine(routineId, {
        name: routineName,
        exercises: routine.exercises.filter((exercise) => exercise.name !== exerciseName),
      });
      toast.success(`Removed ${exerciseName} from "${routineName}".`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to remove the exercise.');
    } finally {
      setEditingRoutineKey('');
    }
  };

  const handleDeleteRoutine = async (routineId: string, routineName: string) => {
    setDeletingRoutineId(routineId);
    try {
      await deleteWorkoutRoutine(routineId);
      toast.success(`Deleted "${routineName}".`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to delete the workout routine.');
    } finally {
      setDeletingRoutineId('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl">Profile & Progress</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Info */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-2xl text-white">
                  {user?.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <CardTitle>{user?.name}</CardTitle>
                  <CardDescription>{user?.email}</CardDescription>
                </div>
              </div>
              <Badge variant={user?.subscription === 'premium' ? 'default' : 'secondary'}>
                {user?.subscription === 'premium' ? '⭐ Premium' : 'Basic'}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Total Sessions</CardDescription>
                <Calendar className="w-4 h-4 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl">{totalSessions}</div>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Avg Quality Score</CardDescription>
                <TrendingUp className="w-4 h-4 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl">{Math.round(avgQuality)}%</div>
              <p className="text-xs text-gray-500 mt-1">Form accuracy</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Total Reps</CardDescription>
                <Award className="w-4 h-4 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl">{totalReps}</div>
              <p className="text-xs text-gray-500 mt-1">Keep it up!</p>
            </CardContent>
          </Card>
        </div>

        {isPremium ? (
          <>
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Exercise Quality Trends</CardTitle>
                <CardDescription>Track your form improvement over the last 14 sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={qualityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="quality" stroke="#4f46e5" strokeWidth={2} name="Rep Quality (%)" />
                    <Line type="monotone" dataKey="drift" stroke="#ef4444" strokeWidth={2} name="Drift (%)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Exercise Distribution</CardTitle>
                <CardDescription>Number of sessions per exercise type</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={exerciseData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="exercise" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="sessions" fill="#4f46e5" name="Sessions Completed" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="mb-8 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
            <CardHeader>
              <CardTitle>Premium Analytics & Routines</CardTitle>
              <CardDescription>
                Upgrade to unlock exercise trends, drift analytics, and your custom routine library.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/subscription')}>Upgrade to Premium</Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Saved Workout Routines</CardTitle>
            <CardDescription>Your personalized training plans with reusable set counts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {user?.workoutRoutines.map((routine) => (
                <details key={routine.id} className="group rounded-lg border bg-white">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4">
                    <div>
                      <h3 className="mb-1">{routine.name}</h3>
                      <p className="text-sm text-gray-500">
                        {routine.exercises.reduce((total, exercise) => total + exercise.sets, 0)} total sets
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{routine.exercises.length} exercises</Badge>
                      <ChevronDown className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180" />
                    </div>
                  </summary>

                  <div className="border-t px-4 pb-4 pt-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <p className="text-xs text-gray-400">
                        Created {new Date(routine.createdAt).toLocaleDateString()}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        disabled={deletingRoutineId === routine.id}
                        onClick={() => handleDeleteRoutine(routine.id, routine.name)}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {routine.exercises.map((exercise) => (
                        <div key={`${routine.id}-${exercise.name}`} className="rounded-lg bg-gray-50 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <h4>{exercise.name}</h4>
                              <p className="text-sm text-gray-500">{exercise.sets} sets planned</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                disabled={exercise.sets <= 1 || editingRoutineKey === `${routine.id}:${exercise.name}`}
                                onClick={() =>
                                  handleRemoveRoutineSet(
                                    routine.id,
                                    routine.name,
                                    exercise.name,
                                    exercise.sets,
                                  )
                                }
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              <div className="min-w-[3rem] text-center text-sm text-gray-500">{exercise.sets} sets</div>
                              <Button
                                variant="outline"
                                size="icon"
                                disabled={editingRoutineKey === `${routine.id}:${exercise.name}`}
                                onClick={() => handleAdjustRoutineSets(routine.id, routine.name, exercise.name, exercise.sets + 1)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                disabled={editingRoutineKey === `${routine.id}:${exercise.name}`}
                                onClick={() => handleRemoveRoutineExercise(routine.id, routine.name, exercise.name)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove Exercise
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Workout History</CardTitle>
            <CardDescription>Completed workouts saved from the start-workout flow</CardDescription>
          </CardHeader>
          <CardContent>
            {user?.workoutHistory.length ? (
              <div className="space-y-3">
                {user.workoutHistory.map((workout) => (
                  <button
                    key={workout.id}
                    type="button"
                    onClick={() => navigate(`/profile/workouts/${workout.id}`)}
                    className="w-full rounded-lg border p-4 text-left transition-colors hover:bg-gray-50"
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <h3>{workout.name}</h3>
                        <p className="text-sm text-gray-500">
                          {new Date(workout.completedAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {workout.exercises.reduce((total, exercise) => total + exercise.sets, 0)} sets
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {workout.exercises.map((exercise) => (
                        <Badge key={`${workout.id}-${exercise.name}`} variant="secondary">
                          {exercise.name} • {exercise.sets} sets
                        </Badge>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
                No saved workouts yet. Start a workout from the dashboard and save it when you finish.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recommendations */}
        {user?.subscription === 'basic' && (
          <Card className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
            <CardHeader>
              <CardTitle>Unlock Premium Features</CardTitle>
              <CardDescription>Get personalized AI coaching and advanced analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/subscription')}>Upgrade to Premium</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
