const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Grounded Stage Answer Bank (Broadway & Musical Theater)
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

const puzzles = [
  {
    id: 'stage-grid-1',
    title: 'Broadway Composers & Milestones',
    medium: 'musical_theater',
    genre: 'Musical Theater',
    xAxis: ['Stephen Sondheim (Composer)', 'Lin-Manuel Miranda (Composer)', 'Andrew Lloyd Webber (Composer)'],
    yAxis: ['Best Musical Winner', 'Off-Broadway Origins', 'Film Adaptation'],
    gridSize: 3,
    createdBy: 'PlaybillFan'
  },
  {
    id: 'cinema-grid-1',
    title: 'Hollywood Directors & Decades',
    medium: 'movies',
    genre: 'Cinema',
    xAxis: ['Director: Christopher Nolan', 'Actor: Tom Hanks', 'Actor: Leonardo DiCaprio'],
    yAxis: ['Released 2010s', 'Released 1990s', 'Released 2000s'],
    gridSize: 3,
    createdBy: 'MovieBuff'
  }
];

app.get('/api/search', async (req, res) => {
  const { q, medium } = req.query;
  if (!q || q.trim().length < 2) return res.json([]);

  const endpoint = medium === 'tv' ? 'search/tv' : 'search/movie';

  try {
    const tmdbRes = await fetch(
      `${TMDB_BASE_URL}/${endpoint}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}&page=1`
    );
    const data = await tmdbRes.json();

    const suggestions = (data.results || []).slice(0, 5).map(item => ({
      id: item.id,
      title: item.title || item.name,
      year: (item.release_date || item.first_air_date || '').split('-')[0] || 'N/A',
      poster: item.poster_path ? `https://image.tmdb.org/t/p/w92${item.poster_path}` : null
    }));

    res.json(suggestions);
  } catch (error) {
    console.error('Search API Error:', error);
    res.status(500).json([]);
  }
});

async function validateMedia(title, xCategory, yCategory, medium) {
  if (medium === 'musical_theater') {
    const colBank = stageAnswerBank[xCategory];
    if (colBank && colBank[yCategory]) {
      const validTitles = colBank[yCategory].map(t => t.toLowerCase());
      const isCorrect = validTitles.includes(title.trim().toLowerCase());
      return { isCorrect, posterUrl: null };
    }
    return { isCorrect: false, posterUrl: null };
  }

  const endpoint = medium === 'tv' ? 'search/tv' : 'search/movie';
  const creditsEndpoint = medium === 'tv' ? 'aggregate_credits' : 'credits';

  try {
    const searchRes = await fetch(
      `${TMDB_BASE_URL}/${endpoint}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`
    );
    const searchData = await searchRes.json();
    if (!searchData.results || searchData.results.length === 0) return { isCorrect: false, posterUrl: null };

    const media = searchData.results[0];
    const creditsRes = await fetch(
      `${TMDB_BASE_URL}/${medium === 'tv' ? 'tv' : 'movie'}/${media.id}/${creditsEndpoint}?api_key=${TMDB_API_KEY}`
    );
    const creditsData = await creditsRes.json();
    const cast = creditsData.cast || [];
    const crew = creditsData.crew || [];

    let xValid = false;
    if (xCategory.startsWith('Actor:')) {
      const name = xCategory.replace('Actor:', '').trim().toLowerCase();
      xValid = cast.some(p => p.name.toLowerCase() === name);
    } else if (xCategory.startsWith('Director:')) {
      const name = xCategory.replace('Director:', '').trim().toLowerCase();
      xValid = crew.some(p => (p.job === 'Director' || p.jobs?.some(j => j.job === 'Director')) && p.name.toLowerCase() === name);
    } else {
      xValid = true;
    }

    let yValid = false;
    const releaseDate = media.release_date || media.first_air_date;
    const releaseYear = releaseDate ? parseInt(releaseDate.split('-')[0]) : null;

    if (yCategory === 'Released 2010s' && releaseYear) {
      yValid = releaseYear >= 2010 && releaseYear <= 2019;
    } else if (yCategory === 'Released 1990s' && releaseYear) {
      yValid = releaseYear >= 1990 && releaseYear <= 1999;
    } else if (yCategory === 'Released 2000s' && releaseYear) {
      yValid = releaseYear >= 2000 && releaseYear <= 2009;
    } else {
      yValid = true;
    }

    const isCorrect = xValid && yValid;
    const posterUrl = media.poster_path ? `https://image.tmdb.org/t/p/w185${media.poster_path}` : null;

    return { isCorrect, posterUrl };
  } catch (error) {
    console.error('Validation Error:', error);
    return { isCorrect: false, posterUrl: null };
  }
}

app.get('/api/puzzles', (req, res) => res.json(puzzles));

app.get('/api/puzzles/:id', (req, res) => {
  const puzzle = puzzles.find(p => p.id === req.params.id);
  if (!puzzle) return res.status(404).json({ error: 'Puzzle not found' });
  res.json(puzzle);
});

app.post('/api/puzzles', (req, res) => {
  const { title, medium, genre, xAxis, yAxis } = req.body;
  const newPuzzle = {
    id: uuidv4(),
    title: title || 'Custom ShowGrid',
    medium: medium || 'movies',
    genre: genre || 'General',
    xAxis,
    yAxis,
    gridSize: xAxis.length,
    createdBy: 'Community Creator'
  };
  puzzles.unshift(newPuzzle);
  res.status(201).json(newPuzzle);
});

app.post('/api/puzzles/:id/solve', async (req, res) => {
  const { userAnswers, timeElapsed = 0 } = req.body;
  const puzzle = puzzles.find(p => p.id === req.params.id);
  if (!puzzle) return res.status(404).json({ error: 'Puzzle not found' });

  let correctCount = 0;
  const totalCells = puzzle.xAxis.length * puzzle.yAxis.length;
  const cellResults = {};
  const validationPromises = [];

  puzzle.xAxis.forEach((col, xIdx) => {
    puzzle.yAxis.forEach((row, yIdx) => {
      const key = `${xIdx}-${yIdx}`;
      const userAns = (userAnswers[key] || '').trim();

      if (!userAns) {
        cellResults[key] = { correct: false, submitted: '', posterUrl: null };
        return;
      }

      validationPromises.push(
        validateMedia(userAns, col, row, puzzle.medium).then(({ isCorrect, posterUrl }) => {
          cellResults[key] = { correct: isCorrect, submitted: userAns, posterUrl };
          if (isCorrect) correctCount++;
        })
      );
    });
  });

  await Promise.all(validationPromises);

  const baseScore = correctCount * 100;
  const speedBonus = correctCount > 0 ? Math.max(0, 500 - (timeElapsed * 5)) : 0;
  const totalScore = baseScore + speedBonus;

  res.json({
    correctCount,
    totalPossible: totalCells,
    baseScore,
    speedBonus,
    totalScore,
    timeElapsed,
    percentage: Math.round((correctCount / totalCells) * 100),
    cellResults
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`ShowGrid backend running on port ${PORT}`));
