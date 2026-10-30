import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';

export function Button({ variant = 'primary', className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }) {
  const styles = variant === 'primary'
    ? 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300'
    : 'border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-50';
  return <button className={`rounded-lg px-4 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-emerald-600 ${styles} ${className}`} {...p} />;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm"><span className="mb-1 block font-medium text-slate-700">{label}</span>{children}</label>;
}
const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none';
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input className={inputCls} {...p} />;
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea className={inputCls} {...p} />;

export function Spinner() {
  return <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" /></div>;
}

export function EmptyState({ title, hint }: { title: string; hint: string }) {
  return <div className="py-16 text-center"><p className="font-medium">{title}</p><p className="mt-1 text-sm text-slate-500">{hint}</p></div>;
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <h2 className="mb-4 text-lg font-semibold">{title}</h2>{children}
      </div>
    </div>
  );
}

export function Badge({ status }: { status: string }) {
  const c: Record<string, string> = {
    scheduled: 'bg-amber-100 text-amber-800', processing: 'bg-blue-100 text-blue-800',
    sent: 'bg-emerald-100 text-emerald-800', failed: 'bg-red-100 text-red-800',
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c[status] ?? ''}`}>{status}</span>;
}

export function Toast({ msg, kind, onDone }: { msg: string; kind: 'ok' | 'err'; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3500); return () => clearTimeout(t); }, [onDone]);
  return <div className={`fixed bottom-4 right-4 z-50 rounded-lg px-4 py-3 text-sm text-white shadow-lg ${kind === 'ok' ? 'bg-emerald-600' : 'bg-red-600'}`}>{msg}</div>;
}
