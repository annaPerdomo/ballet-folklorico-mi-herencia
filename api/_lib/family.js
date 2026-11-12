import { str } from './http.js';
import { newFamilyToken } from './auth.js';
import { siteUrl } from './notify.js';

export const inviteLink = (token) => `${siteUrl()}/team/?k=${token}`;

export const parseDancers = (v) => (Array.isArray(v) ? v : String(v || '').split(/[,\n]/))
  .map((d) => str(d, 80)).filter(Boolean).slice(0, 20);

export async function createFamily(q, { name, dancers, groupmeUserId = null }) {
  const [fam] = await q('INSERT INTO families (name, access_token, groupme_user_id) VALUES ($1,$2,$3) RETURNING id, access_token',
    [name, newFamilyToken(), groupmeUserId]);
  for (const d of dancers) await q('INSERT INTO dancers (family_id, name) VALUES ($1,$2)', [fam.id, d]);
  return { id: fam.id, invite_link: inviteLink(fam.access_token) };
}
