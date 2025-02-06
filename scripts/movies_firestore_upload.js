import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import * as fs from 'fs/promises';

// Your Firebase config (same as in your svelte app)
const firebaseConfig = {
    apiKey: "AIzaSyAd6Hl3f4bH5mlosrdQt6nP-PARj3dwukM", // Replace with your actual config
    authDomain: "movie-guesser-d87e6.firebaseapp.com",
    projectId: "movie-guesser-d87e6",
    storageBucket: "movie-guesser-d87e6.firebasestorage.app",
    messagingSenderId: "233505942934",
    appId: "1:233505942934:web:262138ac6a955a189441b7"
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