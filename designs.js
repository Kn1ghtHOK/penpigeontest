// The twelve designs, in review order. Classic script (not a module) so the
// shell also opens from disk. validate.js keeps its own copy of the ids for the
// Worker; test_worker.mjs fails if the two lists drift apart.
window.PP_DESIGNS = [
  { id: '01-blueprint',   n: '01', name: 'Plotter Blueprint', feel: 'Dark blue, technical',
    line: 'An engineering drawing set. Scrolling draws the card’s construction lines, then the pen writes the note.' },
  { id: '02-sticker',     n: '02', name: 'Sticker Slap',      feel: 'Loud, playful, colourful',
    line: 'Flat colour, hard shadows, stickers that thunk onto a board. You can drag and fling them.' },
  { id: '03-broadsheet',  n: '03', name: 'Broadsheet',        feel: 'Newsprint, typographic',
    line: 'A newspaper front page. Giant type, thin rules, one red, the note as an editor’s mark-up.' },
  { id: '04-night-reel',  n: '04', name: 'Night Reel',        feel: 'Dark, cinematic',
    line: 'A film trailer you scroll through. One pinned sequence: photo, print, pen, stamp, mail slot.' },
  { id: '05-riso',        n: '05', name: 'Riso Zine',         feel: 'Print-textured, colourful',
    line: 'Three-ink risograph. The colour plates slide into register as you scroll.' },
  { id: '06-flatlay',     n: '06', name: 'Desk Flat-lay',     feel: 'Warm, tactile, physical',
    line: 'A desk seen from above. The camera pans across it while a brass pen writes the card.' },
  { id: '07-phosphor',    n: '07', name: 'Phosphor',          feel: 'Dark, retro terminal',
    line: 'The plotter’s own console. A terminal types the steps next to a live G-code readout.' },
  { id: '08-studio',      n: '08', name: 'Studio Object',     feel: 'Clean, light, product launch',
    line: 'The postcard as a 3D object that flips over, with callouts pointing at its parts.' },
  { id: '09-gallery',     n: '09', name: 'Gallery Wall',      feel: 'Quiet, minimal, light',
    line: 'A museum. A pinned horizontal walk through four rooms, with wall labels and a spotlight.' },
  { id: '10-bauhaus',     n: '10', name: 'Bauhaus Poster',    feel: 'Bold geometric, primary colours',
    line: 'Flat shapes that assemble into the pigeon, then re-form for each of the four steps.' },
  { id: '11-inkwell',     n: '11', name: 'Ink Well',          feel: 'Calm, calligraphic, light',
    line: 'One continuous pen line runs the length of the page, underlining and circling as it goes.' },
  { id: '12-altitude',    n: '12', name: 'Altitude',          feel: 'Soft, illustrated, storybook',
    line: 'The page is a flight. The sky goes from dawn to night as the pigeon carries the card to a mailbox.' }
];
