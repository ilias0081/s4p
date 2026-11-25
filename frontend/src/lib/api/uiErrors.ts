let messages: string[] = [];
const listeners = new Set<() => void>();

export function showUiError(message: string) {
  if (messages.includes(message)) return;
  messages = [...messages, message];
  listeners.forEach((listener) => listener());
}

export function dismissUiError() {
  messages = messages.slice(1);
  listeners.forEach((listener) => listener());
}

export function getUiError() {
  return messages[0];
}

export function subscribeToUiErrors(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
