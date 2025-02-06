<script>
  import { onMount } from 'svelte';
  import { Tween } from 'svelte/motion';
  import { PUBLIC_UMAMI_API_KEY } from '$env/static/public';
	console.log("PUBLIC_UMAMI_API_KEY", PUBLIC_UMAMI_API_KEY);

  const WEBSITE_ID = '4e15035b-7c4c-4239-914a-3187a48999bd';

  // Initialize the tween with 0
  const count = new Tween(0, {
    duration: 800,
    easing: t => t * (2 - t)
  });

  onMount(() => {
    const fetchCount = async () => {
      try {
        const endAt = Date.now();
        const startAt = endAt - (24 * 60 * 60 * 1000);

        const response = await fetch(`https://api.umami.is/v1/websites/${WEBSITE_ID}/stats?startAt=${startAt}&endAt=${endAt}`, {
          headers: {
            'Accept': 'application/json',
            'x-umami-api-key': PUBLIC_UMAMI_API_KEY
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("data", data);
        count.target = data.pageviews.value;
      } catch (error) {
        console.error('Error fetching visitor count:', error);
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