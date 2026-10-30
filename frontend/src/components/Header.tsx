import type { SlackStatus, User } from '../types';
import { Button } from './ui';

export function Header({ user, slack, onLogout, onSlackDisconnect }: { user: User; slack: SlackStatus | null; onLogout: () => void; onSlackDisconnect: () => void }) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
      <h1 className="text-lg font-semibold">ReachInbox Scheduler</h1>
      <div className="flex items-center gap-3">
        {slack?.connected
          ? <Button variant="ghost" onClick={onSlackDisconnect}>Slack: {slack.channel ?? 'connected'} · Disconnect</Button>
          : <a href="/api/slack/connect"><Button variant="ghost">Connect Slack</Button></a>}
        <img src={user.avatar} alt="" className="h-8 w-8 rounded-full" referrerPolicy="no-referrer" />
        <div className="hidden text-right text-sm leading-tight sm:block"><div className="font-medium">{user.name}</div><div className="text-slate-500">{user.email}</div></div>
        <Button variant="ghost" onClick={onLogout}>Logout</Button>
      </div>
    </header>
  );
}
