import { json } from '@sveltejs/kit';
import { PUBLIC_UMAMI_API_KEY } from '$env/static/public';

const WEBSITE_ID = '4e15035b-7c4c-4239-914a-3187a48999bd';

export async function GET({fetch}) {
    try {
        const endAt = Date.now();
        const startAt = 0;

        const response = await fetch(
            `https://api.umami.is/v1/websites/${WEBSITE_ID}/stats?startAt=${startAt}&endAt=${endAt}`,
            {
                headers: {
                    'Accept': 'application/json',
                    'x-umami-api-key': PUBLIC_UMAMI_API_KEY
                }
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return json(data);
    } catch (error) {
        console.error('Error fetching stats:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch stats' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}