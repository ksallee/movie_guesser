import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const TMDB_TOKEN = process.env.TMDB_TOKEN;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const OUTPUT_PATH = path.join(process.cwd(), 'static', 'data', 'movies.json');

// Rate limiting configuration
const BATCH_SIZE = 50;  // Number of concurrent requests
const DELAY_BETWEEN_BATCHES = 1000;  // 1 second between batches
const RETRY_DELAY = 5000;  // 5 seconds before retry on rate limit
const MAX_RETRIES = 3;

// Schemas remain the same
const NonObscureMoviesSchema = z.object({
  titles: z.array(z.string())
});

const PlotSchema = z.object({
  plots: z.array(z.object({
    difficulty: z.number(),
    plot: z.string()
  }))
});

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchFromTMDB(endpoint, retryCount = 0) {
  try {
    const response = await fetch(`${TMDB_BASE_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${TMDB_TOKEN}`,
        'accept': 'application/json'
      }
    });

    if (response.status === 429 && retryCount < MAX_RETRIES) {
      console.log(`Rate limited for endpoint ${endpoint}, retrying after ${RETRY_DELAY}ms...`);
      await sleep(RETRY_DELAY);
      return fetchFromTMDB(endpoint, retryCount + 1);
    }

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(`Error fetching ${endpoint}, retrying...`);
      await sleep(RETRY_DELAY);
      return fetchFromTMDB(endpoint, retryCount + 1);
    }
    throw error;
  }
}

async function fetchMovieBatch(targetCount, currentPage) {
  let movies = [];
  let page = currentPage;

  while (movies.length < targetCount) {
    console.log(`Fetching page ${page}...`);
    const response = await fetchFromTMDB(`/movie/top_rated?language=en-US&page=${page}`);

    if (response.results.length === 0) {
      console.log('No more movies available from TMDB');
      break;
    }

    movies = movies.concat(response.results);
    page++;
  }

  return movies;
}

async function getNonObscureMovies(movies) {
  const movieInfoList = movies.map(movie => ({
    title: movie.title,
    year: movie.release_date.split('-')[0],
    overview: movie.overview
  }));

  const prompt = {
    role: "system",
    content: `You are an expert at determining if movies are well-known enough for a movie guessing game.

From the following list, return ONLY the titles of movies that are well-known enough for a general audience.

A movie is well-known enough if:
- It is widely known in Western culture
- It has had significant cultural impact
- An average movie-goer would recognize it from clever hints
- It has been referenced in popular culture
- It is from a major franchise or a well-known director

Movies to evaluate:
${movieInfoList.map(m => `
Title: ${m.title} (${m.year})
Overview: ${m.overview}
---`).join('\n')}
`
  };

  try {
    const completion = await openai.beta.chat.completions.parse({
      model: "gpt-4o-mini",
      messages: [prompt],
      response_format: zodResponseFormat(NonObscureMoviesSchema, "response")
    });

    return completion.choices[0].message.parsed;
  } catch (error) {
    console.error('OpenAI Error Details:', error);
    throw error;
  }
}

async function generatePlots(movie) {
  const prompt = {
    role: "system",
    content: `You are an expert at creating irreverent and funny but technically accurate movie plots. Generate 5 different plots for "${movie.title}" (${movie.release_date}). Each plot must be technically accurate but irreverent, even slightly offensive.

Rules for generating plots:
1. Never mention character names or actor names in difficulties 3-5
2. Simple vocabulary, avoid fill words, idioms, or complex language.
3. The plot should be irreverent and humorous
4. Keep plots short and punchy - one short sentence is ideal
5. Level 1 must be completely direct and obvious, giving away plot, characters, etc just make it funny.
6. I insist, if you've seen the movie, you should guess difficulty 1 and 2 pretty easily. Examples:
Titanic – "Rich girl ditches her fiancé for a homeless artist, then hogs the only floating door while he freezes to death."
The Lion King – "Prince runs away after dad dies, chills with a stoner meerkat and a gassy pig, then comes back for revenge."
7. Levels 3-5 should be increasingly difficult. Level 5 should be a real challenge, but still technically accurate and guessable.

Movie overview: ${movie.overview}`
  };

  try {
    const completion = await openai.beta.chat.completions.parse({
      model: "gpt-4o",
      messages: [prompt],
      response_format: zodResponseFormat(PlotSchema, "response")
    });

    return completion.choices[0].message.parsed;
  } catch (error) {
    console.error('OpenAI Error Details:', error);
    throw error;
  }
}

function findBestTrailer(videos) {
  const trailers = videos.results
    ?.filter(video => video.site === 'YouTube' && video.type === 'Trailer')
    .sort((a, b) => b.size - a.size);

  if (!trailers?.length) {
    return null;
  }

  return `https://www.youtube.com/watch?v=${trailers[0].key}`;
}

async function processBatch(movies, startIdx) {
  const batch = movies.slice(startIdx, startIdx + BATCH_SIZE);
  console.log(`Processing batch starting at index ${startIdx} (${batch.length} movies)...`);

  const enrichedData = await Promise.all(
    batch.map(async movie => {
      try {
        const [externalIds, videos, plots] = await Promise.all([
          fetchFromTMDB(`/movie/${movie.id}/external_ids`),
          fetchFromTMDB(`/movie/${movie.id}/videos?language=en-US`),
          generatePlots(movie)
        ]);

        return {
          id: movie.id,
          title: movie.title,
          overview: movie.overview,
          poster_path: movie.poster_path,
          imdb_id: externalIds.imdb_id,
          trailer: findBestTrailer(videos),
          release_date: movie.release_date,
          vote_average: movie.vote_average,
          plots: plots.plots
        };
      } catch (error) {
        console.error(`Error processing movie ${movie.id}:`, error);
        return null;
      }
    })
  );

  return enrichedData.filter(data => data !== null);
}

async function enrichMovies(movies) {
  console.log('Enriching movies with external IDs, trailers, and plots...');
  const enrichedMovies = [];
  const totalBatches = Math.ceil(movies.length / BATCH_SIZE);

  for (let i = 0; i < movies.length; i += BATCH_SIZE) {
    const currentBatch = Math.floor(i / BATCH_SIZE) + 1;
    console.log(`Processing batch ${currentBatch}/${totalBatches}...`);

    const batchResults = await processBatch(movies, i);
    enrichedMovies.push(...batchResults);

    // Don't delay after the last batch
    if (i + BATCH_SIZE < movies.length) {
      console.log(`Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }

  return enrichedMovies;
}

async function collectNonObscureMovies(targetCount) {
  let nonObscureMovies = [];
  let seenMovies = new Set();
  let currentPage = 1;

  while (nonObscureMovies.length < targetCount) {
    // Fetch new batch of movies
    const remainingCount = targetCount - nonObscureMovies.length;
    const batchSize = Math.min(BATCH_SIZE, remainingCount * 2); // Fetch double what we need
    const newMovies = await fetchMovieBatch(batchSize, currentPage);
    currentPage += Math.ceil(batchSize / 20); // TMDB returns 20 results per page

    if (!newMovies || newMovies.length === 0) {
      console.log('No more movies available');
      break;
    }

    // Filter out movies we've already seen
    const uniqueNewMovies = newMovies.filter(movie => !seenMovies.has(movie.title));
    uniqueNewMovies.forEach(movie => seenMovies.add(movie.title));

    if (uniqueNewMovies.length > 0) {
      // Get non-obscure movies from this batch
      const results = await getNonObscureMovies(uniqueNewMovies);
      const nonObscureTitles = new Set(results.titles);

      // Add new non-obscure movies to our collection
      const newNonObscureMovies = uniqueNewMovies.filter(movie => nonObscureTitles.has(movie.title));
      nonObscureMovies = nonObscureMovies.concat(newNonObscureMovies);

      console.log(`Found ${newNonObscureMovies.length} new non-obscure movies. Total: ${nonObscureMovies.length}/${targetCount}`);
    }
  }

  return nonObscureMovies.length <= targetCount ? nonObscureMovies : nonObscureMovies.slice(0, targetCount);
}

async function main() {
  const targetMovieCount = parseInt(process.argv[2]) || 5;
  console.log(`Finding ${targetMovieCount} suitable movies...`);

  try {
    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });

    // First, collect enough non-obscure movies
    const nonObscureMovies = await collectNonObscureMovies(targetMovieCount);
    console.log(`Successfully collected ${nonObscureMovies.length} non-obscure movies`);

    // Then enrich them with additional data (now including trailers)
    const enrichedMovies = await enrichMovies(nonObscureMovies);
    console.log(`Successfully enriched ${enrichedMovies.length} movies`);

    // Print some statistics
    const moviesWithTrailers = enrichedMovies.filter(m => m.trailer).length;
    console.log(`
Statistics:
- Movies with trailers: ${moviesWithTrailers}/${enrichedMovies.length}
    `);

    // Save the results
    await fs.writeFile(
      OUTPUT_PATH,
      JSON.stringify({
        movies: enrichedMovies,
        generated_at: new Date().toISOString(),
        count: enrichedMovies.length
      }, null, 2)
    );

    console.log(`Data saved to ${OUTPUT_PATH}`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();