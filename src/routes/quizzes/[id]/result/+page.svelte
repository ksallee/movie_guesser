<script>
    import { gameState } from '$lib/state/gameState';
    import { fade } from 'svelte/transition';
    import { page } from '$app/state';
    import { goto } from '$app/navigation';

    const quizId = page.params.id;
    const quizStats = gameState.completedQuizzes[quizId] || {
        score: 0,
        accuracy: 0,
        totalQuestionsAnswered: 0
    };

    function exploreMoreQuizzes() {
        goto('/quizzes');
    }

    function goHome() {
        goto('/');
    }
</script>

<div class="results-container" in:fade>
    <h1>Quiz Complete!</h1>

    <div class="stats-display">
        <div class="stat-item">
            <span class="stat-label">Final Score</span>
            <span class="stat-value">{quizStats.score}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Accuracy</span>
            <span class="stat-value">{quizStats.accuracy.toFixed(1)}%</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Questions Answered</span>
            <span class="stat-value">{quizStats.totalQuestionsAnswered}</span>
        </div>
    </div>

    <div class="message">
        {#if quizStats.accuracy >= 80}
            <p>Outstanding performance! You're a true movie buff! 🏆</p>
        {:else if quizStats.accuracy >= 60}
            <p>Great job! Your movie knowledge is impressive! 🎬</p>
        {:else if quizStats.accuracy >= 40}
            <p>Good effort! Keep watching more movies! 🎥</p>
        {:else}
            <p>Practice makes perfect! Try another quiz! 🎮</p>
        {/if}
    </div>

    <div class="action-buttons">
        <button class="button primary-button" on:click={exploreMoreQuizzes}>
            Explore More Quizzes
        </button>
        <button class="button secondary-button" on:click={goHome}>
            Back to Home
        </button>
    </div>
</div>

<style>
    .results-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--spacing-2xl);
        max-width: 800px;
        margin: 0 auto;
        padding: var(--spacing-xl);
        text-align: center;
    }

    h1 {
        font-size: var(--font-size-2xl);
        color: var(--color-primary);
        margin: 0;
    }

    .stats-display {
        display: flex;
        gap: var(--spacing-xl);
        padding: var(--spacing-xl);
        background: var(--color-neutral-100);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-md);

        @media (max-width: 768px) {
            flex-direction: column;
            gap: var(--spacing-lg);
        }
    }

    .stat-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--spacing-md);
        padding: var(--spacing-lg);
        min-width: 180px;
    }

    .stat-label {
        font-size: var(--font-size-lg);
        color: var(--color-neutral-400);
    }

    .stat-value {
        font-size: var(--font-size-2xl);
        font-weight: var(--font-weight-bold);
        color: var(--color-primary);
    }

    .message {
        font-size: var(--font-size-xl);
        color: var(--color-secondary);
        max-width: 600px;
        line-height: 1.4;
    }

    .action-buttons {
        display: flex;
        gap: var(--spacing-xl);

        @media (max-width: 768px) {
            flex-direction: column;
            gap: var(--spacing-md);
        }
    }
</style>