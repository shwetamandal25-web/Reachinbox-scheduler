import { redis } from './redis';

const HOUR = 3600_000;
// Atomic: INCR, enforce limit, roll back if over. Safe across many workers/instances.
const LUA = `
local c = redis.call('INCR', KEYS[1])
if c == 1 then redis.call('EXPIRE', KEYS[1], 3700) end
if c > tonumber(ARGV[1]) then redis.call('DECR', KEYS[1]); return 0 end
return 1`;

export async function acquireSlot(senderId: number, limit: number) {
  const window = Math.floor(Date.now() / HOUR);
  const key = `rl:${senderId}:${window}`;
  const ok = (await redis.eval(LUA, 1, key, limit)) === 1;
  return { ok, window, nextWindowAt: (window + 1) * HOUR };
}

// true only for the first limit-hit per sender/window (so Slack isn't spammed)
export async function firstHitInWindow(senderId: number, window: number) {
  return (await redis.set(`rlnotify:${senderId}:${window}`, '1', 'EX', 3700, 'NX')) === 'OK';
}
