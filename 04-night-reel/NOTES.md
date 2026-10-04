# 04 Night Reel

**Concept.** A dark theatre where the whole homepage is a trailer you scroll through: one tungsten lamp, film grain, letterbox bars, Bodoni title cards, a reel label and timecode in the bottom bar. The four "how it works" steps are the chapter title cards of the pinned sequence, so the explanation and the picture are the same scroll.

**Palette.** ink `#07080b`, letterbox black `#030405`, warm paper `#efe6d3`, tungsten amber `#f2a33a` / hot `#ffc46b` (the one accent), deep teal `#0f4c52` in the shadows (fills, vignette, stamp). Card paper `#efe4cd`, card ink `#14232b`.
**Fonts.** Bodoni Moda (display, italics for emphasis), Hanken Grotesk (body, tracked caps labels). Google Fonts `<link>`.

**Signature moment.** The hero is frame 0 of one pinned master timeline (`.reel`, 5.6 viewport heights, 4.7 on mobile, `scrub: 0.8`). A sample photo drifts out of the dark, a teal proof is printed by an amber scan bar (clip-path and bar share one ease), the card flips in 3D, the pen writes the real `hero-message.svg` strokes in pen order with a glowing nib that cools each stroke from amber to ink, a stamp slams with a flash, a postmark and wavy cancel lines draw in (DrawSVG), then the card slides into a mail slot (clip-path). Title cards cross-fade on the same scrub; the HUD reads the progress. GSAP: timeline + ScrollTrigger (pin, scrub, batch, function values with invalidateOnRefresh), SplitText (masked line reveals), DrawSVG, ScrollTo (anchors), matchMedia. After the pin: scrubbed letter-finding boxes on a sample sheet, spotlight veils (a radial gradient whose centre follows scroll) over pricing and FAQ, slow blur-fades, a pigeon crossing the closing lamp. Grain is an SVG noise tile jumped in steps by GSAP.

**Reduced motion / no JS.** `.is-pinned` is only added inside the no-preference branch. Otherwise a static layout: card front and back side by side (note written, stamped), the four steps in a row, every section fully visible.

**To port.** Dark only (a light theme needs a rethink); real routes (links are stubs); self-hosted fonts; a real sample photo and real mailed-card photos in place of the SVG drawing; the address on the card is a made-up sample; the contact link is a placeholder mailto.

**Known flaws.** The nav sits in a letterbox bar, leaving a gap of black under it at 1440x900. The lamp cone is a fairly hard triangle. Bodoni "Wr" spacing is loose in "Write the note." (patched with a span). Grain and dust loop forever (dust pauses off screen; both off under reduced motion). The spotlight veil dims text near section edges by design (about 30% at the extremes). Windows under 560px tall are untested.
