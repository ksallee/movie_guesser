<script>
    import SEO from '$lib/components/SEO.svelte';
    import { page } from '$app/state';

    const quizId = page.params.id;
    const score = page.params.score;
		const accuracy = page.params.accuracy;
		const title = page.params.title;

</script>

<SEO
    title="I scored {score} points in Guess The Movie!"
    description="I completed '{title}' with {accuracy}% accuracy! Can you beat my score?"
    image="/images/quizzes_preview.jpg"
    url="https://guessthemoviegame.netlify.app/share/{quizId}?score={score}&accuracy={accuracy}&title={title}"
/>
<h1>Nothing to see here</h1>