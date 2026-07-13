import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Clock, Calendar, Check, X, Ban, Loader2, Plus } from 'lucide-react';

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

  // Schedule modal state
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [otherUsers, setOtherUsers] = useState<MeetingUser[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  const [formScheduledWith, setFormScheduledWith] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formDuration, setFormDuration] = useState(30);
  const [formMessage, setFormMessage] = useState('');

  // Current logged-in user ki id aur role nikaalo
  const currentUser = (() => {
    try {
      const stored = localStorage.getItem('business_nexus_user');
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      return { id: parsed.id ?? parsed._id, role: parsed.role };
    } catch {
      return null;
    }
  })();
  const currentUserId = currentUser?.id ?? null;

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

  // FIX: pehle sirf status check hota tha, date/time bilkul nahi.
  // Ab join sirf tab active hoga jab meeting start time se 5 min pehle se
  // leke end time (date + duration) tak ho. Uske baad expired maana jayega.
  const JOIN_GRACE_MS = 5 * 60 * 1000;

  const getMeetingWindow = (meeting: Meeting) => {
    const start = new Date(meeting.date).getTime();
    const end = start + meeting.duration * 60000;
    return { start, end };
  };

  const canJoin = (meeting: Meeting) => {
    if (meeting.status !== 'accepted') return false;
    const { start, end } = getMeetingWindow(meeting);
    const now = Date.now();
    return now >= start - JOIN_GRACE_MS && now <= end;
  };

  const isMeetingExpired = (meeting: Meeting) => {
    const { end } = getMeetingWindow(meeting);
    return Date.now() > end;
  };

  const fetchOtherUsers = async () => {
    if (!currentUser?.role) return;
    const oppositeRole = currentUser.role === 'investor' ? 'entrepreneur' : 'investor';
    setIsUsersLoading(true);
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const res = await fetch(`${API_URL}/api/users?role=${oppositeRole}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Users load nahi ho paye');
      setOtherUsers(data);
    } catch (err) {
      setScheduleError((err as Error).message);
    } finally {
      setIsUsersLoading(false);
    }
  };

  const openScheduleModal = () => {
    setIsScheduleOpen(true);
    fetchOtherUsers();
  };

  const resetScheduleForm = () => {
    setFormScheduledWith('');
    setFormTitle('');
    setFormDate('');
    setFormTime('');
    setFormDuration(30);
    setFormMessage('');
    setScheduleError('');
  };

  const handleSchedule = async () => {
    if (!formScheduledWith || !formTitle.trim() || !formDate || !formTime) {
      setScheduleError('Please fill in all required fields.');
      return;
    }

    const combinedDate = new Date(`${formDate}T${formTime}`);
    if (isNaN(combinedDate.getTime())) {
      setScheduleError('Invalid date or time.');
      return;
    }

    setIsScheduling(true);
    setScheduleError('');

    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const res = await fetch(`${API_URL}/api/meetings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: formTitle.trim(),
          scheduledWith: formScheduledWith,
          date: combinedDate.toISOString(),
          duration: formDuration,
          message: formMessage.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Meeting schedule nahi ho payi');

      setIsScheduleOpen(false);
      resetScheduleForm();
      fetchMeetings();
    } catch (err) {
      setScheduleError((err as Error).message);
    } finally {
      setIsScheduling(false);
    }
  };

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
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-semibold text-slate-900">Meetings</h1>
        <button
          onClick={openScheduleModal}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus size={15} />
          Schedule Meeting
        </button>
      </div>
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

                {/* Accepted => Join (ya expired label agar time nikal gaya) */}
                {meeting.status === 'accepted' && (
                  <button
                    onClick={() => navigate(`/meeting/${meeting._id}`)}
                    disabled={!canJoin(meeting)}
                    aria-label={isMeetingExpired(meeting) ? 'Meeting time has passed' : 'Join meeting'}
                    title={isMeetingExpired(meeting) ? 'Meeting time has passed' : undefined}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                  >
                    <Video size={15} />
                    {isMeetingExpired(meeting) ? 'Meeting Expired' : 'Join Meeting'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Schedule Meeting Modal */}
      {isScheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Schedule Meeting</h2>
              <button
                onClick={() => {
                  setIsScheduleOpen(false);
                  resetScheduleForm();
                }}
                aria-label="Close"
                className="p-2 rounded-md text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {currentUser?.role === 'investor' ? 'Entrepreneur' : 'Investor'}
                </label>
                {isUsersLoading ? (
                  <p className="text-sm text-slate-400 flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" /> Loading...
                  </p>
                ) : (
                  <select
                    value={formScheduledWith}
                    onChange={(e) => setFormScheduledWith(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a person</option>
                    {otherUsers.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Investment Discussion"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Duration (minutes)</label>
                <select
                  value={formDuration}
                  onChange={(e) => setFormDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={15}>15</option>
                  <option value={30}>30</option>
                  <option value={45}>45</option>
                  <option value={60}>60</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message (optional)</label>
                <textarea
                  value={formMessage}
                  onChange={(e) => setFormMessage(e.target.value)}
                  rows={3}
                  placeholder="Add a short note..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {scheduleError && <p className="text-sm text-red-600">{scheduleError}</p>}
            </div>

            <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsScheduleOpen(false);
                  resetScheduleForm();
                }}
                disabled={isScheduling}
                className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSchedule}
                disabled={isScheduling}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isScheduling && <Loader2 size={15} className="animate-spin" />}
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}