"use strict";
/* Precomputed world-tour legs (BUNDLE — canonical source is legs/level_*.js).
 * Generated offline by chained engine BFS from exact states (boxes persist
 * across revisits: HxH as-left, HxF as-left), plus native C A* for IxE
 * (entry/transit reformulations). path INCLUDES the final crossing step
 * off the edge (world-space U/D/L/R); cross is kept null. content.js waits
 * for the next room whenever the following leg is in a different room.
 * gem: leg collects the room gem. Do not hand-edit; regenerate. */
window.MB_TOUR = [
  {
    "room": "level_HxI",
    "path": "RRRRRRRRRUUULUUUULLLLLLLLLUUUURRRUU",
    "cross": null,
    "gem": false
  },
  {
    "room": "level_HxH",
    "path": "UULLUUUURRRRRRRRDDRRUULUUUURUUULLLLLLLLLRRDDDLLUDLLLLUU",
    "cross": null,
    "gem": true
  },
  {
    "room": "level_HxH",
    "path": "RRUULLLL",
    "cross": null,
    "gem": false
  },
  {
    "room": "level_GxH",
    "path": "LDDDDDDDDDDDDLLLLLLUULLULURDDRRRRURUUUDDDDLLLLLUURLDDRRRRUULLLLUUUURRRDRDRDLLRUULUURDDDDDUUUULLLDDLDDRRRLLLDDRRRRUUUDLLLLUUUUURRRRRDLRDDLURULLLLDLLLURDRURRULLLUUURRRRR",
    "cross": null,
    "gem": true
  },
  {
    "room": "level_GxH",
    "path": "DLLLLLDDDDDRDDDDRDDRRRRRRUUUUUUUUUUUURRR",
    "cross": null,
    "gem": false
  },
  {
    "room": "level_HxH",
    "path": "RRRRRRUU",
    "cross": null,
    "gem": false
  },
  {
    "room": "level_HxG",
    "path": "UUUUURUUUURRRRRRUUUUULLLLUU",
    "cross": null,
    "gem": false
  },
  {
    "room": "level_HxF",
    "path": "ULLLLLLULURRRRRRRDRULURRDRURULLUUUUULLLLLLRRRRRDDDRDDDLLLLLLDLUURRRRRRUUUUULUUULLLLLDLLLUU",
    "cross": null,
    "gem": true
  },
  {
    "room": "level_HxF",
    "path": "LL",
    "cross": null,
    "gem": false
  },
  {
    "room": "level_GxF",
    "path": "LDLLLLLLLLLLDDRRRRDULLLDLDDDDDDRRRRUURUURURULLLRRDDLUDDDDDLLLULLUUUUUURRRDRDDRRRULRUULDDRDDLDDDLLLLULLUUUUURRRURDDULLLLDDDDDDRRRRUURUURURULLRDDLDDDRUUUURULLLRRDDLUDDDDDLLLULLUUUUURLDDDDDDRRRRUURUUURRUULDDDDDDRDLLLLLLULDDLLLUUUR",
    "cross": null,
    "gem": true
  },
  {
    "room": "level_GxF",
    "path": "DLDDRRRUUUUUUUUUUURRRRRRRRRRRR",
    "cross": null,
    "gem": false
  },
  {
    "room": "level_HxF",
    "path": "RDDRRRUURRUU",
    "cross": null,
    "gem": false
  },
  {
    "room": "level_HxE",
    "path": "UUUUUULLLLLLL",
    "cross": null,
    "gem": false
  },
  {
    "room": "level_GxE",
    "path": "LLLULLLLLLRUULDDLLDRURRRDDLULDRDDDLDLLLLUUUUULLL",
    "cross": null,
    "gem": false
  },
  {
    "room": "level_FxE",
    "path": "ULLLLLLDDULLLLLULDDDLLDRDRUUUUUDDRUURRRRRRRULDLURULULULDDDDDRDDDLLURUUUUDRRULDLLLLLLUUUUUULURRRRRLLLLDDDDDDDRRRRUURRRRRRRUULULU",
    "cross": null,
    "gem": true
  },
  {
    "room": "level_FxE",
    "path": "DDRRDDRRR",
    "cross": null,
    "gem": false
  },
  {
    "room": "level_GxE",
    "path": "DDDRDDDDDRRRUURRRUUULUURRRRRRRRRR",
    "cross": null,
    "gem": false
  },
  {
    "room": "level_HxE",
    "path": "URRRUULUUURDLDRRRRURDDULLLLDDDLDDDRRRRUUURRRRRUUULUURRRRRR",
    "cross": null,
    "gem": false
  },
  {
    "room": "level_IxE",
    "path": "RRRDDDDRRRRRRRDDDDLLLDLUUUURULLUUUULDDDRDDDDDLLLULUURRRRURDDDRDDUUURRRDLLLULLLDDRRUULUURRRDLLLLULDRDLULDLLDRURRRDDLDDDRDDLLULUUDDDRRRUUULUUUUULLLDDRRUDRLDRDDDRDDLLULUUU",
    "cross": null,
    "gem": true
  },
  {
    "room": "level_IxE",
    "path": "DDDDRRRUUULUUUUUUUUUULLLL",
    "cross": null,
    "gem": false
  },
  {
    "room": "level_HxE",
    "path": "R",
    "cross": null,
    "gem": false
  },
  {
    "room": "level_IxE",
    "path": "RRRDDDDDDDDRRRRDRUUUULUUUURRRURDDDLDDDDDRRRULLLUUUULDDDDDLLDRURRRDDLULDDRDDLDLLD",
    "cross": null,
    "gem": false
  },
  {
    "room": "level_IxF",
    "path": "DDLDDDRLDLDDDRDDDDDDD",
    "cross": null,
    "gem": false
  },
  {
    "room": "level_IxG",
    "path": "DDDRRRDLDLDDDRRRRULDDD",
    "cross": null,
    "gem": false
  },
  {
    "room": "level_IxH",
    "path": "DDLLLLDDLULURRRRRRRRRURDDDDRDLLDLURRRDLDDD",
    "cross": null,
    "gem": false
  },
  {
    "room": "level_IxI",
    "path": "DDRRRDLDRDLURDLURDLDLURDRULURDLDLU",
    "cross": null,
    "gem": true
  },
  {
    "room": "level_IxI",
    "path": "RULDRDLURDRURR",
    "cross": null,
    "gem": false
  },
  {
    "room": "level_JxI",
    "path": "RDDRRULURDRURDLURULURDLUU",
    "cross": null,
    "gem": false
  },
  {
    "room": "level_JxH",
    "path": "ULLLUDLLURRRDRUULLURRDRUUDLLLLURURRDLDRRRUULDLLLLURURRLDLDRRRURUULURULLLLLULDRRRRDRDLULDLLLURURURRRRRDLULDRULULLDLDLD",
    "cross": null,
    "gem": true
  },
  {
    "room": "level_JxH",
    "path": "RDRDDDLLLDD",
    "cross": null,
    "gem": false
  },
  {
    "room": "level_JxI",
    "path": "DRDDDDRR",
    "cross": null,
    "gem": false
  },
  {
    "room": "level_KxI",
    "path": "DDRRRRDRDRULULUU",
    "cross": null,
    "gem": false
  },
  {
    "room": "level_KxH",
    "path": "UULLUUULDDLLDDRRRRRDRUUUURDLURDRULURDDRULUU",
    "cross": null,
    "gem": false
  },
  {
    "room": "level_KxG",
    "path": "ULLLLULLLLURRRRRRRDRUUUULUURRRRRRDDLULL",
    "cross": null,
    "gem": false
  },
  {
    "room": "level_JxG",
    "path": "LDRDLULDLURDDLDRURULDLDLDLULURUDLURDRDRURULDRDRDRULULDRULDRULDRURLURULDLDLRURDRDLULDLULDRURDRULULDURDLULULRDLURLDRURDULDRULLURULDLDRUR",
    "cross": null,
    "gem": true
  },
  {
    "room": "level_JxG",
    "path": "URURR",
    "cross": null,
    "gem": false
  },
  {
    "room": "level_KxG",
    "path": "RDRDLLULUUU",
    "cross": null,
    "gem": false
  },
  {
    "room": "level_KxF",
    "path": "LULURDRDLURURDLULURULDLDURDLULDLURDRDRDLURRURDDLL",
    "cross": null,
    "gem": false
  },
  {
    "room": "level_JxF",
    "path": "LLLURDLULUURDRDLLURLURURDLUURDRDRUDRULUUU",
    "cross": null,
    "gem": false
  },
  {
    "room": "level_JxE",
    "path": "ULUULURRRURURDDDLLLLLLLDLUUULLLURRLURDDLDRRRRDRURRRRURULLUDLULURDLDRRRRRDRULULDRLDLDRRRRRUUDRRULUDLURRURDULDRURDDDDLLDDDRUURULLLLLLLUULDLURDRDLDLLLURLDRRRURDRURUULLDLULURUL",
    "cross": null,
    "gem": true
  },
  {
    "room": "level_JxE",
    "path": "RDLDDDDRRRDD",
    "cross": null,
    "gem": false
  },
  {
    "room": "level_JxF",
    "path": "DDRULDRR",
    "cross": null,
    "gem": false
  },
  {
    "room": "level_KxF",
    "path": "RDLURURDLURUU",
    "cross": null,
    "gem": false
  },
  {
    "room": "level_KxE",
    "path": "ULDLURDDLDRRDLURURR",
    "cross": null,
    "gem": false
  },
  {
    "room": "level_LxE",
    "path": "URRRULLDDURDLDLUULURRRRURDDDDRURR",
    "cross": null,
    "gem": false
  }
];
