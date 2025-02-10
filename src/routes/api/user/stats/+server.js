import { doc, getDoc, setDoc } from 'firebase/firestore';
import { json } from '@sveltejs/kit';

export async function GET({ request }) {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401
        });
    }

    try {
        const docRef = doc(db, 'userscores', `${userId}_global`);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return json({
                score: 0,
                accuracy: 0,
                totalAttempts: 0,
                totalQuestionsAnswered: 0
            });
        }

        return json(docSnap.data());
    } catch (error) {
        console.error('Error fetching user stats:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch user stats' }), {
            status: 500
        });
    }
}

export async function POST({ request }) {
    const userId = request.headers.get('X-User-Id');
    if (!userId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401
        });
    }

    try {
        const data = await request.json();
        const docRef = doc(db, 'userscores', `${userId}_global`);
        await setDoc(docRef, {
            userId,
            type: 'global',
            ...data
        }, { merge: true });

        return new Response(JSON.stringify({ success: true }));
    } catch (error) {
        console.error('Error updating user stats:', error);
        return new Response(JSON.stringify({ error: 'Failed to update user stats' }), {
            status: 500
        });
    }
}