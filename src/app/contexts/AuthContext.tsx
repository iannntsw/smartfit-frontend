import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  subscription: 'basic' | 'premium';
  workoutRoutines: WorkoutRoutine[];
  exerciseHistory: ExerciseSession[];
}

interface WorkoutRoutine {
  id: string;
  name: string;
  exercises: string[];
  createdAt: Date;
}

interface ExerciseSession {
  id: string;
  exercise: string;
  date: Date;
  reps: number;
  quality: number;
  drift: number;
}

interface AuthContextType {
  user: User | null;
  isAuthLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  updateSubscription: (tier: 'basic' | 'premium') => void;
  addWorkoutRoutine: (routine: Omit<WorkoutRoutine, 'id' | 'createdAt'>) => void;
  addExerciseSession: (session: Omit<ExerciseSession, 'id'>) => Promise<void>;
}

type BackendUser = {
  id: string;
  email: string;
  name: string;
  subscription: 'basic' | 'premium';
  workoutRoutines?: WorkoutRoutine[];
  exerciseHistory?: ExerciseSession[];
};

type AuthResponse = {
  access_token: string;
  token_type: string;
  user: BackendUser;
};

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
    workoutRoutines: user.workoutRoutines ?? [],
    exerciseHistory: (user.exerciseHistory ?? []).map((session) => ({
      ...session,
      date: new Date(session.date),
    })),
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
        const normalizedUser = normalizeUser(backendUser);
        setUser((existingUser) => ({
          ...normalizedUser,
          workoutRoutines: existingUser?.workoutRoutines ?? normalizedUser.workoutRoutines,
          exerciseHistory: normalizedUser.exerciseHistory,
        }));
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
    const normalizedUser = normalizeUser(payload.user);
    setUser(normalizedUser);
    storeAuth(payload.access_token, normalizedUser);
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
    const normalizedUser = normalizeUser(payload.user);
    setUser(normalizedUser);
    storeAuth(payload.access_token, normalizedUser);
    setIsAuthLoading(false);
  };

  const logout = () => {
    clearStoredAuth();
    setUser(null);
    setIsAuthLoading(false);
  };

  const updateSubscription = (tier: 'basic' | 'premium') => {
    setUser((existingUser) => {
      if (!existingUser) {
        return existingUser;
      }
      const updatedUser = { ...existingUser, subscription: tier };
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (token) {
        storeAuth(token, updatedUser);
      }
      return updatedUser;
    });
  };

  const addWorkoutRoutine = (routine: Omit<WorkoutRoutine, 'id' | 'createdAt'>) => {
    setUser((existingUser) => {
      if (!existingUser) {
        return existingUser;
      }
      const newRoutine = {
        ...routine,
        id: Date.now().toString(),
        createdAt: new Date(),
      };
      const updatedUser = {
        ...existingUser,
        workoutRoutines: [...existingUser.workoutRoutines, newRoutine],
      };
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (token) {
        storeAuth(token, updatedUser);
      }
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

  return (
    <AuthContext.Provider
      value={{ user, isAuthLoading, login, signup, logout, updateSubscription, addWorkoutRoutine, addExerciseSession }}
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
