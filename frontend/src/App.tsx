import { useEffect, useState } from 'react';
import { api } from './api';
import type { User } from './types';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { Spinner } from './components/ui';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.me().then(setUser).catch(() => setUser(null)).finally(() => setLoading(false)); }, []);
  if (loading) return <Spinner />;
  if (!user) return <Login />;
  return <Dashboard user={user} onLogout={async () => { await api.logout(); setUser(null); }} />;
}
