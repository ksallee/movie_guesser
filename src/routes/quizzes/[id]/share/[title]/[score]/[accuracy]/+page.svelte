<script>
    import SEO from '$lib/components/SEO.svelte';
    import { page } from '$app/state';

    const score = page.params.score;
		const accuracy = page.params.accuracy;
		const title = page.params.title;

</script>

<SEO
    title="I scored {score} points in {title} movie quizz with {accuracy}% accuracy! Can you beat my score?"
    description="I completed '{title}' with {accuracy}% accuracy! Can you beat my score?"
    image="/images/quizzes_preview.jpg"
/>
<h1>Nothing to see here</h1>