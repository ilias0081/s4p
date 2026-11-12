import { forwardRef, type TextareaHTMLAttributes } from 'react';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className = '', rows = 6, ...props }, ref) {
    return <textarea {...props} ref={ref} rows={rows}
      className={`block min-h-32 w-full resize-y rounded-lg border border-white/20 bg-[#1A1129] px-3 py-2 text-sm text-text ${className}`} />;
  },
);
