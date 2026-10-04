# PenPigeon design review

A small deployable app for showing the twelve homepage designs to someone and
collecting what they think. It is separate from the main penpigeon.com site:
its own Worker, its own database, its own URL. Nothing here ships with the
main site (the repo-root `.assetsignore` excludes this folder).

**What a reviewer sees:** a gallery of the twelve designs, then each one in a
viewer (desktop or phone-sized preview, "Full page" link, prev/next) with a
1–5 rating, a favourite toggle and a note. Answers save as they go and sync to
the Worker. A summary screen at the end has "Copy my feedback" as a backup.

**What you see:** `/results` on the deployed site: average, count, rating
spread and favourites per design, plus every comment, behind a key you set.
"Download JSON" exports it all.

## Run it locally

Just the pages (no feedback collection; answers stay in the browser and
"Copy my feedback" is the way out):

    cd design-explorations
    python3 -m http.server 8000      # then http://localhost:8000/

With the real Worker and a local database:

    cd design-explorations
    npx wrangler dev --var RESULTS_KEY:test
    # http://localhost:8787/   results: http://localhost:8787/results (key: test)

## Deploy (run these from this folder, not the repo root)

    cd design-explorations
    npx wrangler login               # once
    npx wrangler deploy              # creates the Worker and its D1 database
    npx wrangler secret put RESULTS_KEY    # choose a password for /results

Then send people `https://penpigeon-design-review.<your-subdomain>.workers.dev/`.
Open `/results` on the same address and enter the key.

`wrangler.jsonc` leaves out the D1 `database_id` so wrangler can provision it.
If your wrangler version refuses, run
`npx wrangler d1 create penpigeon-design-review`, paste the printed
`database_id` into the `d1_databases` entry, and deploy again. The table
creates itself on the first request.

## Files

| file | what |
|---|---|
| `index.html`, `review.js`, `review.css` | the shell: gallery, viewer, summary |
| `results.html` | the owner's results page |
| `designs.js` | the list of designs: names, one-liners, order |
| `worker.js`, `validate.js` | `/api/feedback` and `/api/results`; D1 storage; input cleaning |
| `wrangler.jsonc`, `.assetsignore`, `_headers`, `robots.txt` | deploy config; keeps `*.md` and server files off the public site; `noindex` |
| `review-assets/thumbs/` | gallery thumbnails (small JPEGs made from each `thumb.png`) |
| `NN-name/` | the twelve designs, each self-contained; `NOTES.md` inside is not deployed |
| `_shared/` | GSAP 3.15 and the shared brief and assets (`BRIEF.md` is not deployed) |

## Notes

- **Privacy:** it stores the ratings, notes and name a reviewer types, tied to a
  random id kept in their browser's localStorage. No cookies, no IP logging, no
  analytics. Reviewers who clear their browser data start fresh.
- **No login.** Anyone with the link can submit. Writes are capped (12 designs,
  ~1,200 characters a note, 2,000 reviewers) and same-origin only. Don't put a
  link you don't want reviewed in the wild.
- **Changing the set:** add the folder and a thumbnail to
  `review-assets/thumbs/`, then add the id to `designs.js` **and** `IDS` in
  `validate.js`. `node test_worker.mjs` fails if the two lists disagree or a
  design is missing its page or thumbnail.
- **Tests:** `node test_worker.mjs` (no dependencies).
