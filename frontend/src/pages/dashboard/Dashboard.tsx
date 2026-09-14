import { Navigate, Outlet, Link } from 'react-router-dom';

import { useCurrentUser, useLogout } from '../login/auth';

export function Dashboard() {
  const sessionQuery = useCurrentUser();
  const logoutMutation = useLogout();

  if (sessionQuery.isLoading) {
    return <main className="min-h-screen bg-background p-8 text-text">Loading...</main>;
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return <Navigate to="/auth" replace />;
  }

  const { user } = sessionQuery.data;

  return (
    <main className="min-h-screen bg-background p-8 text-text">
      <header className="flex items-center justify-between">
        <div>
          <h1>Dashboard</h1>
          <p className="mt-2 text-secondary">Welcome, {user.first_name}.</p>
        </div>
        <button
          type="button"
          className="rounded-xl border border-white/20 px-4 py-2 text-sm hover:bg-white/10"
          disabled={logoutMutation.isPending}
          onClick={() => {
            logoutMutation.mutate(undefined, {
              onSuccess: () => {
                void sessionQuery.refetch();
              },
            });
          }}
        >
          Sign out
        </button>
      </header>

      <nav className="mt-8 flex gap-4 text-sm text-secondary">
        <Link className="hover:text-text" to="/dashboard">Dashboard</Link>
        <Link className="hover:text-text" to="/dashboard/settings">Settings</Link>
      </nav>

      <section className="mt-10">
        <Outlet />
      </section>
    </main>
  );
}

export function DashboardHome() {
  return <h2>Dashboard</h2>;
}

export function SettingsPage() {
  return <h2>Settings</h2>;
}
