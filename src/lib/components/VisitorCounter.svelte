<script>
  import { onMount } from 'svelte';
  import { Tween } from 'svelte/motion';

  // Initialize the tween with 0
  const count = new Tween(0);

  onMount(() => {
    const fetchCount = async () => {
      try {
        // Use our server endpoint instead of calling Umami directly
        const response = await fetch('/api/stats');

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        count.target = data.visitors.value;
      } catch (error) {
        console.error('Error fetching visitor count:', error);
        // Don't set to 0 on error to keep the last known value
        if (!count.current) count.target = 0;
      }
    };

    // Initial fetch
    fetchCount();

    // Poll every 30 seconds
    const interval = setInterval(fetchCount, 30000);

    return () => {
      clearInterval(interval);
    };
  });
</script>

<div class="visitor-counter">
  <span class="label">Players:</span>
	{#if count.current}
		<span class="count">{Math.round(count.current)}</span>
	{:else}
		<span class="count">...</span>
	{/if}
</div>

<style>
  .visitor-counter {
    display: inline-flex;
    align-items: center;
    align-self: flex-start;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-neutral-200);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    color: var(--color-neutral-500);
    white-space: nowrap;
  }

  .count {
    font-weight: var(--font-weight-semibold);
    color: var(--color-primary);
  }
</style>