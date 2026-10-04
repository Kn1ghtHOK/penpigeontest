# PenPigeon: visual overhaul exploration (shared brief)

Henry dislikes the current site and wants a full visual overhaul, ideally with
scroll animations. He doesn't know what he wants yet, so 12 designers are each
building one **fully realised, visually distinct** homepage. He'll flip through
them later and pick. **Nothing here gets merged into the real site.** You are
one of the 12. Stay in your lane (palette, type, layout grammar, motion
language) so the set feels like 12 different studios made them.

## The product (read `<repo>/PRODUCT.md` for the full version)

PenPigeon turns a photo and a typed note into a **mailed postcard**. Photo is
printed on the front; the note is **drawn on the back in real ink by a pen
plotter** (one continuous pen path, not a handwriting font); it's stamped by
hand and put in the US Mail. $4 flat per card, US addresses only, about two
minutes, free to try, you pay only when you send. Optional "Post pigeon"
plan, $9.99/month, 3 cards included, $3 each after that. One person making
cards by hand, at a human scale.

**Voice:** plain, concrete, understated, short declarative sentences. Describes
the mechanism honestly. No hype, no "revolutionary", no AI sheen. You may
rewrite headlines and microcopy to suit your direction, but keep the voice and
keep every claim true.

**Honesty rules (hard):** there are NO customers, testimonials, reviews, order
counts, ratings, press logos, or delivery-time promises. Never invent any.
Sample postcard art is fine (draw it in SVG/CSS) but if shown as examples,
make it clear they are samples. Don't claim anything the product doesn't do
(US only; USPS decides delivery; the note is drawn by a machine, not a
person's hand).

**What is being replaced:** the current site (cream paper + terracotta/sage,
Caprasimo + Figtree, pill buttons, perforated stamp-edge buttons, kraft grain).
`DESIGN.md` and `css/*.css` describe it. Do NOT derive your design from them
and do NOT produce a variant of that look. PRODUCT.md is the brief; DESIGN.md
is the thing being thrown out.

## What to build: the HOME page, full length, one self-contained page

Keep the brand name **PenPigeon**, a **pigeon** as the recognisable mark
(restyle or redraw it to fit your direction, head to the right is the
current convention), and these sections in whatever order/layout your concept
needs. Real copy to use (edit lightly for your voice; don't add claims):

1. **Nav**: PenPigeon wordmark+mark; Create, Pricing, FAQ, Contact; "Log in"; primary button "Make one". (Links can be `#` anchors or `../../create.html`-style dead links; it's fine if they go nowhere.)
2. **Hero**: H1 "Send a photo as a postcard." Sub: "Your photo goes on the front. A pen writes your note on the back. We stamp it and mail it." Buttons: "Make one" and "See how it's made". Facts line: US mail only / $4 a card / about 2 min. Small note: "No account needed to try it."
3. **How it works**, 4 steps:
   01 **Add a photo.** It fills the front. Pan, zoom and straighten it. What you set is what prints.
   02 **Pick a handwriting.** Use one of our styles, upload a font, or trace your own from a photo.
   03 **Write the note.** Type it. The pen adds a little wobble and uneven spacing, so no two cards come out exactly alike.
   04 **Address it.** Add their address, and yours if you want it on the back. Check it, then send it.
4. **Use your own handwriting**: "Write a sentence that uses every letter of the alphabet, once normally and once in capitals, and photograph each. We find the letters and use them to write your cards, filling in any the pages missed."
5. **Pricing**: "$4 a card." Building a card is free; you pay only when you send one. What the $4 covers: USPS postcard postage / a color print of your photo on the front / your note, written on the back in ink / stamped by hand and mailed. Then **Post pigeon, $9.99 a month**: 3 postcards a month, free / $1 off every card after that ($3 instead of $4) / give it as a gift, they claim it by email / cancel any time, it lasts through the month you paid for.
6. **FAQ** (accordion or any pattern): Is the note handwritten? "A machine draws your note on the card with a pen, following a path our software generates. It looks handwritten, but it isn't a person's hand." / How does the handwriting tracing work? "Write a sentence that uses every letter of the alphabet, once in your normal handwriting and once in capitals, and photograph each one. The photos are uploaded, an algorithm finds your letters, and the photos are deleted. We then use your letters to write your cards." / How long does delivery take? "Once it's in the mail, delivery is up to USPS, and we can't promise a date." / What does it cost? "$4 a card. There's also an optional monthly plan." / Where will you mail it? "Any address in the US."
7. **Closing CTA**: "Try it before you pay." "Build a card and watch the note get written. You pay $4 only if you send it." Button "Make one".
8. **Footer**: mark+wordmark, "Send a photo as a postcard.", Home / Create / Pricing / FAQ / Contact / Privacy / Terms, "US addresses only."

Optional extras if your concept wants them: a "front / back of the card"
specimen, a plotter-path readout, an honest sample gallery. Don't pad.

## Real assets you can use (all in `design-explorations/_shared/`)

- `hero-message.svg`: the REAL plotted note ("Wish you were here. / More soon, J"): 40 `<path>`s in pen order, `fill:none; stroke:currentColor`, each with its own `stroke-width` (~1.8–2.2) in a `0 0 563.2 175.2` viewBox. Ideal for a stroke-by-stroke draw-in (DrawSVG, or `stroke-dasharray` + GSAP). Inline it (copy the `<path>`s into your HTML) rather than `<img>` so you can animate it and tint it with CSS. This is the most on-brand asset: the pen drawing the note is the product. Use it, scrubbed to scroll or timed.
- `pigeon-mark.svg`: the current pigeon mark, for reference/redraw.
- `gsap/*.min.js`: GSAP **3.15.0** plus every plugin (all free now): `gsap`, `ScrollTrigger`, `SplitText`, `DrawSVGPlugin`, `MorphSVGPlugin`, `MotionPathPlugin`, `Flip`, `Draggable`, `Observer`, `ScrollToPlugin`, `ScrollSmoother`, `ScrambleTextPlugin`, `TextPlugin`, `CustomEase`, `CustomBounce`, `CustomWiggle`, `InertiaPlugin`, `Physics2DPlugin`, `EasePack`, `CSSRulePlugin`, etc.

## Tech rules

- Plain static `index.html` + `style.css` + `main.js` (+ small local SVG/JS files) **inside your own folder**. No bundler, no npm install, no framework, no Tailwind CDN. Plain CSS (custom properties, grid, clamp, `@layer`, container queries, `color-mix`, `@property`, `view-transition`s are all fair game).
- Load GSAP with **classic script tags**, relative path, so the page works both by double-clicking (`file://`) and over HTTP:
  `<script src="../_shared/gsap/gsap.min.js"></script>`, then `ScrollTrigger.min.js`, then whatever plugins you use, then `main.js`. Call `gsap.registerPlugin(...)`.
- **GSAP is the animation engine.** (CSS transitions are fine for hover/focus only.) Scroll-driven animation is the star: scrubbed timelines, pinned sequences, ScrollTrigger batch reveals, SplitText line/char reveals, DrawSVG, MotionPath, Flip, etc. Choose what suits your concept, but give the page **one unforgettable signature scroll moment** (the pen writing the note on the card is the natural one, but make it yours) plus a coherent reveal language everywhere else.
- Fonts: Google Fonts via `<link>` is allowed (the reviewer has internet). Pick fonts deliberately; avoid the overused defaults (Inter, Roboto, Arial, Open Sans, Space Grotesk-as-default, Playfair-as-default). Provide a sane fallback stack. Don't use external images or other CDNs; make all art with SVG / CSS / canvas.
- Animate `transform`/`opacity` (and clip-path/filter sparingly), never layout properties. Call `ScrollTrigger.refresh()` after `document.fonts.ready`. Pin only bounded sections; no scroll hijacking that traps the user; total desktop length roughly 8–14 viewport heights.
- **Reduced motion + no-JS safety:** wrap the animation in `gsap.matchMedia()` with a `(prefers-reduced-motion: no-preference)` branch; the reduced branch (and the no-JS case) must show all content, fully readable, with the note already written. Content must never be stuck at `opacity:0`.
- Responsive: must work at **1440×900** and **390×844** with no horizontal page scroll; body text ≥16px; touch targets ≥44px; mobile can simplify the choreography (e.g. no pin) but should still feel designed.
- Accessibility: semantic landmarks (`header/nav/main/section/footer`), a skip link, visible `:focus-visible`, AA contrast for text, decorative SVG `aria-hidden`, real `<button>`/`<a>`, keyboard-operable accordion/nav. A single theme is fine (add dark mode only if your concept naturally has one).
- No console errors. No dead layout at any width between 360 and 1920.

## Skills to use (invoke with the Skill tool; if one fails to load, read its SKILL.md directly)

1. `design-taste-frontend`: the anti-slop frontend/taste skill. (also at `<repo>/.claude/skills/design-taste-frontend/SKILL.md`)
2. `impeccable:impeccable`: the Impeccable design skill. Use it for its design laws, craft standards and anti-pattern list. **Do NOT** run its live mode / server / setup, and do NOT write or edit `PRODUCT.md`, `DESIGN.md`, `.impeccable/*`, or any file outside your folder. PRODUCT.md already exists; treat it as the loaded product context.
3. `web-design-guidelines`: run this as your **final audit** on your finished HTML/CSS/JS (Web Interface Guidelines) and fix what it finds. (also at `.claude/skills/web-design-guidelines/SKILL.md`)
4. GSAP skills at `<repo>/.agents/skills/gsap-core/SKILL.md`, `gsap-scrolltrigger`, `gsap-timeline`, `gsap-plugins`, `gsap-performance` (same parent dir): read the ones relevant to what you build. Optional extra: `ui-ux-pro-max:ui-ux-pro-max`.

## Hard rules

- Write ONLY inside **your own folder** `design-explorations/<NN-slug>/` (the folder name is given in your task). Don't edit any other repo file, don't touch `_shared/`, don't touch git (no add/commit/checkout/stash), don't deploy, don't install anything globally, don't kill processes you didn't start.
- Don't ask anyone anything. Henry is away; decide and finish. The result must be complete on its own.
- Don't peek at the other designers' folders to copy; distinctness is the point.

## Verify your work (don't ship blind)

Use `playwright-cli` with **your own named session** so you don't collide with the 11 others, e.g.
`playwright-cli -s=<slug> open file://design-explorations/<folder>/index.html`,
`playwright-cli -s=<slug> resize 1440 900`, scroll with
`playwright-cli -s=<slug> eval "window.scrollTo(0, 1800)"` (wait ~1s after, since scrub/pins settle), then
`playwright-cli -s=<slug> screenshot --filename=<scratchpad>/<slug>-1800.png` and Read the PNG to look at it.
Check several scroll depths at 1440×900 and at 390×844, plus `playwright-cli -s=<slug> console` for errors, and
`eval "document.documentElement.scrollWidth - innerWidth"` should be ≤ 0. Fix what looks off. Close your session when done
(`playwright-cli -s=<slug> close`). Put scratch screenshots in
`<scratch>/<slug>/`
(not in your design folder).

## Deliverables (all inside your folder)

- `index.html` (+ `style.css`, `main.js`, local assets): complete, polished, opens by double-click.
- `thumb.png`: a 1440×900 screenshot of the hero **after** its intro animation has settled.
- `NOTES.md` (under ~30 lines): the concept in two sentences; palette (hex) and fonts; the signature scroll moment and which GSAP features drive it; what a real port to the site would still need (dark mode, other pages, etc.); honest known flaws.
- Your final message to the parent: ≤120 words: folder path, concept, signature moment, any known problems. No narration of your process.
