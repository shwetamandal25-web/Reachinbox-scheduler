import 'dotenv/config';
const n = (k: string, d: number) => Number(process.env[k] ?? d);
const s = (k: string, d = '') => process.env[k] ?? d;

export const config = {
  port: n('PORT', 4000),
  frontendUrl: s('FRONTEND_URL', 'http://localhost:5173'),
  databaseUrl: s('DATABASE_URL', 'postgres://reach:reach@localhost:5432/reachinbox'),
  redisUrl: s('REDIS_URL', 'redis://localhost:6379'),
  esUrl: s('ES_URL', 'http://localhost:9200'),
  jwtSecret: s('JWT_SECRET', 'dev-secret'),
  google: { id: s('GOOGLE_CLIENT_ID'), secret: s('GOOGLE_CLIENT_SECRET'), redirect: s('GOOGLE_REDIRECT_URI') },
  slack: { id: s('SLACK_CLIENT_ID'), secret: s('SLACK_CLIENT_SECRET'), redirect: s('SLACK_REDIRECT_URI') },
  concurrency: n('WORKER_CONCURRENCY', 5),
  minDelayMs: n('MIN_DELAY_MS', 2000),
  maxPerHour: n('MAX_EMAILS_PER_HOUR_PER_SENDER', 100),
  senderCount: n('SENDER_COUNT', 3),
};
