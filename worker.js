// Feedback collector for the design review. Static files are served by the
// assets binding; this Worker only runs for /api/* (see run_worker_first in
// wrangler.jsonc).
//
//   POST /api/feedback   a reviewer's whole state, upserted by reviewer id
//   GET  /api/results    every review, owner only (Authorization: Bearer RESULTS_KEY)
//
// Storage is one D1 row per reviewer, so two people reviewing at once never
// overwrite each other. The table is created on first use; there's no
// migration step.

import { clean, isEmpty } from './validate.js';

const MAX_BODY = 24_000;
const MAX_REVIEWERS = 2000;

const reply = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });

let ready = null;
function init(db) {
  ready ??= db
    .prepare(
      `CREATE TABLE IF NOT EXISTS reviews (
         reviewer TEXT PRIMARY KEY,
         name     TEXT NOT NULL DEFAULT '',
         data     TEXT NOT NULL,
         updated  INTEGER NOT NULL
       )`
    )
    .run()
    .catch((e) => { ready = null; throw e; });
  return ready;
}

async function sameSecret(a, b) {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b))
  ]);
  return crypto.subtle.timingSafeEqual(x, y);
}

async function saveFeedback(req, env, url) {
  const origin = req.headers.get('origin');
  if (origin && new URL(origin).host !== url.host) return reply({ error: 'Cross-origin request' }, 403);

  const text = await req.text();
  if (text.length > MAX_BODY) return reply({ error: 'Too large' }, 413);
  let body;
  try { body = JSON.parse(text); } catch { return reply({ error: 'Not JSON' }, 400); }

  const c = clean(body);
  if (!c) return reply({ error: 'Bad payload' }, 400);
  if (isEmpty(c)) return reply({ ok: true, stored: false });

  await init(env.DB);
  const known = await env.DB.prepare('SELECT 1 AS x FROM reviews WHERE reviewer = ?1').bind(c.id).first();
  if (!known) {
    const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM reviews').first();
    if (n >= MAX_REVIEWERS) return reply({ error: 'Full' }, 429);
  }

  await env.DB
    .prepare(
      `INSERT INTO reviews (reviewer, name, data, updated) VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT(reviewer) DO UPDATE SET
         name = excluded.name, data = excluded.data, updated = excluded.updated`
    )
    .bind(c.id, c.name, JSON.stringify({ ratings: c.ratings, favourite: c.favourite, overall: c.overall }), Date.now())
    .run();
  return reply({ ok: true, stored: true });
}

async function readResults(req, env) {
  if (!env.RESULTS_KEY) return reply({ error: 'RESULTS_KEY is not set on this Worker' }, 503);
  const header = req.headers.get('authorization') || '';
  const given = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!(await sameSecret(given, env.RESULTS_KEY))) return reply({ error: 'Wrong key' }, 401);

  await init(env.DB);
  const { results } = await env.DB
    .prepare('SELECT reviewer, name, data, updated FROM reviews ORDER BY updated DESC LIMIT ?1')
    .bind(MAX_REVIEWERS)
    .all();
  const reviewers = results.map((r) => ({
    id: r.reviewer.slice(0, 6),
    name: r.name,
    updated: r.updated,
    ...JSON.parse(r.data)
  }));
  return reply({ reviewers });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    try {
      if (url.pathname === '/api/feedback') {
        return req.method === 'POST' ? await saveFeedback(req, env, url) : reply({ error: 'POST only' }, 405);
      }
      if (url.pathname === '/api/results') {
        return req.method === 'GET' ? await readResults(req, env) : reply({ error: 'GET only' }, 405);
      }
      return reply({ error: 'Not found' }, 404);
    } catch (e) {
      console.error('review api', e);
      return reply({ error: 'Server error' }, 500);
    }
  }
};
