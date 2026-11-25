import ky from 'ky';
import { showUiError } from './uiErrors';

function getCsrfToken(): string | undefined {
  const match = document.cookie.match(/(?:^|; )csrfToken=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

const api = ky.create({
  prefix: `${window.location.origin}/api`,
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
  retry: 1,
  hooks: {
    beforeRequest: [
      ({ request }) => {
        const csrfToken = getCsrfToken();

        if (csrfToken) {
          request.headers.set('x-csrf-token', csrfToken);
        }
      },
    ],
    afterResponse: [
      async ({ response }) => {
        if (response.ok) return;

        const body = (await response.clone().json().catch(() => undefined)) as { code?: string; error?: string } | undefined;

        // Server failures contain translated public messages; UI_ERROR is already user-facing.
        if ((body?.code === 'UI_ERROR' || response.status >= 500) && typeof body?.error === 'string') {
          showUiError(body.error);
        }

        if (response.status === 401 && body?.code === 'NOT_AUTHENTICATED' && window.location.hostname !== 'localhost') {
          window.location.replace('/auth');
        }
      },
    ],
  },
});

export default api;
