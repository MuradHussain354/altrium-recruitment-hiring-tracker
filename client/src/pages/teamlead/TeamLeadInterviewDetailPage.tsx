import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { teamLeadInterviewsApi } from '../../api/teamLeadInterviews.api';
import { teamLeadFeedbackApi } from '../../api/teamLeadFeedback.api';
import { TLInterviewDetail, TLFeedbackItem } from '../../types/teamlead';
import { useAuth } from '../../auth/AuthContext';
import { FeedbackSubmitModal } from '../../components/teamlead/FeedbackSubmitModal';
import { OwnFeedbackView } from '../../components/teamlead/OwnFeedbackView';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Video,
  User,
  Mail,
  Phone,
  Briefcase,
  Layers,
  Users,
  MessageSquarePlus,
  ShieldAlert,
  AlertCircle
} from 'lucide-react';

export const TeamLeadInterviewDetailPage: React.FC = () => {
  const { interviewId } = useParams<{ interviewId: string }>();
  const { user } = useAuth();

  const [interview, setInterview] = useState<TLInterviewDetail | null>(null);
  const [ownFeedback, setOwnFeedback] = useState<TLFeedbackItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [is403Forbidden, setIs403Forbidden] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);

  const loadData = async () => {
    if (!interviewId) return;
    try {
      setIsLoading(true);
      setError(null);
      setIs403Forbidden(false);

      // 1. Load interview details
      const detailRes = await teamLeadInterviewsApi.getMyInterview(interviewId);
      setInterview(detailRes.data);

      // 2. Load own feedback if assigned
      try {
        const fbRes = await teamLeadFeedbackApi.getMyFeedback(interviewId);
        if (fbRes.data && fbRes.data.length > 0) {
          setOwnFeedback(fbRes.data[0]);
        } else {
          setOwnFeedback(null);
        }
      } catch {
        // Feedback check non-fatal if 404/empty
        setOwnFeedback(null);
      }

      setIsLoading(false);
    } catch (err: any) {
      setIsLoading(false);
      if (err.error === 'ForbiddenError' || err.message?.includes('Access denied')) {
        setIs403Forbidden(true);
      } else {
        setError(err.message || 'Failed to load interview details.');
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [interviewId]);

  if (isLoading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading evaluation assignment details...
      </div>
    );
  }

  if (is403Forbidden) {
    return (
      <div className="glass-card" style={{ padding: '48px 32px', textAlign: 'center', maxWidth: '600px', margin: '40px auto' }}>
        <ShieldAlert size={48} color="var(--accent-amber)" style={{ marginBottom: '16px' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
          Access Denied
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '24px', lineHeight: 1.6 }}>
          You are not assigned as an interviewer for this candidate interview session. Access is restricted to assigned technical interviewers only.
        </p>
        <Link to="/team-lead/interviews" className="btn btn-primary">
          Back to Assigned Interviews
        </Link>
      </div>
    );
  }

  if (error || !interview) {
    return (
      <div className="glass-card" style={{ padding: '32px', textAlign: 'center' }}>
        <AlertCircle size={36} color="var(--accent-amber)" style={{ marginBottom: '12px' }} />
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
          Interview Not Found
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
          {error || 'Unable to retrieve interview details.'}
        </p>
        <Link to="/team-lead/interviews" className="btn btn-secondary">
          <ArrowLeft size={16} /> Return to List
        </Link>
      </div>
    );
  }

  const myAssignment = interview.assignments.find((a) => a.interviewer.id === user?.id);
  const isFeedbackAlreadySubmitted = myAssignment?.feedbackSubmitted || ownFeedback !== null;

  const formattedDate = interview.scheduledAt
    ? new Date(interview.scheduledAt).toLocaleString(undefined, {
        dateStyle: 'full',
        timeStyle: 'short'
      })
    : 'Not scheduled';

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Back Link & Header */}
      <div style={{ marginBottom: '20px' }}>
        <Link to="/team-lead/interviews" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'none', marginBottom: '12px' }}>
          <ArrowLeft size={16} /> Back to Assigned Interviews
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                {interview.application.candidate.name}
              </h1>
              <span className={`badge ${interview.status === 'Completed' ? 'badge-emerald' : 'badge-cyan'}`}>
                {interview.status}
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
              Technical Evaluation for <strong>{interview.application.position.title}</strong>
            </p>
          </div>

          {!isFeedbackAlreadySubmitted && (
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '0.9rem' }}
            >
              <MessageSquarePlus size={18} /> Submit Evaluation Feedback
            </button>
          )}
        </div>
      </div>

      {/* Main Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        {/* Candidate & Position Card */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={18} color="var(--primary)" /> Candidate & Application Info
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Mail size={16} color="var(--text-subtle)" />
              <span style={{ color: 'var(--text-muted)' }}>Email:</span>
              <a href={`mailto:${interview.application.candidate.email}`} style={{ color: 'var(--accent-cyan)', fontWeight: 600, textDecoration: 'none' }}>
                {interview.application.candidate.email}
              </a>
            </div>
            {interview.application.candidate.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Phone size={16} color="var(--text-subtle)" />
                <span style={{ color: 'var(--text-muted)' }}>Phone:</span>
                <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{interview.application.candidate.phone}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Briefcase size={16} color="var(--text-subtle)" />
              <span style={{ color: 'var(--text-muted)' }}>Department:</span>
              <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{interview.application.position.department}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Layers size={16} color="var(--text-subtle)" />
              <span style={{ color: 'var(--text-muted)' }}>Current Stage:</span>
              <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>{interview.stage.name}</span>
            </div>
          </div>
        </div>

        {/* Schedule & Logistics Card */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} color="var(--accent-cyan)" /> Schedule & Logistics
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.875rem' }}>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', display: 'block', marginBottom: '2px' }}>Scheduled Date & Time</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>{formattedDate}</span>
            </div>
            {interview.location && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <MapPin size={16} color="var(--text-subtle)" style={{ marginTop: '2px' }} />
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', display: 'block' }}>Location / Office</span>
                  <span style={{ color: 'var(--text-main)' }}>{interview.location}</span>
                </div>
              </div>
            )}
            {interview.meetingLink && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <Video size={16} color="var(--accent-cyan)" style={{ marginTop: '2px' }} />
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', display: 'block' }}>Video Meeting Link</span>
                  <a href={interview.meetingLink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-cyan)', fontWeight: 600, wordBreak: 'break-all' }}>
                    {interview.meetingLink}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assigned Panel Members Card */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '28px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={18} color="var(--accent-emerald)" /> Assigned Interview Panel
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {interview.assignments.map((asgn) => (
            <div key={asgn.id} style={{
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {asgn.interviewer.name} {asgn.interviewer.id === user?.id && '(You)'}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Role: {asgn.interviewer.role}
                </div>
              </div>
              <span className={`badge ${asgn.feedbackSubmitted ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: '0.72rem' }}>
                {asgn.feedbackSubmitted ? 'Submitted' : 'Pending'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Feedback Section */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px' }}>
          Your Technical Evaluation
        </h3>

        {ownFeedback ? (
          <OwnFeedbackView feedback={ownFeedback} />
        ) : (
          <div className="glass-card" style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
              You have not submitted your technical evaluation for this interview yet.
            </p>
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <MessageSquarePlus size={18} /> Submit Evaluation Feedback Now
            </button>
          </div>
        )}
      </div>

      {/* Submit Modal */}
      {interviewId && (
        <FeedbackSubmitModal
          interviewId={interviewId}
          isOpen={isSubmitModalOpen}
          onClose={() => setIsSubmitModalOpen(false)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
};

export default TeamLeadInterviewDetailPage;
