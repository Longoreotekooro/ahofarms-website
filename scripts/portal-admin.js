#!/usr/bin/env node
// Portal account administration from the command line. Talks to the same
// store the API uses (lib/users.js), so it needs the same environment:
// run with the Vercel project's env pulled locally (`vercel env pull
// .env.local`) or with .env.local written by hand. Never prints hashes.
//
//   node scripts/portal-admin.js hash                       prompt for a password, print its scrypt hash
//   node scripts/portal-admin.js users                      list accounts
//   node scripts/portal-admin.js add <email> <role> [name] [org]   create an account (prompts for a password)
//   node scripts/portal-admin.js set <email> status=active|suspended role=pharmacy name=... org=...
//   node scripts/portal-admin.js password <email>            set a new password (prompts)
//   node scripts/portal-admin.js remove <email>
//   node scripts/portal-admin.js requests                   list access requests
//   node scripts/portal-admin.js approve <request-id>       create the account, print a set-password link
//   node scripts/portal-admin.js decline <request-id>
//   node scripts/portal-admin.js env-user <email> <role> [name] [org]   print a PORTAL_USERS entry (no store needed)
//
// Consumer Portal: prescriber partners (one pathway per market) and leads:
//   node scripts/portal-admin.js partners
//   node scripts/portal-admin.js partner-add country="New Zealand" name="Clinic" referralUrl=https://... contactEmail=intake@... intro="Book online; telehealth available" [region="Auckland"]
//   node scripts/portal-admin.js partner-set <id> status=inactive   (any field from partner-add)
//   node scripts/portal-admin.js partner-remove <id>
//   node scripts/portal-admin.js leads                       consumer leads, newest first, with referral status
//   node scripts/portal-admin.js lead-set <id> status=contacted|closed
//
// Roles: prescriber · pharmacy · export_partner · admin
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = path.join(__dirname, '..');
const envFile = path.join(ROOT, '.env.local');
if (fs.existsSync(envFile)) fs.readFileSync(envFile, 'utf8').split(/\r?\n/).forEach(l => {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(l); if (!m || l.trim().startsWith('#')) return;
  let v = m[2]; if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (!(m[1] in process.env)) process.env[m[1]] = v;
});

function ask(q, { hidden = false } = {}) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      process.stdout.write(q);
      rl.question('', a => { process.stdout.write('\n'); rl.close(); resolve(a); });
      rl._writeToOutput = () => {};
    } else rl.question(q, a => { rl.close(); resolve(a); });
  });
}
async function askPassword() {
  const { passwordProblem } = await import('../lib/password.js');
  for (;;) {
    const a = process.env.PORTAL_ADMIN_CLI_PASSWORD || await ask('Password (min 10 chars, letter + number): ', { hidden: true });
    const p = passwordProblem(a);
    if (!p) { const b = process.env.PORTAL_ADMIN_CLI_PASSWORD || await ask('Again: ', { hidden: true }); if (a === b) return a; console.log('They did not match.'); }
    else console.log(p);
    if (process.env.PORTAL_ADMIN_CLI_PASSWORD) throw new Error(p || 'bad password');
  }
}
const kv = args => Object.fromEntries(args.filter(a => a.includes('=')).map(a => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)]; }));
const table = rows => rows.forEach(r => console.log(r.map(String).join('  ')));

(async () => {
  const [cmd, ...args] = process.argv.slice(2);
  const users = await import('../lib/users.js');
  const { hashPassword } = await import('../lib/password.js');
  const { portalForRole } = await import('../lib/portals.js');
  const { randomBytes } = require('crypto');
  const site = process.env.SITE_ORIGIN || 'https://www.ahofarms.co.nz';

  switch (cmd) {
    case 'hash': console.log(await hashPassword(await askPassword())); break;
    case 'env-user': {
      const [email, role, name = '', org = ''] = args;
      if (!email || !role) throw new Error('usage: env-user <email> <role> [name] [org]');
      const rec = { id: 'env-' + email.replace(/[^a-z0-9]/gi, '-').toLowerCase(), email, name: name || email, role, org, status: 'active', passwordHash: await hashPassword(await askPassword()) };
      console.log(JSON.stringify(rec)); break;
    }
    case 'users': {
      const list = await users.listUsers();
      console.log(`store: ${users.storeName()}${users.store().writable ? '' : ' (read-only)'}`);
      table([['EMAIL', 'ROLE', 'STATUS', 'NAME', 'ORG'], ...list.map(u => [u.email, u.role, u.status, u.name, u.org || ''])]); break;
    }
    case 'add': {
      const [email, role, name = '', org = ''] = args;
      if (!email || !role) throw new Error('usage: add <email> <role> [name] [org]');
      const u = await users.createUser({ email, role, name, org, passwordHash: await hashPassword(await askPassword()) });
      console.log(`created ${u.email} (${u.role}, ${u.status})`); break;
    }
    case 'set': {
      const [email, ...rest] = args; const patch = kv(rest);
      if (!email || !Object.keys(patch).length) throw new Error('usage: set <email> status=... role=... name=... org=...');
      const u = await users.updateUser(email, patch); console.log(`updated ${u.email}: ${u.role}, ${u.status}`); break;
    }
    case 'password': {
      const [email] = args; if (!email) throw new Error('usage: password <email>');
      await users.updateUser(email, { passwordHash: await hashPassword(await askPassword()) }); console.log(`password set for ${email}`); break;
    }
    case 'remove': { const [email] = args; if (!email) throw new Error('usage: remove <email>'); await users.removeUser(email); console.log(`removed ${email}`); break; }
    case 'requests': {
      const list = await users.listAccessRequests();
      table([['ID', 'PORTAL', 'STATUS', 'SUBMITTED', 'NAME', 'EMAIL', 'ORG'], ...list.map(r => [r.id, r.portal, r.status, r.submittedAt, r.fields.name, r.fields.email, r.fields.organisation || ''])]); break;
    }
    case 'approve': {
      const [id] = args; const r = await users.getAccessRequest(id);
      if (!r) throw new Error('no such request');
      const portal = portalForRole({ prescriber: 'prescriber', pharmacy: 'pharmacy', 'export-partner': 'export_partner' }[r.portal]);
      let u = await users.findUser(r.fields.email);
      if (!u) u = await users.createUser({ email: r.fields.email, name: r.fields.name, role: portal.role, org: r.fields.organisation, status: 'pending' });
      const token = randomBytes(24).toString('base64url');
      await users.tokens.put('reset', token, { email: u.email, portal: portal.id }, 7 * 86400);
      await users.updateAccessRequest(id, { status: 'approved', reviewedAt: new Date().toISOString(), reviewedBy: 'cli' });
      console.log(`approved ${u.email} as ${u.role}. Send them this link (valid 7 days):\n${site}/portal/${portal.id}/reset.html?token=${token}`); break;
    }
    case 'partners': {
      const list = await users.listPartners();
      table([['ID', 'COUNTRY', 'REGION', 'NAME', 'LINK', 'EMAIL', 'STATUS'], ...list.map(p => [p.id, p.country, p.region || '-', p.name, p.referralUrl ? 'yes' : '-', p.contactEmail || '-', p.status])]); break;
    }
    case 'partner-add': { const p = await users.savePartner(kv(args)); console.log(`saved ${p.id}: ${p.name} (${p.country})`); break; }
    case 'partner-set': { const [id, ...rest] = args; if (!id) throw new Error('usage: partner-set <id> field=value ...'); const p = await users.savePartner({ id, ...kv(rest) }); console.log(`saved ${p.id}: ${p.name} (${p.status})`); break; }
    case 'partner-remove': { const [id] = args; if (!id) throw new Error('usage: partner-remove <id>'); await users.removePartner(id); console.log(`removed ${id}`); break; }
    case 'leads': {
      const list = await users.listLeads();
      table([['ID', 'CODE', 'CREATED', 'NAME', 'EMAIL', 'COUNTRY', 'REGION', 'CONTACT', 'PARTNER', 'STATUS', 'HANDOFFS'], ...list.map(l => [l.id, l.code, l.createdAt, l.name, l.email, l.country, l.region, l.contactMethod, l.partnerName || '-', l.status, l.handoffCount || 0])]); break;
    }
    case 'lead-set': { const [id, ...rest] = args; const patch = kv(rest); if (!id || !patch.status) throw new Error('usage: lead-set <id> status=...'); const l = await users.updateLead(id, { status: patch.status }); console.log(`lead ${l.id}: ${l.status}`); break; }
    case 'decline': { const [id] = args; await users.updateAccessRequest(id, { status: 'declined', reviewedAt: new Date().toISOString(), reviewedBy: 'cli' }); console.log('declined'); break; }
    default:
      console.log(fs.readFileSync(__filename, 'utf8').split('\n').filter(l => l.startsWith('//')).map(l => l.slice(3)).join('\n'));
  }
})().catch(e => { console.error('error:', e.message); process.exit(1); });
