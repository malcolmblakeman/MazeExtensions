"use strict";
/* level_HxH - world-tour leg(s). First pass only; the revisit leg lives in
 * level_HxH_north.js (tour order matters — legs execute in manifest order).
 * Rewritten from scratch 2026-09-20 (identical paths); see tour.js provenance. */
window.MB_TOUR = window.MB_TOUR || [];
window.MB_TOUR.push(
  { room: "level_HxH", path: "UULLUUUURRRRRRRRDDRRUULUUUURUUULLLLLLLLLRRDDDLLUDLLLLUU", cross: null, gem: true }, // S1 HxH gem
  { room: "level_HxH", path: "RRUULLLL", cross: null, gem: false }, // S2 HxH west exit (folded L)
);

