import { redirect } from '@sveltejs/kit';

export function load({request}) {
    // If it's a crawler (Facebook, Twitter, etc), serve the meta tags
    const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';
    const isCrawler = userAgent.includes('facebookexternalhit') ||
                     userAgent.includes('twitterbot') ||
                     userAgent.includes('linkedinbot');

    if (isCrawler) {
			return {}
    }

    // For regular users, redirect
    throw redirect(302, '/quizzes');
}