import OpenAI from 'openai';
import dotenv from 'dotenv';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';
import * as process from 'process';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: "movie-guesser-d87e6.firebaseapp.com",
    projectId: "movie-guesser-d87e6",
    storageBucket: "movie-guesser-d87e6.firebasestorage.app",
    messagingSenderId: "233505942934",
    appId: "1:233505942934:web:c903893266c27ffe9441b7"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const quizzesCollection = collection(db, 'quizzes');
const moviesCollection = collection(db, 'movies');

// --- Zod Schema for Quiz Output
const QuizSchemaOpenAI = z.object({
    quizzes: z.array(
      z.object({
          title: z.string(),
          difficulty: z.number(),
          questions: z.array(
            z.object({
                movie_title: z.string(),
                plot_index: z.number()
            })
          )
      })
    )
});

async function getExistingQuizzes() {
    try {
        const snapshot = await getDocs(quizzesCollection);
        return snapshot.docs.map(doc => ({
            title: doc.data().title,
            movies: doc.data().questions.map(q => q.movie_id)
        }));
    } catch (error) {
        console.error('Error fetching existing quizzes:', error);
        return [];
    }
}

async function getMoviesMapping() {
    try {
        const snapshot = await getDocs(moviesCollection);
        const titleToId = new Map();
        const idToMovie = new Map();

        snapshot.docs.forEach(doc => {
            const movie = doc.data();
            const normalizedTitle = normalizeTitle(movie.title);
            titleToId.set(normalizedTitle, movie.id);
            idToMovie.set(movie.id, movie);
        });

        return { titleToId, idToMovie };
    } catch (error) {
        console.error('Error fetching movies:', error);
        return { titleToId: new Map(), idToMovie: new Map() };
    }
}

function normalizeTitle(title) {
    return title.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
}

async function generateQuizzes(numQuizzes, existingQuizzes, allMovies) {
    console.log(`Generating ${numQuizzes} quizzes in one call...`);

    // Create a simplified movie list for the LLM
    const moviesList = allMovies.map(movie => ({
        title: movie.title,
        release_date: movie.release_date,
        overview: movie.overview
    }));

    // Format existing quizzes for context
    const existingQuizzesContext = existingQuizzes.map(q =>
      `"${q.title}" (using movies: ${q.movies.join(', ')})`
    ).join('\n');

    const promptContent = `
You are an expert quiz creator. Generate ${numQuizzes} movie quizzes using movies from the provided list.
Each quiz should have its own unique theme and not overlap with existing quizzes or with other quizzes in this batch.

Available movies:
${JSON.stringify(moviesList, null, 2)}

Existing quizzes:
${existingQuizzesContext || 'None'}


Generate ${numQuizzes} quizzes. Each quiz MUST have:
- A unique, catchy, and engaging title using themes like genre, decade, director, actor, etc.
- A difficulty rating from 1 to 5 (1=Easy, 5=Hard)
- 17-25 questions to ensure we have enough valid questions
- Generate ${numQuizzes} movie quizzes!!
- For each question, specify:
  - movie_title: The EXACT title of a movie from the list (this is crucial!)
  - plot_index: A number from 1-5 for plot difficulty
- DO NOT INCLUDE TITLES THAT ARE NOT IN THE LIST!

Important: 
- Only use movie titles that EXACTLY match titles from the provided list!
- Each quiz must have a distinct theme from others in this batch
- Ensure variety in difficulty levels across quizzes
`;

    const messages = [
        { role: "user", content: promptContent }
    ];

    try {
        const completion = await openai.beta.chat.completions.parse({
            model: "gpt-4o",
            messages: messages,
            response_format: zodResponseFormat(QuizSchemaOpenAI, "response")
        });

        return completion.choices[0].message.parsed.quizzes;
    } catch (error) {
        console.error('Error generating quizzes:', error);
        return [];
    }
}

async function validateAndTransformQuiz(quiz, titleToId, idToMovie) {
    const validQuestions = [];

    for (const question of quiz.questions) {
        const normalizedTitle = normalizeTitle(question.movie_title);
        const movieId = titleToId.get(normalizedTitle);

        if (movieId && idToMovie.get(movieId)) {
            validQuestions.push({
                movie_id: movieId,
                plot_index: question.plot_index
            });
        } else {
            console.log(`Warning: Movie not found - "${question.movie_title}"`);
        }
    }

    if (validQuestions.length < 10) {
        console.log(`Quiz "${quiz.title}" has insufficient valid questions (${validQuestions.length})`);
        return null;
    }

    return {
        title: quiz.title,
        difficulty: quiz.difficulty,
        questions: validQuestions
    };
}

async function main() {
    const numQuizzes = parseInt(process.argv[2]) || 1;
    if (numQuizzes > 10) {
        console.error('Please request 10 or fewer quizzes at a time to ensure quality.');
        return;
    }

    try {
        // Get initial data
        const [existingQuizzes, { titleToId, idToMovie }] = await Promise.all([
            getExistingQuizzes(),
            getMoviesMapping()
        ]);

        const moviesData = Array.from(idToMovie.values());

        // Generate all quizzes in one call
        console.log('Making API call to generate quizzes...');
        const generatedQuizzes = await generateQuizzes(numQuizzes, existingQuizzes, moviesData);

        if (!generatedQuizzes.length) {
            console.error('Failed to generate quizzes');
            return;
        }

        // Process each generated quiz
        let successfulQuizzes = 0;

        for (const quiz of generatedQuizzes) {
            console.log(`\nProcessing quiz: ${quiz.title}`);

            // Validate and transform the quiz
            const validQuiz = await validateAndTransformQuiz(quiz, titleToId, idToMovie);
            if (!validQuiz) {
                console.error('Quiz validation failed, skipping...');
                continue;
            }

            try {
                // Upload to Firestore
                const quizDocRef = doc(quizzesCollection);
                await setDoc(quizDocRef, validQuiz);
                console.log(`Successfully created quiz: ${validQuiz.title}`);
                successfulQuizzes++;
            } catch (error) {
                console.error('Error uploading quiz:', error);
            }
        }

        console.log(`\nQuiz generation complete.`);
        console.log(`Successfully generated ${successfulQuizzes}/${numQuizzes} quizzes.`);

    } catch (error) {
        console.error('Error in main:', error);
    }
}

main();