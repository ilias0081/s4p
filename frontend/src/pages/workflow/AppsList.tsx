import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api/api';
import { List, ListItem } from '../../lib/components/List/List';

export type App = { id: string; name: string; ui_name: string };

const icons = import.meta.glob<string>('../../lib/assets/integration_app_icons/*.webp', {
  eager: true, query: '?url', import: 'default',
});

export function AppsList({ onSelect }: { onSelect: (app: App) => void }) {
  const appsQuery = useQuery({
    queryKey: ['apps'],
    queryFn: () => api.get('apps').json<{ apps: App[] }>(),
  });

  if (appsQuery.isPending) return <p className="text-secondary">Loading apps...</p>;
  if (appsQuery.isError) return <p className="text-red-400">Unable to load apps. Please try again.</p>;
  if (!appsQuery.data.apps.length) return <p className="text-secondary">No apps available.</p>;

  return (
    <List id="operation-apps" hasSearch>
      {appsQuery.data.apps.map((app) => {
        const icon = icons[`../../lib/assets/integration_app_icons/${app.name}.webp`];
        return (
          <ListItem key={app.id} className="!p-0 overflow-hidden">
            <button type="button" onClick={() => onSelect(app)} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-white/5">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                {icon ? <img src={icon} alt="" className="max-h-full max-w-full object-contain" /> : (
                  <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/20 text-xs font-semibold">{app.ui_name.charAt(0)}</span>
                )}
              </div>
              <span className="searchable text-sm font-medium">{app.ui_name}</span>
            </button>
          </ListItem>
        );
      })}
    </List>
  );
}
