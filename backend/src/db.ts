import { Pool } from 'pg';
import nodemailer from 'nodemailer';
import { config } from './config';

export const pool = new Pool({ connectionString: config.databaseUrl });

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      google_id TEXT UNIQUE NOT NULL, email TEXT NOT NULL, name TEXT, avatar TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS senders (
      id SERIAL PRIMARY KEY, smtp_user TEXT NOT NULL, smtp_pass TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS emails (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id),
      sender_id INT NOT NULL REFERENCES senders(id),
      to_email TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL,
      scheduled_at TIMESTAMPTZ NOT NULL,
      sent_at TIMESTAMPTZ,
      hourly_limit INT,
      status TEXT NOT NULL DEFAULT 'scheduled',
      preview_url TEXT, error TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS emails_user_status ON emails(user_id, status);
    CREATE TABLE IF NOT EXISTS slack_connections (
      user_id UUID PRIMARY KEY REFERENCES users(id),
      webhook_url TEXT NOT NULL, channel TEXT, team TEXT
    );
  `);
  // Auto-create Ethereal sender accounts once; they persist in DB.
  const { rows } = await pool.query('SELECT count(*)::int AS c FROM senders');
  for (let i = rows[0].c; i < config.senderCount; i++) {
    const acc = await nodemailer.createTestAccount();
    await pool.query('INSERT INTO senders(smtp_user, smtp_pass) VALUES ($1,$2)', [acc.user, acc.pass]);
    console.log('Created Ethereal sender', acc.user);
  }
}
