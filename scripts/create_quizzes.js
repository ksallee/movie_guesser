// scripts/create_quizzes.js (Revised - Model Choice: OpenAI/Gemini, Simplified OpenAI Zod, Full File)
import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { initializeApp } from 'firebase/app';
import { getVertexAI, getGenerativeModel, Schema } from 'firebase/vertexai'; // Import Schema for Gemini
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import * as process from 'process';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyAd6Hl3f4bH5mlosrdQt6nP-PARj3dwukM", // <--- Your Firebase API Key
    authDomain: "movie-guesser-d87e6.firebaseapp.com",
    projectId: "movie-guesser-d87e6",
    storageBucket: "movie-guesser-d87e6.firebasestorage.app",
    messagingSenderId: "233505942934",
    appId: "1:233505942934:web:262138ac6a955a189441b7"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const quizzesCollection = collection(db, 'quizzes');

// --- Zod Schema for Quiz Batch Output (OBJECT ROOT) - For OpenAI (SIMPLIFIED) ---
const QuizSchemaOpenAI = z.object({ // Root is now an object
    quizzes: z.array(      // Property "quizzes" is an array
      z.object({
          title: z.string(),
          difficulty: z.number(), // Simplified: Removed .min() and .max()
          questions: z.array(
            z.object({
                movie_id: z.number(),
                plot_index: z.number(), // Simplified: Removed .min() and .max()
            })
          ) // Simplified: Removed .min() and .max() for array length - relying on prompt
      })
    )
});

// --- JSON Schema for Quiz Output (OBJECT ROOT) - For Gemini (No Changes) ---
const QuizSchemaGemini = Schema.object({
    properties: {
        quizzes: Schema.array({
            items: Schema.object({
                properties: {
                    title: Schema.string(),
                    difficulty: Schema.number(),
                    questions: Schema.array({
                        items: Schema.object({
                            properties: {
                                movie_id: Schema.number(),
                                plot_index: Schema.number()
                            },
                            optionalProperties: []
                        })
                    })
                },
                optionalProperties: []
            })
        })
    }
});


async function generateQuizzes(numQuizzes, outputDestination, modelType = 'openai') { // Added modelType param, default openai
    console.log(`Generating ${numQuizzes} quizzes with ${modelType} in batches (single system prompt), output to: ${outputDestination}`);

    let model;
    if (modelType === 'gemini') {
        const vertexAI = getVertexAI(firebaseApp);
        model = getGenerativeModel(vertexAI, {
            model: "gemini-1.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: QuizSchemaGemini // Use Gemini Schema
            }
        });
    } else if (modelType === 'openai') {
        model = openai; // Use initialized OpenAI client
    } else {
        throw new Error(`Invalid model type: ${modelType}. Choose 'openai' or 'gemini'.`);
    }


    try {
        const moviesData = JSON.parse(await fs.readFile('static/data/movies.json', 'utf-8'));
        const allMovies = moviesData.movies;
        // Reduce movie data
        const allMoviesReduced = allMovies.map(movie => ({
            id: movie.id,
            title: movie.title,
            release_date: movie.release_date,
            plots: movie.plots
        }));

        const quizzesPerBatch = 15;
        let generatedQuizCount = 0;
        let allQuizzes = [];

        // --- System Prompt (Sent only ONCE) ---
        const systemPromptContent = `
You are an expert quiz creator. You will generate movie quizzes in batches. I will ask for quizzes in user prompts, and you will respond with a JSON object containing movie quizzes.
Do not provide same quizzes twice!

You will use movies from the following list to create your quizzes:
${JSON.stringify(allMoviesReduced, null, 2)}

When generating quizzes:
- Try to order them by "virality", so the most popular quizzes come first (within each batch and overall if possible).
- Make sure to vary the difficulty levels from 1 to 5 across quizzes.
- Be creative and engaging with quiz titles and themes! You can make quizzes based on genre, decades, directors, actors, etc.
- Ensure that each quiz has between 10 and 20 questions.
- For each question, the 'plot_index' should be a number between 1 and 5.

        `;

        while (generatedQuizCount < numQuizzes) {
            const currentBatchSize = Math.min(quizzesPerBatch, numQuizzes - generatedQuizCount); // Adjust batch size

            if (currentBatchSize <= 0) break; // No more quizzes to generate

            // --- User Prompt for each batch ---
            const userPromptContent = `Generate ${currentBatchSize} movie quizzes.
            Each quiz in the "quizzes" array MUST have:
- A "title":  A catchy and engaging title for the quiz. Keep it short and concise.
- A "difficulty":  A number from 1 to 5 representing the quiz difficulty (1=Easy, 5=Hard). Vary the difficulty across quizzes within each batch and across batches.
- A "questions" array:  This array should contain 10-20 movie questions PER QUIZ. NO LESS THAN 10 AND NO MORE THAN 20! Each question is represented as an object with:
- "movie_id":  The ID of a movie from the provided movie list.
- "plot_index": A number between 1 and 5, representing the plot index of the plot you chose to keep for this quiz question.
You can have the same themes across quizzes, but with different levels of difficulty (plots), and you can vary the movies a bit too.
            `;

            const messages = [];
            const systemRole = modelType === 'openai' ? "system" : "model"
            if (generatedQuizCount === 0) {
                // For the first batch, include the system prompt
                messages.push({ role: systemRole, content: systemPromptContent });
            }
            messages.push({ role: "user", content: userPromptContent }); // Add user prompt for every batch

            console.log(`--- Sending Prompt to ${modelType} for batch of ${currentBatchSize} quizzes ---`);

            let responseData;
            if (modelType === 'openai') {
                const completion = await model.beta.chat.completions.parse({ // Use OpenAI client
                    model: "gpt-4o",
                    messages: messages,
                    response_format: zodResponseFormat(QuizSchemaOpenAI, "response") // Use OpenAI Zod Schema
                });
                responseData = completion.choices[0].message.parsed;
            } else if (modelType === 'gemini') {
                const geminiPrompt = messages.find(msg => msg.role === 'user')?.content || messages[0].content; // Extract user prompt content
                if (!geminiPrompt) {
                    console.error("Error: No user prompt found for Gemini.");
                    return;
                }

                const geminiResult = await model.generateContent({
                    contents: [{
                        parts: [{ text: geminiPrompt }] // Pass prompt as text in parts array
                    }]
                });


                const responseText = geminiResult.response.text();
                try {
                    responseData = JSON.parse(responseText); // Parse Gemini response
                } catch (e) {
                    console.error("Error parsing JSON response from Gemini:", e);
                    console.error("Raw JSON response that failed to parse (Gemini):", responseText);
                    return;
                }
                // Basic validation for Gemini output (as schema validation is not directly enforced)
                if (!responseData || !responseData.quizzes || !Array.isArray(responseData.quizzes)) {
                    console.error("Gemini output does not match expected QuizSchemaGemini: Missing 'quizzes' array.");
                    return;
                }
            }


            const batchQuizzes = responseData.quizzes; // Access quizzes array (same for both models based on schema)


            console.log(`--- Received and Parsed JSON Response from ${modelType} for batch of ${currentBatchSize} quizzes ---`);
            // console.log("Parsed Batch Quizzes:", JSON.stringify(batchQuizzes, null, 2)); // Optional: Log batch quizzes

            allQuizzes = allQuizzes.concat(batchQuizzes); // Concatenate batch quizzes
            generatedQuizCount += batchQuizzes.length;

            console.log(`Generated ${generatedQuizCount}/${numQuizzes} quizzes so far.`);
        }


        // --- Process and Output Quizzes ---
        if (outputDestination === 'firestore') {
            console.log("Uploading quizzes to Firestore...");
            const uploadPromises = allQuizzes.map(async (quiz, index) => {
                const quizDocRef = doc(quizzesCollection);
                await setDoc(quizDocRef, quiz);
                console.log(`Uploaded quiz ${index + 1}: ${quiz.title}`);
            });
            await Promise.all(uploadPromises);
            console.log("All quizzes uploaded to Firestore.");
        } else { // outputDestination === 'local'
            console.log("Outputting quizzes to console (local):");
            console.log(JSON.stringify({ quizzes: allQuizzes }, null, 2));
            // await fs.writeFile('quizzes_output.json', JSON.stringify({ quizzes: allQuizzes }, null, 2), 'utf-8');
            // console.log("Quizzes saved to quizzes_output.json");
        }

    } catch (error) {
        console.error('Error during quiz generation:', error);
        if (error instanceof z.ZodError && modelType === 'openai') {
            console.error("Zod Validation Error Details (OpenAI):", error.errors);
        } else {
            console.error(`API Error Details (${modelType}):`, error);
        }
    }
}

async function main() {
    const numQuizzes = parseInt(process.argv[2]) || 5;
    const outputDestination = process.argv[3] === 'firestore' ? 'firestore' : 'local';
    const modelType = process.argv[4] === 'gemini' ? 'gemini' : 'openai'; // Default to openai, added modelType arg

    await generateQuizzes(numQuizzes, outputDestination, modelType); // Pass modelType to generateQuizzes
}

main();