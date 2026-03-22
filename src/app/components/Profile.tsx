import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ArrowLeft, TrendingUp, Calendar, Award } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();

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

        {/* Exercise Quality Over Time */}
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

        {/* Exercise Breakdown */}
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

        {/* Workout Routines */}
        <Card>
          <CardHeader>
            <CardTitle>Saved Workout Routines</CardTitle>
            <CardDescription>Your personalized training plans</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {user?.workoutRoutines.map((routine) => (
                <div key={routine.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="mb-1">{routine.name}</h3>
                    <p className="text-sm text-gray-500">{routine.exercises.join(', ')}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Created {new Date(routine.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/live-training')}>
                    Start
                  </Button>
                </div>
              ))}
            </div>
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
