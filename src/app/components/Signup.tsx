import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dumbbell } from 'lucide-react';

export function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { signup } = useAuth();
  const navigate = useNavigate();

  const passwordValidationMessage =
    password.length > 0 && password.length < 8
      ? 'Password must be at least 8 characters long.'
      : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      await signup(email, password, name);
      navigate('/dashboard');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to create account. Please try again.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mb-2">
            <Dumbbell className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>Start your fitness journey with SmartFit</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {passwordValidationMessage ? (
                <p className="text-xs text-red-600">{passwordValidationMessage}</p>
              ) : null}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating account...' : 'Sign Up'}
            </Button>
            {errorMessage ? (
              <p className="text-sm text-red-600">{errorMessage}</p>
            ) : null}
          </form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-indigo-600 hover:underline"
            >
              Sign in
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
