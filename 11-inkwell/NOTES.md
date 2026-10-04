# 11 Ink Well

**Concept.** Calligraphy is the whole interface: bone rice paper, black ink, one vermilion seal used only like a stamp. One continuous pen line, built from where the content actually sits, threads the whole page, and the real hero note writes itself huge behind the headline.

**Palette.** Paper `#f2ede3` (slip `#f8f4ea`), ink `#0c0b0a`, ink-2 `#3a3631`, ink-3 `#5c564d`, seal `#bf3320` (about 4.9:1 on paper). Single light theme.
**Fonts.** Libre Caslon Display (headlines, numerals), Libre Caslon Text italic (emphasis words, the same Caslon family because Display has no italic), Karla (body, UI).

**Signature scroll moment.** The tail of the J in the hero note (`hero-message.svg`, drawn stroke by stroke on load with DrawSVG while a nib follows) lifts off and becomes the page-long thread. `main.js` generates its path with a Catmull-Rom spline through points measured from the DOM, so it adapts at any width. It underlines the "How a card gets made" headline, loops each step numeral, passes under the sample slip, circles the "$4", runs down the FAQ margin and ends at the seal. The line is cut into ~300 slices with pointed-pen pressure (downstrokes thick, upstrokes hairline). Each slice is revealed with DrawSVG, driven by a scroll-to-length schedule (ScrollTrigger `onUpdate` + `gsap.quickTo` lag, so the pen trails the hand). The nib is placed from the sampled path. When the pen arrives, the worn vermilion seal stamps (scale, squash, elastic settle). Also: SplitText line-by-line headline reveals (blur to sharp), `ScrollTrigger.batch` ink-wash fades, scrubbed letter-box timeline on the sample slip, DrawSVG step sketches, ScrollToPlugin anchors, `gsap.matchMedia()` for reduced motion. SVG filters: `feTurbulence`+`feDisplacementMap` ink bleed on display type, worn-stamp filter on the seal, feTurbulence fibre texture as static background tiles.

**Reduced motion / no JS.** Everything visible; hero note already written; with JS the thread is shown fully drawn, no nib. Without JS there is no thread (it is generated).

**To port for real.** Dark mode (an "ink stone" inversion is possible but not designed), the other pages, real asset pipeline for fonts (self-host), the mobile menu focus trap, tests on Safari/Firefox (filters, DrawSVG on many slices), and a path-length cap if the page grows a lot.

**Known flaws.**
- The thread is JS-built; a very late layout change (images, fonts) triggers a rebuild, which can nudge the line for a frame.
- Page is about 7.5 viewport heights at 1440x900, just under the 8 target.
- Mobile route is simplified: the line hugs the left margin and can sit under text edges at 390px.
- Ink-bleed filter looks slightly rough on the largest type in some browsers.
- Sample sketches and the letter-box strip are schematic, labelled as samples; they are not real captures.
- Browser test was Chromium only; reduced-motion branch was code-reviewed, not rendered.
