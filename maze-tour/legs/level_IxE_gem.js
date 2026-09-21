"use strict";
/* level_IxE (first pass) — gem spur. Rooms reset on re-entry, so the gem
 * is grabbed on arrival, then the tour exits back west and re-enters. */
window.MB_TOUR = window.MB_TOUR || [];
window.MB_TOUR.push(
  { room: "level_IxE", path: "RRRDDDDRRRRRRRDDDDLLLDLUUUURULLUUUULDDDRDDDDDLLLULUURRRRURDDDRDDUUURRRDLLLULLLDDRRUULUURRRDLLLLULDRDLULDLLDRURRRDDLDDDRDDLLULUUDDDRRRUUULUUUUULLLDDRRUDRLDRDDDRDDLLULUUU", cross: null, gem: true }, // S13 IxE gem (native C A*, entry 0,1)
  { room: "level_IxE", path: "DDDDRRRUUULUUUUUUUUUULLLL", cross: null, gem: false }, // S13b IxE west exit back to HxE (folded L)
);
