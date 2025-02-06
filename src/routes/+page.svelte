<script>
	import MovieGuesser from '$lib/components/MovieGuesser.svelte';
</script>

<svelte:head>
  <title>Guess The Movie - A Movie Plot Guessing Game</title>
  <meta name="description" content="Test your movie knowledge by guessing films from their plot descriptions. A fun and challenging movie guessing game." />
  <meta property="og:image" content="/favicon.png" />
  <meta property="og:image:width" content="256" />
  <meta property="og:image:height" content="256" />
</svelte:head>

<div class="game-container">
  <h1 class="game-title">Guess The Movie</h1>
	<MovieGuesser />
</div>

<style>
	.game-container {
		height: 100svh;
		width: 100svw;
		display: flex;
		flex-direction: column;
		padding: var(--spacing-md);
		background: var(--color-bg);
		color: var(--color-text);
	}

	.game-title {
		text-align: center;
		color: var(--color-primary);
		font-size: var(--font-size-2xl);
		font-weight: var(--font-weight-normal);
		margin-top: var(--spacing-lg);
	}
</style>