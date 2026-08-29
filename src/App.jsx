import React, { useState, useEffect, useRef } from 'react';
import MovieSearchInput from './MovieSearchInput';

export default function App() {
  const [view, setView] = useState('lobby');
  const [medium, setMedium] = useState('movies');
  const [puzzles, setPuzzles] = useState([]);
  const [activePuzzle, setActivePuzzle] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const [seconds, setSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef(null);

  const [title, setTitle] = useState('');
  const [xCategories, setXCategories] = useState(['Actor: Tom Hanks', 'Director: Christopher Nolan', 'Actor: Leonardo DiCaprio']);
  const [yCategories, setYCategories] = useState(['Released 2010s', 'Released 1990s', 'Released 2000s']);

  useEffect(() => {
    fetch('/api/puzzles')
      .then(res => res.json())
      .then(data => setPuzzles(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerActive]);

  const startPuzzle = (puzzle) => {
    setActivePuzzle(puzzle);
    setUserAnswers({});
    setResult(null);
    setSeconds(0);
    setTimerActive(true);
    setView('solve');
  };

  const handleCreate = (e) => {
    e.preventDefault();
    const newPuzzle = { title, medium, xAxis: xCategories, yAxis: yCategories };
    fetch('/api/puzzles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPuzzle)
    })
      .then(res => res.json())
      .then(data => {
        setPuzzles([data, ...puzzles]);
        startPuzzle(data);
      });
  };

  const handleSolveSubmit = () => {
    setTimerActive(false);
    fetch(`/api/puzzles/${activePuzzle.id}/solve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userAnswers, timeElapsed: seconds })
    })
      .then(res => res.json())
      .then(data => setResult(data));
  };

  const copyShareText = () => {
    if (!result || !activePuzzle) return;
    let gridText = '';
    for (let y = 0; y < activePuzzle.yAxis.length; y++) {
      for (let x = 0; x < activePuzzle.xAxis.length; x++) {
        const key = `${x}-${y}`;
        gridText += result.cellResults[key]?.correct ? '🟩' : '🟥';
      }
      gridText += '\n';
    }
    const shareMessage = `ShowGrid Unlimited 🎭\n"${activePuzzle.title}"\nScore: ${result.totalScore} PTS (${result.correctCount}/${result.totalPossible})\nTime: ${seconds}s\n\n${gridText}\nPlay grid: ${window.location.origin}`;
    
    navigator.clipboard.writeText(shareMessage).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const formatTime = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#0e0f12] text-gray-100 font-sans p-4 max-w-md mx-auto">
      <header className="flex justify-between items-center py-4 border-b border-gray-800 mb-6">
        <h1 className="text-xl font-black tracking-wider text-[#f59e0b]">
          SHOWGRID <span className="text-xs text-[#ef4444] font-normal">UNLIMITED</span>
        </h1>
        <div className="flex gap-2">
          <button onClick={() => { setTimerActive(false); setView('lobby'); }} className="text-xs px-3 py-1 bg-gray-800 rounded text-gray-300">Lobby</button>
          <button onClick={() => { setTimerActive(false); setView('create'); }} className="text-xs px-3 py-1 bg-[#ef4444] text-white rounded font-medium">+ Custom</button>
        </div>
      </header>

      {view === 'lobby' && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Available Grids</h2>
          <div className="space-y-3">
            {puzzles.map(p => (
              <div 
                key={p.id} 
                onClick={() => startPuzzle(p)}
                className="p-4 bg-gray-900 border border-gray-800 rounded-lg cursor-pointer hover:border-[#f59e0b] transition"
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-white">{p.title}</h3>
                  <span className="text-[10px] uppercase bg-gray-800 px-2 py-0.5 rounded text-amber-400 font-semibold">{p.medium.replace('_', ' ')}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Grid: {p.xAxis.length}x{p.yAxis.length} • By {p.createdBy}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'create' && (
        <form onSubmit={handleCreate} className="space-y-4">
          <h2 className="text-lg font-bold">Build Grid</h2>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Medium</label>
            <div className="grid grid-cols-3 gap-2">
              {['movies', 'tv', 'musical_theater'].map(m => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setMedium(m)}
                  className={`text-xs py-2 rounded capitalize font-bold border ${medium === m ? 'bg-[#f59e0b] text-black border-[#f59e0b]' : 'bg-gray-900 text-gray-400 border-gray-800'}`}
                >
                  {m.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Title</label>
            <input 
              required 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="e.g. 2010s Sci-Fi & Actors" 
              className="w-full bg-gray-900 border border-gray-800 rounded p-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">X-Axis (Columns)</label>
            {xCategories.map((col, idx) => (
              <input
                key={idx}
                value={col}
                onChange={e => { const val = [...xCategories]; val[idx] = e.target.value; setXCategories(val); }}
                className="w-full bg-gray-900 border border-gray-800 rounded p-2 text-sm text-white mb-2"
              />
            ))}
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Y-Axis (Rows)</label>
            {yCategories.map((row, idx) => (
              <input
                key={idx}
                value={row}
                onChange={e => { const val = [...yCategories]; val[idx] = e.target.value; setYCategories(val); }}
                className="w-full bg-gray-900 border border-gray-800 rounded p-2 text-sm text-white mb-2"
              />
            ))}
          </div>
          <button type="submit" className="w-full bg-[#ef4444] text-white py-3 rounded font-bold text-sm">
            Launch Grid
          </button>
        </form>
      )}

      {view === 'solve' && activePuzzle && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-gray-900 p-3 rounded-lg border border-gray-800">
            <div>
              <h2 className="text-sm font-bold text-white">{activePuzzle.title}</h2>
              <span className="text-[10px] text-gray-400 uppercase tracking-wide">{activePuzzle.medium.replace('_', ' ')}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-gray-800 px-3 py-1 rounded text-amber-400 font-mono text-sm font-bold border border-amber-500/20">
              ⏱️ {formatTime(seconds)}
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="grid gap-1 min-w-[340px] text-center text-xs" style={{gridTemplateColumns: `repeat(${activePuzzle.xAxis.length + 1}, minmax(80px, 1fr))`}}>
              <div className="bg-transparent"></div>
              {activePuzzle.xAxis.map((col, i) => (
                <div key={i} className="bg-gray-800 text-amber-400 p-2 font-bold flex items-center justify-center rounded-t text-[11px] leading-tight">
                  {col}
                </div>
              ))}

              {activePuzzle.yAxis.map((row, yIdx) => (
                <React.Fragment key={yIdx}>
                  <div className="bg-gray-800 text-amber-400 p-2 font-bold flex items-center justify-center rounded-l text-[11px] leading-tight">
                    {row}
                  </div>
                  {activePuzzle.xAxis.map((_, xIdx) => {
                    const cellKey = `${xIdx}-${yIdx}`;
                    const res = result?.cellResults?.[cellKey];
                    return (
                      <div key={cellKey} className="bg-gray-900 border border-gray-800 p-1 flex items-center justify-center rounded min-h-[85px] relative overflow-hidden">
                        {result ? (
                          res?.correct ? (
                            <div className="relative w-full h-full rounded overflow-hidden group">
                              {res.posterUrl ? (
                                <img src={res.posterUrl} alt={res.submitted} className="w-full h-full object-cover rounded" />
                              ) : (
                                <div className="w-full h-full bg-green-950 flex flex-col items-center justify-center p-1">
                                  <span className="text-xs text-green-400 font-bold">✓</span>
                                  <span className="text-[9px] text-green-300 truncate w-full">{res.submitted}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="w-full h-full bg-red-950/80 border border-red-700/60 text-red-400 p-1 flex flex-col items-center justify-center rounded">
                              <span className="text-xs font-bold">✕</span>
                              <span className="text-[9px] truncate max-w-[65px] text-red-300">{res?.submitted || 'Empty'}</span>
                            </div>
                          )
                        ) : (
                          <MovieSearchInput value={userAnswers[cellKey] || ''} medium={activePuzzle.medium} onChange={(val) => setUserAnswers({ ...userAnswers, [cellKey]: val })}
                          />
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>

          {!result ? (
            <button 
              onClick={handleSolveSubmit} 
              className="w-full bg-[#f59e0b] text-black font-bold py-3 rounded text-sm mt-4 hover:bg-amber-400 transition"
            >
              Submit Grid ({formatTime(seconds)})
            </button>
          ) : (
            <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg text-center space-y-3 mt-4">
              <h3 className="text-2xl font-black text-amber-400">{result.totalScore} PTS</h3>
              <div className="grid grid-cols-3 gap-2 py-2 border-y border-gray-800 text-xs">
                <div>
                  <p className="text-gray-500 text-[10px] uppercase font-bold">Base Score</p>
                  <p className="text-white font-bold">{result.baseScore}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px] uppercase font-bold">Speed Bonus</p>
                  <p className="text-green-400 font-bold">+{result.speedBonus}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px] uppercase font-bold">Time</p>
                  <p className="text-amber-400 font-bold">{result.timeElapsed}s</p>
                </div>
              </div>

              <button 
                onClick={copyShareText}
                className="w-full bg-[#f59e0b] text-black font-bold py-2.5 rounded text-sm flex items-center justify-center gap-2"
              >
                {copied ? '✓ Copied to Clipboard!' : '📋 Copy Emoji Share Grid'}
              </button>

              <button 
                onClick={() => startPuzzle(activePuzzle)}
                className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded w-full font-medium"
              >
                Replay Grid 🔄
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
