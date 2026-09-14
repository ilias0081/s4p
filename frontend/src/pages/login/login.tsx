import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../lib/components/Button';
import { Input } from '../../lib/components/Input';
import { useLogin, useSignUp } from './auth';

type Mode = 'login' | 'signup';

export function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('signup');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const signupMutation = useSignUp();
  const loginMutation = useLogin();

  const isSubmitting = signupMutation.isPending || loginMutation.isPending;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (mode === 'signup') {
      if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
        setError('Please complete all fields.');
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }

      signupMutation.mutate(
        { firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), password },
        {
          onError: (submitError) => {
            setError(submitError instanceof Error ? submitError.message : 'Unable to create account.');
          },
        }
      );

      return;
    }

    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }

    loginMutation.mutate(
      { email: email.trim(), password },
      {
        onSuccess: () => {
          navigate('/dashboard');
        },
        onError: (submitError) => {
          setError(submitError instanceof Error ? submitError.message : 'Invalid email or password.');
        },
      }
    );
  };

  const resetMode = (nextMode: Mode) => {
    setMode(nextMode);
    setError('');
  };

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

        <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit}>
          {mode === 'signup' ? (
            <>
              <Input
                label="First name"
                type="text"
                placeholder="Jane"
                autoComplete="given-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
              />
              <Input
                label="Last name"
                type="text"
                placeholder="Smith"
                autoComplete="family-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
              />
            </>
          ) : null}

          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          {mode === 'signup' ? (
            <Input
              label="Confirm password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          ) : null}

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <Button type="submit" variant="primary" size="lg" className="mt-2 w-full rounded-xl" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-secondary">
          {mode === 'signup' ? (
            <>
              Already have an account?{' '}
              <button
                type="button"
                className="font-medium text-text underline-offset-2 hover:underline"
                onClick={() => resetMode('login')}
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              No account yet?{' '}
              <button
                type="button"
                className="font-medium text-text underline-offset-2 hover:underline"
                onClick={() => resetMode('signup')}
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
