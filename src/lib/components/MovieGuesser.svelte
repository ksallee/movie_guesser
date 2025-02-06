<script>
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	let movies = [];
	let currentMovie = $state(null);
	// set the plot index to a random number between 1 and 4
	const randomPlotIndex = Math.floor(Math.random() * 4) + 1;
	let currentPlotIndex = $state(randomPlotIndex);
	let guess = $state('');
	let gameState = $state('playing');
	let feedback = $state("");
	let posterPreloader = $state(null);

	onMount(async () => {
		const response = await fetch('/data/movies.json');
		const data = await response.json();
		movies = data.movies;
		selectRandomMovie();
	});

	function selectRandomMovie() {
		const newMovie = movies[Math.floor(Math.random() * movies.length)];

		// Start preloading the poster image
		if (posterPreloader) {
			posterPreloader.onload = null;
			posterPreloader.onerror = null;
		}
		posterPreloader = new Image();
		posterPreloader.src = `https://image.tmdb.org/t/p/w500${newMovie.poster_path}`;

		currentMovie = newMovie;
		currentPlotIndex = Math.floor(Math.random() * 4) + 1;
		gameState = 'playing';
		guess = '';
		feedback = '';
	}

	function normalizeString(str) {
		return str
			.toLowerCase()
			.trim()
			.replace(/[^\w\s]/g, ' ')
			.replace(/\s+/g, ' ')
			.replace(/^(a|an|the) /, '')
			.replace(/ (a|an|the) /g, ' ');
	}

	function setDifficulty(index) {
		feedback = '';
		currentPlotIndex = index;
	}

	function fail() {
		feedback = 'FAILED';
		guess = "";
		if (currentPlotIndex > 0) {
			currentPlotIndex--;
		}
		setTimeout(() => {
			feedback = "";
		}, 1000);
	}

	function checkGuess() {
		if (!guess) {
			fail();
			return;
		}

		const normalizedGuess = normalizeString(guess);
		const normalizedTitle = normalizeString(currentMovie.title);

		// Split into words for partial matching
		const guessWords = normalizedGuess.split(' ');
		const titleWords = normalizedTitle.split(' ');

		// Various matching strategies
		if (normalizedGuess === normalizedTitle ||
			(normalizedTitle.includes(normalizedGuess) && guessWords.length >= 2)) {
			gameState = 'success';
			return;
		}

		// Sequential word matching
		let titleIdx = 0;
		let allWordsMatch = true;

		for (const word of guessWords) {
			if (word.length <= 1) {
				allWordsMatch = false;
				break;
			}

			let found = false;
			while (titleIdx < titleWords.length) {
				if (titleWords[titleIdx].includes(word)) {
					found = true;
					titleIdx++;
					break;
				}
				titleIdx++;
			}

			if (!found) {
				allWordsMatch = false;
				break;
			}
		}

		if (allWordsMatch && guessWords.length >= 2) {
			gameState = 'success';
			return;
		}

		// Franchise pattern matching
		const franchiseMatch = normalizedTitle.match(/^(.+?)(?::\s*)?(?:part \d+|[123]\b|\s+\d+)?$/);
		if (franchiseMatch && normalizeString(franchiseMatch[1]) === normalizedGuess) {
			gameState = 'success';
			return;
		}

		fail();
	}

	function giveUp() {
		gameState = 'gaveup';
	}

	function playAgain() {
		selectRandomMovie();
	}
</script>

{#if currentMovie}
	<div class="content" in:fade>
		{#if gameState === 'playing'}
			<div class="game-status">
				{#if feedback}
					<div class="feedback" in:fade>
						{feedback}
					</div>
				{/if}
			</div>
			<div class="plot-container">
				<div class="plot-difficulty">
					<span class="difficulty-label">Choose level:</span>
					{#each Array(5) as _, i}
						<button
							class="star-button"
							onclick={() => setDifficulty(i)}
						>
                <span>
									{#if i < currentMovie.plots[currentPlotIndex].difficulty}
										<img class="fire" src="/images/difficulty_on.svg" alt="Difficulty On" />
									{:else}
										<img  class="fire" src="/images/difficulty_off.svg" alt="Difficulty Off" />
									{/if}

                </span>
						</button>
					{/each}
				</div>
				{#key currentMovie.plots[currentPlotIndex].plot}
					<div class="plot" in:fade={{duration:800}}>
						{currentMovie.plots[currentPlotIndex].plot}
					</div>
				{/key}
			</div>

			<div class="input-area">
				<input
					type="text"
					bind:value={guess}
					placeholder="My guess is..."
					onkeydown={(e) => e.key === 'Enter' && checkGuess()}
				/>
				<div class="button-group">
					<button class="button secondary-button" onclick={selectRandomMovie} title="Get another random movie">
						<img src="/images/refresh.svg" alt="Refresh" class="refresh-icon" />
					</button>
					<button class="button primary-button" onclick={checkGuess}>
						Submit Guess
					</button>
					<button class="button error-button" onclick={giveUp}>
						Give Up
					</button>
				</div>
			</div>
		{:else}
			<div class="result" in:fade={{duration:800}}>
				{#if gameState === 'success'}
					<div class="success-message" in:fade|global={{delay: 300, duration: 500}}>
						Congratulations! You got it right!
					</div>
				{/if}
				<h2>{currentMovie.title}</h2>
				<h3>{currentMovie.release_date.substring(0, 4)}</h3>
				<img
					src={posterPreloader?.src || `https://image.tmdb.org/t/p/w500${currentMovie.poster_path}`}
					alt={currentMovie.title}
					class="movie-poster"
				/>
				<p class="overview">{currentMovie.overview.substring(0, 350)}</p>
				<div class="result-actions">
					{#if currentMovie.trailer}
						<a
							href={currentMovie.trailer}
							target="_blank"
							rel="noopener noreferrer"
							class="button secondary-button"
						>
							Youtube Trailer
						</a>
					{/if}
					<a
						href={`https://www.imdb.com/title/${currentMovie.imdb_id}`}
						target="_blank"
						rel="noopener noreferrer"
						class="button secondary-button"
					>
						View on IMDB
					</a>

					<button class="button primary-button" onclick={playAgain}>
						Play Again
					</button>
				</div>
			</div>
		{/if}
	</div>
{:else}
	<div class="loading">Loading...</div>
{/if}


<style>
	.content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
		align-items: center;
		justify-content: flex-start;
		text-align: center;
		max-width: 800px;
		margin: 0 auto;
		padding: var(--spacing-sm);

		@media (max-width: 768px) {
			padding: var(--spacing-md);
			width: 100%;
			max-width: 100%;
		}
	}

	.game-status {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
		align-items: center;
	}

	.plot-difficulty {
		font-size: var(--font-size-lg);
		color: var(--color-neutral-400);
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);

		@media (max-width: 768px) {
			font-size: var(--font-size-md);
			gap: var(--spacing-xs);
		}
	}

	.difficulty-label {
		color: var(--color-neutral-400);
		margin-right: var(--spacing-sm);
		@media (max-width: 768px) {
			white-space: nowrap;
		}
	}

	.fire {
		width: 28px;
		height: 28px;
		@media (max-width: 768px) {
			width: 24px;
			height: 24px;
		}
	}
	.star-button {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
	}

	.star-button:hover {
		transform: scale(1.2);
	}


	.feedback {
		position: fixed;
		top: 20%;  /* Move it higher up */
		left: 50%;
		transform: translate(-50%, -50%);
		color: var(--color-error);
		font-size: 4rem;
		font-weight: var(--font-weight-bold);
		text-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
		pointer-events: none;
		z-index: 100;
		animation: fadeOut 1s ease-in-out forwards;
	}

	@keyframes fadeOut {
		0% {
			opacity: 1;
			transform: translate(-50%, -50%) scale(1.2);
		}
		100% {
			opacity: 0;
			transform: translate(-50%, -50%) scale(1);
		}
	}

	.plot-container {
		display: flex;
		flex-direction: column;
		min-height: 250px;
		align-items: center;
		max-width: 700px;
		gap: var(--spacing-lg);

		@media (max-width: 768px) {
			padding: var(--spacing-md);
			max-width: 100%;
		}
	}
	.plot {
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-normal);
		color: var(--color-neutral-500);
		line-height: 1.4;

		@media (max-width: 768px) {
			font-size: var(--font-size-lg2);
			justify-self: flex-start;
			text-align: left;
		}
	}

	.input-area {
		width: 100%;
		max-width: 500px;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-lg);
	}

	input {
		font-size: var(--font-size-lg);
		padding: var(--spacing-md) var(--spacing-lg);
		text-align: center;
		background: var(--color-neutral-200);
		border: 2px solid var(--color-neutral-50);
		color: var(--color-neutral-700);
		border-radius: var(--radius-lg);
		transition: all 0.2s ease;
	}
	input::placeholder {
		color: var(--color-neutral-400);
	}

	input:focus {
		border-color: var(--color-primary);
		box-shadow: 0 0 0 2px var(--color-primary-dark);
		outline: none;
	}

	.button-group {
		display: flex;
		gap: var(--spacing-xl);
		justify-content: center;

		@media (max-width: 768px) {
			flex-direction: column;
			gap: var(--spacing-md);
		}
	}

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

	@keyframes fadeInOut {
		0% {
			opacity: 0;
			transform: translateY(-10px);
		}
		100% {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.refresh-icon {
		width: 36px;
		height: 36px;
	}
</style>