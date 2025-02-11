<script>
	import { gameState } from '$lib/state/gameState';
	import { fade } from 'svelte/transition';
	import SEO from '$lib/components/SEO.svelte';
</script>

<SEO />
<div class="landing-container" in:fade>
	<div class="stats-display">
		<div class="stat-item">
			<span class="stat-label">Total Score</span>
			<span class="stat-value">{gameState.globalStats.score}</span>
		</div>
		<div class="stat-item">
			<span class="stat-label">Accuracy</span>
			<span class="stat-value">{gameState.globalStats.accuracy.toFixed(1)}%</span>
		</div>
		<div class="stat-item">
			<span class="stat-label">Questions Answered</span>
			<span class="stat-value">{gameState.globalStats.totalQuestionsAnswered}</span>
		</div>
	</div>

	<div class="game-modes">
		<a href="/random" class="mode-button">
			<span class="mode-title">Random Movies</span>
			<span class="mode-description">Get random movie plots and test your knowledge!</span>
		</a>

		<a href="/quizzes" class="mode-button">
			<span class="mode-title">Movie Quizzes</span>
			<span class="mode-description">Take curated quizzes with themed movie collections!</span>
		</a>
	</div>
</div>

<style>
	.landing-container {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		gap: var(--spacing-2xl);
		max-width: 800px;
		margin: 0 auto;
		padding: var(--spacing-xl);
		@media (max-width: 768px) {
			padding: var(--spacing-sm) 0; /* Only vertical padding */
			gap: var(--spacing-lg);
		}
	}

	.stats-display {
		display: flex;
		gap: var(--spacing-xl);
		padding: var(--spacing-lg);
		background: var(--color-neutral-100);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-md);
		@media (max-width: 768px) {
			gap: var(--spacing-sm); /* Reduce gap on mobile */
			padding: var(--spacing-md); /* Reduce padding on mobile */
			width: 100%; /* Ensure full width */
			flex-wrap: wrap; /* Allow wrapping if needed */
			justify-content: center; /* Center items if they wrap */
		}

	}

	.stat-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--spacing-xs);
		padding: var(--spacing-md);
		justify-content: space-between;
	}

	.stat-label {
		font-size: var(--font-size-sm);
		color: var(--color-neutral-400);
	}

	.stat-value {
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-bold);
		color: var(--color-primary);
	}

	.game-modes {
		display: flex;
		gap: var(--spacing-xl);
		width: 100%;
		max-width: 600px;

		@media (max-width: 768px) {
			flex-direction: column;
		}
	}

	.mode-button {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--spacing-md);
		padding: var(--spacing-xl);
		background: var(--color-neutral-100);
		border-radius: var(--radius-lg);
		border: 2px solid var(--color-primary);
		transition: all 0.2s ease;
		text-align: center;
		min-height: 200px;

		&:hover {
			transform: translateY(-4px);
			border-color: var(--color-primary-light);
			background: var(--color-neutral-200);
		}
	}

	.mode-title {
		font-size: var(--font-size-xl);
		font-weight: var(--font-weight-bold);
		color: var(--color-primary);
	}

	.mode-description {
		font-size: var(--font-size-sm);
		color: var(--color-neutral-500);
		line-height: 1.4;
	}
</style>