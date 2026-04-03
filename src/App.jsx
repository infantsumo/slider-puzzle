import { useState, useEffect, useCallback, useRef } from "react";

const SIZE = 4;
const TOTAL = SIZE * SIZE;
const GOAL = [...Array(TOTAL - 1).keys()].map(i => i + 1).concat(0);

function isSolvable(tiles) {
  const arr = tiles.filter(t => t !== 0);
  let inv = 0;
  for (let i = 0; i < arr.length; i++)
    for (let j = i + 1; j < arr.length; j++)
      if (arr[i] > arr[j]) inv++;
  const blankRow = Math.floor(tiles.indexOf(0) / SIZE);
  const fromBottom = SIZE - blankRow;
  return SIZE % 2 === 1 ? inv % 2 === 0 : (fromBottom % 2 === 1 ? inv % 2 === 0 : inv % 2 === 1);
}

function shuffle() {
  let arr;
  do {
    arr = [...GOAL].sort(() => Math.random() - 0.5);
  } while (!isSolvable(arr) || arr.every((v, i) => v === GOAL[i]));
  return arr;
}

function getNeighbors(idx) {
  const r = Math.floor(idx / SIZE), c = idx % SIZE, n = [];
  if (r > 0) n.push(idx - SIZE);
  if (r < SIZE - 1) n.push(idx + SIZE);
  if (c > 0) n.push(idx - 1);
  if (c < SIZE - 1) n.push(idx + 1);
  return n;
}

function isWon(tiles) {
  return tiles.every((v, i) => v === GOAL[i]);
}

export default function App() {
  const [tiles, setTiles] = useState(() => shuffle());
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(true);
  const [won, setWon] = useState(false);
  const [best, setBest] = useState(() => parseInt(localStorage.getItem("slider-best") || "0"));
  const [animating, setAnimating] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running && !won) {
      intervalRef.current = setInterval(() => setTime(t => t + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, won]);

  const move = useCallback((idx) => {
    if (won) return;
    setTiles(prev => {
      const blank = prev.indexOf(0);
      if (!getNeighbors(blank).includes(idx)) return prev;
      setAnimating(idx);
      setTimeout(() => setAnimating(null), 150);
      const next = [...prev];
      [next[blank], next[idx]] = [next[idx], next[blank]];
      setMoves(m => m + 1);
      if (isWon(next)) {
        setWon(true);
        setRunning(false);
        setBest(b => {
          const newBest = b === 0 || moves + 1 < b ? moves + 1 : b;
          localStorage.setItem("slider-best", newBest);
          return newBest;
        });
      }
      return next;
    });
  }, [won, moves]);

  useEffect(() => {
    const handler = (e) => {
      const blank = tiles.indexOf(0);
      const map = { ArrowUp: blank + SIZE, ArrowDown: blank - SIZE, ArrowLeft: blank + 1, ArrowRight: blank - 1 };
      const target = map[e.key];
      if (target !== undefined && target >= 0 && target < TOTAL) {
        // check same row for left/right
        if ((e.key === "ArrowLeft" || e.key === "ArrowRight") &&
          Math.floor(target / SIZE) !== Math.floor(blank / SIZE)) return;
        move(target);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [tiles, move]);

  const reset = () => {
    setTiles(shuffle());
    setMoves(0);
    setTime(0);
    setWon(false);
    setRunning(true);
  };

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const blank = tiles.indexOf(0);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0e0e0e",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Courier New', monospace",
      padding: 20,
      userSelect: "none",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Share+Tech+Mono&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0e0e0e; }
        .tile {
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border-radius: 4px;
          transition: transform 0.13s cubic-bezier(.4,0,.2,1), box-shadow 0.13s;
          will-change: transform;
        }
        .tile:active { transform: scale(0.94) !important; }
        .tile.movable:hover { filter: brightness(1.15); }
        .tile.pop { animation: pop 0.15s ease; }
        @keyframes pop {
          0% { transform: scale(1); }
          50% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        @keyframes winPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(251,191,36,0); }
          50% { box-shadow: 0 0 40px 10px rgba(251,191,36,0.3); }
        }
        .win-board { animation: winPulse 1.5s ease-in-out infinite; }
        @keyframes fadeIn {
          from { opacity:0; transform: translateY(12px); }
          to { opacity:1; transform: translateY(0); }
        }
        .win-banner { animation: fadeIn 0.4s ease forwards; }
      `}</style>

      {/* Title */}
      <div style={{ marginBottom: 28, textAlign: "center" }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 48, color: "#fbbf24", letterSpacing: "0.12em", lineHeight: 1 }}>
          SLIDE
        </div>
        <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#3d3d3d", letterSpacing: "0.3em", marginTop: 2 }}>
          4 × 4 PUZZLE
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 32, marginBottom: 24 }}>
        {[
          { label: "MOVES", value: moves },
          { label: "TIME", value: fmt(time) },
          { label: "BEST", value: best || "—" },
        ].map(({ label, value }) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#444", letterSpacing: "0.2em", marginBottom: 4 }}>{label}</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: "#e5e5e5", letterSpacing: "0.08em" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Board */}
      {(() => {
        const TILE_SIZE = Math.min(80, (Math.min(typeof window !== "undefined" ? window.innerWidth : 400, 380) - 32) / SIZE);
        const GAP = 6;
        const BOARD = SIZE * TILE_SIZE + (SIZE - 1) * GAP;

        return (
          <div
            className={won ? "win-board" : ""}
            style={{
              position: "relative",
              width: BOARD,
              height: BOARD,
              background: "#181818",
              borderRadius: 12,
              border: "1px solid #222",
              padding: 0,
            }}
          >
            {/* Grid guides */}
            {Array(TOTAL).fill(0).map((_, i) => {
              const row = Math.floor(i / SIZE), col = i % SIZE;
              return (
                <div key={"slot" + i} style={{
                  position: "absolute",
                  left: col * (TILE_SIZE + GAP),
                  top: row * (TILE_SIZE + GAP),
                  width: TILE_SIZE,
                  height: TILE_SIZE,
                  background: "#111",
                  borderRadius: 4,
                  border: "1px solid #1a1a1a",
                }} />
              );
            })}

            {/* Tiles */}
            {tiles.map((val, idx) => {
              if (val === 0) return null;
              const row = Math.floor(idx / SIZE), col = idx % SIZE;
              const blankRow = Math.floor(blank / SIZE), blankCol = blank % SIZE;
              const isMovable = getNeighbors(blank).includes(idx);
              const isCorrect = val === idx + 1;
              const isAnimating = animating === idx;

              return (
                <div
                  key={val}
                  className={`tile${isMovable ? " movable" : ""}${isAnimating ? " pop" : ""}`}
                  onClick={() => move(idx)}
                  style={{
                    left: col * (TILE_SIZE + GAP),
                    top: row * (TILE_SIZE + GAP),
                    width: TILE_SIZE,
                    height: TILE_SIZE,
                    background: won
                      ? "linear-gradient(135deg, #92400e, #fbbf24)"
                      : isCorrect
                      ? "linear-gradient(135deg, #1a2e1a, #14532d)"
                      : isMovable
                      ? "linear-gradient(135deg, #1c1c2e, #2d2d4e)"
                      : "linear-gradient(135deg, #1a1a1a, #242424)",
                    border: won
                      ? "1px solid #fbbf24"
                      : isCorrect
                      ? "1px solid #16a34a"
                      : isMovable
                      ? "1px solid #4f46e5"
                      : "1px solid #2a2a2a",
                    boxShadow: won
                      ? "0 4px 20px rgba(251,191,36,0.3)"
                      : isMovable
                      ? "0 4px 16px rgba(79,70,229,0.25)"
                      : "0 2px 8px rgba(0,0,0,0.4)",
                  }}
                >
                  <span style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: TILE_SIZE * 0.42,
                    color: won ? "#fef3c7" : isCorrect ? "#4ade80" : isMovable ? "#a5b4fc" : "#555",
                    letterSpacing: "0.05em",
                    lineHeight: 1,
                  }}>
                    {val}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Win banner */}
      {won && (
        <div className="win-banner" style={{
          marginTop: 28,
          textAlign: "center",
          padding: "20px 32px",
          background: "#111",
          border: "1px solid #fbbf24",
          borderRadius: 12,
        }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, color: "#fbbf24", letterSpacing: "0.1em" }}>
            SOLVED
          </div>
          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "#666", marginTop: 4 }}>
            {moves} moves · {fmt(time)}
          </div>
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <button onClick={reset} style={{
          padding: "10px 28px",
          background: "transparent",
          border: "1px solid #333",
          borderRadius: 6,
          color: "#888",
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: 12,
          letterSpacing: "0.15em",
          cursor: "pointer",
        }}>
          NEW GAME
        </button>
      </div>

      <div style={{ marginTop: 20, fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#2a2a2a", letterSpacing: "0.15em" }}>
        TAP TILE OR USE ARROW KEYS
      </div>
    </div>
  );
}