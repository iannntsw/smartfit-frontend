import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ArrowLeft, Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export function Subscription() {
  const navigate = useNavigate();
  const { user, updateSubscription } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpgrade = async (tier: 'basic' | 'premium') => {
    setIsProcessing(true);

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 1500));

    updateSubscription(tier);
    toast.success(`Successfully ${tier === 'premium' ? 'upgraded to' : 'downgraded to'} ${tier}!`);
    setIsProcessing(false);
  };

  const plans = [
    {
      name: 'Basic',
      price: 'Free',
      tier: 'basic' as const,
      features: [
        'Access to all 4 exercises',
        'Live webcam tracking',
        'Basic rep counting',
        'Form quality metrics',
        'Upload video analysis',
        'Exercise history'
      ],
      limitations: [
        'No AI-suggested improvements',
        'Limited analytics',
        'No personalized coaching'
      ]
    },
    {
      name: 'Premium',
      price: '$9.99/mo',
      tier: 'premium' as const,
      features: [
        'Everything in Basic',
        'AI Chatbot Coach',
        'Real-time form corrections',
        'Personalized workout plans',
        'Advanced analytics & charts',
        'Drift detection alerts',
        'Priority support',
        'Custom routine builder',
        'Progress predictions'
      ],
      popular: true
    }
  ];

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
            <h1 className="text-xl">Subscription Plans</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl mb-4">Choose Your Plan</h2>
          <p className="text-xl text-gray-600">
            Unlock your full potential with AI-powered coaching
          </p>
        </div>

        {/* Current Plan */}
        {user && (
          <div className="max-w-md mx-auto mb-8">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-blue-700 mb-1">Current Plan</p>
                  <h3 className="text-2xl text-blue-900">
                    {user.subscription === 'premium' ? '⭐ Premium' : 'Basic'}
                  </h3>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Plans */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative ${
                plan.popular
                  ? 'border-indigo-500 border-2 shadow-xl'
                  : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-indigo-600 hover:bg-indigo-700">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-8 pt-8">
                <CardTitle className="text-3xl mb-2">{plan.name}</CardTitle>
                <div className="text-4xl mb-2">{plan.price}</div>
                <CardDescription>
                  {plan.tier === 'premium' ? 'For serious athletes' : 'Perfect for beginners'}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-4 mb-6">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}

                  {plan.limitations?.map((limitation) => (
                    <div key={limitation} className="flex items-start gap-3 opacity-50">
                      <div className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span className="text-sm line-through">{limitation}</span>
                    </div>
                  ))}
                </div>

                <Button
                  className="w-full"
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={() => handleUpgrade(plan.tier)}
                  disabled={isProcessing || user?.subscription === plan.tier}
                >
                  {user?.subscription === plan.tier
                    ? 'Current Plan'
                    : plan.tier === 'premium'
                    ? 'Upgrade to Premium'
                    : 'Downgrade to Basic'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Features Comparison */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h3 className="text-2xl text-center mb-8">Premium Features Deep Dive</h3>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Chatbot Coach</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Get instant, personalized feedback on your form. Our AI analyzes your movement in real-time
                  and provides specific corrections to improve your technique and prevent injuries.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Advanced Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Track your progress with detailed charts showing quality trends, drift detection,
                  rep consistency, and more. Understand exactly how you're improving over time.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Drift Detection</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Advanced sensors detect when your form starts to deteriorate during a set.
                  Get alerts to rest or adjust before risking injury.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Custom Routines</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Create unlimited custom workout routines tailored to your goals.
                  The AI suggests optimal exercise combinations and rest periods.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
