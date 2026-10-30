import type { EmailRow, SchedulePayload, SlackStatus, User } from './types';

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...init });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Request failed (${res.status})`);
  return res.json();
}

export const api = {
  me: () => req<User>('/auth/me'),
  logout: () => req('/auth/logout', { method: 'POST' }),
  emails: (status: 'scheduled' | 'sent') => req<EmailRow[]>(`/api/emails?status=${status}`),
  schedule: (p: SchedulePayload) => req<{ scheduled: number }>('/api/emails/schedule', { method: 'POST', body: JSON.stringify(p) }),
  slackStatus: () => req<SlackStatus>('/api/slack/status'),
  slackDisconnect: () => req('/api/slack', { method: 'DELETE' }),
};
