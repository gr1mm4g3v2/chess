# NEURO_CHESS_ZERO

A self-learning chess AI that plays against itself using Q-learning with position memory. Watch two neural networks compete and evolve in real-time.

![Chess AI Interface](https://img.shields.io/badge/Next.js-15-black?logo=next.js) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript) ![Socket.io](https://img.shields.io/badge/Socket.io-Realtime-green?logo=socket.io)

## Features

- 🧠 **Dual AI Networks** - White and Black AIs compete separately with their own ELO ratings
- 📚 **Q-Learning** - AIs learn from wins/losses, storing up to 10,000 positions per network
- 🎯 **Epsilon-Greedy Exploration** - Balance between trying new moves and exploiting known good ones
- 📊 **Live Metrics** - Real-time ELO tracking, win/loss/draw stats, and learning progress
- 📈 **Eval Bar** - Visual representation of who's winning
- ⏱️ **Speed Control** - Adjust training speed from slow (1500ms) to turbo (50ms)
- 📜 **Game History** - Browse and replay past games move-by-move
- 💾 **Persistent Learning** - AI progress saves between sessions

## Getting Started

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to watch the AI train.

## How It Works

### Q-Learning
Each AI maintains a Q-table mapping positions to move values. After each game:
- **Winner's moves** get positive reinforcement (+1.0)
- **Loser's moves** get negative reinforcement (-1.0)
- **Draws** give small positive rewards (+0.1)

### Exploration vs Exploitation
- **Exploration Rate** starts at 30% (try random moves)
- Decays to 5% as the AI gains experience
- Higher exploration = more variety, lower = more optimal play

### Persistence
Two files store AI progress:
- `ai-state.json` - ELO, stats, and Q-tables for both networks
- `game-history.json` - Up to 50 past games for replay

## Tech Stack

- **Frontend**: Next.js 15, React 19, TailwindCSS, Recharts
- **Backend**: Node.js, Socket.io, chess.js
- **AI**: Custom Q-learning implementation

## Project Structure

```
├── server.ts              # Custom server with Socket.io
├── src/
│   ├── app/               # Next.js app router
│   ├── components/        # React components
│   │   ├── CustomBoard.tsx    # SVG chess board
│   │   ├── EvalBar.tsx        # Evaluation bar
│   │   ├── MetricsPanel.tsx   # Dual AI stats display
│   │   ├── SpeedControl.tsx   # Training speed slider
│   │   └── GameHistory.tsx    # Past games viewer
│   └── lib/
│       ├── ai/
│       │   └── neural-net.ts   # Q-learning AI implementation
│       ├── game/
│       │   └── game-manager.ts # Game loop and state management
│       └── persistence.ts      # Save/load AI state
```

## License

MIT
