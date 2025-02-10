<script>
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { page } from '$app/state';
	import MovieGuesser from '$lib/components/MovieGuesser.svelte';
	import { gameState, updateQuizProgress } from '$lib/state/gameState';
	import { Jumper } from 'svelte-loading-spinners';

	let quiz = $state(null);
	let loading = $state(true);
	let currentQuestionIndex = $state(0);
	let currentQuestion = $state(null);
	let currentMovie = $state(null);
	let progress = $state(0);
	let isLastQuestion = $state(false);

	onMount(async () => {
		const quizId = page.params.id;

		// First check if we have it in state
		if (gameState.activeQuizzes[quizId]) {
			quiz = gameState.activeQuizzes[quizId];
			currentQuestionIndex = quiz.currentQuestionIndex || 0;
			loading = false;
		}

		// Then fetch from API
		try {
			const response = await fetch(`/api/quizzes/${quizId}`);
			const data = await response.json();
			// data[questions][i][plot_index] is one based instead of zero based.
			// Subtract 1 from plot_index to get the correct index.
			data.quiz.questions.forEach(question => {
				question.plot_index = Math.max(0, question.plot_index - 1);
			});
			quiz = data.quiz;

			if (!quiz || !quiz.movies) {
				// Initialize new quiz state
				quiz = {
					...data.quiz,
					currentQuestionIndex: 0,
					score: 0,
					accuracy: 0,
					totalAttempts: 0,
					totalQuestionsAnswered: 0
				};

				// Update state
				gameState.activeQuizzes[quizId] = quiz;
			}
			setData();
		} catch (error) {
			console.error('Error fetching quiz:', error);
		} finally {
			loading = false;
		}
	});

	function handleQuestionComplete() {
		const quizId = page.params.id;

		// Update quiz progress
		currentQuestionIndex++;
		quiz.currentQuestionIndex = currentQuestionIndex;


		if (currentQuestionIndex >= quiz.questions.length - 1){
			isLastQuestion = true;
		}

		updateQuizProgress(quizId, quiz);
		setData();
	}
	function setData(){
		currentQuestion = quiz?.questions?.[currentQuestionIndex];
		currentMovie = quiz.movies[currentQuestion.movie_id];
		progress = `Question ${currentQuestionIndex + 1}/${quiz.questions.length}`;
	}

</script>

<div class="quiz-container" in:fade>
	{#if loading}
		<div class="loading">
			<Jumper size={80} color={"var(--color-primary)"} unit="px" duration="1s"/>
		</div>
	{:else if quiz}
		<div class="quiz-header">
			<h2 class="quiz-title">{quiz.title}</h2>
			<div class="quiz-progress">{progress}</div>
		</div>

		{#if currentMovie}
			<MovieGuesser
				movie={currentMovie}
				plotIndex={currentQuestion.plot_index}
				onComplete={handleQuestionComplete}
				quizMode={true}
				quizId={page.params.id}
				isLastQuestion={isLastQuestion}
			/>
		{/if}
	{/if}
</div>

<style>
	.quiz-container {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: var(--spacing-xl);
		max-width: 800px;
		margin: 0 auto;
		width: 100%;

		@media (max-width: 768px) {
			padding: var(--spacing-md);
		}
	}

	.quiz-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--spacing-md);
		margin-bottom: var(--spacing-xl);
	}

	.quiz-title {
		font-size: var(--font-size-xl);
		color: var(--color-primary);
		font-weight: var(--font-weight-medium);
	}

	.quiz-progress {
		font-size: var(--font-size-lg);
		color: var(--color-neutral-400);
	}
</style>