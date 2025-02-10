<script>
	import { fade } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { completeQuiz } from '$lib/state/gameState.js';
	import {onMount} from 'svelte';

	let {
		movie,
		gameState = 'success',
		onPlayAgain,
		onNext = undefined,
		isLastQuestion = false,
		quizId = undefined
	} = $props();


	async function goToResults() {
		await completeQuiz(quizId);
		goto(`/quizzes/${quizId}/result`);
	}
</script>

<div class="result" in:fade={{duration:800}}>
	{#if gameState === 'success'}
		<div class="success-message" in:fade|global={{delay: 300, duration: 500}}>
			Congratulations! You got it right!
		</div>
	{/if}

	<h2>{movie.title}</h2>
	<h3>{movie.release_date.substring(0, 4)}</h3>
	<img
		src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
		alt={movie.title}
		class="movie-poster"
	/>
	<p class="overview">{movie.overview}</p>

	<div class="result-actions">
		{#if isLastQuestion}
			<button
				class="button success-button"
				onclick={async() => await goToResults()}
			>
				See Results
			</button>
		{:else if onNext}
			<button
				class="button primary-button"
				onclick={onNext}
			>
				Next Question
			</button>
		{:else if onPlayAgain}
			<button
				class="button primary-button"
				onclick={onPlayAgain}
			>
				Play Again
			</button>
		{/if}
		{#if movie.trailer}
			<a
				href={movie.trailer}
				target="_blank"
				rel="noopener noreferrer"
				class="button secondary-button"
			>
				Watch Trailer
			</a>
		{/if}
		<a
			href={`https://www.imdb.com/title/${movie.imdb_id}`}
			target="_blank"
			rel="noopener noreferrer"
			class="button secondary-button"
		>
			View on IMDB
		</a>
	</div>
</div>

<style>
	.result {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
		align-items: center;
	}

	.movie-poster {
		max-width: 270px;
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		object-fit: cover;
	}

	.overview {
		max-width: 600px;
		color: var(--color-secondary);
	}

	.result-actions {
		display: flex;
		gap: var(--spacing-md);

		@media (max-width: 768px) {
			flex-direction: column;
			gap: var(--spacing-md);
		}
	}

	.success-message {
		color: var(--color-success);
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-medium);
	}
</style>