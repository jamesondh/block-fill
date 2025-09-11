# Block Fill - Puzzle Game

A web-based puzzle game featuring infinite, seeded, deterministic puzzles. Built with Next.js, TypeScript, and Zustand.

## 🎮 Game Modes

1. **Classic Block Fill** - Draw a single path that covers all cells in an irregular grid
2. **Multi Block Fill** - Use multiple colored paths to cover all cells *(Coming Soon)*
3. **Flow Free** - Connect matching colored pairs on a square grid *(Coming Soon)*

## 🚀 Getting Started

### Installation

```bash
# Install dependencies
npm install
# or
bun install
```

### Development

```bash
# Run development server
npm run dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to play the game.

### Building

```bash
# Build for production
npm run build
# or
bun run build
```

## 📋 Implementation Progress

Based on the specification in `SPEC.md`, here's the current implementation status:

### ✅ Phase 0 - Foundation (COMPLETE)
- [x] Next.js app scaffolding with TypeScript
- [x] Global state management with Zustand
- [x] PRNG module (xorshift-based deterministic random)
- [x] Seed parser/serializer with base36 encoding
- [x] URL hash router for deep linking
- [x] SVG grid renderer with crisp mobile/desktop rendering
- [x] Input system with mouse/pointer drag support
- [x] Undo/redo functionality
- [x] Paint model and validator hooks
- [x] Web Worker setup with message protocol

### ✅ Phase 1 - Classic Block Fill (COMPLETE)
- [x] **IR Region Generator** (`/lib/irRegion.ts`)
  - Generates irregular connected regions using frontier-based growth
  - Ensures single connected component
  - Supports configurable fill ratio
- [x] **Hamiltonian Path Generator** (`/lib/hamiltonian.ts`)
  - Strip-and-stitch algorithm for fast path generation
  - DFS fallback for complex regions
  - Guarantees full coverage of open cells
- [x] **Level Generation in Worker** (`/workers/gen.worker.ts`)
  - Integrated IR region and Hamiltonian path algorithms
  - Calculates difficulty metrics (branching factor, forced moves, corridors, turn rate)
  - 200ms timeout handling
- [x] **Visual Polish**
  - Start cell markers with circular indicators
  - CSS transitions for smooth interactions
  - Path drawing animations
- [x] **LocalStorage Persistence** (`/lib/storage.ts`)
  - Saves current game state
  - Auto-loads on app mount
  - Preserves progress between sessions

### 🚧 Phase 2 - Multi Block Fill (NOT STARTED)
- [ ] M2-P segmentation algorithm
- [ ] Multiple color support in UI
- [ ] Color assignment and start selection
- [ ] Intertwine index metrics
- [ ] Multi-path win validation

### 🚧 Phase 3 - Flow Free Mode (NOT STARTED)
- [ ] Solid rectangle generator
- [ ] Pair endpoint generation
- [ ] Endpoint UI markers
- [ ] Path connection validation
- [ ] Anti-triviality rules

### 🔮 Phase 4 - Quality & Features (PARTIALLY COMPLETE)
- [x] Animations and transitions *(basic implementation)*
- [x] Path rounding with SVG
- [ ] Hints system using solver
- [ ] Daily seed functionality
- [ ] Advanced analytics
- [ ] Color-blind palette toggle

### 🌟 Phase 5 - Stretch Goals (NOT STARTED)
- [ ] Serverless uniqueness checks
- [ ] Additional variants (bridges, warps, hex)
- [ ] Challenge modes

## 🏗️ Architecture

### Tech Stack
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **State Management**: Zustand
- **Rendering**: SVG for crisp graphics
- **Workers**: Web Workers for CPU-intensive generation
- **Storage**: localStorage for persistence

### Project Structure
```
/src
  /app          # Next.js app router pages
  /components   # React components (BoardSVG, etc.)
  /hooks        # Custom React hooks
  /lib          # Core algorithms and utilities
  /store        # Zustand state management
  /types        # TypeScript type definitions
  /workers      # Web Worker scripts
```

### Key Algorithms
- **PRNG**: Deterministic random number generation using xorshift
- **IR Region**: Irregular region generation with connectivity guarantees
- **Hamiltonian Path**: Strip-and-stitch algorithm with DFS fallback
- **Paint Model**: Path validation and win condition checking

## 🎯 Features

### Currently Implemented
- **Deterministic Puzzle Generation**: Same seed always generates the same puzzle
- **Deep Linking**: Share puzzles via URL with embedded parameters
- **Difficulty Tiers**: Easy, Medium, and Hard presets with tuned parameters
- **Drag Controls**: Intuitive mouse/touch drag to draw paths
- **Undo/Redo**: Full history management
- **Auto-Save**: Progress persists between sessions
- **Visual Feedback**: Real-time validation and coverage indicators
- **Win Detection**: Automatic detection when puzzle is solved
- **Responsive Design**: Works on mobile and desktop

### Planned Features
- Multiple game modes (Multi Block Fill, Flow Free)
- Hint system
- Daily challenges
- Achievement system
- Advanced statistics
- More visual themes

## 🔧 Development Notes

### Testing the Game
1. Run the development server
2. Navigate to http://localhost:3000
3. Select Classic mode and difficulty
4. Draw a path from the start cell (marked with a circle) to cover all open cells
5. The game validates in real-time and shows win state when complete

### URL Parameters
The game supports deep linking with these parameters:
- `v`: Version (always 1)
- `m`: Mode (1=Classic, 2=Multi, 3=Flow)
- `w`: Width of the grid
- `h`: Height of the grid
- `hd`: Hole density (0-1)
- `diff`: Difficulty tier (easy/medium/hard)
- `seed`: Puzzle seed (base36 string)

Example: `/play#v=1;m=1;w=10;h=10;hd=0.15;diff=medium;seed=abc123`

## 🐛 Known Issues
- Redo functionality is implemented but not fully connected in the UI
- Touch controls need refinement for mobile devices
- Mode 2 and 3 are shown in the UI but generation is not implemented

## 📝 License
This project is part of a puzzle game implementation based on the Block Fill specification.

## 🤝 Contributing
Contributions are welcome! Please review `SPEC.md` for the full technical specification before making changes.