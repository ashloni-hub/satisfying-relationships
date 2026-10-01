// Cloudflare Worker entry point.
// Handles POST /api/contact via Resend; everything else falls through
// to the static site assets.
//
// Required runtime variables (Worker Settings → Variables and Secrets):
//   RESEND_API_KEY     — Resend API key (Sending access)
//   CONTACT_TO_EMAIL   — inbox that should receive submissions
//   CONTACT_FROM_EMAIL — sender address on your verified Resend domain,
//                        e.g. "Satisfying Relationships <contact@yourdomain.com>"

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

async function handleContact(request, env) {
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
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.CONTACT_FROM_EMAIL,
        to: env.CONTACT_TO_EMAIL,
        reply_to: email,
        subject: `New contact form submission from ${firstName} ${lastName}`,
        html,
      }),
    });

    if (!resendResponse.ok) {
      return redirect(origin, '/contact.html?error=true');
    }
  } catch (err) {
    return redirect(origin, '/contact.html?error=true');
  }

  return redirect(origin, '/contact.html?sent=true');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/contact' && request.method === 'POST') {
      return handleContact(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
