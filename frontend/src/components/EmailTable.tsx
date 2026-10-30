import type { EmailRow } from '../types';
import { Badge, EmptyState, Spinner } from './ui';

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString() : '—');

export function EmailTable({ rows, loading, mode }: { rows: EmailRow[] | null; loading: boolean; mode: 'scheduled' | 'sent' }) {
  if (loading && !rows) return <Spinner />;
  if (!rows?.length)
    return mode === 'scheduled'
      ? <EmptyState title="No scheduled emails" hint="Click “Compose New Email” to schedule a batch." />
      : <EmptyState title="No sent emails yet" hint="Emails appear here once they're delivered." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-slate-500">
          <tr><th className="py-2 pr-4">Email</th><th className="pr-4">Subject</th><th className="pr-4">{mode === 'scheduled' ? 'Scheduled time' : 'Sent time'}</th><th>Status</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-slate-100">
              <td className="py-3 pr-4">{r.to_email}</td>
              <td className="pr-4">{r.subject}</td>
              <td className="pr-4 whitespace-nowrap">{fmt(mode === 'scheduled' ? r.scheduled_at : r.sent_at)}</td>
              <td title={r.error ?? ''}><Badge status={r.status} />
                {r.preview_url && <a className="ml-2 text-xs text-emerald-700 underline" href={r.preview_url} target="_blank" rel="noreferrer">preview</a>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
