// node test_worker.mjs   (run from this folder; no dependencies)
import { readFileSync, existsSync } from 'node:fs';
import { IDS, clean, isEmpty } from './validate.js';

let failed = 0;
const ok = (cond, msg) => { if (!cond) { failed++; console.error('FAIL', msg); } else console.log('ok  ', msg); };

// designs.js (browser) and validate.js (Worker) must list the same designs, in order.
const src = readFileSync(new URL('./designs.js', import.meta.url), 'utf8');
const ids = [...src.matchAll(/id: '([^']+)'/g)].map((m) => m[1]);
ok(JSON.stringify(ids) === JSON.stringify(IDS), 'designs.js ids match validate.js ids');

// Every design has its page and a gallery thumbnail.
for (const id of IDS) {
  ok(existsSync(new URL(`./${id}/index.html`, import.meta.url)), `${id}/index.html exists`);
  ok(existsSync(new URL(`./review-assets/thumbs/${id}.jpg`, import.meta.url)), `${id} thumbnail exists`);
}

const id = 'a'.repeat(24);
ok(clean(null) === null && clean([]) === null && clean('x') === null, 'rejects non-objects');
ok(clean({ id: 'nope' }) === null, 'rejects a bad reviewer id');
ok(clean({ id: 'A'.repeat(24) }) === null, 'rejects uppercase ids');

const c = clean({
  id, name: '  Sam\u0000  ', favourite: '03-broadsheet', overall: 'x'.repeat(5000),
  ratings: {
    '03-broadsheet': { score: 5, comment: 'Love the type' },
    '04-night-reel': { score: 9, comment: '' },          // bad score, no comment: dropped
    '05-riso': { score: 3.5, comment: 'ok' },            // non-integer score: comment kept
    'not-a-design': { score: 5, comment: 'hi' }          // unknown id: dropped
  }
});
ok(c.name === 'Sam', 'trims and strips control characters from the name');
ok(c.overall.length === 2000, 'caps the overall note at 2000');
ok(c.ratings['03-broadsheet'].score === 5, 'keeps a valid score');
ok(!('04-night-reel' in c.ratings), 'drops an out-of-range score with no comment');
ok(c.ratings['05-riso'].score === null && c.ratings['05-riso'].comment === 'ok', 'keeps the comment when the score is bad');
ok(!('not-a-design' in c.ratings), 'drops unknown design ids');
ok(c.favourite === '03-broadsheet', 'keeps a valid favourite');
ok(clean({ id, favourite: 'zzz' }).favourite === null, 'drops an unknown favourite');
ok(isEmpty(clean({ id })), 'a reviewer with nothing filled in is empty');
ok(!isEmpty(clean({ id, name: 'Sam' })), 'a name alone counts as content');

process.exit(failed ? 1 : 0);
