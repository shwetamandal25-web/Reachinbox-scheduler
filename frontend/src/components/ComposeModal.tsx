import { useState } from 'react';
import { api } from '../api';
import { Button, Field, Input, Modal, Textarea } from './ui';

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);

export function ComposeModal({ onClose, onDone, onError }: { onClose: () => void; onDone: (n: number) => void; onError: (m: string) => void }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [start, setStart] = useState(toLocalInput(new Date(Date.now() + 60_000)));
  const [delay, setDelay] = useState(5);
  const [limit, setLimit] = useState(50);
  const [busy, setBusy] = useState(false);

  const onFile = async (f?: File) => {
    if (!f) return;
    const found = (await f.text()).match(EMAIL_RE) ?? [];
    setRecipients([...new Set(found.map((e) => e.toLowerCase()))]);
  };

  const submit = async () => {
    if (!subject || !body || !recipients.length) return onError('Add a subject, a body and a lead file with at least one email.');
    setBusy(true);
    try {
      const r = await api.schedule({ subject, body, recipients, startTime: new Date(start).toISOString(), delaySeconds: delay, hourlyLimit: limit });
      onDone(r.scheduled);
    } catch (e) { onError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <Modal title="Compose new email" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Subject"><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
        <Field label="Body"><Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
        <Field label="Leads (CSV or text file)">
          <input type="file" accept=".csv,.txt" onChange={(e) => onFile(e.target.files?.[0])} className="text-sm" />
          {recipients.length > 0 && <p className="mt-1 text-xs text-emerald-700">{recipients.length} email addresses detected</p>}
        </Field>
        <Field label="Start time"><Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Delay between emails (sec)"><Input type="number" min={0} value={delay} onChange={(e) => setDelay(+e.target.value)} /></Field>
          <Field label="Hourly limit"><Input type="number" min={1} value={limit} onChange={(e) => setLimit(+e.target.value)} /></Field>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={busy}>{busy ? 'Scheduling…' : 'Schedule'}</Button>
      </div>
    </Modal>
  );
}
