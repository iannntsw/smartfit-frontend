import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Activity, Camera, User, CreditCard, Dumbbell, LogOut, TrendingUp, Calendar } from 'lucide-react';

export function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const exercises = [
    { name: 'Bicep Curl', icon: '💪', difficulty: 'Beginner' },
    { name: 'Dumbbell Lat Raise', icon: '🏋️', difficulty: 'Beginner' },
    { name: 'Push-ups', icon: '🤸', difficulty: 'Beginner' },
    { name: 'Squats', icon: '🦵', difficulty: 'Intermediate' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl mb-2">Welcome back, {user?.name}! 👋</h2>
          <p className="text-gray-600">Ready to crush your workout today?</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/subscription')}>
            <CardHeader className="pb-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
                <CreditCard className="w-6 h-6 text-purple-600" />
              </div>
              <CardTitle className="text-lg">Upgrade</CardTitle>
              <CardDescription>Unlock premium features</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Exercise Library */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Available Exercises</CardTitle>
            <CardDescription>Click any exercise to start training</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {exercises.map((exercise) => (
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

        {/* Saved Routines */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Saved Workout Routines</CardTitle>
                <CardDescription>Your personalized workout plans</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Calendar className="w-4 h-4 mr-2" />
                Create New
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {user?.workoutRoutines.map((routine) => (
                <div key={routine.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div>
                    <h3 className="mb-1">{routine.name}</h3>
                    <p className="text-sm text-gray-500">{routine.exercises.join(', ')}</p>
                  </div>
                  <Button variant="outline" size="sm">Start</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Additional Features */}
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
