// functions/index.js
const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// Initialize Firebase Admin
initializeApp();

// Create and initialize firestore
const db = getFirestore();

// Create the function with public access
exports.getRandomMovie = onRequest({
    cors: true,  // Enable CORS
    maxInstances: 10,
    invoker: "public"  // Allow public access
}, async (request, response) => {
    try {
        const moviesRef = db.collection("movies");

        // Get total count
        const snapshot = await moviesRef.get();
        const movies = snapshot.docs;

        if (movies.length === 0) {
            response.status(404).json({ error: "No movies found" });
            return;
        }

        // Get random document
        const randomIndex = Math.floor(Math.random() * movies.length);
        const randomMovie = movies[randomIndex].data();

        // Send the response
        response.json(randomMovie);
    } catch (error) {
        console.error("Error getting random movie:", error);
        response.status(500).json({ error: "Failed to get random movie" });
    }
});