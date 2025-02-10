import { collection, doc, getDoc } from 'firebase/firestore';
import { json } from '@sveltejs/kit';
import { db } from '$lib/firebase.js';

export async function GET({ params }) {
    try {
        const { id } = params;
        const quizRef = doc(db, 'quizzes', id);
        const quizSnap = await getDoc(quizRef);

        if (!quizSnap.exists()) {
            return new Response(JSON.stringify({ error: 'Quiz not found' }), {
                status: 404
            });
        }

        const quiz = quizSnap.data();

        // Fetch all movies for this quiz
        const moviesRef = collection(db, 'movies');
        const movieIds = quiz.questions.map(q => q.movie_id);

        const moviePromises = movieIds.map(movieId =>
            getDoc(doc(moviesRef, movieId.toString()))
        );

        const movieDocs = await Promise.all(moviePromises);
        const movies = {};

        movieDocs.forEach(doc => {
            if (doc.exists()) {
                movies[doc.id] = doc.data();
            }
        });

        return json({
            quiz: {
                id,
                ...quiz,
                movies
            }
        });
    } catch (error) {
        console.error('Error fetching quiz:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch quiz' }), {
            status: 500
        });
    }
}