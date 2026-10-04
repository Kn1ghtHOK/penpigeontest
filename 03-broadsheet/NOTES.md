# 03 Broadsheet

**Concept.** A type-led newspaper front page: newsprint, black ink and exactly one signal red, with hairline and double rules, a nameplate with a date line, a classified-ads rate card and a corrections-box FAQ. The headline is the show, and the product's real artifact (the plotted note) is drawn over the printed page like an editor's red pen.

**Palette.** Newsprint `#efeadb`, ink `#15130f`, signal red `#c9200d` (5.0:1 on newsprint, so it also carries small text and the button label), secondary text `#4b473e`. No gradients, shadows or radii.
**Fonts.** Abril Fatface (display), Newsreader (text, drop caps, pull quotes), Schibsted Grotesk (small-cap labels, buttons). Google Fonts `<link>`; Bodoni/Didot/Georgia fallbacks.

**Signature scroll moment.**
1. Hero: on load, SplitText line-masks lift the giant H1 out of the rules (`mask: "lines"`). Scrolling then scale-scrubs it down (`scale` from "fills the page" to final size, function-based so it re-measures on refresh) into the banner slot of a sticky, 100svh stage. As it shrinks, the page "prints" beneath it: the halftone photo wipes down behind a red press bar, the "In this edition" rules draw out. Driven by a `scrub` timeline on a tall zone (CSS sticky, not a pin spacer).
2. Handwriting: the same sticky-stage trick. Scrolling draws a red circle and underline over the copy, then all 40 real strokes of `hero-message.svg` in pen order, each stroke's scroll share proportional to its length (DrawSVG + `getTotalLength`).
Also: scrubbed rule draws, batch-style reveals (clip-path "printing", numerals rising from masks), a facts ticker whose speed follows scroll velocity (with a Pause button), and a compact running head that appears after the front page.
Features: ScrollTrigger (scrub, sticky stages, once-reveals), SplitText (`autoSplit`, `onSplit`), DrawSVG, `gsap.matchMedia()` (motion x wide).

**Honesty.** The date line is the viewer's current date. The halftone card is labelled as sample art. The red note is labelled as a sample plot. Pull quotes only repeat real copy.

**To port.** Dark mode (this is print-emulating, light only; `color-scheme: light`), real nav targets and a mobile menu, a real sample-card image set, focus-managed accordion animation, shared header/footer with the other pages, self-hosted fonts, Create flow styling in the same language.

**Known flaws.** Below 1000px wide or 700px tall the hero and handwriting stages fall back to a plain stack (no scale-down moment). The halftone art is a 330KB generated SVG. The drop cap uses `::first-letter` so its alignment varies slightly by browser. At 1280x720 the hero is tight. Reduced-motion and no-JS paths are reasoned, not browser-emulated. playwright-cli blocks `file://`, so I tested over a local server (the page itself uses only relative paths and classic scripts).
