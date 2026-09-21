"use strict";
/* Saved optimal solutions for the MazeBench Autoplayer.
 *
 * Moves are world-space single chars: U = y-1, D = y+1, L = x-1, R = x+1.
 * The player sends them through the page's own solver-move API, so they are
 * camera-independent and animation-safe.
 *
 * ADDING A LEVEL: add one entry keyed by canonical id "level_<A>x<B>"
 * (uppercase letters, e.g. level_HxF) with a verified optimal `path`.
 * The content script picks it up automatically — no other changes needed.
 * Verify first: replay the path step-by-step in the real engine and confirm
 * exactly 1 gem collected and the player alive (see README, or run
 * solver/solve_all.ps1 which verifies automatically).
 */
window.MB_SOLUTIONS = {
  level_HxF: {
    label: "Level HxF",
    moves: 88,
    source: "classic BFS (FIFO queue, optimal), re-verified in the real engine",
    path: "LLLLLULURRRRRRRDRULURRDRURULLUUUUULLLLLLRRRRRDDDRDDDLLLLLLDLUURRRRRRUUUUULUUULLLLLDLLLUU"
  },
  level_HxH: {
    label: "Level HxH",
    moves: 56,
    source: "classic BFS (FIFO queue, optimal), re-verified in the real engine",
    path: "ULLLLUUUURRRRRRRRDDRRUULUUUURUUULLLLLLLLLRRDDDLLUDLLLLUU"
  },
  level_GxH: {
    label: "Level GxH",
    moves: 164,
    source: "classic BFS (FIFO queue, optimal), re-verified in the real engine",
    path: "DDDDDDDDDDLLLLLLUULLULURDDRRRRURUUUDDDDLLLLLUURLDDRRRRUULLLLUUUURRRDRDRDLLRUULUURDDDDDUUUULLLDDLDDRRRLLLDDRRRRUUUDLLLLUUUUURRRRRDLRDDLURULLLLDLLLURDRURRULLLUUURRRRR"
  },
  level_FxE: {
    label: "Level FxE",
    moves: 125,
    source: "my A* (Manhattan, optimal), re-verified in the real engine",
    path: "LLLLLDDULLLLLULDDDLLDRDRUUUUUDDRUURRRRRRRULDLURULULULDDDDDRDDDLLURUUUUDRRULDLLLLLLUUUUUULURRRRRLLLLDDDDDDDRRRRUURRRRRRRUULULU"
  },
  level_FxF: {
    label: "Level FxF",
    moves: 92,
    source: "classic BFS (FIFO queue, optimal), re-verified in the real engine",
    path: "LLLLLLLDDDDRDRURDRRDDUULUUDDRDDUULUUDDRDDUULUUDDRDDUULUUDDRDLULDLDLLDDDRRRRRRRRRUURUUUUUUUUL"
  },
  level_GxG: {
    label: "Level GxG",
    moves: 220,
    source: "classic BFS (FIFO queue, optimal), re-verified in the real engine",
    path: "DRRRRRRRRRDDLDDRDLULLLLDDRDDDRRUUDLLUULUUURRRRDLDDULURRRDLRDDLUURULLDLULLLLUURDLDRRDDRDDDRRUUURRUULULLLULDDURRRRDRDDLULLUDRRRULLDLULLDULLUURDLDRRRRDRRRULULLLDRURDDDDRRDLULDRDLLLLLLRRRURRUUUUUURRUULLLLLLLLLDDDDDDDLDDRDRDR"
  },
  level_JxH: {
    label: "Level JxH",
    moves: 117,
    source: "built-in A* (official), re-verified in the real engine",
    path: "LLLLUDLLURRRDRUULLURRDRUUDLLLLURURRDLDRRRUULDLLLLURURRLDLDRRRURUULURULLLLLULDRRRRDRDLULDLLLURURLDLDRURUULDRULULLDLDLD"
  },
  level_DxG: {
    label: "Level DxG",
    moves: 202,
    source: "built-in A* (official), re-verified in the real engine",
    path: "UULLLUULLLLDRRRRLDRRRRDDRRRRUUURULLLRRDDDDLUUURULDLLLLURRUULLRRDDRDRRRRUUUULDRDDDLLLLLLDLURURUULLLUUUUUUULLLLLDRRRRURDDDDDDDRRRDDDDLLLLULLLURRRDDRRUURRRDDRRRURUUULDRDDDLLLLUUDLUUULLLUUUULUURRRURRRRDDURR"
  },
  level_JxL: {
    label: "Level JxL",
    moves: 127,
    source: "built-in A* (official), re-verified in the real engine",
    path: "DLLLLLDDDDLLLLUUUUULLDDDDDRRRRRRRUUURDRDLLDLLLLLLLUULDDDDDDDDRRRRRRRRRUULRDDLLLLLLLLLUUUUUUUUUULURRDRDDDDLLDRRRDRRRRRRRUDRRDDDD"
  },
  level_FxB: {
    label: "Level FxB",
    moves: 82,
    source: "built-in A* (official), re-verified in the real engine",
    path: "LDLLLLLLLDDDLLLLLUULURUDDDDRRRUUULUUURDDLDDDDRRRRURRULRUULLDDDDLDDDDDDUURRRDDDLULL"
  },
  level_JxG: {
    label: "Level JxG",
    moves: 134,
    source: "built-in A* (official), re-verified in the real engine",
    path: "LDRDLULDLURDDLDRURULDLDLDLULURUDLURDRDRURULDRDRDRULULDRULDRULDRURLURULDLDLRURDRDLULDLULDRURDRULULDURDLULULRDLURLDRURDULDRULLURULDLDRUR"
  },
  level_OxD: {
    label: "Level OxD",
    moves: 90,
    source: "built-in A* (official), re-verified in the real engine",
    path: "UUURRRUUURRRUDDLDDRRRRRUUULUDDDUUULRUUUULLLLURRRDDRRRLLLLRRRRRRRDDDDDDLLLDDDLLLLDDRRRRRRRU"
  },
  level_HxC: {
    label: "Level HxC",
    moves: 81,
    source: "built-in A* (official), re-verified in the real engine",
    path: "DDDDLLLUDLLUURLUUURRRRRDRRRRURRDLLLLRRRRRRDDLRDDLLUDLLUURLUURRDRDURRDDLRDDLLUUURU"
  },
  level_JxE: {
    label: "Level JxE",
    moves: 174,
    source: "built-in A* (official), re-verified in the real engine",
    path: "LLLLUULURRRURURDDDLLLLLLLDLUUULLLURRLURDDLDRRRRDRURRRRURULLUDLULURDLDRRRRRDRULULDRLDLDRRRRRUUDRRULUDLURRURDULDRURDDDDLLDDDRUURULLLLLLLUULDLURDRDLDLLLURLDRRRURDRURUULLDLULURUL"
  },
  level_IxI: {
    label: "Level IxI",
    moves: 34,
    source: "built-in A* (official), re-verified in the real engine",
    path: "DRRRRDLDRDLURDLURDLDLURDRULURDLDLU"
  },
  level_NxE: {
    label: "Level NxE",
    moves: 39,
    source: "built-in A* (official), re-verified in the real engine",
    path: "URULULDRDRURDLULULDRURDRDLDLDLDRURURDLD"
  },
  level_PxC: {
    label: "Level PxC",
    moves: 40,
    source: "built-in A* (official), re-verified in the real engine",
    path: "UUUURRDLLLLLDRLDDDRRLRUUUUUUUUUULLLLLLLL"
  },
  level_AxP: {
    label: "Level AxP",
    moves: 9,
    source: "built-in A* (official), re-verified in the real engine",
    path: "DDDDDDDDL"
  },
  level_DxH: {
    label: "Level DxH",
    moves: 56,
    source: "built-in A* (official), re-verified in the real engine",
    path: "RRRRRRDDRRRRDDDDLDDRUUUUUURULLLLULDDRDLLULDRURUURRRRRRRD"
  },
  level_DxN: {
    label: "Level DxN",
    moves: 46,
    source: "built-in A* (official), re-verified in the real engine",
    path: "ULUUULLLLLUURRULLUULUUUUDLLLDURRRRULDDDDRURDRR"
  },
  level_ExM: {
    label: "Level ExM",
    moves: 35,
    source: "built-in A* (official), re-verified in the real engine",
    path: "RRRRDDRRRUURRRULLLULLLLDDDDDRDRRDDR"
  },
  level_LxP: {
    label: "Level LxP",
    moves: 43,
    source: "built-in A* (official), re-verified in the real engine",
    path: "RRDRRRDRRRRURURRURUUUULLLUUUUULLLLLDDRDLLDL"
  },
  level_MxD: {
    label: "Level MxD",
    moves: 103,
    source: "built-in A* (official), re-verified in the real engine",
    path: "LLLDLDLDLURLLDULDULDULDUULRULRRUURUDDLRDLLLRDLRDDURDURDUUULUDDRDDUULDDURDURDUULDDURDURRLULDDUURRUUURURD"
  },
  level_MxN: {
    label: "Level MxN",
    moves: 38,
    source: "built-in A* (official), re-verified in the real engine",
    path: "RDLLURDLUUDLURDDLUULDDDDLDRUULDRRULLLD"
  },
  level_NxF: {
    label: "Level NxF",
    moves: 33,
    source: "built-in A* (official), re-verified in the real engine",
    path: "UURRRURRDDULDDLURULLURDLDLDLURDRU"
  },
  level_NxN: {
    label: "Level NxN",
    moves: 78,
    source: "built-in A* (official), re-verified in the real engine",
    path: "DDLDLLLLDRULLDDRDLLUUURDDDDDDLDRRRURRRDDDRDDDDDDLLUURRUUUUUUULLLLDLLLLDRUUUULL"
  },
  level_PxA: {
    label: "Level PxA",
    moves: 9,
    source: "built-in A* (official), re-verified in the real engine",
    path: "UUUUUULLL"
  },
  level_PxG: {
    label: "Level PxG",
    moves: 78,
    source: "built-in A* (official), re-verified in the real engine",
    path: "UUURDRRRRUUUURRRRRLLLLLDDDDLLLUUUULDDDRRRRRRDLUURRDUUURDLUURRRRRRRRUUUUUULLLLL"
  },
  level_PxH: {
    label: "Level PxH",
    moves: 76,
    source: "built-in A* (official), re-verified in the real engine",
    path: "UUURRRRRUULDDDDDDRUUUUUURRDLLRRDDDLLLLLLUURUUDLURDRRULLLUULLLULLDDDDLLUUUUUU"
  },
  level_PxL: {
    label: "Level PxL",
    moves: 32,
    source: "built-in A* (official), re-verified in the real engine",
    path: "RRRRRRDRRRRRULDLUUUUURUUUUUUUURU"
  },
  level_PxP: {
    label: "Level PxP",
    moves: 9,
    source: "built-in A* (official), re-verified in the real engine",
    path: "RRRRRDRRR"
  },
  level_CxL: {
    label: "Level CxL",
    moves: 99,
    source: "built-in A* (official), re-verified in the real engine",
    path: "LLLDLLLLUUDRRRRRRRRRDRUUULUUULLUULLLDLLLDRRRRRDRRRDDRUDDDLLLLLLLLLLUUUUUUUURRRRRRDDDRRRRRRUUUUULLDR"
  },
  level_FxO: {
    label: "Level FxO",
    moves: 118,
    source: "built-in A* (official), re-verified in the real engine",
    path: "LLDDLDDDDDDRDLLLLLLULLLDDRUUULUURRRUUURRDDRDLLLLDLLUURDDDDLDRRRRRRURDDDUULLLLLLDDULDDLDDRRRRRUUUULLURRRRRRDRUUURUULUUU"
  },
  level_LxI: {
    label: "Level LxI",
    moves: 117,
    source: "built-in A* (official), re-verified in the real engine",
    path: "LDDDDDRRULURDRULLLULDDDDDDDDDDDDLDRRRRRDRUURULRDLLULDDDRRUULURDRULLLDDDRRRLDDDDRRUULLULDDDRULLLULDDDDDRDLULDLDRRRRRRR"
  },
  level_PxD: {
    label: "Level PxD",
    moves: 81,
    source: "built-in A* (official), re-verified in the real engine",
    path: "UUULLLULLLLLDDLLUUUUURRDDDDUUUULDLDLDRRRRRRRRRUUUULLUULLLLDRUUULLUURRRUULDRRRDDLL"
  },
  level_GxF: {
    label: "Level GxF",
    moves: 219,
    source: "classic BFS (C solver), re-verified in the real engine",
    path: "DLLLDDRRRRDULLLDLDDDDDDRRRRUURUURURULLLRRDDLUDDDDDLLLULLUUUUUURRRDRDDRRRULRUULDDRDDLDDDLLLLULLUUUUURRRURDDULLLLDDDDDDRRRRUURUURURULLRDDLDDDRUUUURULLLRRDDLUDDDDDLLLULLUUUUURLDDDDDDRRRRUURUUURRUULDDDDDDRDLLLLLLULDDLLLUUUR"
  },
  level_IxE: {
    label: "Level IxE",
    moves: 161,
    source: "classic BFS (C solver), re-verified in the real engine",
    path: "DRDRRRRDRUUUURRRRUUUULLLLLLULDDDRDDDDDLLLULUURRRRURDDDRDDUUURRRDLLLULLLDDRRUULUURRRDLLLLULDRDLULDLLDRURRRDDLDDDRDDLLULUUDDDRRRUUULUUUUULLLDDRRUDRLDRDDDRDDLLULUUU"
  },
  level_HxP: {
    label: "Level HxP",
    moves: 32,
    source: "built-in A* (official), single-room re-verified in the real engine",
    path: "LRUUUULRLLLLLLLDLDDLUUUDDDRUUUUU"
  },
  level_MxL: {
    label: "Level MxL",
    moves: 74,
    source: "engine BFS, re-verified in the real engine",
    path: "ULLDRUULDDDDDDDDRRRRUUUULLLLDRRRRRULLDRULLDRULUUULLLLDDDDDDRRRRRDRRURUURRR"
  },
  level_AxM: {
    label: "Level AxM",
    moves: 39,
    source: "built-in A* (official), re-verified in the real engine",
    path: "DDLURRRRLLLDDDDRDDLLLLLURRDRRRRURULURRU"
  },
  level_BxI: {
    label: "Level BxI",
    moves: 365,
    source: "manual 463 + machine-shortened to 365 (wiggles, window splicing), engine-verified",
    path: "UUUUULLLLLLLLRRRRRRDDDDDDDDDLLLLULLLUURUUURRRRDLDDLUURRULLLLDLUUUULULDRRDDDDRDDLDDRRRDLLLLLLUUUUUURURURRRRRRRURDDDDDDDDRDLUUUUUUUUULLLLULLLDRDLLDLLLURRRRRRRRRURRDDDDDDDDDRDLUUUUUUUUUULLDRRLLLLLLLLDDLLDDDDDDRRRRRRURRRDDDRDRULLUUULLLDRRRRRURRDDLUUUURULLULUUUURDDDDRDLDLDDDDLLLLLLLLLDLUUUUUDDDDRRRRRRRURRRRRDLLLULLDDRULURRRRDRUUUURULLLLLLLLLRRRRRRDDDDLLLLULLLUURLULLLL"
  },
  level_DxM: {
    label: "Level DxM",
    moves: 176,
    source: "manual 200 + machine-shortened to 176 (wiggles, window splicing), engine-verified",
    path: "RDDDDDDDDDRRRUURDLDRRRRRRRRUUULLLLLLLLLLDLUUUULURDRUULURDLDDDDDDDDDRRRRRRRUUULULLLLLLUUUUUURRRRDDDRRRDDDLLLLLLLRRRDLLLLLULUUULURURDLDDDDRDDLUUUUULURDRUULURRRLLDDDRRRRRRUUURRRRD"
  }
};
