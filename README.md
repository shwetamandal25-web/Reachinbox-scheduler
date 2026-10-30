# ReachInbox – Email Job Scheduler

TypeScript · Express · BullMQ + Redis · PostgreSQL · Elasticsearch · Ethereal SMTP · React + Tailwind

## Run

```bash
docker compose up -d                 # Postgres, Redis (AOF on), Elasticsearch

cd backend
cp .env.example .env                 # fill Google + Slack creds (see below)
npm i
npm run dev                          # API  -> :4000   (BullMQ dashboard: /admin/queues)
npm run worker                       # BullMQ worker (run in a 2nd terminal; can run N copies)

cd ../frontend
npm i && npm run dev                 # UI -> http://localhost:5173
```

**Ethereal:** nothing to set up. On first start the app calls `nodemailer.createTestAccount()` `SENDER_COUNT` times and stores the credentials in the `senders` table. Open the "preview" link in the Sent tab to see each email.

**Google OAuth:** Google Cloud Console → OAuth client (Web). Redirect URI: `http://localhost:4000/auth/google/callback`.

**Slack OAuth:** api.slack.com/apps → create app → enable *Incoming Webhooks* → Redirect URL must be https (use `ngrok http 4000`): `https://<id>.ngrok.app/api/slack/callback`, put the same in `SLACK_REDIRECT_URI`.

## Architecture

- **Scheduling:** `POST /api/emails/schedule` inserts one row per recipient in Postgres (in a transaction), then adds one BullMQ **delayed job** per row (`delay = scheduledAt - now`). No cron anywhere. Email *i* is scheduled at `start + i * delay`; senders are assigned round-robin.
- **Persistence:** jobs live in Redis (AOF enabled) and rows in Postgres. Kill the server/worker → on restart the worker reconnects and delayed jobs fire at the right time. Nothing is re-created at startup.
- **Idempotency:** `jobId = emailId` (BullMQ rejects duplicates) **and** the worker atomically claims the row with `UPDATE ... WHERE status='scheduled' RETURNING *`. A second delivery of the same job finds nothing to claim and exits.
- **Concurrency:** `WORKER_CONCURRENCY` (default 5) per worker process; multiple processes are safe.
- **Min delay between sends:** BullMQ `limiter {max:1, duration: MIN_DELAY_MS}` (default **2000 ms**, queue-wide across all workers).
- **Hourly rate limit:** per sender, `MAX_EMAILS_PER_HOUR_PER_SENDER` (default 100; the compose form's "Hourly limit" overrides it per batch). Enforced with an atomic Redis Lua counter keyed `rl:{sender}:{hourWindow}` → safe across workers/instances. When exceeded the job is **not dropped**: `job.moveToDelayed(startOfNextHour)` and the DB row's `scheduled_at` is updated. BullMQ orders delayed jobs by (time, insertion), so order is preserved as much as possible.
- **Slack:** first limit hit per sender/hour posts a message to the user's connected Slack webhook (OAuth `incoming-webhook`). Not connected → silently skipped; connecting later works immediately (webhook is read from DB at hit time).
- **Search:** each email is indexed in Elasticsearch on schedule and again when sent; `GET /api/emails/search?q=`.
- **1000+ emails at once:** all 1000 delayed jobs are created; the limiter spaces sends (≥ MIN_DELAY_MS), concurrency caps parallelism, and the Redis counter pushes overflow into the next hour window.

## Features
Backend: scheduler, persistence, idempotency, concurrency, min-delay, hourly limit, Slack notify, ES search, bull-board.
Frontend: Google login, header with user, Scheduled/Sent tabs, compose modal with CSV parsing, loading + empty states, toasts, Slack connect.

## Trade-offs
- Crash mid-send leaves a row in `processing` (skipped on redelivery to guarantee no duplicates → at-most-once). A sweeper could reset stale rows.
- Limiter is queue-wide, not per-sender.
- No Figma access: UI follows the spec layout, adjust styles to match.
