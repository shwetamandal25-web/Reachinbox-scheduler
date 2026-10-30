import { Router } from 'express';
import { randomUUID } from 'crypto';
import { pool } from './db';
import { emailQueue } from './queue';
import { requireAuth, AuthedReq } from './auth';
import { indexEmail, searchEmails } from './search';

export const apiRouter = Router();
apiRouter.use(requireAuth);

// POST /api/emails/schedule
// { subject, body, recipients: string[], startTime: ISO, delaySeconds: number, hourlyLimit?: number }
apiRouter.post('/emails/schedule', async (req: AuthedReq, res) => {
  const { subject, body, recipients, startTime, delaySeconds = 0, hourlyLimit } = req.body ?? {};
  if (!subject || !body || !Array.isArray(recipients) || !recipients.length)
    return res.status(400).json({ error: 'subject, body and recipients[] are required' });
  const start = startTime ? new Date(startTime).getTime() : Date.now();
  if (isNaN(start)) return res.status(400).json({ error: 'Invalid startTime' });

  const { rows: senders } = await pool.query('SELECT id FROM senders ORDER BY id');
  const now = Date.now();
  const client = await pool.connect();
  const jobs: any[] = [];
  const docs: any[] = [];
  try {
    await client.query('BEGIN');
    for (let i = 0; i < recipients.length; i++) {
      const id = randomUUID();
      const at = start + i * Number(delaySeconds) * 1000;
      const sender = senders[i % senders.length].id; // round-robin across senders
      await client.query(
        `INSERT INTO emails(id,user_id,sender_id,to_email,subject,body,scheduled_at,hourly_limit)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [id, req.userId, sender, recipients[i], subject, body, new Date(at), hourlyLimit || null]);
      // jobId = email id -> BullMQ refuses duplicate ids, so one email = one job
      jobs.push({ name: 'send', data: { emailId: id }, opts: { jobId: id, delay: Math.max(0, at - now) } });
      docs.push({ id, user_id: req.userId, to_email: recipients[i], subject, body, status: 'scheduled', scheduled_at: new Date(at) });
    }
    await client.query('COMMIT');
  } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  await emailQueue.addBulk(jobs);
  docs.forEach(indexEmail);
  res.json({ scheduled: recipients.length });
});

// GET /api/emails?status=scheduled|sent
apiRouter.get('/emails', async (req: AuthedReq, res) => {
  const sent = req.query.status === 'sent';
  const { rows } = await pool.query(
    `SELECT id,to_email,subject,status,scheduled_at,sent_at,preview_url,error FROM emails
     WHERE user_id=$1 AND status = ANY($2) ORDER BY ${sent ? 'sent_at DESC' : 'scheduled_at ASC'} LIMIT 500`,
    [req.userId, sent ? ['sent', 'failed'] : ['scheduled', 'processing']]);
  res.json(rows);
});

// GET /api/emails/search?q=   (Elasticsearch)
apiRouter.get('/emails/search', async (req: AuthedReq, res) => {
  res.json(await searchEmails(req.userId!, String(req.query.q ?? '')));
});
