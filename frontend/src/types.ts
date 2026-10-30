export interface User { id: string; name: string; email: string; avatar: string }
export interface EmailRow {
  id: string; to_email: string; subject: string;
  status: 'scheduled' | 'processing' | 'sent' | 'failed';
  scheduled_at: string; sent_at: string | null; preview_url: string | null; error: string | null;
}
export interface SchedulePayload {
  subject: string; body: string; recipients: string[];
  startTime: string; delaySeconds: number; hourlyLimit?: number;
}
export interface SlackStatus { connected: boolean; channel?: string; team?: string }
