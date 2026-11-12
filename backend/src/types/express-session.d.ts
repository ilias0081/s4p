import 'express-session';

import type { PendingOAuth } from '../lib/Integration.js';
import type { OperationOutputCache } from '../services/workflowEditorService.js';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    userEmail?: string;
    pendingOAuth?: PendingOAuth;
    operationOutputs?: OperationOutputCache;
  }
}
