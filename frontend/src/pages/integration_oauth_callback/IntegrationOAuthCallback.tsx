import { useEffect, useRef } from 'react';

import { OAUTH_CHANNEL, type OAuthMessage } from '../dashboard/integrations';

export function IntegrationOAuthCallback() {
  // StrictMode runs effects twice in dev and an authorization code is single use
  const hasSent = useRef(false);

  useEffect(() => {
    if (hasSent.current) {
      return;
    }

    hasSent.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const message: OAuthMessage = code
      ? { code }
      : { error: params.get('error_description') ?? params.get('error') ?? 'The connection was cancelled.' };

    const channel = new BroadcastChannel(OAUTH_CHANNEL);
    channel.postMessage(message);
    channel.close();
    window.close();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-8 text-text">
      <p className="text-secondary">Finishing the connection. You can close this window.</p>
    </main>
  );
}
