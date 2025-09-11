# Block Fill spec

## Goals

* Web app (Next.js) featuring infinite, seeded, deterministic puzzles.
* Three modes (priority order):

  1. **Classic Block Fill**: irregular grid; 1 start; single path covers all cells; endpoint free.
  2. **Multi Block Fill**: irregular grid; K colored starts; K disjoint paths cover all cells; ends free.
  3. **Flow Free**: square grid; K colored pairs; disjoint paths cover all cells; all cells covered.

## Core rules (all modes)

* Grid: square cells; 4-neighborhood adjacency; no diagonal moves.
* Paths occupy cells; paths cannot overlap; cells used by exactly one path.
* All non-blocked cells must be covered at solve time.
* Two paths may be edge-adjacent.

## Difficulty model (exposed & tunable)

* **Size**: open-cell count `N`.
* **Hole density**: blocked/open ratio.
* **Branching factor**: average #legal next-steps along the (hidden) solution.
* **Forced-move ratio**: fraction of solution steps with degree 1.
* **Corridors %**: fraction of cells in 1-wide tunnels.
* **Turn rate**: turns per 10 steps in the solution.
* **Intertwine index** (multi/flow): normalized crossings-avoided pressures between segments (computed from solution proximity).
* Difficulty tiers (defaults):

  * **Easy**: small `N`, high forced-move ratio, low branching, moderate corridors, low intertwine.
  * **Medium**: mid `N`, mixed forced/branch, moderate turns, medium intertwine.
  * **Hard**: larger `N`, low forced-move ratio, higher branching, higher turns and intertwine.

# Technical spec

## Tech stack

* **Next.js 14+** (client logic initially), React 18.
* **Rendering**: SVG (crisp on mobile/desktop, easy hit-testing).
* **State**: Zustand or Redux Toolkit (small store).
* **Workers**: Web Worker for generation/metrics to keep UI jank-free.
* **PRNG**: `xorshift128+` (64-bit state) or `Mulberry32` (fast 32-bit). Deterministic from seed string.
* **Persistence**: `localStorage` for options, last-seed, progress. No DB.

## Seed & share codes

* **Seed string**: base36 (8–12 chars).
* **Params**: compact key=value tokens.
* **Share code** (deep-link):

  ```
  /play#v=1;m=2;w=12;h=10;k=4;hd=0.15;diff=med;seed=8f3kz2
  ```

  * `m` mode, `w/h` nominal bounds, `k` #colors, `hd` hole density, `diff` difficulty tier.
  * Parsing is deterministic; identical code → identical level.

## Level JSON schema

```ts
type Mode = 1|2|3; // classic, multi, flow
interface Level {
  v: 1;
  mode: Mode;
  w: number; h: number;                 // nominal rectangle
  open: Uint8Array;                     // length w*h, 1=open, 0=blocked
  starts: {color: number; i: number;}[];// Mode1: len=1; Mode2: K starts; Mode3: 2K endpoints
  pairs?: {color: number; a: number; b: number;}[]; // Mode3 only
  solution: number[];                   // Mode1: path order indices; 
                                        // Mode2/3: by color (concatenated or map)
  metrics: DifficultyMetrics;
  seed: string; params: Record<string,number|string>;
}
```

## Input & UX (v1 minimal)

* Drag to draw; snapping to cell centers; erase with back-drag or toolbar “erase”.
* Undo/redo stack (O(1) ops).
* Visuals: subtle rounded corners, 2px SVG strokes, simple fill animation.
* Hints: off in v1 (stubbed).
* Win check: all open cells painted, constraints satisfied.

# Generation algorithms (seeded, ≤200 ms target)

### Common pre-step A: PRNG + deterministic choices

* All randomness via PRNG; never `Math.random`.
* Utility: `randInt(a,b)`, `shuffle`, `choiceWeighted`.

### Common pre-step B: build **irregular open region** (Modes 1–2)

Goal: connected 4-neighbor polyomino within `w×h`, with target open count `N≈(1-hd)*w*h`.

**Algorithm IR (fast, constructive):**

1. Start from a random cell; grow a **randomized BFS region** until reaching `N`.
2. During growth, apply bias for irregularity: prefer frontier cells that increase perimeter; avoid creating diagonal pinches that would disconnect.
3. After growth, run a **connectivity sweep** to ensure single connected component; if not, patch with shortest 4-neighbor bridges.
4. Optional **smoothing**: remove 1×1 dead spurs unless needed for difficulty.

### Mode 1: **Classic Block Fill** (single Hamiltonian path)

We need a path visiting every open cell exactly once.

**Approach M1-S**: **Strip-and-Stitch Hamiltonianizer** (constructive, fast)

1. **Strip decomposition**: partition the open region into maximal horizontal or vertical strips (contiguous runs).
2. Within each strip, lay a **serpentine** subpath.
3. **Stitching**: connect adjacent strips at designed junctions (choose cells where strips touch by edges).
4. Ensure no revisit: maintain degree ≤2 invariant per cell; forbid cycles that maroon cells.
5. If stitching gets stuck (no legal connectors): backtrack limited steps; if still stuck, regenerate IR.
6. Choose a **start cell** near a low-degree boundary to increase forced moves (helps difficulty shaping).
7. Output `solution` as the full path order.

This yields a valid Hamiltonian path on most organic regions quickly, avoiding brute DFS. Fallback (rare): **degree-heuristic DFS** with pruning (prefer next cells with minimum forward degree; avoid creating isolated pockets).

### Mode 2: **Multi Block Fill** (K starts, ends free)

Interpretation: partition the open region into K disjoint simple paths that together cover all cells; each path contains exactly one given start.

**Approach M2-P**: **Segment a Hamiltonian path**

1. Generate Mode 1 solution path `P`.
2. Choose K **cut points** along `P` to form contiguous segments `{S1…SK}`; enforce min-length per segment and variance bounds.
3. Assign a distinct color to each segment; select a **start** within each segment (default: one end of the segment). Ends are free by rule.
4. Metrics: intertwine index = sum over adjacent segment borders; adjust cut points to hit target difficulty.
5. Reveal only the K start cells.

Pros: instant coverage guarantee; deterministic; naturally varied shapes. Multiple valid player completions acceptable (uniqueness not required).

### Mode 3: **Flow Free / Numberlink** (pairs on square grid)

Full rectangle; no holes (for classic feel). All cells must be covered.

**Approach M3-FF**: **Pairs from disjoint segments**

1. Generate a full-coverage multi-path partition as in Mode 2 on a **solid rectangle** (run M1 then segment).
2. For each segment, pick **two endpoints** far apart along the segment as the pair `(a,b)`; store in `pairs`.
3. Enforce anti-trivial constraints: endpoints ≥3 cells apart; avoid 2×2 boxed trivialities; diversify segment lengths.
4. Optionally add **bridges/warps** in future variants; v1 stays standard.

### Verification & rating (all modes)

* **Coverage check**: union of paths equals open set.
* **Simple paths**: max degree 2; no overlaps.
* **Mode constraints**: starts/pairs present as specified.
* **Metrics**: compute difficulty features from `solution` and `open`.
* **Time budget**: if generation+verify >200 ms, throw “gen-timeout”.

# Solvers (for verify & future hints)

* **Internal solver**: DFS/backtracking with pruning:

  * **Pruning**: early fail if remaining open cells split into >K components; degree-0 islands; 2×2 parity traps.
  * **Heuristics**: minimum forward-degree first; prefer extending into narrow corridors; avoid making 2×2 loops.
* **Mode specifics**:

  * M1: find Hamiltonian path from given start.
  * M2: grow K paths from starts; stop when cover all cells.
  * M3: connect K pairs while ensuring full coverage.
* For v1, solver used only for **sanity checks and metric scoring**; hints later can reuse it.

# Performance targets

* Gen ≤200 ms median on mid phone (recent iPhone/Pixel).
* SVG render ≤3 ms per frame; minimal animations.
* Worker transfer: compact arrays (`Uint8Array`/`Uint32Array`).
* Memory: <10 MB per level.

# UI spec (minimal)

* **Home**: pick Mode, Size (S/M/L), Difficulty (E/M/H), Seed (auto/random/manual), Play.
* **HUD**: level code, undo/redo, erase, restart, next, seed copy.
* **Win screen**: time, moves, share link (deep link).
* **Error**: gen-timeout → suggest smaller size or new seed.

# Phased implementation plan

## Phase 0 — Foundation (1–2 days)

* Next.js app scaffolding; global store; theming (minimalist).
* PRNG module; seed parser/serializer; URL hash router.
* SVG grid renderer; input system (pointer events, dragging).
* Undo/redo; paint model; validator hooks.
* Web Worker setup; message protocol.

## Phase 1 — Mode 1: Classic Block Fill (irregular, single path)

* Implement **IR** region generator.
* Implement **M1-S** strip-and-stitch Hamiltonianizer; fallback DFS.
* Level schema; metrics; difficulty mapping (E/M/H presets).
* Generator → Worker; 200 ms timeout handling.
* Minimal polish: start cell marker, simple fill animation.
* LocalStorage: last seed, last mode, last win.

## Phase 2 — Mode 2: Multi Block Fill (irregular, K starts)

* Implement **M2-P** segmentation on M1 path.
* Color assignment; start selection per segment; UI for multiple colors.
* Metrics incl. intertwine; difficulty knobs (#segments, min/max lengths).
* Win check for multi-path coverage.
* Share codes include `k`.

## Phase 3 — Mode 3: Flow Free (rectangle, K pairs)

* Solid rectangle generator; run M1 then **segment**; choose pairs.
* Endpoint spacing & anti-triviality rules.
* Pair UI: show endpoints; restrict paths by color.
* Difficulty mapping tuned for Flow Free feel.

## Phase 4 — Quality & features

* Hints (single edge/cell reveal) using solver.
* Daily seed & “random next” button.
* Animations (subtle), path rounding.
* Basic analytics (client-only counters).
* Color-blind palette toggle (later per your note).

## Phase 5 — Stretch

* Serverless endpoint for heavy uniqueness checks (optional later).
* Additional variants: bridges, warps, hex (future), challenges.

# Defaults (initial presets)

| Tier | Mode 1 (w×h, hd, N≈)  | Mode 2 (K) | Mode 3 (size, K) |
| ---: | --------------------- | ---------- | ---------------- |
| Easy | 8×10, hd≈0.10, \~72   | 3          | 6×6, 4           |
|  Med | 10×12, hd≈0.15, \~102 | 4–5        | 7×7, 5           |
| Hard | 12×14, hd≈0.18, \~138 | 6–7        | 8×8, 6–7         |

# Key algorithms (sketch)

**PRNG (Mulberry32)**

```ts
function mulberry32(a:number){return function(){let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
```

**Region grow (IR)**

```ts
function growRegion(w,h,N,rand){
  const open=new Uint8Array(w*h), q=[]; 
  const s=randCell(); open[s]=1; q.push(s);
  const frontier=new Set(neigh4(s).filter(inBounds));
  while(count(open)<N && frontier.size){
    const c=biasedPick(frontier, cell => perimeterGain(cell, open) - pinchRisk(cell, open));
    open[c]=1; updateFrontier(c);
  }
  ensureConnected(open); smooth(open);
  return open;
}
```

**Strip-and-Stitch (M1-S)**

```ts
// 1) decompose into row/col strips; 2) serpentine each; 3) connect strips at adjacency cells
// keep degree<=2; choose connectors that don't isolate remaining cells; backtrack a few steps if needed.
```

**Segment for Mode 2 / build pairs for Mode 3**

```ts
function segmentPath(P, K, rand){
  // choose K-1 cut indices with minDist constraint; adjust to hit segment length targets
  return segments;
}
```

**Metrics**

```ts
function computeMetrics(level){
  // scan solution to compute branching, forced ratio, corridors, turns, intertwine
}
```

# Testing

* Property tests: coverage, no overlaps, single component open set, mode constraints.
* Determinism: 1,000 random seeds → identical outputs across Chrome/Safari/Firefox.
* Performance: median gen time <200 ms on emulated mid devices.
* Visual regression: snapshot SVGs for seeds.

# Risks & mitigations

* **Hamiltonianization failure** on certain masks → cap backtrack, then regenerate mask.
* **Perceived difficulty drift** despite metrics → adjust cut/endpoint policy via A/B seeds.
* **Mobile input precision** → enlarge hitboxes; path magnetism to centers.

# Next.js module layout

```
/app
  /play (mode params via hash)
  /api (empty for now)
/lib/prng.ts, /lib/grid.ts, /lib/region.ts, /lib/hamilton.ts, /lib/segment.ts
/lib/solver.ts, /lib/metrics.ts
/components/BoardSVG.tsx, Palette.tsx, Toolbar.tsx
/workers/gen.worker.ts
```

# What I’ll implement first (Phase 1 checklist)

* Seed parsing & deep-link.
* IR region + M1-S Hamiltonianizer (with fallback DFS).
* Minimal SVG renderer + drag paint + undo/redo.
* Validator + metrics + timeout.
* Three difficulty presets wired to parameters.
