import { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, Link } from 'react-router-dom';

import { Tabs } from '../../lib/components/Tabs/Tabs';
import { useCurrentUser, useLogout } from '../login/auth';

export function Dashboard() {
  const sessionQuery = useCurrentUser();
  const logoutMutation = useLogout();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (sessionQuery.isLoading) {
    return <main className="min-h-screen bg-background p-8 text-text">Loading...</main>;
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return <Navigate to="/auth" replace />;
  }

  const { user } = sessionQuery.data;
  const initial = user.first_name.charAt(0).toUpperCase();

  const handleLogout = () => {
    setIsMenuOpen(false);
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        void sessionQuery.refetch();
      },
    });
  };

  return (
    <main className="min-h-screen bg-background text-text">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/15 bg-background/80 px-6 py-4 backdrop-blur-md">
        <Link to="/dashboard" className="text-lg font-bold tracking-[0.06em] text-text">
          s4p
        </Link>

        <Tabs
          tabs={[
            {
              label: 'Workflows',
              to: '/dashboard',
              isActive: (pathname) =>
                pathname === '/dashboard' || pathname.startsWith('/dashboard/workflows/'),
            },
            { label: 'Integrations', to: '/dashboard/integrations' },
            { label: 'Settings', to: '/dashboard/settings' },
          ]}
        />

        <div ref={menuRef} className="relative">
          <button
            type="button"
            aria-label="Account menu"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-primary/30 text-sm font-semibold hover:bg-primary/40"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {initial}
          </button>

          {isMenuOpen ? (
            <div className="absolute right-0 mt-2 w-40 rounded-xl border border-white/15 bg-background p-1 shadow-panel">
              <button
                type="button"
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-secondary hover:bg-white/10 hover:text-text"
                disabled={logoutMutation.isPending}
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">
        <Outlet />
      </section>
    </main>
  );
}

