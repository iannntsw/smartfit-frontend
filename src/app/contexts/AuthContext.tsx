import React, { createContext, useContext, useState, useEffect } from 'react';

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
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  updateSubscription: (tier: 'basic' | 'premium') => void;
  addWorkoutRoutine: (routine: Omit<WorkoutRoutine, 'id' | 'createdAt'>) => void;
  addExerciseSession: (session: Omit<ExerciseSession, 'id'>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // Mock login function
  const login = async (email: string, password: string) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock user data
    setUser({
      id: '1',
      email,
      name: email.split('@')[0],
      subscription: 'basic',
      workoutRoutines: [
        {
          id: '1',
          name: 'Upper Body Strength',
          exercises: ['Bicep Curl', 'Dumbbell Lat Raise'],
          createdAt: new Date('2026-03-15')
        },
        {
          id: '2',
          name: 'Lower Body & Core',
          exercises: ['Squats', 'Push-ups'],
          createdAt: new Date('2026-03-18')
        }
      ],
      exerciseHistory: generateMockHistory()
    });
  };

  const signup = async (email: string, password: string, name: string) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    setUser({
      id: '1',
      email,
      name,
      subscription: 'basic',
      workoutRoutines: [],
      exerciseHistory: []
    });
  };

  const logout = () => {
    setUser(null);
  };

  const updateSubscription = (tier: 'basic' | 'premium') => {
    if (user) {
      setUser({ ...user, subscription: tier });
    }
  };

  const addWorkoutRoutine = (routine: Omit<WorkoutRoutine, 'id' | 'createdAt'>) => {
    if (user) {
      const newRoutine = {
        ...routine,
        id: Date.now().toString(),
        createdAt: new Date()
      };
      setUser({
        ...user,
        workoutRoutines: [...user.workoutRoutines, newRoutine]
      });
    }
  };

  const addExerciseSession = (session: Omit<ExerciseSession, 'id'>) => {
    if (user) {
      const newSession = {
        ...session,
        id: Date.now().toString()
      };
      setUser({
        ...user,
        exerciseHistory: [...user.exerciseHistory, newSession]
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, updateSubscription, addWorkoutRoutine, addExerciseSession }}>
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

// Generate mock exercise history data
function generateMockHistory(): ExerciseSession[] {
  const exercises = ['Bicep Curl', 'Dumbbell Lat Raise', 'Push-ups', 'Squats'];
  const sessions: ExerciseSession[] = [];

  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    sessions.push({
      id: `session-${i}`,
      exercise: exercises[Math.floor(Math.random() * exercises.length)],
      date,
      reps: Math.floor(Math.random() * 5) + 8,
      quality: Math.random() * 30 + 70,
      drift: Math.random() * 20
    });
  }

  return sessions.sort((a, b) => a.date.getTime() - b.date.getTime());
}
