import { html } from '../lib/html.mjs';
import { icon } from '../lib/icons.mjs';

// Enquiry channels. Email and WhatsApp appear only when the owner has supplied
// them (site/config.json) or the Instagram profile publishes them; otherwise the
// account's Instagram direct-message link is the channel. Nothing is invented.
// The design preview shows the two supplied channels as marked placeholders so
// the owner can see where they will go; published builds never do.
export function enquireActions(site, { subject = null, message = null, root = '' } = {}) {
  const { email, whatsapp } = site.contact;
  const out = [];
  if (site.preview && !email && !whatsapp) {
    return [
      html`<span class="btn btn--placeholder" aria-disabled="true">${icon('mail', { size: 18 })}<span>Email · to be supplied</span></span>`,
      html`<span class="btn-line btn--placeholder" aria-disabled="true">${icon('message', { size: 18 })}<span>WhatsApp · to be supplied</span></span>`,
    ];
  }
  if (email) {
    const q = subject ? `?subject=${encodeURIComponent(subject)}` : '';
    out.push(html`<a class="btn" href="mailto:${email}${q}">${icon('mail', { size: 18 })}<span>Email</span></a>`);
  }
  if (whatsapp) {
    const q = message ? `?text=${encodeURIComponent(message)}` : '';
    out.push(html`<a class="${email ? 'btn-line' : 'btn'}" href="https://wa.me/${whatsapp}${q}" rel="noopener">${icon('message', { size: 18 })}<span>WhatsApp</span></a>`);
  }
  if (!out.length) {
    out.push(html`<a class="btn" href="https://ig.me/m/${site.instagram.handle}" rel="noopener">${icon('instagram', { size: 18 })}<span>Message on Instagram</span></a>`);
  }
  return out;
}

export function enquirePage(model, { root }) {
  const { site } = model;
  const { email, whatsapp, whatsappDisplay } = site.contact;
  return html`
<section class="page-head wrap">
  <h1>Enquiries</h1>
  <p class="page-head__intro">Ask about a residence in the collection, or about featuring a home.</p>
</section>
<div class="wrap page-body folio">
  <section class="folio__row" aria-labelledby="contact-title">
    <h2 id="contact-title">Contact</h2>
    <div class="folio__body">
      <dl class="contact-list">
        ${email ? html`<div><dt>Email</dt><dd><a href="mailto:${email}">${email}</a></dd></div>`
          : site.preview ? html`<div><dt>Email</dt><dd class="contact-list__pending">Address to be supplied</dd></div>` : ''}
        ${whatsapp ? html`<div><dt>WhatsApp</dt><dd><a href="https://wa.me/${whatsapp}" rel="noopener">${whatsappDisplay ?? `+${whatsapp}`}</a></dd></div>`
          : site.preview ? html`<div><dt>WhatsApp</dt><dd class="contact-list__pending">Number to be supplied</dd></div>` : ''}
        <div><dt>Instagram</dt><dd><a href="${site.instagram.url}" rel="noopener">@${site.instagram.handle}</a></dd></div>
      </dl>
      <div class="enquire__actions">${enquireActions(site, { root, subject: `Enquiry via ${site.name}` })}</div>
    </div>
  </section>
  <section class="folio__row" aria-labelledby="enquire-residence">
    <h2 id="enquire-residence">About a residence</h2>
    <div class="folio__body prose">
      <p>Each residence page names the agent or agency credited when the home was featured, and its enquiry button refers to that residence by name. Listings change quickly, so availability and price are confirmed at the time of enquiry.</p>
    </div>
  </section>
  <section class="folio__row" aria-labelledby="enquire-feature">
    <h2 id="enquire-feature">Featuring a home</h2>
    <div class="folio__body prose">
      <p>Agents, agencies, developers and owners can ask about having a residence featured on ${site.name}.</p>
    </div>
  </section>
</div>`;
}
