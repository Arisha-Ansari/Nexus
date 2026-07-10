import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Clock, Calendar, Check, X, Ban, Loader2 } from 'lucide-react';

const TOKEN_KEY = 'business_nexus_token';
const API_URL = import.meta.env.VITE_API_URL;

interface MeetingUser {
  _id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: string;
}

interface Meeting {
  _id: string;
  title: string;
  scheduledBy: MeetingUser;
  scheduledWith: MeetingUser;
  date: string;
  duration: number;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  message: string;
}

const statusStyles: Record<Meeting['status'], string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  declined: 'bg-red-50 text-red-700 border-red-200',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200'
};

export function MeetingsPage() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Current logged-in user ki id nikaalo, taaki dikha sakein "doosra banda" kaun hai
  const currentUserId = (() => {
    try {
      const stored = localStorage.getItem('business_nexus_user');
      return stored ? JSON.parse(stored).id ?? JSON.parse(stored)._id : null;
    } catch {
      return null;
    }
  })();

  const fetchMeetings = async () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const res = await fetch(`${API_URL}/api/meetings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Meetings load nahi ho payi');
      setMeetings(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const canJoin = (meeting: Meeting) => meeting.status === 'accepted';

  const updateStatus = async (meetingId: string, status: 'accepted' | 'declined' | 'cancelled') => {
    setActionLoadingId(meetingId);
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const res = await fetch(`${API_URL}/api/meetings/${meetingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Status update nahi ho paya');

      setMeetings((prev) => prev.map((m) => (m._id === meetingId ? { ...m, status: data.status } : m)));
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-xl font-semibold text-slate-900 mb-1">Meetings</h1>
      <p className="text-sm text-slate-500 mb-6">Your Meetings</p>

      {isLoading && <p className="text-sm text-slate-500">Loading meetings...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!isLoading && !error && meetings.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">
          No Meeting Scheduled Right Now
        </div>
      )}

      <div className="space-y-3">
        {meetings.map((meeting) => {
          const isInvitee = meeting.scheduledWith._id === currentUserId;
          const isScheduler = meeting.scheduledBy._id === currentUserId;
          const otherPerson = isScheduler ? meeting.scheduledWith : meeting.scheduledBy;
          const isActing = actionLoadingId === meeting._id;

          return (
            <div
              key={meeting._id}
              className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-medium text-slate-900 truncate">{meeting.title}</h2>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${statusStyles[meeting.status]}`}
                  >
                    {meeting.status}
                  </span>
                </div>
                <p className="text-sm text-slate-500 truncate">
                  {isScheduler ? 'With' : 'Requested by'} {otherPerson?.name} ({otherPerson?.role})
                </p>
                {meeting.message && (
                  <p className="text-sm text-slate-400 truncate italic">"{meeting.message}"</p>
                )}
                <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(meeting.date).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(meeting.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ·{' '}
                    {meeting.duration} min
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {/* Pending + invitee => Accept / Decline */}
                {meeting.status === 'pending' && isInvitee && (
                  <>
                    <button
                      onClick={() => updateStatus(meeting._id, 'accepted')}
                      disabled={isActing}
                      aria-label="Accept meeting"
                      className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {isActing ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                      Accept
                    </button>
                    <button
                      onClick={() => updateStatus(meeting._id, 'declined')}
                      disabled={isActing}
                      aria-label="Decline meeting"
                      className="flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                    >
                      <X size={15} />
                      Decline
                    </button>
                  </>
                )}

                {/* Pending or accepted + scheduler => Cancel */}
                {(meeting.status === 'pending' || meeting.status === 'accepted') && isScheduler && (
                  <button
                    onClick={() => updateStatus(meeting._id, 'cancelled')}
                    disabled={isActing}
                    aria-label="Cancel meeting"
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-50"
                  >
                    {isActing ? <Loader2 size={15} className="animate-spin" /> : <Ban size={15} />}
                    Cancel
                  </button>
                )}

                {/* Accepted => Join */}
                {meeting.status === 'accepted' && (
                  <button
                    onClick={() => navigate(`/meeting/${meeting._id}`)}
                    disabled={!canJoin(meeting)}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                  >
                    <Video size={15} />
                    Join Meeting
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}