import { Queue } from 'bullmq';
import { redis } from './redis';
export const QUEUE_NAME = 'emails';
export const emailQueue = new Queue(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 1000, removeOnFail: 5000 },
});
