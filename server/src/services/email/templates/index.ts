import { renderMasterLayout, escapeHtml } from './master-layout';

// ── 1. Application Confirmation (S2-39) ─────────────────────────────────────────

export interface ApplicationConfirmationPayload {
  candidateName: string;
  positionTitle: string;
  department: string;
  applicationId: string;
  trackingUrl?: string;
}

export function renderApplicationConfirmation(data: ApplicationConfirmationPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Application Received: ${data.positionTitle} at Altrium`;
  const trackingLink = data.trackingUrl || `http://localhost:5173/track`;

  const html = renderMasterLayout({
    title: subject,
    preheader: `Thank you for applying for the ${data.positionTitle} position at Altrium.`,
    bodyContentHtml: `
      <h2 style="margin: 0 0 16px 0; color: #ffffff; font-size: 20px; font-weight: 600;">Hello, ${escapeHtml(data.candidateName)}!</h2>
      <p style="margin: 0 0 16px 0;">
        Thank you for your interest in joining <strong>Altrium</strong>. We have successfully received your application for the 
        <strong style="color: #6366f1;">${escapeHtml(data.positionTitle)}</strong> position in the <strong>${escapeHtml(data.department)}</strong> department.
      </p>
      <div style="background-color: #1e293b; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 18px; margin: 24px 0;">
        <div style="font-size: 13px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Application Reference</div>
        <div style="font-size: 16px; font-weight: 600; color: #ffffff; margin-top: 4px; font-family: monospace;">${escapeHtml(data.applicationId)}</div>
      </div>
      <p style="margin: 0 0 24px 0;">
        Our talent acquisition team is actively reviewing your profile. You can track the real-time status of your application through our candidate portal:
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${trackingLink}" style="display: inline-block; background-color: #6366f1; color: #ffffff; font-weight: 600; padding: 12px 28px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">
          Track Application Status
        </a>
      </div>
      <p style="margin: 24px 0 0 0; font-size: 14px; color: #94a3b8;">
        Best regards,<br>
        <strong style="color: #cbd5e1;">The Altrium Talent Team</strong>
      </p>
    `,
  });

  const text = `Hello ${data.candidateName},\n\nThank you for applying for the ${data.positionTitle} position in the ${data.department} department at Altrium. Your application reference is: ${data.applicationId}.\n\nYou can track your application status at: ${trackingLink}\n\nBest regards,\nThe Altrium Talent Team`;

  return { subject, html, text };
}

// ── 2. Interview Scheduled (S2-40) ──────────────────────────────────────────────

export interface InterviewScheduledPayload {
  candidateName: string;
  positionTitle: string;
  stageName: string;
  scheduledAt: string; // ISO date string
  durationMinutes: number;
  location?: string | null;
  meetingLink?: string | null;
}

export function renderInterviewScheduled(data: InterviewScheduledPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Interview Scheduled: ${data.positionTitle} — Altrium`;
  const formattedDate = new Date(data.scheduledAt).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const meetingInfo = data.meetingLink
    ? `<p style="margin: 6px 0 0 0;"><strong style="color: #94a3b8;">Meeting Link:</strong> <a href="${escapeHtml(data.meetingLink)}" style="color: #6366f1; text-decoration: underline;">Join Online Interview</a></p>`
    : data.location
    ? `<p style="margin: 6px 0 0 0;"><strong style="color: #94a3b8;">Location:</strong> <span style="color: #ffffff;">${escapeHtml(data.location)}</span></p>`
    : '';

  const html = renderMasterLayout({
    title: subject,
    preheader: `Your ${data.stageName} interview for ${data.positionTitle} has been confirmed.`,
    bodyContentHtml: `
      <h2 style="margin: 0 0 16px 0; color: #ffffff; font-size: 20px; font-weight: 600;">Dear ${escapeHtml(data.candidateName)},</h2>
      <p style="margin: 0 0 20px 0;">
        We are excited to invite you to an interview for the <strong>${escapeHtml(data.positionTitle)}</strong> role at <strong>Altrium</strong>.
      </p>
      <div style="background-color: #1e293b; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 20px; margin: 24px 0;">
        <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #6366f1; text-transform: uppercase; letter-spacing: 0.5px;">Interview Details</h3>
        <p style="margin: 0 0 8px 0;"><strong style="color: #94a3b8;">Stage:</strong> <span style="color: #ffffff;">${escapeHtml(data.stageName)}</span></p>
        <p style="margin: 0 0 8px 0;"><strong style="color: #94a3b8;">Date &amp; Time:</strong> <span style="color: #ffffff;">${escapeHtml(formattedDate)}</span></p>
        <p style="margin: 0 0 8px 0;"><strong style="color: #94a3b8;">Estimated Duration:</strong> <span style="color: #ffffff;">${escapeHtml(data.durationMinutes)} minutes</span></p>
        ${meetingInfo}
      </div>
      <p style="margin: 0 0 16px 0;">
        Please make sure you are in a quiet environment and have tested your setup prior to the scheduled start time. If you require any accommodations or need to reschedule, please notify us as early as possible.
      </p>
      <p style="margin: 24px 0 0 0; font-size: 14px; color: #94a3b8;">
        Best of luck,<br>
        <strong style="color: #cbd5e1;">The Altrium Talent Team</strong>
      </p>
    `,
  });

  const text = `Dear ${data.candidateName},\n\nYour interview for ${data.positionTitle} (${data.stageName}) has been scheduled.\nDate & Time: ${formattedDate}\nDuration: ${data.durationMinutes} minutes\n${data.meetingLink ? `Meeting Link: ${data.meetingLink}\n` : ''}${data.location ? `Location: ${data.location}\n` : ''}\nBest of luck,\nThe Altrium Talent Team`;

  return { subject, html, text };
}

// ── 3. Interview Rescheduled (S2-41) ────────────────────────────────────────────

export interface InterviewRescheduledPayload {
  candidateName: string;
  positionTitle: string;
  stageName: string;
  oldScheduledAt: string;
  newScheduledAt: string;
  durationMinutes: number;
  meetingLink?: string | null;
  location?: string | null;
}

export function renderInterviewRescheduled(data: InterviewRescheduledPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Interview Rescheduled: ${data.positionTitle} — Altrium`;
  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

  const oldDate = formatTime(data.oldScheduledAt);
  const newDate = formatTime(data.newScheduledAt);

  const meetingInfo = data.meetingLink
    ? `<p style="margin: 6px 0 0 0;"><strong style="color: #94a3b8;">Meeting Link:</strong> <a href="${escapeHtml(data.meetingLink)}" style="color: #6366f1; text-decoration: underline;">Join Online Interview</a></p>`
    : data.location
    ? `<p style="margin: 6px 0 0 0;"><strong style="color: #94a3b8;">Location:</strong> <span style="color: #ffffff;">${escapeHtml(data.location)}</span></p>`
    : '';

  const html = renderMasterLayout({
    title: subject,
    preheader: `Your ${data.stageName} interview for ${data.positionTitle} has been moved to a new time.`,
    bodyContentHtml: `
      <h2 style="margin: 0 0 16px 0; color: #ffffff; font-size: 20px; font-weight: 600;">Dear ${escapeHtml(data.candidateName)},</h2>
      <p style="margin: 0 0 20px 0;">
        Please note that your upcoming interview for the <strong>${escapeHtml(data.positionTitle)}</strong> role has been 
        <span style="color: #eab308; font-weight: 600;">rescheduled</span>.
      </p>
      <div style="background-color: #1e293b; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 20px; margin: 24px 0;">
        <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #6366f1; text-transform: uppercase; letter-spacing: 0.5px;">Updated Schedule</h3>
        <p style="margin: 0 0 8px 0;"><strong style="color: #94a3b8;">Stage:</strong> <span style="color: #ffffff;">${escapeHtml(data.stageName)}</span></p>
        <p style="margin: 0 0 8px 0;"><strong style="color: #94a3b8;">Previous Time:</strong> <strike style="color: #ef4444;">${escapeHtml(oldDate)}</strike></p>
        <p style="margin: 0 0 8px 0;"><strong style="color: #94a3b8;">New Time:</strong> <span style="color: #10b981; font-weight: 600;">${escapeHtml(newDate)}</span></p>
        <p style="margin: 0 0 8px 0;"><strong style="color: #94a3b8;">Duration:</strong> <span style="color: #ffffff;">${escapeHtml(data.durationMinutes)} minutes</span></p>
        ${meetingInfo}
      </div>
      <p style="margin: 0 0 16px 0;">
        We apologize for any inconvenience this schedule change may cause. Please contact us if you have any questions or conflicts with this updated time.
      </p>
      <p style="margin: 24px 0 0 0; font-size: 14px; color: #94a3b8;">
        Best regards,<br>
        <strong style="color: #cbd5e1;">The Altrium Talent Team</strong>
      </p>
    `,
  });

  const text = `Dear ${data.candidateName},\n\nYour interview for ${data.positionTitle} (${data.stageName}) has been rescheduled.\nPrevious Time: ${oldDate}\nNew Time: ${newDate}\nDuration: ${data.durationMinutes} minutes\n\nBest regards,\nThe Altrium Talent Team`;

  return { subject, html, text };
}

// ── 4. Interview Cancelled (S2-42) ─────────────────────────────────────────────

export interface InterviewCancelledPayload {
  candidateName: string;
  positionTitle: string;
  stageName: string;
  scheduledAt: string;
  reason?: string | null;
}

export function renderInterviewCancelled(data: InterviewCancelledPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Interview Cancelled: ${data.positionTitle} — Altrium`;
  const formattedDate = new Date(data.scheduledAt).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const reasonHtml = data.reason
    ? `<div style="background-color: #1e293b; border-left: 4px solid #ef4444; padding: 14px 18px; margin: 20px 0; color: #e2e8f0; font-size: 14px;">
        <strong style="color: #94a3b8;">Reason:</strong> ${escapeHtml(data.reason)}
       </div>`
    : '';

  const html = renderMasterLayout({
    title: subject,
    preheader: `Your scheduled interview for ${data.positionTitle} has been cancelled.`,
    bodyContentHtml: `
      <h2 style="margin: 0 0 16px 0; color: #ffffff; font-size: 20px; font-weight: 600;">Dear ${escapeHtml(data.candidateName)},</h2>
      <p style="margin: 0 0 16px 0;">
        We are writing to notify you that your <strong>${escapeHtml(data.stageName)}</strong> interview for the 
        <strong>${escapeHtml(data.positionTitle)}</strong> position originally scheduled for 
        <strong>${escapeHtml(formattedDate)}</strong> has been <span style="color: #ef4444; font-weight: 600;">cancelled</span>.
      </p>
      ${reasonHtml}
      <p style="margin: 0 0 16px 0;">
        Our recruiting team will reach out directly with further updates regarding your application or to explore rescheduling if applicable.
      </p>
      <p style="margin: 24px 0 0 0; font-size: 14px; color: #94a3b8;">
        Best regards,<br>
        <strong style="color: #cbd5e1;">The Altrium Talent Team</strong>
      </p>
    `,
  });

  const text = `Dear ${data.candidateName},\n\nYour interview for ${data.positionTitle} (${data.stageName}) originally scheduled for ${formattedDate} has been cancelled.${data.reason ? `\nReason: ${data.reason}` : ''}\n\nBest regards,\nThe Altrium Talent Team`;

  return { subject, html, text };
}

// ── 5. Application Rejected (S2-43) ─────────────────────────────────────────────

export interface ApplicationRejectedPayload {
  candidateName: string;
  positionTitle: string;
  rejectionDate?: string;
}

export function renderApplicationRejected(data: ApplicationRejectedPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Update regarding your application at Altrium`;

  const html = renderMasterLayout({
    title: subject,
    preheader: `An update regarding your application for the ${data.positionTitle} position.`,
    bodyContentHtml: `
      <h2 style="margin: 0 0 16px 0; color: #ffffff; font-size: 20px; font-weight: 600;">Dear ${escapeHtml(data.candidateName)},</h2>
      <p style="margin: 0 0 16px 0;">
        Thank you for taking the time to consider <strong>Altrium</strong> and for applying for the 
        <strong>${escapeHtml(data.positionTitle)}</strong> position.
      </p>
      <p style="margin: 0 0 16px 0;">
        After thorough review and careful consideration by our hiring team, we have decided not to advance your application to the next stage of our selection process. We received a significant number of strong candidates, and our decision was difficult.
      </p>
      <p style="margin: 0 0 16px 0;">
        We genuinely appreciate your enthusiasm and the effort you invested in your application. We will keep your profile in our talent network for future opportunities that align with your skillset.
      </p>
      <p style="margin: 0 0 24px 0;">
        We wish you every success in your ongoing job search and future professional endeavors.
      </p>
      <p style="margin: 24px 0 0 0; font-size: 14px; color: #94a3b8;">
        Sincerely,<br>
        <strong style="color: #cbd5e1;">The Altrium Talent Team</strong>
      </p>
    `,
  });

  const text = `Dear ${data.candidateName},\n\nThank you for applying for the ${data.positionTitle} position at Altrium. After careful consideration, we have decided not to move forward with your application at this time.\n\nWe wish you the best in your career pursuits.\n\nSincerely,\nThe Altrium Talent Team`;

  return { subject, html, text };
}

// ── 6. Application Hired (S2-44) ────────────────────────────────────────────────

export interface ApplicationHiredPayload {
  candidateName: string;
  positionTitle: string;
  department: string;
}

export function renderApplicationHired(data: ApplicationHiredPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Welcome to Altrium! Offer & Next Steps`;

  const html = renderMasterLayout({
    title: subject,
    preheader: `Congratulations! We are delighted to welcome you to the Altrium team.`,
    bodyContentHtml: `
      <h2 style="margin: 0 0 16px 0; color: #ffffff; font-size: 22px; font-weight: 700;">Congratulations, ${escapeHtml(data.candidateName)}! 🎉</h2>
      <p style="margin: 0 0 16px 0;">
        We are thrilled to officially offer you the position of <strong style="color: #6366f1;">${escapeHtml(data.positionTitle)}</strong> 
        in the <strong>${escapeHtml(data.department)}</strong> department at <strong>Altrium</strong>!
      </p>
      <div style="background-color: #1e293b; border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 8px; padding: 22px; margin: 24px 0;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #10b981;">Welcome to the Team!</h3>
        <p style="margin: 0; color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          Your technical expertise, vision, and collaborative mindset stood out across every stage of our evaluation. We are excited about the impact you will make at Altrium.
        </p>
      </div>
      <p style="margin: 0 0 20px 0;">
        Our People Operations team will follow up shortly with formal onboarding documents, benefits information, and details regarding your start date.
      </p>
      <p style="margin: 24px 0 0 0; font-size: 14px; color: #94a3b8;">
        Warmest congratulations,<br>
        <strong style="color: #cbd5e1;">The Altrium Leadership Team</strong>
      </p>
    `,
  });

  const text = `Congratulations ${data.candidateName}!\n\nWe are delighted to offer you the position of ${data.positionTitle} in the ${data.department} department at Altrium.\n\nWelcome to the team!\n\nThe Altrium Leadership Team`;

  return { subject, html, text };
}

// ── 7. Account Invitation (S2-45) ───────────────────────────────────────────────

export interface AccountInvitationPayload {
  userName: string;
  userEmail: string;
  role: string;
  encryptedToken?: string; // Stored in DB payload, decrypted at render time
}

export function renderAccountInvitation(
  data: AccountInvitationPayload,
  rawToken: string
): { subject: string; html: string; text: string } {
  const subject = `Invitation to join Altrium Recruitment Platform`;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const invitationUrl = `${frontendUrl.replace(/\/+$/, '')}/accept-invitation?token=${encodeURIComponent(rawToken)}`;

  const html = renderMasterLayout({
    title: subject,
    preheader: `You have been invited to join Altrium as ${data.role}.`,
    bodyContentHtml: `
      <h2 style="margin: 0 0 16px 0; color: #ffffff; font-size: 20px; font-weight: 600;">Welcome, ${escapeHtml(data.userName)}!</h2>
      <p style="margin: 0 0 16px 0;">
        You have been invited to join the <strong>Altrium Recruitment &amp; Hiring Platform</strong> with the role of 
        <strong style="color: #6366f1;">${escapeHtml(data.role)}</strong>.
      </p>
      <p style="margin: 0 0 24px 0;">
        To activate your staff account and set your secure password, please click the button below. This invitation link is personal to you and will expire in <strong>7 days</strong>.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${invitationUrl}" style="display: inline-block; background-color: #6366f1; color: #ffffff; font-weight: 600; padding: 12px 30px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">
          Activate Account &amp; Set Password
        </a>
      </div>
      <p style="margin: 24px 0 0 0; font-size: 12px; color: #64748b; line-height: 1.5;">
        If the button above does not work, copy and paste this link into your browser:<br>
        <span style="color: #94a3b8; word-break: break-all;">${escapeHtml(invitationUrl)}</span>
      </p>
      <p style="margin: 24px 0 0 0; font-size: 14px; color: #94a3b8;">
        Best regards,<br>
        <strong style="color: #cbd5e1;">Altrium System Administration</strong>
      </p>
    `,
  });

  const text = `Welcome ${data.userName}!\n\nYou have been invited to join Altrium Recruitment as ${data.role}.\n\nPlease activate your account and choose your password at:\n${invitationUrl}\n\nThis invitation link expires in 7 days.\n\nAltrium System Administration`;

  return { subject, html, text };
}

// ── 8. Job Alert (S2-07) ────────────────────────────────────────────────────────

export interface JobAlertPayload {
  positionId: string;
  subscriptionId: string;
  positionTitle: string;
  department: string;
  location?: string | null;
  jobUrl?: string;
}

export function renderJobAlert(
  data: JobAlertPayload,
  unsubscribeToken: string
): { subject: string; html: string; text: string } {
  const subject = `New Job Opening: ${data.positionTitle} at Altrium`;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const jobUrl = data.jobUrl || `${frontendUrl.replace(/\/+$/, '')}/careers/${data.positionId}`;
  const unsubscribeUrl = `${frontendUrl.replace(/\/+$/, '')}/job-alerts/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;

  const html = renderMasterLayout({
    title: subject,
    preheader: `A new role matching your job preferences has just opened at Altrium.`,
    unsubscribeUrl,
    bodyContentHtml: `
      <h2 style="margin: 0 0 16px 0; color: #ffffff; font-size: 20px; font-weight: 600;">New Career Opportunity at Altrium</h2>
      <p style="margin: 0 0 20px 0;">
        We noticed you are interested in opportunities in <strong>${escapeHtml(data.department)}</strong>. A new position matching your preferences has just been published:
      </p>
      <div style="background-color: #1e293b; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 22px; margin: 24px 0;">
        <h3 style="margin: 0 0 6px 0; font-size: 18px; color: #ffffff;">${escapeHtml(data.positionTitle)}</h3>
        <p style="margin: 0 0 16px 0; color: #6366f1; font-weight: 500; font-size: 14px;">
          ${escapeHtml(data.department)}${data.location ? ` &bull; ${escapeHtml(data.location)}` : ''}
        </p>
        <a href="${jobUrl}" style="display: inline-block; background-color: #6366f1; color: #ffffff; font-weight: 600; padding: 10px 22px; border-radius: 6px; text-decoration: none; font-size: 14px;">
          View Job Details &amp; Apply &rarr;
        </a>
      </div>
      <p style="margin: 24px 0 0 0; font-size: 14px; color: #94a3b8;">
        Best of luck in your career search,<br>
        <strong style="color: #cbd5e1;">The Altrium Talent Team</strong>
      </p>
    `,
  });

  const text = `New Career Opportunity at Altrium\n\nPosition: ${data.positionTitle}\nDepartment: ${data.department}\n\nView and apply: ${jobUrl}\n\nTo unsubscribe: ${unsubscribeUrl}`;

  return { subject, html, text };
}

// ── 9. Hiring Report Digest (S2-27) ─────────────────────────────────────────────

export interface HiringReportDigestPayload {
  managerName: string;
  openPositionsCount: number;
  inProgressCount: number;
  interviewsCount: number;
  pendingOffersCount: number;
  agingCount: number;
  dashboardUrl?: string;
}

export function renderHiringReportDigest(data: HiringReportDigestPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Altrium Weekly Executive Hiring Digest`;
  const dashboardLink = data.dashboardUrl || `${(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '')}/manager/dashboard`;

  const html = renderMasterLayout({
    title: subject,
    preheader: `Weekly recruitment executive summary: ${data.openPositionsCount} open roles, ${data.inProgressCount} active applicants.`,
    bodyContentHtml: `
      <h2 style="margin: 0 0 16px 0; color: #ffffff; font-size: 20px; font-weight: 600;">Good morning, ${escapeHtml(data.managerName)}</h2>
      <p style="margin: 0 0 24px 0;">
        Here is your weekly executive summary of recruitment operations across <strong>Altrium</strong>:
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0;">
        <tr>
          <td width="50%" style="padding: 8px 8px 8px 0;">
            <div style="background-color: #1e293b; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 16px;">
              <div style="font-size: 12px; color: #94a3b8; text-transform: uppercase;">Open Positions</div>
              <div style="font-size: 26px; font-weight: 700; color: #6366f1; margin-top: 4px;">${escapeHtml(data.openPositionsCount)}</div>
            </div>
          </td>
          <td width="50%" style="padding: 8px 0 8px 8px;">
            <div style="background-color: #1e293b; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 16px;">
              <div style="font-size: 12px; color: #94a3b8; text-transform: uppercase;">In-Progress Applications</div>
              <div style="font-size: 26px; font-weight: 700; color: #38bdf8; margin-top: 4px;">${escapeHtml(data.inProgressCount)}</div>
            </div>
          </td>
        </tr>
        <tr>
          <td width="50%" style="padding: 8px 8px 8px 0;">
            <div style="background-color: #1e293b; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 16px;">
              <div style="font-size: 12px; color: #94a3b8; text-transform: uppercase;">Interviews (Next 7 Days)</div>
              <div style="font-size: 26px; font-weight: 700; color: #a855f7; margin-top: 4px;">${escapeHtml(data.interviewsCount)}</div>
            </div>
          </td>
          <td width="50%" style="padding: 8px 0 8px 8px;">
            <div style="background-color: #1e293b; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 16px;">
              <div style="font-size: 12px; color: #94a3b8; text-transform: uppercase;">Pending Offer Approvals</div>
              <div style="font-size: 26px; font-weight: 700; color: #f59e0b; margin-top: 4px;">${escapeHtml(data.pendingOffersCount)}</div>
            </div>
          </td>
        </tr>
        ${
          data.agingCount > 0
            ? `<tr>
                <td colspan="2" style="padding: 8px 0;">
                  <div style="background-color: #1e293b; border-left: 4px solid #ef4444; border-radius: 4px; padding: 12px 16px;">
                    <div style="font-size: 12px; color: #f87171; text-transform: uppercase; font-weight: 600;">Attention Required</div>
                    <div style="font-size: 14px; color: #e2e8f0; margin-top: 2px;">
                      <strong>${escapeHtml(data.agingCount)}</strong> applications have aged beyond 7 days without stage progression.
                    </div>
                  </div>
                </td>
              </tr>`
            : ''
        }
      </table>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${dashboardLink}" style="display: inline-block; background-color: #6366f1; color: #ffffff; font-weight: 600; padding: 12px 28px; border-radius: 8px; text-decoration: none;">
          Open Manager Dashboard &rarr;
        </a>
      </div>
      <p style="margin: 24px 0 0 0; font-size: 14px; color: #94a3b8;">
        Best regards,<br>
        <strong style="color: #cbd5e1;">Altrium Automated Reporting</strong>
      </p>
    `,
  });

  const text = `Altrium Weekly Executive Hiring Digest\n\nGood morning ${data.managerName},\n\n- Open Positions: ${data.openPositionsCount}\n- In-Progress Applications: ${data.inProgressCount}\n- Interviews Next 7 Days: ${data.interviewsCount}\n- Pending Offer Approvals: ${data.pendingOffersCount}\n- Aging Applications: ${data.agingCount}\n\nView dashboard: ${dashboardLink}`;

  return { subject, html, text };
}
