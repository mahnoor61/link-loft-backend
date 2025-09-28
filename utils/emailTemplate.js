// Simple branded email template wrapper used across all system emails

function generateEmailTemplate(appName, subject, contentHtml) {
    const safeAppName = appName || 'Our App';
    const safeSubject = subject || safeAppName;
    const year = new Date().getFullYear();

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeSubject}</title>
  <style>
    body { background-color: #f6f9fc; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif; color: #1f2937; }
    .container { max-width: 560px; margin: 24px auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 18px rgba(0,0,0,0.06); overflow: hidden; }
    .header { padding: 16px 20px; background: linear-gradient(90deg, #ff80c3 0%, #ffb6dc 100%); color: #fff; font-weight: 700; font-size: 18px; }
    .content { padding: 24px 20px; line-height: 1.6; }
    .divider { height: 1px; background: #f1f5f9; margin: 12px 0 20px; }
    .footer { padding: 16px 20px; color: #64748b; font-size: 12px; text-align: center; }
    .code { font-size: 22px; letter-spacing: 2px; font-weight: 700; background: #fff1f8; color: #be185d; padding: 6px 10px; border-radius: 8px; display: inline-block; }
    a.button { display: inline-block; background: #ff80c3; color: #fff !important; text-decoration: none; padding: 10px 16px; border-radius: 10px; font-weight: 600; }
  </style>
  </head>
<body>
  <div class="container">
    <div class="header">${safeAppName}</div>
    <div class="content">
      ${contentHtml}
      <div class="divider"></div>
      <div style="font-size:13px;color:#64748b;">If you didn’t request this, you can safely ignore this email.</div>
    </div>
    <div class="footer">© ${year} ${safeAppName}. All rights reserved.</div>
  </div>
</body>
</html>`;
}

module.exports = { generateEmailTemplate };


