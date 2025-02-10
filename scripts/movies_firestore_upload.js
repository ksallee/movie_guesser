import { initializeApp } from 'firebase/app';
import { collection, doc, getFirestore, setDoc } from 'firebase/firestore';
import * as fs from 'fs/promises';
import dotenv from 'dotenv';
import * as process from 'process';

dotenv.config();

const firebaseConfig = {
    apiKey: process.env.PUBLIC_FIREBASE_API_KEY,
    authDomain: "movie-guesser-d87e6.firebaseapp.com",
    projectId: "movie-guesser-d87e6",
    storageBucket: "movie-guesser-d87e6.firebasestorage.app",
    messagingSenderId: "233505942934",
    appId: "1:233505942934:web:c903893266c27ffe9441b7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const moviesCollection = collection(db, 'movies');

async function uploadMovies() {
    try {
        const moviesData = JSON.parse(await fs.readFile('static/data/movies.json', 'utf-8'));
        const uploadPromises = []; // Array to hold all upload promises

        for (const movie of moviesData.movies) {
            const movieDocRef = doc(moviesCollection, String(movie.id));
            const uploadPromise = setDoc(movieDocRef, movie); // Create the Promise, but don't await yet
            uploadPromises.push(uploadPromise); // Add promise to the array
        }

        console.log(`Starting parallel upload of ${uploadPromises.length} movies...`);
        await Promise.all(uploadPromises); // Wait for all promises to resolve (parallel upload)
        console.log('All movies uploaded successfully in parallel!');

    } catch (error) {
        console.error('Error uploading movies:', error);
    }
}

uploadMovies();