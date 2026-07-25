import { useState } from 'react';
import { Button } from '../../lib/components/Button';
import { Input } from '../../lib/components/Input';

type Mode = 'login' | 'signup';

export function AuthPage() {
  const [mode, setMode] = useState<Mode>('signup');

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-text">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(600px_circle_at_30%_20%,rgba(13,0,255,0.25),transparent_50%),radial-gradient(500px_circle_at_75%_80%,rgba(119,0,255,0.2),transparent_50%)]" />

      <div className="my-4 w-full max-w-sm rounded-3xl border border-white/15 bg-white/5 p-8 backdrop-blur-xl">
        <h2 className="text-text">{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h2>
        <p className="mt-2 text-sm text-secondary">
          {mode === 'signup'
            ? 'Start automating your workflows for free.'
            : 'Sign in to continue to s4p.'}
        </p>

        <form
          className="mt-8 flex flex-col gap-4"
          onSubmit={(e) => e.preventDefault()}
        >
          {mode === 'signup' ? ([
            <Input label="First name" type="text" placeholder="Jane" autoComplete="name" />,
            <Input label="Last name" type="text" placeholder="Smith" autoComplete="name" />,
          ]) : null}

          <Input label="Email" type="email" placeholder="you@example.com" autoComplete="email" />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />

          {mode === 'signup' ? (
            <Input
              label="Confirm password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
            />
          ) : null}

          <Button type="submit" variant="primary" size="lg" className="mt-2 w-full rounded-xl">
            {mode === 'signup' ? 'Create account' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-secondary">
          {mode === 'signup' ? (
            <>
              Already have an account?{' '}
              <button
                className="font-medium text-text underline-offset-2 hover:underline"
                onClick={() => setMode('login')}
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              No account yet?{' '}
              <button
                className="font-medium text-text underline-offset-2 hover:underline"
                onClick={() => setMode('signup')}
              >
                Sign up free
              </button>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
