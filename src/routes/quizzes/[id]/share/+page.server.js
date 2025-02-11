// routes/share/[id]/+page.server.js
export function load({ params, url }) {
    const score = url.searchParams.get('score');
    const accuracy = url.searchParams.get('accuracy');
    const title = url.searchParams.get('title');

		return {
				score,
				accuracy,
				title,
				quizId: params.id,
				isCrawler: true
		};
}