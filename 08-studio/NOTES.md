# 08 Studio Object

**Concept.** A product-launch page where the postcard is the object: a real CSS 3D card (perspective, two faces, paper-stock edge, a specular sheen that follows its rotation, a floor shadow) lit on a cool-grey seamless backdrop, with one vermilion accent and spec-sheet hairline tables. **Signature moment:** one pinned stage (about 4.6 viewport heights) where the card floats up, turns over from a printed lake photo to the back, the real plotted note is drawn stroke by stroke, a stamp thunks in with a postmark, four callouts attach to the parts ("Colour print", "Drawn in ink", "USPS postage", "Stamped by hand"), and it settles tilted beside "$4 a card."

**Palette.** Wall `#fbfcfd`, `#f2f4f7`, `#e6eaf0`; ink `#141a2a`, `#444b5e`, `#5f667a`; accent vermilion `#d93a14` (text-size use `#b32b09`); card paper `#fdfdfb`, card ink `#1a2038`. Light theme only. Radius 3px for UI.
**Fonts.** Funnel Display (display, 600, tracking -0.035em) and Onest (body), via Google Fonts.

**GSAP.** ScrollTrigger (pin, scrub, batch), a master timeline with tweened rotationX/Y/Z on the 3D card, DrawSVG (the 40 note paths in pen order with a tip dot riding the stroke via getPointAtLength, postmark cancel lines, step figures), SplitText (masked line reveals), quickTo (magnetic buttons, pointer tilt), ScrollTo (nav "Pricing" lands on the settled frame), MotionPath (closing pigeon), matchMedia (pinned desktop / timed autoplay under 1000px / static reduced motion with a front-back toggle). The handwriting section scrubs a photo (blurred, tilted) to letter boxes to ink.

**Port to the real site still needs.** Dark mode, the other pages, real sample photos instead of the SVG lake, a real stamp design, hooking Log in / Create to routes, and a decision on whether the long pin suits returning visitors.

**Known flaws.** Resizing the window within one breakpoint leaves pinned x/y values stale until reload. The pin is long (4.6 screens) and there is no skip control besides the anchors. The sample address (June Marlowe, Duluth) is invented sample art. Edges at corners are square under the rounded faces (visible only at extreme angles). Funnel Display and Onest need internet; fallbacks are Helvetica/system sans. The preview server must be HTTP for playwright; the page itself opens by double-click.
