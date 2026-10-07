import { useEffect, useRef, useState } from 'react';

import { Button } from '../../../lib/components/Button/Button';
import { List, ListItem } from '../../../lib/components/List/List';
import { Modal, type ModalHandle } from '../../../lib/components/Modal/Modal';
import {
  OAUTH_CHANNEL,
  useCompleteIntegrationOAuth,
  useConnectIntegration,
  useIntegrations,
  useRemoveIntegration,
  type Integration,
  type OAuthMessage,
} from '../integrations';

export function IntegrationsPage() {
  const integrationsQuery = useIntegrations();
  const connectMutation = useConnectIntegration();
  const completeMutation = useCompleteIntegrationOAuth();
  const [connectError, setConnectError] = useState('');
  const removeIntegrationMutation = useRemoveIntegration();
  const removeModalRef = useRef<ModalHandle<Integration>>(null);

  // the popup can't reliably reach window.opener after visiting the provider, so it posts the code on a same-origin channel
  useEffect(() => {
    const channel = new BroadcastChannel(OAUTH_CHANNEL);

    channel.onmessage = (event: MessageEvent<OAuthMessage>) => {
      if ('error' in event.data) {
        setConnectError(event.data.error);
        return;
      }

      completeMutation.mutate(event.data.code, {
        onError: () => setConnectError('Unable to complete the connection. Please try again.'),
      });
    };

    return () => channel.close();
  }, [completeMutation.mutate]);

  const handleConnect = (integrationId: string) => {
    setConnectError('');

    // opened synchronously inside the click so popup blockers allow it; navigated once the url arrives
    const popup = window.open('about:blank', 'integration_oauth', 'width=500,height=500');

    if (!popup) {
      setConnectError('The popup was blocked. Allow popups for this site and try again.');
      return;
    }

    connectMutation.mutate(integrationId, {
      onSuccess: ({ url }) => {
        popup.location.href = url;
      },
      onError: () => {
        popup.close();
        setConnectError('Unable to start the connection. Please try again.');
      },
    });
  };

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

      {connectError ? <p className="mt-4 text-sm text-red-400">{connectError}</p> : null}

      {integrations.length === 0 ? (
        <p className="mt-4 text-secondary">No integrations available.</p>
      ) : (
        <List id="integrations-list" hasSearch className="mt-4">
          {integrations.map((integration) => (
            <ListItem
              key={integration.id}
              id={`integration-${integration.id}`}
              className={integration.is_connected ? '!border-white' : ''}
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
                    disabled={removeIntegrationMutation.isPending && removeIntegrationMutation.variables === integration.id}
                    onClick={() => removeModalRef.current?.showModal(integration)}
                  >
                    Remove
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={connectMutation.isPending && connectMutation.variables === integration.id}
                    onClick={() => handleConnect(integration.id)}
                  >
                    Connect
                  </Button>
                )}
              </div>
            </ListItem>
          ))}
        </List>
      )}

      <Modal<Integration>
        ref={removeModalRef}
        add_title="Remove integration"
        body={() => (
          <p>Are you sure you want to remove this integration? This may break your workflows.</p>
        )}
        footer={({ status }) => (
          <>
            <Button
              type="button"
              variant="neutral"
              disabled={status === 'loading'}
              onClick={() => removeModalRef.current?.hideModal()}
            >
              Cancel
            </Button>
            <Button type="submit" variant="danger" disabled={status === 'loading'}>
              {status === 'loading' ? 'Removing...' : 'Remove'}
            </Button>
          </>
        )}
        submit={async (data) => {
          if (!data?.id) {
            throw new Error('Integration not found.');
          }

          try {
            await removeIntegrationMutation.mutateAsync(data.id);
          } catch {
            throw new Error('Unable to delete the connection. Please try again.');
          }

          removeModalRef.current?.hideModal();
        }}
      />
    </div>
  );
}
