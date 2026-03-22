import { useNavigate } from 'react-router';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Dumbbell, Camera, TrendingUp, Shield, Zap, Users, CheckCircle2, Star } from 'lucide-react';

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
                <Dumbbell className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl">SmartFit</span>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => navigate('/login')}>
                Sign In
              </Button>
              <Button onClick={() => navigate('/signup')}>
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <Badge className="mb-4">AI-Powered Fitness Training</Badge>
          <h1 className="text-5xl md:text-6xl mb-6">
            Train Smarter, Not Harder
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Perfect your form, prevent injuries, and accelerate your fitness journey with real-time AI coaching and computer vision technology.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/signup')}>
              Start Free Trial
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/login')}>
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl mb-4">Everything You Need to Succeed</h2>
            <p className="text-xl text-gray-600">
              Cutting-edge technology meets personalized fitness coaching
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                  <Camera className="w-6 h-6 text-red-600" />
                </div>
                <CardTitle>Live Form Tracking</CardTitle>
                <CardDescription>
                  Real-time computer vision analyzes your movements and provides instant feedback on your form
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle>Progress Analytics</CardTitle>
                <CardDescription>
                  Track rep quality, drift detection, and performance trends with beautiful visualizations
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle>AI Coaching</CardTitle>
                <CardDescription>
                  Get personalized form corrections and training advice powered by advanced AI (Premium)
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>Injury Prevention</CardTitle>
                <CardDescription>
                  Detect form breakdown before it leads to injury with drift detection alerts
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-orange-600" />
                </div>
                <CardTitle>Expert Trainers</CardTitle>
                <CardDescription>
                  Book sessions with certified personal trainers for personalized 1-on-1 coaching
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-6 h-6 text-indigo-600" />
                </div>
                <CardTitle>4 Core Exercises</CardTitle>
                <CardDescription>
                  Master bicep curls, lat raises, push-ups, and squats with guided video analysis
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl mb-4">How It Works</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-2xl text-white mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl mb-2">Position Your Camera</h3>
              <p className="text-gray-600">
                Set up your webcam or phone camera to capture your full body during exercises
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-2xl text-white mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl mb-2">Start Your Workout</h3>
              <p className="text-gray-600">
                Select your exercise and begin training. Our AI tracks your movement in real-time
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-2xl text-white mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl mb-2">Get Instant Feedback</h3>
              <p className="text-gray-600">
                Receive live form corrections, rep counts, and quality scores to perfect your technique
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl mb-4">Loved by Fitness Enthusiasts</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'Alex M.',
                role: 'Gym Beginner',
                content: 'Finally feel confident in my form! The real-time feedback is a game-changer.',
                rating: 5
              },
              {
                name: 'Sarah K.',
                role: 'Fitness Enthusiast',
                content: 'The AI coaching helped me fix my squat form and my knees feel so much better.',
                rating: 5
              },
              {
                name: 'Mike T.',
                role: 'Home Workout Fan',
                content: 'Like having a personal trainer in my pocket. Worth every penny of the premium subscription.',
                rating: 5
              }
            ].map((testimonial) => (
              <Card key={testimonial.name}>
                <CardContent className="pt-6">
                  <div className="flex mb-2">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-4">"{testimonial.content}"</p>
                  <div>
                    <div>{testimonial.name}</div>
                    <div className="text-sm text-gray-500">{testimonial.role}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl mb-6">Ready to Transform Your Training?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of users who are training smarter and safer with SmartFit
          </p>
          <Button size="lg" variant="secondary" onClick={() => navigate('/signup')}>
            Start Your Free Trial
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl">SmartFit</span>
          </div>
          <p className="text-gray-400">
            AI-powered training for a smarter, safer workout experience
          </p>
          <p className="text-gray-500 text-sm mt-4">
            © 2026 SmartFit. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
