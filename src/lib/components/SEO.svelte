<script>
	import { page } from '$app/state';
let {
    title = "Guess The Movie - A Movie Plot Guessing Game",
    description = "Test your movie knowledge by guessing films from their plot descriptions.",
    image = "/images/question_preview.jpg",
    url = page.url,
    type = "website"
} = $props();
</script>

<svelte:head>
    <title>{title}</title>
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:image" content={image} />
    <meta property="og:url" content={url} />
    <meta property="og:type" content={type} />
    <meta name="description" content={description} />
</svelte:head>