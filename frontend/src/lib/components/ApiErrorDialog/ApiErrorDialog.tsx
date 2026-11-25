import { useEffect, useRef, useSyncExternalStore } from 'react';
import { dismissUiError, getUiError, subscribeToUiErrors } from '../../api/uiErrors';
import { Button } from '../Button/Button';

export function ApiErrorDialog() {
  const message = useSyncExternalStore(subscribeToUiErrors, getUiError);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    // A native dialog remains visible above an already-open operation modal.
    if (message !== undefined && !dialog.open) dialog.showModal();
    if (message === undefined && dialog.open) dialog.close();
  }, [message]);

  return (
    <dialog ref={dialogRef} aria-labelledby="api-error-title" aria-describedby="api-error-message"
      onCancel={(event) => { event.preventDefault(); dismissUiError(); }}
      className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl border border-white/15 bg-background p-6 text-text shadow-panel backdrop:bg-black/60">
      <h2 id="api-error-title" className="mb-3 text-lg font-semibold">Unable to complete request</h2>
      <p id="api-error-message" role="alert" className="whitespace-pre-wrap break-words text-sm">{message}</p>
      <div className="mt-5 flex justify-end">
        <Button type="button" onClick={dismissUiError}>OK</Button>
      </div>
    </dialog>
  );
}
