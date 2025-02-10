import { json } from '@sveltejs/kit';

export async function GET() {
    try {
        const response = await fetch('https://getrandommovie-gswuy2kjqq-uc.a.run.app');
        if (!response.ok) {
            return new Response(JSON.stringify({ error: 'Failed to fetch random movie' }), {
                status: response.status
            });
        }

        const movie = await response.json();
        return json(movie);
    } catch (error) {
        console.error('Error fetching random movie:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch random movie' }), {
            status: 500
        });
    }
}