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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [seconds, setSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef(null);

  const [title, setTitle] = useState('');
  const [xCategories, setXCategories] = useState(['Actor: Tom Hanks', 'Director: Christopher Nolan', 'Actor: Leonardo DiCaprio']);
  const [yCategories, setYCategories] = useState(['Released 2010s', 'Released 1990s', 'Released 2000s']);

  useEffect(() => {
    setLoading(true);
    fetch('/api/puzzles')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load puzzles');
        return res.json();
      })
      .then(data => {
        setPuzzles(data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading puzzles:', err);
        setError('Failed to load puzzles. Please refresh.');
        setLoading(false);
      });
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
    if (!title.trim() || xCategories.some(x => !x.trim()) || yCategories.some(y => !y.trim())) {
      setError('Please fill in all fields');
      return;
    }
    const newPuzzle = { title, medium, xAxis: xCategories, yAxis: yCategories };
    fetch('/api/puzzles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPuzzle)
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to create puzzle');
        return res.json();
      })
      .then(data => {
        setError(null);
        setPuzzles([data, ...puzzles]);
        setTitle('');
        setXCategories(['', '', '']);
        setYCategories(['', '', '']);
        startPuzzle(data);
      })
      .catch(err => {
        console.error('Error creating puzzle:', err);
        setError('Failed to create puzzle');
      });
  };

  const handleSolveSubmit = () => {
    setTimerActive(false);
    fetch(`/api/puzzles/${activePuzzle.id}/solve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userAnswers, timeElapsed: seconds })
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to submit');
        return res.json();
      })
      .then(data => setResult(data))
      .catch(err => {
        console.error('Error submitting puzzle:', err);
        setError('Failed to submit puzzle');
      });
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
    <div className="min-h-screen bg-[#0e0f12] text-gray-100 font-sans">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <header className="flex justify-between items-center py-6 border-b border-gray-800 mb-8">
          <h1 className="text-3xl font-black tracking-wider text-[#f59e0b]">
            SHOWGRID <span className="text-sm text-[#ef4444] font-normal">UNLIMITED</span>
          </h1>
          <div className="flex gap-3">
            {view !== 'lobby' && (
              <button 
                onClick={() => { setTimerActive(false); setView('lobby'); setError(null); }} 
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 font-medium transition"
              >
                ← Lobby
              </button>
            )}
            {view !== 'create' && (
              <button 
                onClick={() => { setTimerActive(false); setView('create'); setError(null); }} 
                className="px-4 py-2 bg-[#ef4444] hover:bg-red-500 text-white rounded font-bold transition"
              >
                + Create Grid
              </button>
            )}
          </div>
        </header>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded text-red-200 flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-200 hover:text-red-100">✕</button>
          </div>
        )}

        {/* Loading state */}
        {loading && view === 'lobby' && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">Loading puzzles...</p>
          </div>
        )}

        {/* Lobby View */}
        {view === 'lobby' && !loading && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-white">Available Grids</h2>
            {puzzles.length === 0 ? (
              <div className="text-center py-12 bg-gray-900 rounded-lg border border-gray-800">
                <p className="text-gray-400 mb-4">No puzzles available yet</p>
                <button
                  onClick={() => setView('create')}
                  className="px-6 py-3 bg-[#f59e0b] hover:bg-amber-400 text-black font-bold rounded transition"
                >
                  Create the First Grid
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {puzzles.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => startPuzzle(p)}
                    className="p-6 bg-gray-900 border border-gray-800 rounded-lg cursor-pointer hover:border-[#f59e0b] hover:shadow-lg hover:shadow-amber-900/50 transition transform hover:-translate-y-1"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-white text-lg">{p.title}</h3>
                      <span className="text-xs uppercase bg-gray-800 px-3 py-1 rounded text-amber-400 font-semibold">
                        {p.medium.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">Grid: {p.xAxis.length}×{p.yAxis.length}</p>
                    <p className="text-xs text-gray-500 mt-2">By {p.createdBy}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create View */}
        {view === 'create' && (
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold mb-6 text-white">Create Custom Grid</h2>
            <form onSubmit={handleCreate} className="space-y-6 bg-gray-900 p-8 rounded-lg border border-gray-800">
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">Medium</label>
                <div className="grid grid-cols-3 gap-3">
                  {['movies', 'tv', 'musical_theater'].map(m => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setMedium(m)}
                      className={`py-3 rounded font-bold border transition capitalize ${
                        medium === m 
                          ? 'bg-[#f59e0b] text-black border-[#f59e0b]' 
                          : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      {m.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">Grid Title</label>
                <input 
                  required 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder="e.g., 2010s Sci-Fi Directors" 
                  className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-3 text-white placeholder-gray-500 focus:border-amber-400 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-300 mb-3">X-Axis Categories (Columns)</label>
                <div className="space-y-2">
                  {xCategories.map((col, idx) => (
                    <input
                      key={idx}
                      value={col}
                      onChange={e => { const val = [...xCategories]; val[idx] = e.target.value; setXCategories(val); }}
                      placeholder={`Column ${idx + 1}`}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white placeholder-gray-500 focus:border-amber-400 focus:outline-none transition"
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-300 mb-3">Y-Axis Categories (Rows)</label>
                <div className="space-y-2">
                  {yCategories.map((row, idx) => (
                    <input
                      key={idx}
                      value={row}
                      onChange={e => { const val = [...yCategories]; val[idx] = e.target.value; setYCategories(val); }}
                      placeholder={`Row ${idx + 1}`}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white placeholder-gray-500 focus:border-amber-400 focus:outline-none transition"
                    />
                  ))}
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full bg-[#ef4444] hover:bg-red-500 text-white py-4 rounded font-bold text-lg transition"
              >
                Launch Grid 🚀
              </button>
            </form>
          </div>
        )}

        {/* Solve View */}
        {view === 'solve' && activePuzzle && (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="flex justify-between items-center bg-gray-900 p-6 rounded-lg border border-gray-800">
              <div>
                <h2 className="text-2xl font-bold text-white">{activePuzzle.title}</h2>
                <span className="text-sm text-gray-400 uppercase tracking-wide mt-1 inline-block">
                  {activePuzzle.medium.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-gray-800 px-6 py-3 rounded text-amber-400 font-mono text-2xl font-bold border border-amber-500/20">
                ⏱️ {formatTime(seconds)}
              </div>
            </div>

            {/* Grid */}
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 overflow-auto">
              <div 
                className="inline-grid gap-2 p-4 bg-gray-800 rounded"
                style={{
                  gridTemplateColumns: `auto repeat(${activePuzzle.xAxis.length}, 1fr)`,
                  gridAutoRows: 'auto'
                }}
              >
                {/* Top-left corner (empty) */}
                <div className="w-32 h-12"></div>

                {/* Column headers */}
                {activePuzzle.xAxis.map((col, i) => (
                  <div 
                    key={`col-${i}`} 
                    className="w-32 h-12 bg-amber-900/50 border border-amber-700 text-amber-400 p-2 font-bold flex items-center justify-center rounded text-center text-sm leading-tight"
                  >
                    {col}
                  </div>
                ))}

                {/* Rows */}
                {activePuzzle.yAxis.map((row, yIdx) => (
                  <React.Fragment key={`row-${yIdx}`}>
                    {/* Row header */}
                    <div 
                      className="w-32 h-20 bg-amber-900/50 border border-amber-700 text-amber-400 p-2 font-bold flex items-center justify-center rounded text-center text-sm leading-tight"
                    >
                      {row}
                    </div>

                    {/* Cells */}
                    {activePuzzle.xAxis.map((_, xIdx) => {
                      const cellKey = `${xIdx}-${yIdx}`;
                      const res = result?.cellResults?.[cellKey];
                      return (
                        <div 
                          key={cellKey} 
                          className="w-32 h-20 bg-gray-700 border border-gray-600 rounded overflow-hidden flex items-center justify-center"
                        >
                          {result ? (
                            res?.correct ? (
                              <div className="w-full h-full flex items-center justify-center">
                                {res.posterUrl ? (
                                  <img src={res.posterUrl} alt={res.submitted} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-green-900/80 flex flex-col items-center justify-center p-2 text-center">
                                    <span className="text-lg text-green-400 font-bold">✓</span>
                                    <span className="text-xs text-green-300 truncate">{res.submitted}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="w-full h-full bg-red-900/80 border border-red-700 flex flex-col items-center justify-center p-2 text-center">
                                <span className="text-lg text-red-400 font-bold">✕</span>
                                <span className="text-xs text-red-300 truncate">{res?.submitted || 'Empty'}</span>
                              </div>
                            )
                          ) : (
                            <MovieSearchInput 
                              value={userAnswers[cellKey] || ''} 
                              medium={activePuzzle.medium} 
                              disabled={false}
                              onChange={(val) => setUserAnswers({ ...userAnswers, [cellKey]: val })}
                            />
                          )}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Submit or Results */}
            {!result ? (
              <button 
                onClick={handleSolveSubmit} 
                className="w-full bg-[#f59e0b] hover:bg-amber-400 text-black font-bold py-4 rounded text-lg transition"
              >
                Submit Grid ({formatTime(seconds)})
              </button>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center space-y-6">
                <h3 className="text-5xl font-black text-amber-400">{result.totalScore} PTS</h3>
                
                <div className="grid grid-cols-3 gap-4 py-6 border-y border-gray-800">
                  <div className="p-4 bg-gray-800 rounded">
                    <p className="text-gray-500 text-xs uppercase font-bold mb-1">Base Score</p>
                    <p className="text-white font-bold text-2xl">{result.baseScore}</p>
                  </div>
                  <div className="p-4 bg-gray-800 rounded">
                    <p className="text-gray-500 text-xs uppercase font-bold mb-1">Speed Bonus</p>
                    <p className="text-green-400 font-bold text-2xl">+{result.speedBonus}</p>
                  </div>
                  <div className="p-4 bg-gray-800 rounded">
                    <p className="text-gray-500 text-xs uppercase font-bold mb-1">Time</p>
                    <p className="text-amber-400 font-bold text-2xl">{result.timeElapsed}s</p>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-gray-400 text-sm mb-2">Correct: {result.correctCount} of {result.totalPossible}</p>
                  <p className="text-amber-400 font-bold text-lg">{result.percentage}% Solved</p>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={copyShareText}
                    className="w-full bg-[#f59e0b] hover:bg-amber-400 text-black font-bold py-3 rounded text-lg transition"
                  >
                    {copied ? '✓ Copied!' : '📋 Copy Emoji Share Grid'}
                  </button>

                  <button 
                    onClick={() => startPuzzle(activePuzzle)}
                    className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded text-lg transition"
                  >
                    Replay Grid 🔄
                  </button>

                  <button
                    onClick={() => { setView('lobby'); setTimerActive(false); }}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded text-lg transition"
                  >
                    Return to Lobby
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
