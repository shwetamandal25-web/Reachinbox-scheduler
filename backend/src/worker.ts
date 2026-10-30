import { Worker, DelayedError } from 'bullmq';
import nodemailer from 'nodemailer';
import { config } from './config';
import { pool, initDb } from './db';
import { redis } from './redis';
import { QUEUE_NAME } from './queue';
import { acquireSlot, firstHitInWindow } from './rateLimiter';
import { notifyRateLimit } from './slack';
import { indexEmail } from './search';

const transports = new Map<number, nodemailer.Transporter>();
const transportFor = (id: number, user: string, pass: string) => {
  if (!transports.has(id))
    transports.set(id, nodemailer.createTransport({ host: 'smtp.ethereal.email', port: 587, auth: { user, pass } }));
  return transports.get(id)!;
};

async function main() {
  await initDb();
  const worker = new Worker(QUEUE_NAME, async (job, token) => {
    const { emailId } = job.data as { emailId: string };

    // Idempotency: atomically claim the row. Already claimed/sent => skip.
    const claim = await pool.query(
      `UPDATE emails SET status='processing' WHERE id=$1 AND status='scheduled' RETURNING *`, [emailId]);
    if (!claim.rows.length) return { skipped: true };
    const e = claim.rows[0];
    const { rows: [s] } = await pool.query('SELECT * FROM senders WHERE id=$1', [e.sender_id]);

    // Hourly rate limit: atomic Redis counter shared by all workers/instances
    const limit = e.hourly_limit || config.maxPerHour;
    const slot = await acquireSlot(e.sender_id, limit);
    if (!slot.ok) {
      await pool.query(`UPDATE emails SET status='scheduled', scheduled_at=$2 WHERE id=$1`, [emailId, new Date(slot.nextWindowAt)]);
      await job.moveToDelayed(slot.nextWindowAt, token); // not dropped: pushed to next hour window
      if (await firstHitInWindow(e.sender_id, slot.window))
        await notifyRateLimit(e.user_id, s.smtp_user, limit, slot.nextWindowAt);
      throw new DelayedError();
    }

    try {
      const info = await transportFor(s.id, s.smtp_user, s.smtp_pass).sendMail({
        from: `"ReachInbox" <${s.smtp_user}>`, to: e.to_email, subject: e.subject, text: e.body,
      });
      const preview = nodemailer.getTestMessageUrl(info) || null;
      await pool.query(`UPDATE emails SET status='sent', sent_at=now(), preview_url=$2 WHERE id=$1`, [emailId, preview]);
      indexEmail({ id: e.id, user_id: e.user_id, to_email: e.to_email, subject: e.subject, body: e.body, status: 'sent', sent_at: new Date() });
    } catch (err: any) {
      const last = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
      await pool.query(
        `UPDATE emails SET status=$2, error=$3, sent_at=CASE WHEN $2='failed' THEN now() END WHERE id=$1`,
        [emailId, last ? 'failed' : 'scheduled', err.message]);
      throw err; // BullMQ retries with backoff
    }
  }, {
    connection: redis,
    concurrency: config.concurrency,                    // configurable concurrency
    limiter: { max: 1, duration: config.minDelayMs },   // min delay between sends (queue-wide)
  });

  worker.on('failed', (j, err) => { if (!(err instanceof DelayedError)) console.error('job failed', j?.id, err.message); });
  console.log(`Worker up: concurrency=${config.concurrency}, minDelay=${config.minDelayMs}ms, maxPerHour=${config.maxPerHour}`);
}
main();
