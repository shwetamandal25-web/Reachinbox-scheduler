import { Button } from '../components/ui';

export default function Login() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow">
        <h1 className="text-xl font-semibold">ReachInbox Scheduler</h1>
        <p className="mt-1 mb-6 text-sm text-slate-500">Sign in to schedule and track your emails.</p>
        <a href="/auth/google"><Button className="w-full">Continue with Google</Button></a>
      </div>
    </div>
  );
}
