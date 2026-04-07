import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { confirmPremiumCheckoutSession } from '../lib/billing';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

export function SubscriptionSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      setStatus('error');
      setErrorMessage('Stripe did not return a checkout session ID.');
      return;
    }

    let cancelled = false;

    const confirmCheckout = async () => {
      try {
        await confirmPremiumCheckoutSession(sessionId);
        await refreshUser();
        if (!cancelled) {
          setStatus('success');
        }
      } catch (error) {
        if (!cancelled) {
          setStatus('error');
          setErrorMessage(
            error instanceof Error ? error.message : 'Unable to confirm the Stripe payment.',
          );
        }
      }
    };

    void confirmCheckout();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          {status === 'loading' ? (
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-indigo-600" />
          ) : status === 'success' ? (
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
          ) : (
            <XCircle className="mx-auto h-10 w-10 text-red-600" />
          )}
          <CardTitle>
            {status === 'loading'
              ? 'Confirming your Stripe payment'
              : status === 'success'
                ? 'Premium unlocked'
                : 'Payment confirmation failed'}
          </CardTitle>
          <CardDescription>
            {status === 'loading'
              ? 'Please wait while we verify your checkout session.'
              : status === 'success'
                ? 'Your account has been upgraded to Premium.'
                : errorMessage}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button onClick={() => navigate(status === 'success' ? '/dashboard' : '/subscription')}>
            {status === 'success' ? 'Go to Dashboard' : 'Back to Subscription'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
