import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { VideoCall } from '../../components/VideoCall';

const TOKEN_KEY = 'business_nexus_token'; // AuthContext.tsx mein jo key use hui hai, wahi yahan bhi honi chahiye

export function MeetingRoomPage() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const token = localStorage.getItem(TOKEN_KEY);

  if (!meetingId) {
    return <p className="p-6">Meeting ID nahi mili. Galat link se aaye ho shayad.</p>;
  }

  if (!token) {
    return <p className="p-6">Aap logged in nahi hain. Pehle login karo.</p>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <button
        onClick={() => navigate('/meetings')}
        className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 mb-4"
      >
        <ArrowLeft size={16} />
        Meetings pe wapas jao
      </button>

      <h1 className="text-xl font-semibold text-slate-900 mb-4">Meeting Room</h1>

      <VideoCall
        meetingId={meetingId}
        token={token}
        onLeave={() => navigate('/meetings')}
      />
    </div>
  );
}