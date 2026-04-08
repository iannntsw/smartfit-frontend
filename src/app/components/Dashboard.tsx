import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Activity, Calendar, Camera, ChevronDown, CreditCard, Dumbbell, LogOut, Plus, Trash2, TrendingUp, User, X } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { useAuth } from '../contexts/AuthContext';
import { START_WORKOUT_UPDATED_EVENT, hasActiveWorkoutSession } from '../lib/startWorkoutSession';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';

type ExerciseOption = {
  name: string;
  icon: string;
  difficulty: string;
};

type RoutineExerciseDraft = {
  name: string;
  sets: number;
};

const exerciseOptions: ExerciseOption[] = [
  { name: 'Bicep Curl', icon: '💪', difficulty: 'Beginner' },
  { name: 'Shoulder Press', icon: '🏋️', difficulty: 'Intermediate' },
  { name: 'Push-ups', icon: '🤸', difficulty: 'Beginner' },
  { name: 'Squats', icon: '🦵', difficulty: 'Intermediate' },
];

const chartColors = ['#4f46e5', '#0f766e', '#ea580c', '#db2777', '#0891b2', '#65a30d'];

export function Dashboard() {
  const { user, logout, addWorkoutRoutine, updateWorkoutRoutine, deleteWorkoutRoutine } = useAuth();
  const navigate = useNavigate();
  const [isRoutineDialogOpen, setIsRoutineDialogOpen] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState('');
  const [routineName, setRoutineName] = useState('');
  const [selectedRoutineExercises, setSelectedRoutineExercises] = useState<RoutineExerciseDraft[]>([]);
  const [routineError, setRoutineError] = useState('');
  const [isSavingRoutine, setIsSavingRoutine] = useState(false);
  const [editingRoutineKey, setEditingRoutineKey] = useState('');
  const [deletingRoutineId, setDeletingRoutineId] = useState('');
  const [hasWorkoutInProgress, setHasWorkoutInProgress] = useState(false);

  const exerciseConfigByName = useMemo(
    () => Object.fromEntries(exerciseOptions.map((exercise) => [exercise.name, exercise])),
    [],
  );

  const exerciseHistory = user?.exerciseHistory ?? [];
  const workoutHistory = user?.workoutHistory ?? [];

  const progressStats = useMemo(() => {
    const workoutsLast7Days = workoutHistory.filter((workout) => {
      const completedAt = new Date(workout.completedAt);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      return completedAt >= sevenDaysAgo;
    }).length;

    const averageRepsPerSession = exerciseHistory.length
      ? Math.round(exerciseHistory.reduce((sum, session) => sum + session.reps, 0) / exerciseHistory.length)
      : 0;

    const bestQuality = exerciseHistory.length
      ? Math.round(Math.max(...exerciseHistory.map((session) => session.quality)))
      : 0;

    const workoutDates = new Set(
      workoutHistory.map((workout) => {
        const date = new Date(workout.completedAt);
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      }),
    );

    let streak = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    while (workoutDates.has(`${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return {
      workoutsLast7Days,
      averageRepsPerSession,
      bestQuality,
      streak,
    };
  }, [exerciseHistory, workoutHistory]);

  const qualityTrendData = useMemo(
    () =>
      exerciseHistory.slice(-10).map((session, index) => ({
        label: session.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        quality: Math.round(session.quality),
        drift: Math.round(session.drift),
        reps: session.reps,
        exercise: session.exercise,
        index: index + 1,
      })),
    [exerciseHistory],
  );

  const weeklyLoadData = useMemo(() => {
    const buckets = new Map<string, { label: string; reps: number; workouts: number }>();

    const getWeekStart = (dateValue: Date) => {
      const nextDate = new Date(dateValue);
      const day = nextDate.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      nextDate.setDate(nextDate.getDate() + diff);
      nextDate.setHours(0, 0, 0, 0);
      return nextDate;
    };

    exerciseHistory.forEach((session) => {
      const weekStart = getWeekStart(new Date(session.date));
      const key = weekStart.toISOString();
      const label = `${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
      const existing = buckets.get(key) ?? { label, reps: 0, workouts: 0 };
      existing.reps += session.reps;
      existing.workouts += 1;
      buckets.set(key, existing);
    });

    return Array.from(buckets.entries())
      .sort(([left], [right]) => new Date(left).getTime() - new Date(right).getTime())
      .slice(-6)
      .map(([, value]) => value);
  }, [exerciseHistory]);

  const exerciseMixData = useMemo(() => {
    const grouped = exerciseHistory.reduce<Record<string, { exercise: string; reps: number; sessions: number }>>(
      (accumulator, session) => {
        const current = accumulator[session.exercise] ?? {
          exercise: session.exercise,
          reps: 0,
          sessions: 0,
        };
        current.reps += session.reps;
        current.sessions += 1;
        accumulator[session.exercise] = current;
        return accumulator;
      },
      {},
    );

    return Object.values(grouped)
      .sort((left, right) => right.reps - left.reps)
      .slice(0, 5);
  }, [exerciseHistory]);

  const consistencyData = useMemo(() => {
    const buckets = new Map<string, { label: string; workouts: number; sets: number }>();

    for (let index = 13; index >= 0; index -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - index);
      date.setHours(0, 0, 0, 0);
      const key = date.toISOString();
      buckets.set(key, {
        label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        workouts: 0,
        sets: 0,
      });
    }

    workoutHistory.forEach((workout) => {
      const completedAt = new Date(workout.completedAt);
      completedAt.setHours(0, 0, 0, 0);
      const key = completedAt.toISOString();
      const bucket = buckets.get(key);
      if (!bucket) {
        return;
      }
      bucket.workouts += 1;
      bucket.sets += workout.exercises.reduce((sum, exercise) => sum + exercise.sets, 0);
    });

    return Array.from(buckets.values());
  }, [workoutHistory]);

  useEffect(() => {
    const syncWorkoutDraftState = () => {
      setHasWorkoutInProgress(hasActiveWorkoutSession());
    };

    syncWorkoutDraftState();
    window.addEventListener(START_WORKOUT_UPDATED_EVENT, syncWorkoutDraftState);
    window.addEventListener('focus', syncWorkoutDraftState);

    return () => {
      window.removeEventListener(START_WORKOUT_UPDATED_EVENT, syncWorkoutDraftState);
      window.removeEventListener('focus', syncWorkoutDraftState);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const resetRoutineForm = () => {
    setEditingRoutineId('');
    setRoutineName('');
    setSelectedRoutineExercises([]);
    setRoutineError('');
  };

  const handleDialogChange = (open: boolean) => {
    setIsRoutineDialogOpen(open);
    if (!open) {
      resetRoutineForm();
    }
  };

  const isExerciseSelected = (exerciseName: string) =>
    selectedRoutineExercises.some((exercise) => exercise.name === exerciseName);

  const toggleRoutineExercise = (exerciseName: string) => {
    setRoutineError('');
    setSelectedRoutineExercises((currentExercises) =>
      currentExercises.some((exercise) => exercise.name === exerciseName)
        ? currentExercises.filter((exercise) => exercise.name !== exerciseName)
        : [...currentExercises, { name: exerciseName, sets: 3 }],
    );
  };

  const updateExerciseSets = (exerciseName: string, nextSets: number) => {
    setSelectedRoutineExercises((currentExercises) =>
      currentExercises.map((exercise) =>
        exercise.name === exerciseName
          ? { ...exercise, sets: Math.min(10, Math.max(1, nextSets)) }
          : exercise,
      ),
    );
  };

  const handleOpenEditRoutine = (routineId: string) => {
    const routine = user?.workoutRoutines.find((item) => item.id === routineId);
    if (!routine) {
      return;
    }

    setEditingRoutineId(routine.id);
    setRoutineName(routine.name);
    setSelectedRoutineExercises(routine.exercises.map((exercise) => ({ ...exercise })));
    setRoutineError('');
    setIsRoutineDialogOpen(true);
  };

  const handleSaveRoutine = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = routineName.trim();
    if (!trimmedName) {
      setRoutineError('Enter a routine name.');
      return;
    }
    if (selectedRoutineExercises.length === 0) {
      setRoutineError('Select at least one exercise.');
      return;
    }

    setIsSavingRoutine(true);
    setRoutineError('');
    try {
      if (editingRoutineId) {
        await updateWorkoutRoutine(editingRoutineId, {
          name: trimmedName,
          exercises: selectedRoutineExercises,
        });
        toast.success(`Updated "${trimmedName}".`);
      } else {
        await addWorkoutRoutine({
          name: trimmedName,
          exercises: selectedRoutineExercises,
        });
        toast.success(`Saved "${trimmedName}".`);
      }
      handleDialogChange(false);
    } catch (error) {
      setRoutineError(error instanceof Error ? error.message : 'Unable to save routine.');
    } finally {
      setIsSavingRoutine(false);
    }
  };

  const handleAdjustRoutineSets = async (
    routineId: string,
    routineNameValue: string,
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
        name: routineNameValue,
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
    routineNameValue: string,
    exerciseName: string,
    currentSets: number,
  ) => {
    if (currentSets <= 1) {
      return;
    }

    const requestKey = `${routineId}:${exerciseName}`;
    setEditingRoutineKey(requestKey);
    try {
      const routine = user?.workoutRoutines.find((item) => item.id === routineId);
      if (!routine) {
        return;
      }
      await updateWorkoutRoutine(routineId, {
        name: routineNameValue,
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
    routineNameValue: string,
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
        name: routineNameValue,
        exercises: routine.exercises.filter((exercise) => exercise.name !== exerciseName),
      });
      toast.success(`Removed ${exerciseName} from "${routineNameValue}".`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to remove the exercise.');
    } finally {
      setEditingRoutineKey('');
    }
  };

  const handleDeleteRoutine = async (routineId: string, routineNameValue: string) => {
    setDeletingRoutineId(routineId);
    try {
      await deleteWorkoutRoutine(routineId);
      toast.success(`Deleted "${routineNameValue}".`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to delete the workout routine.');
    } finally {
      setDeletingRoutineId('');
    }
  };

  const handleUpgradeClick = () => {
    navigate('/subscription');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
                <Dumbbell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl">SmartFit</h1>
                <p className="text-sm text-gray-500">AI-Powered Training</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {hasWorkoutInProgress ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-orange-200 bg-orange-50 text-orange-700 shadow-[0_0_18px_rgba(251,146,60,0.35)] hover:bg-orange-100"
                  onClick={() => navigate('/start-workout')}
                >
                  Session In Progress
                </Button>
              ) : null}
              <Badge variant={user?.subscription === 'premium' ? 'default' : 'secondary'}>
                {user?.subscription === 'premium' ? '⭐ Premium' : 'Basic'}
              </Badge>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl mb-2">Welcome back, {user?.name}! 👋</h2>
          <p className="text-gray-600">Ready to crush your workout today?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/live-training')}>
            <CardHeader className="pb-3">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-2">
                <Camera className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-lg">Live Training</CardTitle>
              <CardDescription>Start real-time tracking</CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/profile')}>
            <CardHeader className="pb-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle className="text-lg">Profile</CardTitle>
              <CardDescription>View your progress</CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/exercises')}>
            <CardHeader className="pb-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle className="text-lg">Exercises</CardTitle>
              <CardDescription>Browse all exercises</CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={handleUpgradeClick}>
            <CardHeader className="pb-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
                <CreditCard className="w-6 h-6 text-purple-600" />
              </div>
              <CardTitle className="text-lg">Upgrade</CardTitle>
              <CardDescription>
                {user?.subscription === 'premium' ? 'Manage premium plan' : 'Unlock premium features'}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/start-workout')}>
            <CardHeader className="pb-3">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-2">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
              <CardTitle className="text-lg">Start Workout</CardTitle>
              <CardDescription>Build today&apos;s session</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Progress Insights</CardTitle>
                <CardDescription>See how your consistency, workload, and form are changing over time</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/profile')}>
                View Full Progress
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {exerciseHistory.length || workoutHistory.length ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border bg-white p-4">
                    <p className="text-sm text-gray-500">Workouts This Week</p>
                    <p className="mt-2 text-3xl">{progressStats.workoutsLast7Days}</p>
                    <p className="mt-1 text-xs text-gray-400">Completed in the last 7 days</p>
                  </div>
                  <div className="rounded-lg border bg-white p-4">
                    <p className="text-sm text-gray-500">Avg Reps Per Session</p>
                    <p className="mt-2 text-3xl">{progressStats.averageRepsPerSession}</p>
                    <p className="mt-1 text-xs text-gray-400">Across all tracked exercise sessions</p>
                  </div>
                  <div className="rounded-lg border bg-white p-4">
                    <p className="text-sm text-gray-500">Best Quality</p>
                    <p className="mt-2 text-3xl">{progressStats.bestQuality}%</p>
                    <p className="mt-1 text-xs text-gray-400">Highest single-session form score</p>
                  </div>
                  <div className="rounded-lg border bg-white p-4">
                    <p className="text-sm text-gray-500">Current Streak</p>
                    <p className="mt-2 text-3xl">{progressStats.streak}</p>
                    <p className="mt-1 text-xs text-gray-400">{progressStats.streak === 1 ? 'Consecutive day' : 'Consecutive days'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <div className="rounded-xl border bg-white p-4">
                    <div className="mb-4">
                      <h3>Weekly Training Load</h3>
                      <p className="text-sm text-gray-500">Track whether your workload is trending up or flattening out</p>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={weeklyLoadData}>
                        <defs>
                          <linearGradient id="repsGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="reps" stroke="#4f46e5" fill="url(#repsGradient)" name="Total reps" />
                        <Line type="monotone" dataKey="workouts" stroke="#0f766e" strokeWidth={2} name="Logged sessions" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="rounded-xl border bg-white p-4">
                    <div className="mb-4">
                      <h3>Form Trend</h3>
                      <p className="text-sm text-gray-500">Compare rep quality against drift over your most recent sessions</p>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={qualityTrendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="quality" stroke="#4f46e5" strokeWidth={3} name="Quality %" />
                        <Line type="monotone" dataKey="drift" stroke="#ef4444" strokeWidth={2} name="Drift %" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="rounded-xl border bg-white p-4">
                    <div className="mb-4">
                      <h3>Exercise Focus</h3>
                      <p className="text-sm text-gray-500">Understand where most of your training volume is going</p>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={exerciseMixData}
                          dataKey="reps"
                          nameKey="exercise"
                          innerRadius={60}
                          outerRadius={95}
                          paddingAngle={3}
                        >
                          {exerciseMixData.map((entry, index) => (
                            <Cell key={entry.exercise} fill={chartColors[index % chartColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="rounded-xl border bg-white p-4">
                    <div className="mb-4">
                      <h3>Consistency Over 14 Days</h3>
                      <p className="text-sm text-gray-500">Spot gaps in your routine before they become trends</p>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={consistencyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" minTickGap={18} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="workouts" fill="#ea580c" radius={[4, 4, 0, 0]} name="Workouts" />
                        <Bar dataKey="sets" fill="#0891b2" radius={[4, 4, 0, 0]} name="Total sets" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed bg-white p-6 text-center">
                <h3 className="mb-1">No progress data yet</h3>
                <p className="text-sm text-gray-500">Complete a few workouts to unlock charts for workload, form trends, and consistency.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Available Exercises</CardTitle>
            <CardDescription>Click any exercise to start training</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {exerciseOptions.map((exercise) => (
                <div
                  key={exercise.name}
                  onClick={() => navigate('/live-training', { state: { exercise: exercise.name } })}
                  className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="text-4xl mb-2">{exercise.icon}</div>
                  <h3 className="mb-1">{exercise.name}</h3>
                  <Badge variant="outline" className="text-xs">{exercise.difficulty}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Saved Workout Routines</CardTitle>
                <CardDescription>Review and adjust your saved plans before loading them into Start Workout</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleDialogChange(true)}>
                <Calendar className="w-4 h-4 mr-2" />
                Create New
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {user?.workoutRoutines.length ? (
              <div className="space-y-4">
                {user.workoutRoutines.map((routine) => (
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
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditRoutine(routine.id)}
                          >
                            Edit Routine
                          </Button>
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
                      </div>

                      <div className="space-y-3">
                        {routine.exercises.map((exercise) => {
                          const exerciseMeta = exerciseConfigByName[exercise.name];
                          return (
                            <div key={`${routine.id}-${exercise.name}`} className="rounded-lg bg-gray-50 p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className="text-2xl">{exerciseMeta?.icon ?? '🏋️'}</div>
                                  <div>
                                    <div>{exercise.name}</div>
                                    <div className="text-sm text-gray-500">{exercise.sets} sets planned</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary">{exerciseMeta?.difficulty ?? 'Routine'}</Badge>
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
                                    onClick={() =>
                                      handleAdjustRoutineSets(routine.id, routine.name, exercise.name, exercise.sets + 1)
                                    }
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
                                    Remove
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed bg-white p-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                  <Plus className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="mb-1">No routines yet</h3>
                <p className="mb-4 text-sm text-gray-500">Build a routine with planned exercises and set counts, then load it into Start Workout when you want to run it.</p>
                <Button variant="outline" onClick={() => handleDialogChange(true)}>
                  <Calendar className="w-4 h-4 mr-2" />
                  Create Your First Routine
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isRoutineDialogOpen} onOpenChange={handleDialogChange}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRoutineId ? 'Edit Workout Routine' : 'Create Workout Routine'}</DialogTitle>
              <DialogDescription>
                {editingRoutineId
                  ? 'Update the routine name, adjust set counts, or add more exercises.'
                  : 'Choose exercises and set counts for a reusable routine.'}
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-5" onSubmit={handleSaveRoutine}>
              <div className="space-y-2">
                <Label htmlFor="routine-name">Routine name</Label>
                <Input
                  id="routine-name"
                  value={routineName}
                  onChange={(event) => {
                    setRoutineName(event.target.value);
                    setRoutineError('');
                  }}
                  placeholder="Upper Body Focus"
                  maxLength={255}
                />
              </div>

              <div className="space-y-3">
                <Label>Select exercises and sets</Label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {exerciseOptions.map((exercise) => {
                    const isSelected = isExerciseSelected(exercise.name);
                    const draft = selectedRoutineExercises.find((entry) => entry.name === exercise.name);
                    return (
                      <div
                        key={exercise.name}
                        className={`rounded-lg border p-4 transition-colors ${
                          isSelected ? 'border-indigo-600 bg-indigo-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleRoutineExercise(exercise.name)}
                          className="w-full text-left"
                        >
                          <div className="mb-1 text-2xl">{exercise.icon}</div>
                          <div>{exercise.name}</div>
                          <div className="text-sm text-gray-500">{exercise.difficulty}</div>
                        </button>

                        {isSelected ? (
                          <div className="mt-4 space-y-2">
                            <Label htmlFor={`sets-${exercise.name}`}>Sets</Label>
                            <Input
                              id={`sets-${exercise.name}`}
                              type="number"
                              min={1}
                              max={10}
                              value={draft?.sets ?? 3}
                              onChange={(event) => updateExerciseSets(exercise.name, Number(event.target.value) || 1)}
                            />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              {routineError ? <p className="text-sm text-red-600">{routineError}</p> : null}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleDialogChange(false)} disabled={isSavingRoutine}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSavingRoutine}>
                  {isSavingRoutine ? 'Saving...' : editingRoutineId ? 'Save Changes' : 'Save Routine'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/partnerships')}>
            <CardHeader>
              <CardTitle>Partnerships</CardTitle>
              <CardDescription>Explore supplements, equipment & more</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                <TrendingUp className="w-4 h-4 mr-2" />
                View Partners
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/book-trainer')}>
            <CardHeader>
              <CardTitle>Personal Trainers</CardTitle>
              <CardDescription>Book a session with a certified trainer</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                <User className="w-4 h-4 mr-2" />
                Book Now
              </Button>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
