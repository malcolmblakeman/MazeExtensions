"use strict";
/* level_HxF - world-tour leg(s). First pass only; the revisit leg lives in
 * level_HxF_north.js (tour order matters — legs execute in manifest order).
 * Rewritten from scratch 2026-09-20 (identical paths); see tour.js provenance. */
window.MB_TOUR = window.MB_TOUR || [];
window.MB_TOUR.push(
  { room: "level_HxF", path: "ULLLLLLULURRRRRRRDRULURRDRURULLUUUUULLLLLLRRRRRDDDRDDDLLLLLLDLUURRRRRRUUUUULUUULLLLLDLLLUU", cross: null, gem: true }, // S7 HxF gem
  { room: "level_HxF", path: "LL", cross: null, gem: false }, // S8 HxF west exit (folded L)
);

