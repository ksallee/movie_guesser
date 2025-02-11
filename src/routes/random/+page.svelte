<script>
    import MovieGuesser from '$lib/components/MovieGuesser.svelte';
    import { fade } from 'svelte/transition';
		import SEO from '$lib/components/SEO.svelte';
</script>

<SEO/>
<div class="random-container" in:fade>
    <MovieGuesser />
</div>

<style>
    .random-container {
        flex: 1;
        display: flex;
        flex-direction: column;
    }
</style>