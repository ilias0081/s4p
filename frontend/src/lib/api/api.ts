import ky from 'ky';

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
        if (response.status !== 401) {
          return;
        }

        const body = (await response.clone().json().catch(() => undefined)) as { code?: string } | undefined;

        if (body?.code === 'NOT_AUTHENTICATED') {
          window.location.replace('/auth');
        }
      },
    ],
  },
});

export default api;
