import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

dotenv.config();

const TMDB_TOKEN = process.env.TMDB_TOKEN;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const INPUT_PATH = path.join(process.cwd(), 'static', 'data', 'movies.json');
const OUTPUT_PATH = path.join(process.cwd(), 'static', 'data', 'movies_with_trailers.json');

// Rate limiting configuration
const BATCH_SIZE = 10;  // Number of concurrent requests
const DELAY_BETWEEN_BATCHES = 2000;  // 2 seconds between batches
const RETRY_DELAY = 5000;  // 5 seconds before retry on rate limit
const MAX_RETRIES = 3;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchMovieVideos(movieId, retryCount = 0) {
  try {
    const response = await fetch(`${TMDB_BASE_URL}/movie/${movieId}/videos?language=en-US`, {
      headers: {
        'Authorization': `Bearer ${TMDB_TOKEN}`,
        'accept': 'application/json'
      }
    });

    if (response.status === 429 && retryCount < MAX_RETRIES) {
      console.log(`Rate limited for movie ${movieId}, retrying after ${RETRY_DELAY}ms...`);
      await sleep(RETRY_DELAY);
      return fetchMovieVideos(movieId, retryCount + 1);
    }

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(`Error fetching movie ${movieId}, retrying...`);
      await sleep(RETRY_DELAY);
      return fetchMovieVideos(movieId, retryCount + 1);
    }
    throw error;
  }
}

function findBestTrailer(videos) {
  const trailers = videos.results
    .filter(video => video.site === 'YouTube' && video.type === 'Trailer')
    .sort((a, b) => b.size - a.size);

  if (trailers.length === 0) {
    return null;
  }

  return `https://www.youtube.com/watch?v=${trailers[0].key}`;
}

async function getTrailerForMovie(movieId) {
  try {
    const videos = await fetchMovieVideos(movieId);
    return findBestTrailer(videos);
  } catch (error) {
    console.error(`Error fetching trailer for movie ${movieId}:`, error);
    return null;
  }
}

async function processBatch(movies, startIdx) {
  const batch = movies.slice(startIdx, startIdx + BATCH_SIZE);
  console.log(`Processing batch starting at index ${startIdx} (${batch.length} movies)...`);

  const trailers = await Promise.all(
    batch.map(movie =>
      getTrailerForMovie(movie.id)
        .then(trailer => ({
          movieId: movie.id,
          trailer
        }))
    )
  );

  return trailers;
}

async function processAllMovies(movies) {
  const trailers = [];

  for (let i = 0; i < movies.length; i += BATCH_SIZE) {
    const batchTrailers = await processBatch(movies, i);
    trailers.push(...batchTrailers);

    // Don't delay after the last batch
    if (i + BATCH_SIZE < movies.length) {
      console.log(`Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }

  return trailers;
}

async function main() {
  try {
    // Read existing movies data
    console.log('Reading existing movies data...');
    const moviesData = JSON.parse(await fs.readFile(INPUT_PATH, 'utf8'));
    const movies = moviesData.movies;

    console.log(`Found ${movies.length} movies. Fetching trailers in batches of ${BATCH_SIZE}...`);

    // Process all movies in batches
    const trailers = await processAllMovies(movies);

    // Create trailer lookup dictionary
    const trailerDict = Object.fromEntries(
      trailers.map(({ movieId, trailer }) => [movieId, trailer])
    );

    // Add trailers to movies data
    const updatedMovies = movies.map(movie => ({
      ...movie,
      trailer: trailerDict[movie.id]
    }));

    // Prepare updated data
    const updatedData = {
      ...moviesData,
      movies: updatedMovies,
      updated_at: new Date().toISOString()
    };

    // Save to new file
    await fs.writeFile(
      OUTPUT_PATH,
      JSON.stringify(updatedData, null, 2)
    );

    console.log(`Updated data saved to ${OUTPUT_PATH}`);

    // Print some statistics
    const moviesWithTrailers = updatedMovies.filter(m => m.trailer).length;
    console.log(`Added trailers to ${moviesWithTrailers}/${movies.length} movies`);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();