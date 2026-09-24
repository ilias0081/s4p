import { randomBytes, timingSafeEqual } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

const CSRF_COOKIE_NAME = 'csrfToken';
const CSRF_HEADER_NAME = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) {
    return {};
  }

  return header.split(';').reduce<Record<string, string>>((cookies, part) => {
    const separatorIndex = part.indexOf('=');

    if (separatorIndex === -1) {
      return cookies;
    }

    const name = part.slice(0, separatorIndex).trim();
    const value = part.slice(separatorIndex + 1).trim();

    if (name) {
      cookies[name] = decodeURIComponent(value);
    }

    return cookies;
  }, {});
}

export function issueCsrfToken(request: Request, response: Response) {
  const token = randomBytes(32).toString('hex');

  response.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    sameSite: 'lax',
    secure: request.secure,
    maxAge: 1000 * 60 * 60 * 24
  });

  return response.status(200).json({ csrfToken: token });
}

export function verifyCsrfToken(request: Request, response: Response, next: NextFunction) {
  if (SAFE_METHODS.has(request.method)) {
    return next();
  }

  const cookieToken = parseCookies(request.headers.cookie)[CSRF_COOKIE_NAME];
  const headerToken = request.headers[CSRF_HEADER_NAME];

  if (!cookieToken || typeof headerToken !== 'string') {
    return response.status(403).json({ error: 'Missing CSRF token.' });
  }

  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);

  // lengths must match before timingSafeEqual, which throws on mismatched buffer sizes
  if (cookieBuffer.length !== headerBuffer.length || !timingSafeEqual(cookieBuffer, headerBuffer)) {
    return response.status(403).json({ error: 'Invalid CSRF token.' });
  }

  return next();
}
