// Cloudflare Worker entry point.
// Handles POST /api/contact via Resend; everything else falls through
// to the static site assets.
//
// Required runtime variables (Worker Settings → Variables and Secrets):
//   RESEND_API_KEY        — Resend API key (Sending access)
//   CONTACT_TO_EMAIL      — inbox that should receive submissions
//   CONTACT_FROM_EMAIL    — sender address on your verified Resend domain,
//                           e.g. "Satisfying Relationships <contact@yourdomain.com>"
//   TURNSTILE_SECRET_KEY  — Cloudflare Turnstile secret key (spam protection)

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function redirect(origin, path) {
  return new Response(null, { status: 303, headers: { Location: origin + path } });
}

async function verifyTurnstile(env, token, remoteip) {
  if (!env.TURNSTILE_SECRET_KEY || !token) {
    return false;
  }

  try {
    const body = new URLSearchParams();
    body.append('secret', env.TURNSTILE_SECRET_KEY);
    body.append('response', token);
    if (remoteip) {
      body.append('remoteip', remoteip);
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    });

    const result = await response.json();
    return result.success === true;
  } catch (err) {
    console.error('contact form: Turnstile verification threw', err);
    return false;
  }
}

function sendResendEmail(env, payload) {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

async function sendAutoReply(env, firstName, email) {
  const html = `
    <p>Hi ${escapeHtml(firstName)},</p>
    <p>Thanks for reaching out to Satisfying Relationships. Doug will be in touch within 24 hours.</p>
    <p>&mdash; Satisfying Relationships, PLLC</p>
  `;
  try {
    await sendResendEmail(env, {
      from: env.CONTACT_FROM_EMAIL,
      to: email,
      subject: 'We got your message',
      html,
    });
  } catch (err) {
    // Best-effort — the visitor's confirmation email failing shouldn't
    // affect the form submission itself, which already succeeded.
  }
}

async function handleContact(request, env, ctx) {
  const origin = new URL(request.url).origin;

  let form;
  try {
    form = await request.formData();
  } catch (err) {
    return redirect(origin, '/contact.html?error=true');
  }

  // Honeypot — real visitors never fill this hidden field in.
  if (form.get('website')) {
    return redirect(origin, '/contact.html?sent=true');
  }

  const turnstileToken = (form.get('cf-turnstile-response') || '').toString();
  const remoteip = request.headers.get('CF-Connecting-IP');
  const turnstileOk = await verifyTurnstile(env, turnstileToken, remoteip);
  if (!turnstileOk) {
    return redirect(origin, '/contact.html?error=true');
  }

  const firstName = (form.get('firstName') || '').toString().trim();
  const lastName = (form.get('lastName') || '').toString().trim();
  const email = (form.get('email') || '').toString().trim();
  const phone = (form.get('phone') || '').toString().trim();
  const service = (form.get('service') || '').toString().trim();
  const message = (form.get('message') || '').toString().trim();

  if (!firstName || !lastName || !email || !phone || !message) {
    return redirect(origin, '/contact.html?error=true');
  }

  if (!env.RESEND_API_KEY || !env.CONTACT_TO_EMAIL || !env.CONTACT_FROM_EMAIL) {
    console.error('contact form: missing one or more env vars', {
      hasKey: !!env.RESEND_API_KEY,
      hasTo: !!env.CONTACT_TO_EMAIL,
      hasFrom: !!env.CONTACT_FROM_EMAIL,
    });
    return redirect(origin, '/contact.html?error=true');
  }

  const html = `
    <h2>New contact form submission</h2>
    <p><strong>Name:</strong> ${escapeHtml(firstName)} ${escapeHtml(lastName)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
    <p><strong>Service:</strong> ${escapeHtml(service || 'Not specified')}</p>
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
  `;

  try {
    const resendResponse = await sendResendEmail(env, {
      from: env.CONTACT_FROM_EMAIL,
      to: env.CONTACT_TO_EMAIL,
      reply_to: email,
      subject: `New contact form submission from ${firstName} ${lastName}`,
      html,
    });

    if (!resendResponse.ok) {
      const body = await resendResponse.text();
      console.error('contact form: Resend API error', resendResponse.status, body);
      return redirect(origin, '/contact.html?error=true');
    }
  } catch (err) {
    console.error('contact form: fetch to Resend threw', err);
    return redirect(origin, '/contact.html?error=true');
  }

  // Fire the visitor's confirmation email in the background — don't
  // delay the redirect response waiting on it.
  ctx.waitUntil(sendAutoReply(env, firstName, email));

  return redirect(origin, '/contact.html?sent=true');
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/contact' && request.method === 'POST') {
      return handleContact(request, env, ctx);
    }

    return env.ASSETS.fetch(request);
  },
};
