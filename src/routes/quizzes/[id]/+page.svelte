<script>
    import { onMount } from 'svelte';
    import { fade } from 'svelte/transition';
    import { page } from '$app/state';
    import MovieGuesser from '$lib/components/MovieGuesser.svelte';
    import { gameState, initializeQuiz, advanceQuestion } from '$lib/state/gameState';
    import { Jumper } from 'svelte-loading-spinners';

    let loading = $state(true);

    onMount(async () => {
        const quizId = page.params.id;

        // First check if we have it in state and it matches current quiz
        if (gameState.currentQuiz.quizId === quizId && gameState.currentQuiz.quiz) {
            loading = false;
            return;
        }

        // Otherwise fetch from API
        try {
            const response = await fetch(`/api/quizzes/${quizId}`);
            const data = await response.json();

            // Normalize plot indices
            data.quiz.questions.forEach(question => {
                question.plot_index = Math.max(0, question.plot_index - 1);
            });

            // Initialize quiz state
            await initializeQuiz(quizId, data.quiz);
        } catch (error) {
            console.error('Error fetching quiz:', error);
        } finally {
            loading = false;
        }
    });

    function handleQuestionComplete() {
        advanceQuestion();
    }
</script>

<div class="quiz-container" in:fade>
    {#if loading}
        <div class="loading">
            <Jumper size={80} color={"var(--color-primary)"} unit="px" duration="1s"/>
        </div>
    {:else if gameState.currentQuiz.quiz}
        <div class="quiz-header">
            <h2 class="quiz-title">{gameState.currentQuiz.quiz.title}</h2>
            <div class="quiz-progress">
                Question {gameState.currentQuiz.currentQuestionIndex + 1}/{gameState.currentQuiz.totalQuestions}
            </div>
        </div>

        {#if gameState.currentQuiz.currentMovie}
            <MovieGuesser
                movie={gameState.currentQuiz.currentMovie}
                plotIndex={gameState.currentQuiz.currentQuestion.plot_index}
                onComplete={handleQuestionComplete}
                quizMode={true}
                quizId={page.params.id}
                isLastQuestion={gameState.currentQuiz.isLastQuestion}
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