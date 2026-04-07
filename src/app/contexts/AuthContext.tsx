import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  subscription: 'basic' | 'premium';
  workoutRoutines: WorkoutRoutine[];
  workoutHistory: WorkoutHistoryEntry[];
  exerciseHistory: ExerciseSession[];
  sensorSetup?: SensorSetup | null;
}

interface SensorSetup {
  id: string;
  deviceName?: string | null;
  bleAddress?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt?: Date | null;
}

interface WorkoutRoutine {
  id: string;
  name: string;
  exercises: WorkoutRoutineExercise[];
  createdAt: Date;
}

interface WorkoutRoutineExercise {
  name: string;
  sets: number;
}

interface WorkoutSetCoachResponse {
  exercise: string;
  predicted_label: string;
  provider: string;
  model: string;
  summary: string;
  priority: string;
  cues: string[];
  safety_note?: string | null;
}

interface WorkoutHistorySetResult {
  exercise: string;
  setNumber: number;
  repCount: number;
  currentQuality: number;
  source: 'upload' | 'webcam';
  coachResponse?: WorkoutSetCoachResponse | null;
}

interface ExerciseSession {
  id: string;
  exercise: string;
  date: Date;
  reps: number;
  quality: number;
  drift: number;
}

interface WorkoutHistoryEntry {
  id: string;
  name: string;
  exercises: WorkoutRoutineExercise[];
  completedAt: Date;
  setResults: WorkoutHistorySetResult[];
}

interface AuthContextType {
  user: User | null;
  isAuthLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  updateSubscription: (tier: 'basic' | 'premium') => Promise<void>;
  refreshUser: () => Promise<void>;
  addWorkoutRoutine: (routine: Omit<WorkoutRoutine, 'id' | 'createdAt'>) => Promise<void>;
  updateWorkoutRoutine: (routineId: string, updates: Omit<WorkoutRoutine, 'id' | 'createdAt'>) => Promise<void>;
  deleteWorkoutRoutine: (routineId: string) => Promise<void>;
  addCompletedWorkout: (workout: Omit<WorkoutHistoryEntry, 'id' | 'completedAt'> & { completedAt?: Date }) => Promise<void>;
  addExerciseSession: (session: Omit<ExerciseSession, 'id'>) => Promise<void>;
  updateSensorSetup: (setup: Omit<SensorSetup, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

type BackendWorkoutRoutine = {
  id: string;
  name: string;
  exercises: Array<string | WorkoutRoutineExercise>;
  createdAt: string | Date;
};

type BackendWorkoutHistoryEntry = {
  id: string;
  name: string;
  exercises: Array<string | WorkoutRoutineExercise>;
  completedAt: string | Date;
  setResults?: WorkoutHistorySetResult[];
};

type BackendUser = {
  id: string;
  email: string;
  name: string;
  subscription: 'basic' | 'premium';
  workoutRoutines?: BackendWorkoutRoutine[];
  workoutHistory?: BackendWorkoutHistoryEntry[];
  exerciseHistory?: ExerciseSession[];
  sensorSetup?: BackendSensorSetup | null;
};

type BackendSensorSetup = {
  id: string;
  deviceName?: string | null;
  bleAddress?: string | null;
  notes?: string | null;
  createdAt: string | Date;
  updatedAt?: string | Date | null;
};

type AuthResponse = {
  access_token: string;
  token_type: string;
  user: BackendUser;
};

type SubscriptionUpdateResponse = BackendUser;

type BackendExerciseSession = {
  id: string;
  exercise: string;
  date: string | Date;
  reps: number;
  quality: number;
  drift: number;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL ?? 'http://127.0.0.1:8000';
const AUTH_TOKEN_KEY = 'smartfit_auth_token';
const AUTH_USER_KEY = 'smartfit_auth_user';

function normalizeUser(user: BackendUser): User {
  return {
    ...user,
    workoutRoutines: (user.workoutRoutines ?? []).map((routine) => ({
      ...routine,
      exercises: routine.exercises.map((exercise) =>
        typeof exercise === 'string'
          ? { name: exercise, sets: 1 }
          : { name: exercise.name, sets: Math.max(1, exercise.sets) },
      ),
      createdAt: new Date(routine.createdAt),
    })),
    workoutHistory: (user.workoutHistory ?? []).map((workout) => ({
      ...workout,
      exercises: workout.exercises.map((exercise) =>
        typeof exercise === 'string'
          ? { name: exercise, sets: 1 }
          : { name: exercise.name, sets: Math.max(1, exercise.sets) },
      ),
      setResults: (workout.setResults ?? []).map((setResult) => ({
        ...setResult,
        source: setResult.source === 'webcam' ? 'webcam' : 'upload',
        setNumber: Math.max(1, setResult.setNumber),
        repCount: Math.max(0, setResult.repCount),
        currentQuality: Math.max(0, setResult.currentQuality),
      })),
      completedAt: new Date(workout.completedAt),
    })),
    exerciseHistory: (user.exerciseHistory ?? []).map((session) => ({
      ...session,
      date: new Date(session.date),
    })),
    sensorSetup: user.sensorSetup
      ? {
          ...user.sensorSetup,
          createdAt: new Date(user.sensorSetup.createdAt),
          updatedAt: user.sensorSetup.updatedAt ? new Date(user.sensorSetup.updatedAt) : null,
        }
      : null,
  };
}

function normalizeExerciseSession(session: BackendExerciseSession): ExerciseSession {
  return {
    ...session,
    date: new Date(session.date),
  };
}

function storeAuth(token: string, user: User) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

function clearStoredAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

async function parseError(response: Response): Promise<string> {
  try {
    const payload = await response.json();
    return payload.detail ?? 'Request failed';
  } catch {
    return 'Request failed';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const syncUser = (backendUser: BackendUser, tokenOverride?: string | null) => {
    const normalizedUser = normalizeUser(backendUser);
    setUser(normalizedUser);
    const token = tokenOverride ?? localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      storeAuth(token, normalizedUser);
    }
    return normalizedUser;
  };

  const refreshUser = async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      throw new Error('You must be logged in.');
    }

    const response = await fetch(`${BACKEND_BASE_URL}/api/v1/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    const backendUser = (await response.json()) as BackendUser;
    syncUser(backendUser, token);
  };

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const rawUser = localStorage.getItem(AUTH_USER_KEY);
    if (rawUser) {
      try {
        setUser(normalizeUser(JSON.parse(rawUser) as BackendUser));
      } catch {
        clearStoredAuth();
      }
    }

    if (!token) {
      setIsAuthLoading(false);
      return;
    }

    fetch(`${BACKEND_BASE_URL}/api/v1/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await parseError(response));
        }
        return response.json() as Promise<BackendUser>;
      })
      .then((backendUser) => {
        syncUser(backendUser, token);
      })
      .catch(() => {
        clearStoredAuth();
        setUser(null);
      })
      .finally(() => {
        setIsAuthLoading(false);
      });
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch(`${BACKEND_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    const payload = (await response.json()) as AuthResponse;
    syncUser(payload.user, payload.access_token);
    setIsAuthLoading(false);
  };

  const signup = async (email: string, password: string, name: string) => {
    const response = await fetch(`${BACKEND_BASE_URL}/api/v1/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    const payload = (await response.json()) as AuthResponse;
    syncUser(payload.user, payload.access_token);
    setIsAuthLoading(false);
  };

  const logout = () => {
    clearStoredAuth();
    setUser(null);
    setIsAuthLoading(false);
  };

  const updateSubscription = async (tier: 'basic' | 'premium') => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      throw new Error('You must be logged in to update a subscription.');
    }

    const response = await fetch(`${BACKEND_BASE_URL}/api/v1/auth/subscription`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tier }),
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    const backendUser = (await response.json()) as SubscriptionUpdateResponse;
    syncUser(backendUser, token);
  };

  const addWorkoutRoutine = async (routine: Omit<WorkoutRoutine, 'id' | 'createdAt'>) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      throw new Error('You must be logged in to save a workout routine.');
    }

    const response = await fetch(`${BACKEND_BASE_URL}/api/v1/routines`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(routine),
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    const savedRoutine = (await response.json()) as BackendWorkoutRoutine;

    setUser((existingUser) => {
      if (!existingUser) {
        return existingUser;
      }
      const normalizedRoutine = {
        ...savedRoutine,
        exercises: savedRoutine.exercises.map((exercise) =>
          typeof exercise === 'string'
            ? { name: exercise, sets: 1 }
            : { name: exercise.name, sets: Math.max(1, exercise.sets) },
        ),
        createdAt: new Date(savedRoutine.createdAt),
      };
      const updatedUser = {
        ...existingUser,
        workoutRoutines: [normalizedRoutine, ...existingUser.workoutRoutines],
      };
      storeAuth(token, updatedUser);
      return updatedUser;
    });
  };

  const updateWorkoutRoutine = async (
    routineId: string,
    updates: Omit<WorkoutRoutine, 'id' | 'createdAt'>,
  ) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      throw new Error('You must be logged in to update a workout routine.');
    }

    const response = await fetch(`${BACKEND_BASE_URL}/api/v1/routines/${routineId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    const savedRoutine = (await response.json()) as BackendWorkoutRoutine;

    setUser((existingUser) => {
      if (!existingUser) {
        return existingUser;
      }
      const normalizedRoutine = {
        ...savedRoutine,
        exercises: savedRoutine.exercises.map((exercise) =>
          typeof exercise === 'string'
            ? { name: exercise, sets: 1 }
            : { name: exercise.name, sets: Math.max(1, exercise.sets) },
        ),
        createdAt: new Date(savedRoutine.createdAt),
      };
      const updatedUser = {
        ...existingUser,
        workoutRoutines: existingUser.workoutRoutines.map((routine) =>
          routine.id === routineId ? normalizedRoutine : routine,
        ),
      };
      storeAuth(token, updatedUser);
      return updatedUser;
    });
  };

  const deleteWorkoutRoutine = async (routineId: string) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      throw new Error('You must be logged in to delete a workout routine.');
    }

    const response = await fetch(`${BACKEND_BASE_URL}/api/v1/routines/${routineId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    setUser((existingUser) => {
      if (!existingUser) {
        return existingUser;
      }
      const updatedUser = {
        ...existingUser,
        workoutRoutines: existingUser.workoutRoutines.filter((routine) => routine.id !== routineId),
      };
      storeAuth(token, updatedUser);
      return updatedUser;
    });
  };

  const addCompletedWorkout = async (
    workout: Omit<WorkoutHistoryEntry, 'id' | 'completedAt'> & { completedAt?: Date },
  ) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      throw new Error('You must be logged in to save workout history.');
    }

    const completedAt = workout.completedAt ?? new Date();
    const response = await fetch(`${BACKEND_BASE_URL}/api/v1/workouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: workout.name,
        exercises: workout.exercises,
        completedAt: completedAt.toISOString(),
        setResults: workout.setResults ?? [],
      }),
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    const savedWorkout = (await response.json()) as BackendWorkoutHistoryEntry;
    setUser((existingUser) => {
      if (!existingUser) {
        return existingUser;
      }
      const normalizedWorkout = {
        ...savedWorkout,
        exercises: savedWorkout.exercises.map((exercise) =>
          typeof exercise === 'string'
            ? { name: exercise, sets: 1 }
            : { name: exercise.name, sets: Math.max(1, exercise.sets) },
        ),
        setResults: (savedWorkout.setResults ?? []).map((setResult) => ({
          ...setResult,
          source: setResult.source === 'webcam' ? 'webcam' : 'upload',
          setNumber: Math.max(1, setResult.setNumber),
          repCount: Math.max(0, setResult.repCount),
          currentQuality: Math.max(0, setResult.currentQuality),
        })),
        completedAt: new Date(savedWorkout.completedAt),
      };
      const updatedUser = {
        ...existingUser,
        workoutHistory: [normalizedWorkout, ...existingUser.workoutHistory],
      };
      storeAuth(token, updatedUser);
      return updatedUser;
    });
  };

  const addExerciseSession = async (session: Omit<ExerciseSession, 'id'>) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      throw new Error('You must be logged in to save a session.');
    }

    const response = await fetch(`${BACKEND_BASE_URL}/api/v1/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        exercise: session.exercise,
        date: session.date.toISOString(),
        reps: session.reps,
        quality: session.quality,
        drift: session.drift,
      }),
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    const savedSession = normalizeExerciseSession((await response.json()) as BackendExerciseSession);
    setUser((existingUser) => {
      if (!existingUser) {
        return existingUser;
      }
      const updatedUser = {
        ...existingUser,
        exerciseHistory: [...existingUser.exerciseHistory, savedSession],
      };
      storeAuth(token, updatedUser);
      return updatedUser;
    });
  };

  const updateSensorSetup = async (setup: Omit<SensorSetup, 'id' | 'createdAt' | 'updatedAt'>) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      throw new Error('You must be logged in to save sensor setup.');
    }

    const response = await fetch(`${BACKEND_BASE_URL}/api/v1/profile/sensor-setup`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(setup),
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    const savedSetup = (await response.json()) as BackendSensorSetup;
    setUser((existingUser) => {
      if (!existingUser) {
        return existingUser;
      }
      const updatedUser = {
        ...existingUser,
        sensorSetup: {
          ...savedSetup,
          createdAt: new Date(savedSetup.createdAt),
          updatedAt: savedSetup.updatedAt ? new Date(savedSetup.updatedAt) : null,
        },
      };
      storeAuth(token, updatedUser);
      return updatedUser;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthLoading,
        login,
        signup,
        logout,
        updateSubscription,
        refreshUser,
        addWorkoutRoutine,
        updateWorkoutRoutine,
        deleteWorkoutRoutine,
        addCompletedWorkout,
        addExerciseSession,
        updateSensorSetup,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
