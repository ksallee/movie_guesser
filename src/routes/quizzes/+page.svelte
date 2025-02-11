<script>
	import { fade } from 'svelte/transition';
	import { gameState } from '$lib/state/gameState';
	import { Jumper } from 'svelte-loading-spinners';
	import { onMount } from 'svelte';
	import SEO from '$lib/components/SEO.svelte';

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

	function getQuizStatus(quiz) {
		if (gameState.completedQuizzes[quiz.id]) {
			return 'completed';
		}
		return gameState.activeQuizzes[quiz.id] ? 'in-progress' : 'not-started';
	}
</script>

<SEO title="Guess the plot Quizzes" description="Test your knowledge with our movie quizzes!"
 image="/images/quizzes_preview.jpg"/>
<div class="quizzes-container" in:fade>
	{#if loading}
		<div class="loading">
			<Jumper size={80} color={"var(--color-primary)"} unit="px" duration="1s"/>
		</div>
	{:else}
		<div class="quizzes-grid">
			{#each quizzes as quiz (quiz.id)}
				{@const status = getQuizStatus(quiz)}
				<a
					href={`/quizzes/${quiz.id}`}
					class="quiz-card {status}"
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

						{#if status === 'completed'}
							<div class="quiz-completed">
								<span class="success">Completed</span>
								<div class="progress-details">
									<span>Score: {gameState.completedQuizzes[quiz.id].score || 0}</span>
									<span>Accuracy: {gameState.completedQuizzes[quiz.id].accuracy.toFixed(1) || 0}%</span>
								</div>
								<div class="progress-bar">
									<div
										class="progress-fill success"
										style="width: 100%"
									></div>
								</div>
							</div>
						{:else if status === 'in-progress'}
							<div class="quiz-progress">
								<span class="in-progress">In Progress</span>
								<div class="progress-details">
									<span>Question {(gameState.activeQuizzes[quiz.id].currentQuestionIndex + 1)} of {quiz.questions.length}</span>
									<span>Score: {gameState.activeQuizzes[quiz.id].score || 0}</span>
									<span>Accuracy: {gameState.activeQuizzes[quiz.id].accuracy?.toFixed(1) || 0}%</span>
								</div>
								<div class="progress-bar">
									<div
										class="progress-fill"
										style="width: {((gameState.activeQuizzes[quiz.id].currentQuestionIndex + 1) / quiz.questions.length) * 100}%"
									></div>
								</div>
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
		border-color: var(--color-success);
		cursor: not-allowed;
	}

	.quiz-card.in-progress {
		border-color: var(--color-primary-light);
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
		color: var(--color-success);
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

	.quiz-completed, .quiz-progress {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
		font-size: var(--font-size-sm);
		margin-top: var(--spacing-xs);
	}

	.success {
		color: var(--color-success);
	}

	.in-progress {
		color: var(--color-primary-light);
	}

	.progress-details {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-xs);
		color: var(--color-neutral-500);
	}

	.progress-bar {
		width: 100%;
		height: 4px;
		background: var(--color-neutral-200);
		border-radius: var(--radius-sm);
		overflow: hidden;
		margin-top: var(--spacing-xs);
	}

	.progress-fill {
		height: 100%;
		background: var(--color-primary-light);
		transition: width 0.3s ease;
	}

	.progress-fill.success {
		background: var(--color-success);
	}
</style>