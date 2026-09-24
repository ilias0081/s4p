import {
  forwardRef,
  useImperativeHandle,
  useState,
  type FormEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';

export type ModalStatus = 'idle' | 'loading' | 'success' | 'error';

export type ModalRenderContext<TData> = {
  data: TData | undefined;
  status: ModalStatus;
  isEdit: boolean;
};

export type ModalHandle<TData> = {
  showModal: (data?: TData) => void;
  hideModal: () => void;
  unhideModal: () => void;
  removeModal: () => void;
};

type ButtonAlignment = 'left' | 'center' | 'right';

// edit mode is determined solely by a truthy id, never by data merely existing (add modals can be prepopulated)
function hasId(value: unknown): value is { id: unknown } {
  return typeof value === 'object' && value !== null && 'id' in value;
}

export type ModalProps<TData> = {
  add_title: string;
  edit_title?: string;
  body: (context: ModalRenderContext<TData>) => ReactNode;
  footer: (context: ModalRenderContext<TData>) => ReactNode;
  submit: (data: TData | undefined, event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  button_alignment?: ButtonAlignment;
};

const alignmentClasses: Record<ButtonAlignment, string> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
};

function ModalInner<TData>(
  { add_title, edit_title, body, footer, submit, button_alignment = 'right' }: ModalProps<TData>,
  ref: Ref<ModalHandle<TData>>
) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState<TData>();
  const [status, setStatus] = useState<ModalStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>();

  useImperativeHandle(
    ref,
    () => ({
      showModal: (nextData) => {
        setData(nextData);
        setStatus('idle');
        setErrorMessage(undefined);
        setMounted(true);
        setVisible(true);
      },
      hideModal: () => setVisible(false),
      unhideModal: () => setVisible(true),
      removeModal: () => {
        setMounted(false);
        setVisible(false);
        setData(undefined);
        setStatus('idle');
        setErrorMessage(undefined);
      },
    }),
    []
  );

  if (!mounted) {
    return null;
  }

  const isEdit = hasId(data) && data.id != null;
  const context: ModalRenderContext<TData> = { data, status, isEdit };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('loading');
    setErrorMessage(undefined);

    try {
      await submit(data, event);
      setStatus('success');
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong.');
    }
  };

  return (
    <div
      className={[
        'fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4',
        visible ? '' : 'hidden',
      ].join(' ')}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          setVisible(false);
        }
      }}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-white/15 bg-background text-text shadow-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-white/15 px-6 py-4">
            <h3 className="text-lg font-semibold">{isEdit ? edit_title ?? add_title : add_title}</h3>
            <button
              type="button"
              aria-label="Close"
              className="rounded-full px-2 py-1 text-secondary hover:bg-white/10 hover:text-text"
              onClick={() => setVisible(false)}
            >
              ✕
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">{body(context)}</div>

          <footer className="border-t border-white/15 px-6 py-4">
            <p className="mb-3 min-h-[1.25rem] text-sm">
              {status === 'loading' ? <span className="text-secondary">Saving...</span> : null}
              {status === 'success' ? <span className="text-green-400">Saved.</span> : null}
              {status === 'error' ? <span className="text-red-400">{errorMessage}</span> : null}
            </p>
            <div className={['flex gap-3', alignmentClasses[button_alignment]].join(' ')}>
              {footer(context)}
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}

export const Modal = forwardRef(ModalInner) as <TData>(
  props: ModalProps<TData> & { ref?: Ref<ModalHandle<TData>> }
) => ReactElement | null;
