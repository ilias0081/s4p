# Project conventions

These instructions apply throughout this repository. Follow the user's current request when it changes an earlier design decision. Preserve unrelated work already in the workspace.

## Working style

- Make concrete changes when asked to implement something; keep changes focused and explain the result briefly.
- Favor readable code, straightforward abstractions, and simple CSS. Use flex layouts for ordinary lists and panels; do not add grid or other complexity without a reason.
- Reuse shared components rather than duplicating their markup and styling.
- Treat the notes below as established conventions and current behavior, not a reason to expand a small request into unrelated feature work.

## Stack and structure

- Frontend: React, TypeScript, Vite, Tailwind, TanStack Query, Ky, and React Flow (`@xyflow/react`).
- Backend: Express, TypeScript, Zod, Kysely, PostgreSQL, and Winston.
- Backend controllers handle HTTP/authentication/validation; services implement persistence and workflow logic.
- Backend source imports use `.js` extensions for Node ESM. Keep filename casing exact; Docker runs Linux.
- Database tables use the `s4p` schema. Validate UUID request identifiers with `z.uuid()`.
- The canonical generated database types are `backend/src/db/types.ts`. Do not edit generated types manually or create another copy under `backend/db/src`.
- To inspect the database schema, read `backend/src/db/types.ts`; it lists the tables, columns, and their types.
- Keep database migrations in `backend/db/migrations` and database utilities in `backend/db/scripts`. `generate_types.bat` generates the canonical types and resolves paths relative to the script.

## Errors and user messages

- Use `codedError(code, message)` and the shared `handleError` in `backend/src/lib/utils.ts`.
- `UI_ERROR` is reserved for messages explicitly intended for users to read verbatim. It returns HTTP 400 with `{ code: 'UI_ERROR', error: message }`.
- Do not label technical failures as `UI_ERROR` just to make them visible. Preserve specific codes such as `OAUTH_ACCOUNT_LOOKUP_FAILED`, `OAUTH_TOKEN_EXCHANGE_FAILED`, `OAUTH_TOKEN_REFRESH_FAILED`, and `EXTERNAL_SERVICE_TIMEOUT`.
- Translate technical codes into public messages in `handleError`. External-service failures should show a simple message such as **"External service failed. Please try again later."**
- Technical details, endpoint names, token-exchange stages, and stack traces belong in backend logs, not product error messages.
- Authentication failures use `NOT_AUTHENTICATED` and HTTP 401. `getUserId(request)` is the shared session guard.
- Keep the frontend's shared API error display working: it displays verbatim `UI_ERROR` messages and translated server-failure messages. Do not silently replace actionable user messages with generic text in individual screens.

## Logging

- Winston configuration lives in `backend/src/lib/logger.ts`; `handleError` uses the shared logger.
- Write errors as JSON records to `./logs/error.log`, including timestamps, messages, error codes when available, and stacks.
- Remove `node_modules` stack frames for both Windows and Linux paths. Keep application frames and the error message; do not globally remove useful stack information.
- Docker mounts the repository's `logs` directory at `/app/logs`. Logs are ignored by Git.
- Never log client secrets, access tokens, refresh tokens, authorization codes, or private email contents. Do not dump credentials or environment files during debugging.

## Integrations and app methods

- Keep shared OAuth, token persistence, and refresh coordination in `Integration`. Provider-specific API requests belong in the provider implementation, such as `microsoft_graph.ts`.
- `getAccessToken(userId)` reuses a valid access token and refreshes an expired or missing token when possible.
- `Integration.refreshAccessToken` loads the saved refresh token, coordinates concurrent refreshes, calls the provider's `requestTokenRefresh`, and persists the new access token and expiry. Save a rotated refresh token when supplied; retain the previous one when it is omitted.
- Permanent refresh rejection requires reconnection. Temporary provider failures must not discard saved tokens. Successful reconnection clears `needs_reauth`.
- Microsoft Graph resource requests use `Authorization: Bearer <accessToken>`. Client ID and secret belong in OAuth token requests, not mailbox URLs.
- Keep reusable app-method behavior in `App`, with provider-specific actions in app subclasses such as Outlook.
- App methods declare their input Zod schema, supported operation types, metadata, and `readonly` flag.
- Call `setAppExecutionContext({ userId, operationId, workflowId })` before executing an app method; implementations read `this.appExecutionContext`.
- Use bounded external requests and allow enough frontend time for sequential backend calls. Do not automatically retry single-use authorization-code exchanges.

## Workflow editor

- A nonempty workflow must start with a trigger. Enforce this in the backend as well as the UI.
- A trigger with following operations cannot be deleted. The first node's Delete control is disabled while other nodes remain.
- Disable App Event when adding after an existing operation. Editing the first operation must preserve its trigger type.
- Model raw operation rows into objects whose `previous` and `next` links reference the actual operation objects.
- Editing preloads the operation type, app, method, and configuration. Update the existing row without changing its ID or connections.
- Validate configuration against the selected method's schema on the backend, including references to preceding operations.
- React Flow nodes have working menus and directed edges. The last operation's Add control belongs on a hanging edge, outside the node.

## Configuration forms and shared UI

- `OperationModal` selects an operation type, app, and method, then displays configuration.
- `App.getMethodInputSchema` converts Zod schemas to JSON Schema for the frontend. `SchemaForm` generates fields from that schema.
- Use key names as labels; strings are text inputs, enums are dropdowns, booleans are checkboxes, and objects nest their fields.
- Mark long text with `.meta({ multiline: true })` on the Zod string. Render it through the shared textarea while preserving the operation-output picker.
- Use `Repeatable` for arrays or other repeated UI. It owns Add/Delete behavior and item-count limits and supplies a Delete control to the child renderer.
- Use `Button.tsx` and its variants for shared button styling. Repeated-item Delete controls use the danger variant and compact sizing, aligned beside their input inside its content container.
- The modal header and footer reserve their own layout space. Left and right panels fill the body height and scroll independently; content must not extend underneath the footer. Keep the modal tall with small viewport margins.

## Operation-output references

- Typing `\` in a supported string field opens the output picker. Textareas support the same behavior.
- Offer only preceding operations, and allow preview execution only for methods marked `readonly`.
- `executeOperation` must check ownership, workflow membership, preceding-operation scope, and readonly status on the backend, including on cache hits.
- Cache preview output in the Express session for five minutes or until the session expires. Reuse valid cached output; execute the method only on a cache miss. Configuration changes invalidate the cached result. No Refresh button is part of the current design.
- Selecting a field inserts raw text such as `${[operation_uuid].body.content}` at the cursor. Nested arrays and objects must preserve the selected field path.
- Configuration saving accepts references while retaining ordinary schema constraints. Runtime reference resolution is separate work; do not execute or evaluate reference strings as JavaScript.

## Development and verification

- Use appropriate checks for the change. Backend typecheck: `npx tsc -p tsconfig.json --noEmit` from `backend`. Frontend typecheck: `npx tsc -b --pretty false` from `frontend`.
- Backend tests use Node's test runner with TSX, for example: `docker exec s4p-backend-1 node --import tsx --test tests/logger.test.ts tests/uiError.test.ts`.
- Use isolated fixtures and mocked provider responses for ordinary tests. Do not modify real accounts or workflows as test fixtures.
- `microsoftGraph.live.test.ts` is explicitly opt-in through `GRAPH_LIVE_TEST=1`; it accesses a real connected account. Select one account when ambiguous, and keep diagnostic output free of secrets and message contents.
- Docker's persistent `node_modules` volumes can hide newly installed dependencies. Check installation inside the relevant container and sync with `npm ci` when needed.
- Windows bind mounts use polling for the backend watcher. Keep the established dev watcher settings unless investigating them directly.
- Inspect logs and reproduce failures before assigning a cause. Distinguish local proxy failures from responses received directly from Microsoft. Report uncertain causes as uncertain.
- Recreating the backend clears its in-memory sessions; mention when a sign-in may be needed. Do not delete Docker database volumes to fix dependency or watcher problems.
