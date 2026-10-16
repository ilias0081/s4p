import 'express-session';

import type { PendingOAuth } from '../lib/Integration.js';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    userEmail?: string;
    pendingOAuth?: PendingOAuth;
  }
}
