import { useEffect, useState } from 'react';

type HealthResponse = {
  status: 'ok' | 'degraded';
  timestamp: string;
  services: {
    api: 'ok';
    database: 'ok' | 'error';
  };
};

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadHealth() {
      try {
        const response = await fetch('/api/health');

        if (!response.ok) {
          throw new Error(`Health check failed with status ${response.status}`);
        }

        const payload = (await response.json()) as HealthResponse;

        if (!cancelled) {
          setHealth(payload);
          setError(null);
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : 'Unknown error');
        }
      }
    }

    loadHealth();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(82,182,255,0.24),_transparent_36%),linear-gradient(135deg,_#09111f_0%,_#111c2f_48%,_#1e2f4f_100%)] px-6 py-10 text-white">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 rounded-[2rem] border border-white/10 bg-white/6 p-8 shadow-panel backdrop-blur md:p-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl space-y-4">
            <p className="text-sm uppercase tracking-[0.35em] text-mist/70">Docker-first scaffold</p>
            <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
              React, Express, Kysely, Postgres, and nginx.
            </h1>
            <p className="max-w-2xl text-base text-mist/80 md:text-lg">
              This workspace is wired so the containers own the build, the runtime, and the service topology.
              The host machine only needs Docker.
            </p>
          </div>

          <div className="rounded-2xl border border-ember/40 bg-ember/10 px-5 py-4 text-sm text-mist shadow-lg shadow-ember/10">
            <p className="font-medium text-white">Entry points</p>
            <p>Gateway: localhost:8080</p>
            <p>Frontend: localhost:4173</p>
            <p>Backend: localhost:3001</p>
            <p>Postgres: localhost:5432</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[1.5rem] border border-white/10 bg-black/15 p-6">
            <h2 className="text-xl font-semibold text-white">Service graph</h2>
            <div className="mt-5 grid gap-4 text-sm text-mist/85 md:grid-cols-2">
              <div className="rounded-2xl border border-tide/30 bg-tide/10 p-4">
                <p className="font-medium text-white">frontend</p>
                <p>Vite build compiled inside Docker, then served by nginx.</p>
              </div>
              <div className="rounded-2xl border border-tide/30 bg-tide/10 p-4">
                <p className="font-medium text-white">backend</p>
                <p>Express + Kysely API running as compiled Node.js output.</p>
              </div>
              <div className="rounded-2xl border border-tide/30 bg-tide/10 p-4">
                <p className="font-medium text-white">postgres</p>
                <p>Persistent Postgres container with local host exposure for GUI tools.</p>
              </div>
              <div className="rounded-2xl border border-tide/30 bg-tide/10 p-4">
                <p className="font-medium text-white">nginx gateway</p>
                <p>Single public reverse proxy for frontend traffic and `/api` requests.</p>
              </div>
            </div>
          </article>

          <article className="rounded-[1.5rem] border border-white/10 bg-black/15 p-6">
            <h2 className="text-xl font-semibold text-white">Health check</h2>
            <div className="mt-5 space-y-4 text-sm text-mist/85">
              {health ? (
                <>
                  <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4">
                    <p className="font-medium text-white">API status: {health.status}</p>
                    <p>Database: {health.services.database}</p>
                    <p>Timestamp: {new Date(health.timestamp).toLocaleString()}</p>
                  </div>
                  <p>
                    The frontend is calling <span className="font-medium text-white">/api/health</span> so the
                    same UI works on the direct frontend port and through the nginx gateway.
                  </p>
                </>
              ) : null}

              {error ? (
                <div className="rounded-2xl border border-ember/40 bg-ember/10 p-4 text-white">
                  <p className="font-medium">Unable to load health status</p>
                  <p className="mt-2 text-sm text-mist/85">{error}</p>
                </div>
              ) : null}

              {!health && !error ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
                  Checking container health...
                </div>
              ) : null}
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}

export default App;