import nodemailer from 'nodemailer';
import { prisma } from './db.js';

/**
 * Email for change notifications. Set SMTP_HOST (and usually SMTP_USER / SMTP_PASS) in apps/api/.env to turn it on.
 * Changes made close together are sent as ONE email per person (a minute after the first one), and nobody is
 * emailed about their own changes. Until SMTP is set, the bell still works and the emails wait (up to a day).
 */
const HOLD_MS = 60_000;
const GIVE_UP_MS = 24 * 3600_000;

export const mailConfigured = () => !!process.env.SMTP_HOST;

const transport = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? '' } : undefined,
});
const from = () => process.env.MAIL_FROM || process.env.SMTP_USER || 'Synx Brain <no-reply@localhost>';
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const verb: Record<string, string> = { created: 'added', edited: 'edited', published: 'published', unpublished: 'unpublished', deleted: 'deleted', restored: 'restored an older version of' };
const adminUrl = () => process.env.ADMIN_ORIGIN || 'http://localhost:5173';

export async function sendTest(to: string) {
  if (!mailConfigured()) throw new Error('Email is not set up on the server yet (SMTP_HOST is empty).');
  await transport().sendMail({ from: from(), to, subject: 'Synx Brain test email', text: 'This is a test. Change notifications will arrive like this.' });
}

let busy = false;
async function flush() {
  if (busy || !mailConfigured()) return;
  busy = true;
  try {
    const now = Date.now();
    const due = await prisma.notification.findMany({
      where: { emailedAt: null, createdAt: { lt: new Date(now - HOLD_MS), gt: new Date(now - GIVE_UP_MS) } },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    if (!due.length) return;
    const bySite = new Map<string, typeof due>();
    for (const n of due) bySite.set(n.siteId, [...(bySite.get(n.siteId) ?? []), n]);
    const mail = transport();
    for (const [siteId, items] of bySite) {
      const site = await prisma.site.findUnique({ where: { id: siteId }, select: { name: true } });
      const members = await prisma.membership.findMany({ where: { siteId, notifyEmail: true }, include: { user: true } });
      let failed = false;
      for (const m of members) {
        if (m.user.email.endsWith('@localhost')) continue; // the built-in dev admin has no mailbox
        const mine = items.filter((n) => n.actorId !== m.userId);
        if (!mine.length) continue;
        const subject = mine.length === 1
          ? `${site?.name}: ${mine[0].actorName} ${verb[mine[0].action] ?? mine[0].action} "${mine[0].title}"`
          : `${site?.name}: ${mine.length} changes`;
        const rows = mine.map((n) => `<li><b>${esc(n.actorName)}${n.source === 'ai' ? '' : ''}</b> ${esc(verb[n.action] ?? n.action)} <b>${esc(n.title)}</b>${n.summary ? `<br><span style="color:#667">${esc(n.summary)}</span>` : ''}</li>`).join('');
        try {
          await mail.sendMail({
            from: from(), to: m.user.email, subject,
            text: mine.map((n) => `${n.actorName} ${verb[n.action] ?? n.action} "${n.title}"${n.summary ? ' - ' + n.summary : ''}`).join('\n') + `\n\nOpen Synx Brain: ${adminUrl()}\nTurn these emails off in the bell menu inside Synx Brain.`,
            html: `<div style="font-family:system-ui,sans-serif;font-size:14px"><p>Changes on <b>${esc(site?.name ?? '')}</b>:</p><ul>${rows}</ul><p><a href="${esc(adminUrl())}">Open Synx Brain</a></p><p style="color:#889;font-size:12px">You can turn these emails off in the bell menu.</p></div>`,
          });
        } catch (err) {
          failed = true;
          console.error('mail: could not send a notification email:', (err as Error).message);
        }
      }
      if (!failed) await prisma.notification.updateMany({ where: { id: { in: items.map((n) => n.id) } }, data: { emailedAt: new Date() } });
    }
  } catch (err) {
    console.error('mail: flush failed', (err as Error).message);
  } finally { busy = false; }
}

export function startMailer() {
  setInterval(flush, 30_000).unref();
  console.log(mailConfigured() ? 'mail: notification emails are on' : 'mail: SMTP_HOST is not set, so notification emails are off (the bell still works)');
}
