// Pure input cleaning for the feedback Worker. No Workers APIs in here, so
// test_worker.mjs can import it in plain Node.

export const IDS = [
  '01-blueprint', '02-sticker', '03-broadsheet', '04-night-reel',
  '05-riso', '06-flatlay', '07-phosphor', '08-studio',
  '09-gallery', '10-bauhaus', '11-inkwell', '12-altitude'
];

const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const str = (v, max) => (typeof v === 'string' ? v.replace(CONTROL, '').trim().slice(0, max) : '');

// Returns a clean { id, name, ratings, favourite, overall }, or null if the
// body isn't a feedback payload at all. Unknown design ids and bad scores are
// dropped rather than rejected, so one stale client field can't lose a review.
export function clean(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  if (typeof body.id !== 'string' || !/^[a-f0-9]{16,64}$/.test(body.id)) return null;

  const ratings = {};
  const given = body.ratings && typeof body.ratings === 'object' ? body.ratings : {};
  for (const id of IDS) {
    const r = given[id];
    if (!r || typeof r !== 'object') continue;
    const score = Number.isInteger(r.score) && r.score >= 1 && r.score <= 5 ? r.score : null;
    const comment = str(r.comment, 1200);
    if (score || comment) ratings[id] = { score, comment };
  }

  return {
    id: body.id,
    name: str(body.name, 60),
    ratings,
    favourite: IDS.includes(body.favourite) ? body.favourite : null,
    overall: str(body.overall, 2000)
  };
}

export const isEmpty = (c) =>
  !c.name && !c.overall && !c.favourite && Object.keys(c.ratings).length === 0;
