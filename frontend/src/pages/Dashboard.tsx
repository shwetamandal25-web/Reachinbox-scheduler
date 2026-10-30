import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { EmailRow, SlackStatus, User } from '../types';
import { Header } from '../components/Header';
import { EmailTable } from '../components/EmailTable';
import { ComposeModal } from '../components/ComposeModal';
import { Button, Toast } from '../components/ui';

type Tab = 'scheduled' | 'sent';

export default function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>('scheduled');
  const [rows, setRows] = useState<EmailRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [compose, setCompose] = useState(false);
  const [slack, setSlack] = useState<SlackStatus | null>(null);
  const [toast, setToast] = useState<{ msg: string; kind: 'ok' | 'err' } | null>(null);

  const load = useCallback(async () => {
    try { setRows(await api.emails(tab)); }
    catch (e) { setToast({ msg: (e as Error).message, kind: 'err' }); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { setRows(null); setLoading(true); load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [load]);
  useEffect(() => { api.slackStatus().then(setSlack).catch(() => {}); }, []);
  useEffect(() => {
    const s = new URLSearchParams(location.search).get('slack');
    if (s) { setToast({ msg: s === 'connected' ? 'Slack connected' : 'Slack connection failed', kind: s === 'connected' ? 'ok' : 'err' }); history.replaceState({}, '', '/'); }
  }, []);

  const disconnectSlack = async () => { await api.slackDisconnect(); setSlack({ connected: false }); };

  return (
    <div>
      <Header user={user} slack={slack} onLogout={onLogout} onSlackDisconnect={disconnectSlack} />
      <main className="mx-auto max-w-5xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-1 rounded-lg bg-slate-200 p-1">
            {(['scheduled', 'sent'] as Tab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize ${tab === t ? 'bg-white shadow' : 'text-slate-600'}`}>{t} Emails</button>
            ))}
          </div>
          <Button onClick={() => setCompose(true)}>Compose New Email</Button>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm"><EmailTable rows={rows} loading={loading} mode={tab} /></div>
      </main>
      {compose && (
        <ComposeModal
          onClose={() => setCompose(false)}
          onError={(msg) => setToast({ msg, kind: 'err' })}
          onDone={(n) => { setCompose(false); setToast({ msg: `${n} emails scheduled`, kind: 'ok' }); setTab('scheduled'); load(); }}
        />
      )}
      {toast && <Toast {...toast} onDone={() => setToast(null)} />}
    </div>
  );
}
