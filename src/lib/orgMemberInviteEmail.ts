/**
 * Transactional invite emails for organization portals.
 * Uses table-based HTML and a plain-text part to improve inbox placement.
 */

export type OrgInvitePayload = {
  orgName: string
  loginUrl: string
  username: string
  displayName: string
  tempPassword: string
}

export function buildOrgMemberInviteText(p: OrgInvitePayload): string {
  const who = p.displayName?.trim() || p.username
  return [
    `Hello ${who},`,
    "",
    `Your account for ${p.orgName} is ready.`,
    "",
    `Sign in: ${p.loginUrl}`,
    `Username: ${p.username}`,
    `Temporary password: ${p.tempPassword}`,
    "",
    "Please sign in and change your password right away.",
    "",
    "If you did not expect this message, you can ignore it.",
    "",
    `— ${p.orgName}`,
  ].join("\n")
}

export function buildOrgMemberInviteHtml(p: OrgInvitePayload): string {
  const who = escapeHtml(p.displayName?.trim() || p.username)
  const org = escapeHtml(p.orgName)
  const url = escapeHtml(p.loginUrl)
  const user = escapeHtml(p.username)
  const pw = escapeHtml(p.tempPassword)
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${org} — Account ready</title>
</head>
<body style="margin:0;background:#f1f5f9;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your ${org} login details — action required.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="padding:28px 28px 8px;font-size:20px;font-weight:800;color:#0f172a;">You're invited</td>
          </tr>
          <tr>
            <td style="padding:8px 28px 20px;font-size:15px;line-height:1.55;color:#334155;">
              Hello <strong>${who}</strong>,<br><br>
              Your secure portal account for <strong>${org}</strong> has been created. Use the details below to sign in once, then choose a new password.
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px;">
              <table role="presentation" width="100%" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
                <tr><td style="padding:16px 18px;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">Sign-in link</td></tr>
                <tr><td style="padding:0 18px 18px;"><a href="${url}" style="display:inline-block;font-size:15px;font-weight:700;color:#2563eb;">${url}</a></td></tr>
                <tr><td style="padding:0 18px 8px;font-size:13px;color:#475569;"><span style="color:#64748b;">Username:</span> <code style="background:#e2e8f0;padding:2px 8px;border-radius:6px;font-size:13px;">${user}</code></td></tr>
                <tr><td style="padding:8px 18px 18px;font-size:13px;color:#475569;"><span style="color:#64748b;">Temporary password:</span> <code style="background:#fef3c7;padding:2px 8px;border-radius:6px;font-size:13px;">${pw}</code></td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;">
              <a href="${url}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:800;font-size:14px;padding:14px 28px;border-radius:12px;">Open portal</a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.5;color:#94a3b8;">
              This message was sent because an administrator added you to ${org}. If it looks unexpected, contact your organization — do not reply if you are unsure.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function buildCertificateReadyEmailHtml(opts: { displayName: string; dashboardUrl: string; tournamentTitle: string }): string {
  const name = escapeHtml(opts.displayName)
  const dash = escapeHtml(opts.dashboardUrl)
  const title = escapeHtml(opts.tournamentTitle)
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f1f5f9;font-family:system-ui,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px;"><tr><td align="center">
<table width="100%" style="max-width:520px;background:#fff;border-radius:16px;border:1px solid #e2e8f0;">
<tr><td style="padding:24px;font-size:18px;font-weight:800;color:#0f172a;">Certificate approved</td></tr>
<tr><td style="padding:0 24px 20px;font-size:15px;color:#334155;line-height:1.5;">Hello ${name}, your certificate for <strong>${title}</strong> is ready. Open your dashboard to download the PDF.</td></tr>
<tr><td style="padding:0 24px 28px;"><a href="${dash}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px;">Go to certificates</a></td></tr>
</table></td></tr></table></body></html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
