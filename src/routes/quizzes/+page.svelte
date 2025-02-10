<script>
	import { fade } from 'svelte/transition';
	import { gameState } from '$lib/state/gameState';
	import { Jumper } from 'svelte-loading-spinners';
	import { onMount } from 'svelte';

	let quizzes = $state([]);
	let loading = $state(true);

	onMount(async () => {
		const response = await fetch('/api/quizzes');
		const data = await response.json();
		quizzes = data.quizzes;
		loading = false;
	});

	function handleQuizClick(event, quiz) {
		if (gameState.completedQuizzes[quiz.id]) {
			event.preventDefault();
		}
	}
</script>

<div class="quizzes-container" in:fade>
	{#if loading}
		<div class="loading">
			<Jumper size={80} color={"var(--color-primary)"} unit="px" duration="1s"/>
		</div>
	{:else}
		<div class="quizzes-grid">
			{#each quizzes as quiz (quiz.id)}
				<a
					href={`/quizzes/${quiz.id}`}
					class="quiz-card {gameState.completedQuizzes[quiz.id] ? 'completed' : ''}"
					onclick={(e) => handleQuizClick(e, quiz)}
					in:fade
				>
					<div class="quiz-top">
						<h2 class="quiz-title">{quiz.title}</h2>
					</div>

					<div class="quiz-bottom">
						<div class="quiz-details">
							<div class="quiz-difficulty">
								{#each Array(5) as _, i}
                                    <span>
                                        {#if i < quiz.difficulty}
                                            <img class="fire" src="/images/difficulty_on.svg" alt="Difficulty On" />
                                        {:else}
                                            <img class="fire" src="/images/difficulty_off.svg" alt="Difficulty Off" />
                                        {/if}
                                    </span>
								{/each}
							</div>
							<span class="quiz-questions">{quiz.questions.length} Questions</span>
						</div>

						{#if gameState.completedQuizzes[quiz.id]}
							<div class="quiz-completed">
								<span class="success">Completed</span>
								<span>Score: {gameState.completedQuizzes[quiz.id].score || 0}</span>
								<span>Accuracy: {gameState.completedQuizzes[quiz.id].accuracy.toFixed(1) || 0}%</span>
							</div>
						{/if}
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>

<style>
	.quizzes-container {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: var(--spacing-xl);
		max-width: 1200px;
		margin: 0 auto;
		width: 100%;

		@media (max-width: 768px) {
			padding: var(--spacing-md);
		}
	}

	.quizzes-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: var(--spacing-xl);
		width: 100%;

		@media (max-width: 768px) {
			grid-template-columns: 1fr;
			gap: var(--spacing-md);
		}
	}

	.quiz-card {
		background: var(--color-neutral-100);
		border: 2px solid var(--color-neutral-200);
		border-radius: var(--radius-lg);
		padding: var(--spacing-lg);
		transition: all 0.2s ease;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		min-height: 180px;
		text-decoration: none;
		cursor: pointer;

		@media (max-width: 768px) {
			min-height: 140px;
			padding: var(--spacing-md);
		}

		&:not(.completed):hover {
			transform: translateY(-4px);
			border-color: var(--color-primary);
			background: var(--color-neutral-200);
		}
	}

	.quiz-card.completed {
		background: var(--color-neutral-50);
		border-color: var(--color-neutral-200);
		cursor: not-allowed;
		opacity: 0.8;
	}

	.quiz-top {
		margin-bottom: var(--spacing-lg);
	}

	.quiz-title {
		font-size: var(--font-size-lg);
		color: var(--color-primary);
		font-weight: var(--font-weight-medium);

		@media (max-width: 768px) {
			font-size: var(--font-size-md);
		}
	}

	.completed .quiz-title {
		color: var(--color-neutral-400);
	}

	.quiz-bottom {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.quiz-details {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.quiz-difficulty {
		display: flex;
		gap: var(--spacing-xs);
	}

	.fire {
		width: 20px;
		height: 20px;
	}

	.quiz-questions {
		color: var(--color-neutral-400);
		font-size: var(--font-size-sm);
	}

	.quiz-completed {
		display: flex;
		flex-direction: row;
		gap: var(--spacing-xs);
		color: var(--color-neutral-500);
		font-size: var(--font-size-sm);
		margin-top: var(--spacing-xs);
	}

	.success {
		color: var(--color-success);
	}
</style>