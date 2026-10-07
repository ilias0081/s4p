import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import api from '../../lib/api/api';

export type Integration = {
  id: string;
  name: string;
  ui_name: string | null;
  is_connected: boolean;
};

export type IntegrationsResponse = {
  integrations: Integration[];
};

export async function getIntegrations(): Promise<IntegrationsResponse> {
  return api.get('integrations').json<IntegrationsResponse>();
}

export function useIntegrations() {
  return useQuery({
    queryKey: ['integrations'],
    queryFn: getIntegrations,
  });
}

export async function getAuthUrl(integrationId: string): Promise<{ url: string }> {
  const redirectUri = `${window.location.origin}/integration_oauth_callback`;

  return api.post(`integrations/${integrationId}/auth-url`, { json: { redirectUri } }).json<{ url: string }>();
}

export async function removeIntegration(integrationId: string) {
  return api.delete(`integrations/${integrationId}/delete`)
}

export function useConnectIntegration() {
  return useMutation({
    mutationFn: getAuthUrl,
  });
}

export const OAUTH_CHANNEL = 'integration_oauth';

export type OAuthMessage = { code: string } | { error: string };

export async function completeOAuth(code: string): Promise<void> {
  await api.post('integrations/oauth-callback', { json: { code } });
}

export function useCompleteIntegrationOAuth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: completeOAuth,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });
}

export function useRemoveIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeIntegration,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  })
}