# 02 Sticker Slap

**Concept.** The whole page is a scrapbook board. Flat colour slabs, 3px ink outlines, hard offset shadows, buttons that press down, die-cut pigeon sticker with a white border, tape, stamps, a postmark. Things get slapped on, and the plain voice stays plain.

**Palette.** Ink `#16120F`, paper `#FFF9EA`, acid yellow `#FFE818`, tomato `#FF4B2B`, cobalt `#2D4BFF`, mint `#5BE6B0`, hot pink `#FF6FB5`, sample pen ink `#1D35D6`. Section order: yellow, ink/pink strips, cobalt, pink, mint, paper, tomato, ink.
**Fonts.** Bricolage Grotesque 800 (opsz + wdth axes, condensed for labels), Schibsted Grotesk body (swapped in for Instrument Sans), Covered By Your Grace only inside the labelled sample handwriting sheets.

**Signature moment (How it works).** The board section is pinned (`+=260%`). Scroll position picks the step; each step's pieces fly in from the camera and thunk down (`back.out` scale and rotation overshoot, CustomBounce drops for labels, CustomWiggle screen shake, impact lines). The real plotted note is drawn stroke by stroke on the slapped-down card (DrawSVG, constant pen speed, a pen follows the tip) scrubbed to scroll; step 4 stamps and postmarks it. Scrolling back peels the pieces off. Under 960px there is no pin: each step's pieces slap on as they enter and the note draws on landing.
Also: SplitText word-slap headings, ScrollTrigger.batch rises, scroll-velocity marquee strips, Draggable + InertiaPlugin flingable stickers in the hero and CTA (bounded to their column, "Put them back" button resets), footer letters dropping with CustomBounce.
Reduced motion and no-JS: everything visible and settled, note fully drawn, no pin, stickers draggable without the fling. Verified at 1440x900, 1024x700, 1920x1080, 390x844: no console errors, no horizontal scroll.

**For a real port.** Dark mode (single light theme here), real pages behind the links (links go to `../../*.html`), a self-hosted font subset instead of Google Fonts, a real photo on the sample card instead of the SVG scene, keyboard alternative for the sticker dragging (they are decorative and aria-hidden), tests for the scroll state machine.

**Known flaws.** Sticker dragging on touch can eat a vertical swipe that starts on a sticker (cards are excluded on coarse pointers). Short desktop windows under about 640px tall compress the pinned board. Sample art (scene, address lines, sample note) is illustrative and labelled "Sample"; the address is placeholder text. The tidy button and drags are not keyboard accessible. Page height is about 9 viewports on desktop.
