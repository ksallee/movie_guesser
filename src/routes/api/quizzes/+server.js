import { collection, getDocs } from 'firebase/firestore';
import { json } from '@sveltejs/kit';
import { db } from '$lib/firebase.js';

export async function GET() {
    try {
        const quizzesRef = collection(db, 'quizzes');
        const snapshot = await getDocs(quizzesRef);

        const quizzes = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return json({ quizzes });
    } catch (error) {
        console.error('Error fetching quizzes:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch quizzes' }), {
            status: 500
        });
    }
}