import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { config } from './config';
import { pool } from './db';
import { requireAuth, AuthedReq } from './auth';

export const slackRouter = Router();

// 1) "Connect Slack" -> real OAuth authorize flow
slackRouter.get('/connect', requireAuth, (req: AuthedReq, res) => {
  const state = jwt.sign({ uid: req.userId }, config.jwtSecret, { expiresIn: '10m' });
  const p = new URLSearchParams({ client_id: config.slack.id, scope: 'incoming-webhook', redirect_uri: config.slack.redirect, state });
  res.redirect(`https://slack.com/oauth/v2/authorize?${p}`);
});

// 2) Callback -> exchange code, store webhook per user
slackRouter.get('/callback', async (req, res) => {
  try {
    const { uid } = jwt.verify(String(req.query.state), config.jwtSecret) as { uid: string };
    const r = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code: String(req.query.code), client_id: config.slack.id, client_secret: config.slack.secret, redirect_uri: config.slack.redirect }),
    });
    const j: any = await r.json();
    if (!j.ok) throw new Error(j.error);
    await pool.query(
      `INSERT INTO slack_connections(user_id, webhook_url, channel, team) VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id) DO UPDATE SET webhook_url=$2, channel=$3, team=$4`,
      [uid, j.incoming_webhook.url, j.incoming_webhook.channel, j.team?.name]);
    res.redirect(`${config.frontendUrl}/?slack=connected`);
  } catch { res.redirect(`${config.frontendUrl}/?slack=error`); }
});

slackRouter.get('/status', requireAuth, async (req: AuthedReq, res) => {
  const { rows } = await pool.query('SELECT channel, team FROM slack_connections WHERE user_id=$1', [req.userId]);
  res.json({ connected: rows.length > 0, ...(rows[0] ?? {}) });
});

slackRouter.delete('/', requireAuth, async (req: AuthedReq, res) => {
  await pool.query('DELETE FROM slack_connections WHERE user_id=$1', [req.userId]);
  res.json({ ok: true });
});

// Called by the worker. Not connected => silently skip. Never throws.
export async function notifyRateLimit(userId: string, senderEmail: string, limit: number, resumeAt: number) {
  try {
    const { rows } = await pool.query('SELECT webhook_url FROM slack_connections WHERE user_id=$1', [userId]);
    if (!rows.length) return;
    await fetch(rows[0].webhook_url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `:warning: Hourly limit (${limit}) reached for sender *${senderEmail}*. Remaining emails are rescheduled to ${new Date(resumeAt).toISOString()}.` }),
    });
  } catch (e: any) { console.warn('Slack notify failed:', e.message); }
}
