const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL ?? 'http://127.0.0.1:8000';
const AUTH_TOKEN_KEY = 'smartfit_auth_token';

type CheckoutSessionResponse = {
  checkoutUrl: string;
  sessionId: string;
};

async function parseError(response: Response): Promise<string> {
  try {
    const payload = await response.json();
    return payload.detail ?? 'Request failed';
  } catch {
    return 'Request failed';
  }
}

function getAuthToken() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) {
    throw new Error('You must be logged in.');
  }
  return token;
}

export async function createPremiumCheckoutSession() {
  const token = getAuthToken();
  const response = await fetch(`${BACKEND_BASE_URL}/api/v1/billing/checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      frontendBaseUrl: window.location.origin,
    }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as CheckoutSessionResponse;
}

export async function confirmPremiumCheckoutSession(sessionId: string) {
  const token = getAuthToken();
  const response = await fetch(
    `${BACKEND_BASE_URL}/api/v1/billing/checkout-session/${encodeURIComponent(sessionId)}/confirm`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}
