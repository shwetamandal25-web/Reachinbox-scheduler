import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { config } from './config';
import { initDb } from './db';
import { emailQueue } from './queue';
import { authRouter } from './auth';
import { apiRouter } from './routes';
import { slackRouter } from './slack';

async function main() {
  await initDb();
  const app = express();
  app.use(cors({ origin: config.frontendUrl, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());

  // Live BullMQ dashboard -> http://localhost:4000/admin/queues
  const board = new ExpressAdapter();
  board.setBasePath('/admin/queues');
  createBullBoard({ queues: [new BullMQAdapter(emailQueue) as any], serverAdapter: board });
  app.use('/admin/queues', board.getRouter());

  app.use('/auth', authRouter);
  app.use('/api/slack', slackRouter);
  app.use('/api', apiRouter);
  app.listen(config.port, () => console.log(`API on :${config.port}`));
}
main();
