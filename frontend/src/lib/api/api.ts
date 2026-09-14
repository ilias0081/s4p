import ky from 'ky';

const api = ky.create({
  prefix: `${window.location.origin}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  retry: 1,
});

export default api;
