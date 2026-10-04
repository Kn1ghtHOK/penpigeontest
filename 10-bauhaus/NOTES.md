# 10 / Bauhaus Poster

**Concept.** Constructivist poster grammar: every section is its own flat-colour poster built from circles, half-circles, squares, triangles and thick bars, with hard diagonal colour wipes, tilted numerals and baselines made of bars. One set of 16 pieces keeps being rebuilt: pigeon, photo, handwriting, note, address.

**Palette.** paper `#EFE8D8`, ink `#121212`, red `#C9221A`, yellow `#F4B30B`, blue `#1C3FAA` (+ `#FAF6EA` for the sample sheets). **Fonts.** League Spartan 700-900 (display, lowercase, tight), Jost 400-600 (body), both via Google Fonts.

**Signature moment: construction.** Hero + How it works is ONE pinned stage (about 5.4 viewport heights of scrub). Pieces fly in on load (time-based), sit scattered, then scroll assembles them into the pigeon (position, rotation, scale and fill scrubbed per piece, staggered), the card flies into its beak, and the pieces rebuild into the four steps. Step 03 draws the real plotted note stroke by stroke with a pen nib following the line; in step 04 the same note rides onto the left half of the address side. A big half-circle rotates 720 degrees across the pin like a clock hand; the facts band (the one marquee) reacts to scroll velocity and has a pause button.
GSAP: ScrollTrigger (pin, scrub, batch), `gsap.matchMedia`, DrawSVGPlugin, SplitText (masked line reveal), clip-path polygon wipes. The piece factory is `scenes.js`; choreography is `main.js`.

**Below the pin.** Letter-box "finding" scrubbed across two sample sheets; `$4` built from a disc and bars; stepped price bars; accordion FAQ; closing poster re-assembles the pigeon with the same factory.

**Modes.** Desktop (>=900px, motion ok): pinned. Mobile: no pin, each poster gets its own small stage scrubbed on its own scroll. Reduced motion / no JS: static posters, pieces already assembled, note already written (no-JS shows the note on a yellow card in step 03, but no pigeon art).

**A real port would still need:** the other pages in this style, a dark mode (the palette is light-only), real nav state, SEO/OG tags, a proper focus-return for the mobile menu, and the sample-sheet art replaced by a real pangram photo + CRAFT boxes.

**Known flaws.** The scattered opening state reads as abstract shapes, not yet a pigeon (the pigeon appears after about one screen of scroll). Colours cross-fade through muddy mid-tones during transitions. The ticker pause button covers a word as it passes. Sheet text is typed, not handwriting (labelled as sample). Resizing rebuilds the timelines (intro does not replay). Tested in Chromium only.
