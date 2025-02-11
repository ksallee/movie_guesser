<!-- routes/share/[id]/+page.svelte -->
<script>
    import SEO from '$lib/components/SEO.svelte';

		export let data;

    $: seoData = {
        title: `I scored ${data.score} points on ${data.title}!`,
        description: `I got ${data.accuracy}% accuracy. Can you beat my score?`,
        image: "/images/share_preview.png",
        url: `https://guessthemoviegame.netlify.app/share/${data.quizId}?score=${data.score}&accuracy=${data.accuracy}&title=${encodeURIComponent(data.title)}`,
        type: "article"
    }
</script>

<SEO {...seoData} />