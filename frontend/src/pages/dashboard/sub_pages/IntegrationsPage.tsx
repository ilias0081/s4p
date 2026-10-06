import { Button } from '../../../lib/components/Button/Button';
import { List, ListItem } from '../../../lib/components/List/List';
import { useIntegrations } from '../integrations';

export function IntegrationsPage() {
  const integrationsQuery = useIntegrations();

  if (integrationsQuery.isLoading) {
    return <p className="text-secondary">Loading integrations...</p>;
  }

  if (integrationsQuery.isError) {
    return <p className="text-red-400">Unable to load integrations.</p>;
  }

  const integrations = integrationsQuery.data?.integrations ?? [];

  return (
    <div>
      <h2>Integrations</h2>

      {integrations.length === 0 ? (
        <p className="mt-4 text-secondary">No integrations available.</p>
      ) : (
        <List id="integrations-list" hasSearch className="mt-4">
          {integrations.map((integration) => (
            <ListItem
              key={integration.id}
              id={`integration-${integration.id}`}
              className={integration.is_connected ? '!border-white !bg-white !text-background' : ''}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden">
                    <img
                      src={new URL(`../../../lib/assets/integration_app_icons/${integration.name}.webp`, import.meta.url).href}
                      alt=""
                      className="max-h-full max-w-full object-contain"
                      onError={(event) => {
                        event.currentTarget.style.visibility = 'hidden';
                      }}
                    />
                  </div>
                  <span className="searchable font-semibold">{integration.ui_name ?? integration.name}</span>
                </div>
                {integration.is_connected ? (
                  <Button
                    variant="danger"
                    size="sm"
                    className="!text-red-600 hover:!text-red-700"
                    onClick={() => {}}
                  >
                    Remove
                  </Button>
                ) : (
                  <Button variant="primary" size="sm" onClick={() => {}}>
                    Connect
                  </Button>
                )}
              </div>
            </ListItem>
          ))}
        </List>
      )}
    </div>
  );
}
