<script>
    import { initializeAnonymousAuth } from '$lib/firebase';
    import { onMount } from 'svelte';
    import { syncGlobalStats } from '$lib/state/gameState';
    import VisitorCounter from '$lib/components/VisitorCounter.svelte';
    import "../app.css";

    onMount(async () => {
        await initializeAnonymousAuth();
        await syncGlobalStats(); // Sync stats when app loads
    });
</script>

<svelte:head>
  <title>Guess The Movie - A Movie Plot Guessing Game</title>
  <meta name="description" content="Test your movie knowledge by guessing films from their plot descriptions. A fun and challenging movie guessing game." />
  <meta property="og:image" content="/images/question_preview.webp" />
  <meta property="og:image:width" content="256" />
  <meta property="og:image:height" content="256" />
</svelte:head>

<div class="game-container">
    <h1 class="game-title"><a href="/">Guess The Movie</a></h1>
    <slot />
    <div class="footer">
        <VisitorCounter />
        <p class="footer-text">Made with ❤️ by <a href="mailto:kevin.sallee@gmail.com">Kevin Sallée</a></p>
    </div>
</div>

<style>
    .game-container {
        min-height: 100svh;
        width: 100svw;
        display: flex;
        flex-direction: column;
        padding: var(--spacing-md);
        background: var(--color-bg);
        color: var(--color-text);
        @media (max-width: 768px) {
            padding: var(--spacing-sm);
        }
    }

    .game-title {
        text-align: center;
        color: var(--color-primary);
        font-size: var(--font-size-2xl);
        font-weight: var(--font-weight-normal);
        margin-top: var(--spacing-lg);
    }

    .footer {
        display: flex;
        flex-direction: row;
        align-items: center;
        width: 100%;
        justify-content: space-between;
        gap: var(--spacing-lg);
        margin-top: auto;
				margin-bottom: var(--spacing-sm);
    }

    .footer-text {
        font-size: var(--font-size-xs);
        color: var(--color-neutral-500);
        text-align: right;
    }

    a {
        color: var(--color-primary);
        white-space: nowrap;
    }
</style>