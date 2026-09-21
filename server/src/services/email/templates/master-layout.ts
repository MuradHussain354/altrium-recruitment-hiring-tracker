/**
 * HTML entity escaping to eliminate injection vulnerabilities in email bodies.
 */
export function escapeHtml(unsafe: unknown): string {
  if (unsafe === null || unsafe === undefined) return '';
  const str = String(unsafe);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitizes subjects, recipients, and headers against CRLF injection attacks.
 */
export function sanitizeHeader(str: string): string {
  if (!str) return '';
  return str.replace(/[\r\n]+/g, ' ').trim();
}

export interface MasterLayoutOptions {
  title: string;
  preheader?: string;
  bodyContentHtml: string;
  unsubscribeUrl?: string;
}

/**
 * Master Branded Altrium Email Layout
 * Fully responsive, cross-client tested styling using inline CSS.
 */
export function renderMasterLayout(options: MasterLayoutOptions): string {
  const currentYear = new Date().getFullYear();
  const safeTitle = escapeHtml(options.title);
  const preheaderHtml = options.preheader
    ? `<div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
        ${escapeHtml(options.preheader)}
       </div>`
    : '';

  const unsubscribeHtml = options.unsubscribeUrl
    ? `<p style="margin: 12px 0 0 0; font-size: 12px; color: #94a3b8;">
        Don't want to receive these updates? 
        <a href="${options.unsubscribeUrl}" style="color: #6366f1; text-decoration: underline;">Unsubscribe from job alerts</a>.
       </p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    table { border-collapse: collapse; }
    a { color: #6366f1; text-decoration: none; }
    .btn-primary:hover { background-color: #4f46e5 !important; }
  </style>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #0b0f19; color: #f1f5f9;">
  ${preheaderHtml}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" align="center">
    <tr>
      <td align="center" style="padding: 12px;">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #111827; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);" cellspacing="0" cellpadding="0" border="0">
          <!-- Header -->
          <tr>
            <td style="padding: 28px 36px; background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <div style="font-size: 22px; font-weight: 700; letter-spacing: -0.5px; color: #ffffff;">
                      <span style="color: #6366f1;">▲</span> ALTRIUM
                    </div>
                    <div style="font-size: 12px; color: #94a3b8; margin-top: 2px; text-transform: uppercase; letter-spacing: 1px;">
                      Recruitment &amp; Talent Platform
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Slot -->
          <tr>
            <td style="padding: 36px 36px 28px 36px; font-size: 15px; line-height: 1.6; color: #cbd5e1;">
              ${options.bodyContentHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px; background-color: #0f172a; border-top: 1px solid rgba(255, 255, 255, 0.06); text-align: center; font-size: 12px; color: #64748b; line-height: 1.5;">
              <p style="margin: 0;">&copy; ${currentYear} Altrium Technologies Inc. All rights reserved.</p>
              <p style="margin: 4px 0 0 0;">This is an automated operational notification. Please do not reply directly to this message.</p>
              ${unsubscribeHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
