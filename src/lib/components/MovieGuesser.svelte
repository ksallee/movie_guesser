<script>
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import MovieResult from './MovieResult.svelte';
	import { gameState, updateGlobalStats, updateQuizProgress, calculateQuestionScore } from '$lib/state/gameState';
	import { Jumper } from 'svelte-loading-spinners';
	import { Tween } from 'svelte/motion';

	// Props
	let {
		movie = null,               // If provided, use this movie instead of fetching
		plotIndex = null,           // If provided, use this plot index
		quizMode = false,           // Whether we're in quiz mode
		onComplete = null,          // Callback for quiz mode when question is complete
	} = $props();

	plotIndex = plotIndex || Math.floor(Math.random() * 4) + 1;
	let guess = $state('');
	let guessState = $state('playing');
	let feedback = $state("");
	let feedbackColor = $state("var(--color-error)");
	let wrongAttempts = $state(0);
	let posterPreloader = $state(null);

	// Score display animations
	let score = new Tween(0, {duration: 300});
	let accuracy = new Tween(0, {duration: 300});

	// Update display score/accuracy based on mode
	onMount(async () => {
		if (!movie && !quizMode) {
			await fetchRandomMovie();
		}
		if (quizMode) {
			const quizId = gameState.currentQuiz.quizId;
			const quizStats = gameState.activeQuizzes[quizId];
			score.target = quizStats?.score ?? 0;
			accuracy.target = quizStats?.accuracy ?? 0;
		} else {
			score.target = gameState.globalStats.score;
			accuracy.target = gameState.globalStats.accuracy;
		}
	});

	async function fetchRandomMovie() {
		const response = await fetch('/api/movies/random');
		const newMovie = await response.json();
		movie = newMovie;

		// Preload poster
		if (posterPreloader) {
			posterPreloader.onload = null;
			posterPreloader.onerror = null;
		}
		posterPreloader = new Image();
		posterPreloader.src = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
	}

	function updateScore(success, gaveUp = false) {
		const difficulty = movie.plots[plotIndex].difficulty;
		let newScore = 0;

		if (success) {
			// Full points for success
			newScore = score.current + calculateQuestionScore(difficulty, wrongAttempts);
		} else if (gaveUp) {
			// Half points (rounded down) for giving up
			newScore = score.current - Math.floor(calculateQuestionScore(difficulty, 0) / 2);
		} else {
			// Third of points (rounded down) for failing
			newScore = score.current - Math.floor(calculateQuestionScore(difficulty, 0) / 3);
		}
		newScore = Math.max(0, newScore);

		if (quizMode) {
			const quizId = gameState.currentQuiz.quizId;
			// Update quiz stats
			const updatedStats = {
				score: newScore,
				totalAttempts: (gameState.activeQuizzes[quizId]?.totalAttempts ?? 0) + 1,
			};

			// Only update accuracy on actual failures (not give-ups)
			if (!gaveUp) {
				updatedStats.totalQuestionsAnswered = (gameState.activeQuizzes[quizId]?.totalQuestionsAnswered ?? 0) + 1
				const correctAnswers = success ?
					(gameState.activeQuizzes[quizId]?.totalQuestionsAnswered ?? 0) * (gameState.activeQuizzes[quizId]?.accuracy ?? 0) / 100 + (success ? 1 : 0) :
					(gameState.activeQuizzes[quizId]?.totalQuestionsAnswered ?? 0) * (gameState.activeQuizzes[quizId]?.accuracy ?? 0) / 100;

				updatedStats.accuracy = (correctAnswers / updatedStats.totalQuestionsAnswered) * 100;
			}
			else {
				updatedStats.accuracy = gameState.activeQuizzes[quizId]?.accuracy ?? 0;
			}

			// Update local state
			score.target = updatedStats.score;
			accuracy.target = updatedStats.accuracy;
			// Background sync to DB
			updateQuizProgress(quizId, updatedStats);
		} else {
			// Update global stats
			const updatedStats = {
				score: newScore,
				totalAttempts: gameState.globalStats.totalAttempts + 1,
			};

			// Only update accuracy on actual failures (not give-ups)
			if (!gaveUp) {
				updatedStats.totalQuestionsAnswered = gameState.globalStats.totalQuestionsAnswered + 1;
				const correctAnswers = success ?
					(gameState.globalStats.totalQuestionsAnswered * (gameState.globalStats.accuracy / 100)) + 1 :
					(gameState.globalStats.totalQuestionsAnswered * (gameState.globalStats.accuracy / 100));

				updatedStats.accuracy = (correctAnswers / updatedStats.totalQuestionsAnswered) * 100;
			}
			else {
				updatedStats.accuracy = gameState.globalStats.accuracy;
			}

			// Update local state
			score.target = updatedStats.score;
			accuracy.target = updatedStats.accuracy;
			// Background sync to DB
			updateGlobalStats(updatedStats);
		}
	}

	async function handleNext() {
		if (quizMode) {
			if (onComplete) {
				onComplete();
			}
			guess = '';
			guessState = 'playing';
			feedback = '';
			wrongAttempts = 0;
		} else {
			await selectRandomMovie();
		}
	}

	async function selectRandomMovie() {
		await fetchRandomMovie();
		plotIndex = Math.floor(Math.random() * 4) + 1;
		guessState = 'playing';
		guess = '';
		feedback = '';
		wrongAttempts = 0;
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

	function fail(theFeedback, color) {
		feedback = theFeedback || "FAILED";
		feedbackColor = color || "var(--color-error)";
		guess = "";
		wrongAttempts++;

		if (plotIndex > 0) {
			plotIndex--;
		}

		setTimeout(() => {
			feedback = "";
		}, 1000);

		// Only update score/accuracy if it's a real fail (not "YOU'RE CLOSE!")
		if (theFeedback === "FAILED") {
			updateScore(false);
		}
	}

	function checkGuess() {
		if (!guess) {
			fail();
			return;
		}

		const normalizedGuess = normalizeString(guess);
		const normalizedTitle = normalizeString(movie.title);

		// Split into words for partial matching
		const guessWords = normalizedGuess.split(' ');
		const titleWords = normalizedTitle.split(' ');

		// Sequential word matching
		let titleIdx = 0;
		let allWordsMatch = true;
		let matchCount = 0;

		for (const word of guessWords) {
			if (word.length <= 1) {
				allWordsMatch = false;
				break;
			}

			let found = false;
			while (titleIdx < titleWords.length) {
				if (titleWords[titleIdx].includes(word)) {
					found = true;
					matchCount++;
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

		const missingWords = titleWords.length - matchCount;
		if ((allWordsMatch && titleWords.length > 3 && missingWords <= 1) ||
			(allWordsMatch && titleWords.length <= 3 && missingWords === 0)) {
			guessState = 'success';
			updateScore(true);
			return;
		}

		// Franchise pattern matching
		const franchiseMatch = normalizedTitle.match(/^(.+?)(?::\s*)?(?:part \d+|[123]\b|\s+\d+)?$/);
		if (franchiseMatch && normalizeString(franchiseMatch[1]) === normalizedGuess) {
			guessState = 'success';
			updateScore(true);
			return;
		}

		let theFeedback = "FAILED";
		let color = "var(--color-error)";
		if ((matchCount >= 2 && titleWords.length > 3) || (matchCount === 1 && titleWords.length <= 3)) {
			theFeedback = "YOU'RE CLOSE!";
			color = "var(--color-success)";
		}

		fail(theFeedback, color);
	}

	function giveUp() {
		guessState = 'gaveup';
		updateScore(false, true); // Pass true for gaveUp parameter
	}
</script>

{#if score.target !== -1 && accuracy.target !== -1}
	<div class="game-status" in:fade>
		<div class="stats">
			<span>Score: {Math.floor(score.current)}</span>
			<span>Accuracy: {accuracy.current.toFixed(1)}%</span>
		</div>
		{#if feedback}
			<div class="feedback" in:fade style="color: {feedbackColor}">
				{feedback}
			</div>
		{/if}
	</div>
{/if}

{#if movie}
	<div class="content" in:fade>
		{#if guessState === 'playing'}
			<div class="plot-container">
				<div class="plot-difficulty">
					<span class="difficulty-label">Level:</span>
					{#each Array(5) as _, i}
						<button class="star-button">
                                <span>
                                    {#if i < movie.plots[plotIndex].difficulty}
                                        <img class="fire" src="/images/difficulty_on.svg" alt="Difficulty On" />
                                    {:else}
                                        <img class="fire" src="/images/difficulty_off.svg" alt="Difficulty Off" />
                                    {/if}
                                </span>
						</button>
					{/each}
				</div>
				{#key movie.plots[plotIndex].plot}
					<div class="plot" in:fade={{duration:800}}>
						{movie.plots[plotIndex].plot}
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
					{#if !quizMode}
						<button class="button secondary-button" onclick={selectRandomMovie} title="Get another random movie">
							<img src="/images/refresh.svg" alt="Refresh" class="refresh-icon" />
						</button>
					{/if}
					<button class="button primary-button" onclick={checkGuess}>
						Submit Guess
					</button>
					<button class="button error-button" onclick={giveUp}>
						Give Up
					</button>
				</div>
			</div>
		{:else}
			<MovieResult
				movie={movie}
				gameState={guessState}
				onPlayAgain={!quizMode ? selectRandomMovie : undefined}
				onNext={quizMode ? handleNext : undefined}
			/>
		{/if}
	</div>
{:else}
	<div class="loading">
		<Jumper size={80} color={"var(--color-primary)"} unit="px" duration="1s"/>
	</div>
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

	.feedback {
		position: fixed;
		top: 35%;
		left: 50%;
		transform: translate(-50%, -50%);
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

	.refresh-icon {
		width: 36px;
		height: 36px;
	}

	.stats {
		display: flex;
		gap: var(--spacing-xl);
		font-size: var(--font-size-lg);
		color: var(--color-primary);
		margin-bottom: var(--spacing-md);
	}
</style>