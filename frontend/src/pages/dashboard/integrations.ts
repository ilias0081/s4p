import { useQuery } from '@tanstack/react-query';

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
