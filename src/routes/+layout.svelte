<script>
	import { initializeAnonymousAuth } from '$lib/firebase';
	import { onMount } from 'svelte';
	import "../app.css";

	onMount(async () => {
		await initializeAnonymousAuth(); // Initialize anonymous auth on mount
	});
</script>

<slot />