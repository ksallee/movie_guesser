<script>
    import SEO from '$lib/components/SEO.svelte';
    import { page } from '$app/state';

    const quizId = page.params.quizId;
    const searchParams = page.url.searchParams;
    const score = searchParams.get('score') || 0;
    const accuracy = searchParams.get('accuracy') || 0;
    const title = searchParams.get('title') || 'a movie quiz';
</script>

<SEO
    title="I scored {score} points in Guess The Movie!"
    description="I completed '{title}' with {accuracy}% accuracy! Can you beat my score?"
    image="/images/quizzes_preview.jpg"
    url="https://guessthemoviegame.netlify.app/share/{quizId}?score={score}&accuracy={accuracy}&title={title}"
/>
