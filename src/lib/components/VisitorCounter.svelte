<script>
  import { onMount } from 'svelte';
  import { Tween } from 'svelte/motion';
  import { dev } from '$app/environment';

  const WEBSITE_ID = '4e15035b-7c4c-4239-914a-3187a48999bd';
  const API_KEY = 'iNBXkoQNEfmdOoQXxrjezbQ5PGxVoCOx';

  // Initialize the tween with 0
  const count = new Tween(0, {
    duration: 800,
    easing: t => t * (2 - t)
  });


  onMount(() => {
    const fetchCount = async () => {
      try {

        const response = await fetch(`https://cloud.umami.is/api/websites/${WEBSITE_ID}/stats`, {
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
				console.log("data", data);
        const pageviews = data.pageviews.value;

        count.target = pageviews;
      } catch (error) {
        console.error('Error fetching visitor count:', error);
        // On error, just show a fallback
				count.target = 0;
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
  <span class="count">{Math.round(count.current)}</span>
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