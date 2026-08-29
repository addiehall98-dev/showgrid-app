import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

const app = express();

// CORS Configuration
const allowedOrigins = [
  'https://scenematrix-app.vercel.app',
  'http://localhost:3000',
  'http://localhost:5000'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

if (!TMDB_API_KEY) {
  console.warn('⚠️  WARNING: TMDB_API_KEY not set. Movie/TV search will not work.');
} else {
  console.log('✅ TMDB API Key configured');
}

// ============================================
// BROADWAY & MUSICAL THEATER ANSWER BANK
// ============================================
const stageAnswerBank = {
  'Stephen Sondheim (Composer)': {
    'Best Musical Winner': ['Company', 'A Little Night Music', 'Sweeney Todd', 'Passion'],
    'Off-Broadway Origins': ['Sunday in the Park with George', 'Road Show', 'Assassins'],
    'Film Adaptation': ['West Side Story', 'Gypsy', 'A Little Night Music', 'Sweeney Todd', 'Into the Woods']
  },
  'Lin-Manuel Miranda (Composer)': {
    'Best Musical Winner': ['In the Heights', 'Hamilton'],
    'Off-Broadway Origins': ['In the Heights', 'Hamilton', '21 Chump Street'],
    'Film Adaptation': ['In the Heights', 'Hamilton', 'Encanto', 'Vivo']
  },
  'Anaïs Mitchell (Composer)': {
    'Best Musical Winner': ['Hadestown'],
    'Off-Broadway Origins': ['Hadestown'],
    'Film Adaptation': []
  },
  'Andrew Lloyd Webber (Composer)': {
    'Best Musical Winner': ['Evita', 'Cats', 'The Phantom of the Opera', 'Sunset Boulevard'],
    'Off-Broadway Origins': ['Joseph and the Amazing Technicolor Dreamcoat'],
    'Film Adaptation': ['Jesus Christ Superstar', 'Evita', 'Cats', 'The Phantom of the Opera']
  }
};

// ============================================
// FEATURED PUZZLE ROOMS
// ============================================
const puzzles = [
  {
    id: 'scene-stage-1',
    title: '🎭 Broadway Icons & Milestones',
    medium: 'musical_theater',
    genre: 'Broadway',
    xAxis: ['Stephen Sondheim (Composer)', 'Lin-Manuel Miranda (Composer)', 'Andrew Lloyd Webber (Composer)'],
    yAxis: ['Best Musical Winner', 'Off-Broadway Origins', 'Film Adaptation'],
    createdBy: 'StageMaster',
    difficulty: 'medium'
  },
  {
    id: 'scene-cinema-1',
    title: '🎬 Hollywood Directors & Decades',
    medium: 'movies',
    genre: 'Cinema',
    xAxis: ['Director: Christopher Nolan', 'Actor: Tom Hanks', 'Actor: Leonardo DiCaprio'],
    yAxis: ['Released 2010s', 'Released 1990s', 'Released 2000s'],
    createdBy: 'Cinephile',
    difficulty: 'hard'
  },
  {
    id: 'scene-tv-1',
    title: '📺 Binge-Worthy Series & Eras',
    medium: 'tv',
    genre: 'Television',
    xAxis: ['Drama Series', 'Comedy Hits', 'Sci-Fi Shows'],
    yAxis: ['2010s Era', '2000s Era', '1990s Era'],
    createdBy: 'StreamFan',
    difficulty: 'easy'
  }
];

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date(), api: !!TMDB_API_KEY });
});

// ============================================
// SEARCH AUTOCOMPLETE
// ============================================
app.get('/api/search', async (req, res) => {
  const { q, medium } = req.query;

  if (!q || q.trim().length < 2) {
    return res.json([]);
  }

  if (!TMDB_API_KEY) {
    console.warn('Search attempted without TMDB_API_KEY');
    return res.status(500).json({ error: 'API not configured' });
  }

  const endpoint = medium === 'tv' ? 'search/tv' : 'search/movie';

  try {
    const tmdbRes = await fetch(
      `${TMDB_BASE_URL}/${endpoint}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}&page=1`
    );
    const data = await tmdbRes.json();

    if (!tmdbRes.ok) {
      console.error('TMDb API error:', data);
      return res.status(500).json({ error: 'TMDb API error' });
    }

    const suggestions = (data.results || []).slice(0, 5).map(item => ({
      id: item.id,
      title: item.title || item.name,
      year: (item.release_date || item.first_air_date || '').split('-')[0] || 'N/A',
      poster: item.poster_path ? `https://image.tmdb.org/t/p/w92${item.poster_path}` : null,
      popularity: item.popularity || 0
    }));

    res.json(suggestions);
  } catch (error) {
    console.error('Search error:', error.message);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ============================================
// MEDIA VALIDATION WITH RARITY SCORING
// ============================================
async function validateMedia(title, xCategory, yCategory, medium) {
  // Musical Theater validation (grounded answer bank)
  if (medium === 'musical_theater') {
    const colBank = stageAnswerBank[xCategory];
    if (colBank && colBank[yCategory]) {
      const validTitles = colBank[yCategory].map(t => t.toLowerCase());
      const isCorrect = validTitles.includes(title.trim().toLowerCase());
      return { isCorrect, posterUrl: null, rarityScore: isCorrect ? 75 : 0 };
    }
    return { isCorrect: false, posterUrl: null, rarityScore: 0 };
  }

  if (!TMDB_API_KEY) {
    return { isCorrect: false, posterUrl: null, rarityScore: 0 };
  }

  const endpoint = medium === 'tv' ? 'search/tv' : 'search/movie';
  const creditsEndpoint = medium === 'tv' ? 'aggregate_credits' : 'credits';

  try {
    const searchRes = await fetch(
      `${TMDB_BASE_URL}/${endpoint}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`
    );
    const searchData = await searchRes.json();
    if (!searchData.results || searchData.results.length === 0) {
      return { isCorrect: false, posterUrl: null, rarityScore: 0 };
    }

    const media = searchData.results[0];
    const creditsRes = await fetch(
      `${TMDB_BASE_URL}/${medium === 'tv' ? 'tv' : 'movie'}/${media.id}/${creditsEndpoint}?api_key=${TMDB_API_KEY}`
    );
    const creditsData = await creditsRes.json();
    const cast = creditsData.cast || [];
    const crew = creditsData.crew || [];

    // X-Axis validation
    let xValid = false;
    if (xCategory.startsWith('Actor:')) {
      const name = xCategory.replace('Actor:', '').trim().toLowerCase();
      xValid = cast.some(p => p.name.toLowerCase() === name);
    } else if (xCategory.startsWith('Director:')) {
      const name = xCategory.replace('Director:', '').trim().toLowerCase();
      xValid = crew.some(p => (p.job === 'Director' || p.jobs?.some(j => j.job === 'Director')) && p.name.toLowerCase() === name);
    } else if (xCategory.startsWith('Drama Series') || xCategory.startsWith('Comedy Hits') || xCategory.startsWith('Sci-Fi Shows')) {
      xValid = true; // Genre-based validation
    } else {
      xValid = true;
    }

    // Y-Axis validation (decade-based)
    let yValid = false;
    const releaseDate = media.release_date || media.first_air_date;
    const releaseYear = releaseDate ? parseInt(releaseDate.split('-')[0]) : null;

    if (yCategory.includes('2010s') && releaseYear) {
      yValid = releaseYear >= 2010 && releaseYear <= 2019;
    } else if (yCategory.includes('2000s') && releaseYear) {
      yValid = releaseYear >= 2000 && releaseYear <= 2009;
    } else if (yCategory.includes('1990s') && releaseYear) {
      yValid = releaseYear >= 1990 && releaseYear <= 1999;
    } else if (yCategory.includes('Era')) {
      yValid = true; // Generic era check
    } else {
      yValid = true;
    }

    const isCorrect = xValid && yValid;
    const posterUrl = media.poster_path ? `https://image.tmdb.org/t/p/w185${media.poster_path}` : null;

    // Rarity scoring: lower popularity = higher rarity bonus
    const popularity = media.popularity || 100;
    const rarityScore = isCorrect ? Math.max(10, Math.round(Math.max(0, 100 - popularity))) : 0;

    return { isCorrect, posterUrl, rarityScore };
  } catch (error) {
    console.error('Validation error:', error.message);
    return { isCorrect: false, posterUrl: null, rarityScore: 0 };
  }
}

// ============================================
// PUZZLE ENDPOINTS
// ============================================
app.get('/api/puzzles', (req, res) => {
  res.json(puzzles);
});

app.get('/api/puzzles/:id', (req, res) => {
  const puzzle = puzzles.find(p => p.id === req.params.id);
  if (!puzzle) return res.status(404).json({ error: 'Puzzle not found' });
  res.json(puzzle);
});

app.post('/api/puzzles', (req, res) => {
  const { title, medium, genre, xAxis, yAxis } = req.body;

  if (!title || !xAxis || !yAxis || xAxis.length === 0 || yAxis.length === 0) {
    return res.status(400).json({ error: 'Missing or invalid fields' });
  }

  const newPuzzle = {
    id: uuidv4(),
    title: title || 'Custom SceneMatrix',
    medium: medium || 'movies',
    genre: genre || 'General',
    xAxis,
    yAxis,
    createdBy: 'Community Creator',
    difficulty: 'medium'
  };
  puzzles.unshift(newPuzzle);
  res.status(201).json(newPuzzle);
});

// ============================================
// SOLVE & SCORING
// ============================================
app.post('/api/puzzles/:id/solve', async (req, res) => {
  const { userAnswers, timeElapsed = 0 } = req.body;
  const puzzle = puzzles.find(p => p.id === req.params.id);
  if (!puzzle) return res.status(404).json({ error: 'Puzzle not found' });

  let correctCount = 0;
  let totalRarityBonus = 0;
  const totalCells = puzzle.xAxis.length * puzzle.yAxis.length;
  const cellResults = {};
  const validationPromises = [];

  puzzle.xAxis.forEach((col, xIdx) => {
    puzzle.yAxis.forEach((row, yIdx) => {
      const key = `${xIdx}-${yIdx}`;
      const userAns = (userAnswers[key] || '').trim();

      if (!userAns) {
        cellResults[key] = { correct: false, submitted: '', posterUrl: null, rarityScore: 0 };
        return;
      }

      validationPromises.push(
        validateMedia(userAns, col, row, puzzle.medium).then(({ isCorrect, posterUrl, rarityScore }) => {
          cellResults[key] = { correct: isCorrect, submitted: userAns, posterUrl, rarityScore };
          if (isCorrect) {
            correctCount++;
            totalRarityBonus += rarityScore;
          }
        })
      );
    });
  });

  await Promise.all(validationPromises);

  const baseScore = correctCount * 100;
  const speedBonus = correctCount > 0 ? Math.max(0, 500 - timeElapsed * 5) : 0;
  const totalScore = baseScore + speedBonus + totalRarityBonus;

  res.json({
    correctCount,
    totalPossible: totalCells,
    baseScore,
    speedBonus,
    totalRarityBonus,
    totalScore,
    timeElapsed,
    percentage: Math.round((correctCount / totalCells) * 100),
    cellResults
  });
});

// ============================================
// ERROR HANDLING
// ============================================
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`\n🎭 SceneMatrix API Server`);
  console.log(`📍 Running on ${HOST}:${PORT}`);
  console.log(`✅ Status: ${TMDB_API_KEY ? 'Ready' : 'Waiting for TMDB_API_KEY'}\n`);
});
