# Svelte 5 & SvelteKit Complete Guide

## Table of Contents
1. [Svelte 5 Reactivity](#svelte-5-reactivity)
2. [Component Architecture](#component-architecture)
3. [SvelteKit Routing](#sveltekit-routing)
4. [Data Loading](#data-loading)
5. [Form Handling](#form-handling)
6. [State Management](#state-management)
7. [Server Endpoints](#server-endpoints)
8. [Deployment & Configuration](#deployment--configuration)
9. [Best Practices](#best-practices)

---

## Svelte 5 Reactivity <a name="svelte-5-reactivity"></a>

### Core Reactivity Runes
```svelte
<script>
// Reactive state
let count = $state(0);
let user = $state({ name: 'Alice', age: 30 });

// Derived state
let doubled = $derived(count * 2);
let isAdult = $derived(user.age >= 18);

// Effects
$effect(() => {
  console.log('Count changed:', count);
  return () => console.log('Cleanup');
});

// Pre-effects (run before DOM updates)
$effect.pre(() => {
  if (scrollPosition > 100) updateHeader();
});
</script>
```

### Advanced State Handling
```svelte
<script>
// Non-reactive object (requires full reassignment)
let config = $state.raw({ theme: 'dark' });

// Class-based state
class UserStore {
  name = $state('Anonymous');
  login() { /* ... */ }
}

// State snapshots
const currentState = $state.snapshot(user);
</script>
```

---

## Component Architecture <a name="component-architecture"></a>

### Props and Composition
```svelte
<!-- Parent.svelte -->
<script>
import Child from './Child.svelte';
let message = $state('Hello World');
</script>

<Child {message} modifier="bold" />

<!-- Child.svelte -->
<script>
let { message, modifier = 'normal' } = $props();
let styledMessage = $derived(`<${modifier}>${message}</${modifier}>`);
</script>

<div>{@html styledMessage}</div>
```

### Slots and Context
```svelte
<!-- Layout.svelte -->
<script>
import { setContext } from 'svelte';
let theme = $state('dark');
setContext('theme', theme);
</script>

<main class={theme}>
  <slot />
</main>

<!-- Consumer.svelte -->
<script>
import { getContext } from 'svelte';
const theme = getContext('theme');
</script>
```

---

## SvelteKit Routing <a name="sveltekit-routing"></a>

### File System Routing
```
src/routes/
├ (auth)/
│ ├ login/
│ │ └ +page.svelte
│ └ register/
│   └ +page.svelte
├ blog/
│ └ [slug]/
│   ├ +page.svelte
│   └ +page.server.js
└ +layout.svelte
```

### Dynamic Routes and Params
```svelte
<!-- [slug]/+page.svelte -->
<script>
import { page } from '$app/state';
let slug = $derived(page.params.slug);
</script>

<h1>{slug}</h1>

<!-- +page.server.js -->
export async function load({ params }) {
  return { post: await getPost(params.slug) };
}
```

### Layout Inheritance
```svelte
<!-- Root layout (+layout.svelte) -->
<script>
let user = $state(null);
</script>

<nav>{user?.name || 'Guest'}</nav>
<slot />

<!-- Nested layout (+layout.svelte) -->
<script>
let { data } = $props();
</script>

<aside>Related content: {data.related}</aside>
<slot />
```

---

## Data Loading <a name="data-loading"></a>

### Server-Side Loading
```javascript
// +page.server.js
export async function load({ fetch, cookies }) {
  return {
    user: await fetchUser(cookies.get('sessionid')),
    posts: await fetch('/api/posts').then(r => r.json())
  };
}
```

### Client-Side Loading
```javascript
// +page.js
export async function load({ fetch }) {
  return {
    trending: await fetch('/api/trending').then(r => r.json())
  };
}
```

### Hybrid Loading
```svelte
<script>
import { page } from '$app/state';
let combinedData = $derived({
  ...page.data.serverData,
  ...page.data.clientData
});
</script>
```

---

## Form Handling <a name="form-handling"></a>

### Basic Form Action
```javascript
// +page.server.js
export const actions = {
  default: async ({ request }) => {
    const data = await request.formData();
    const user = await createUser(data);
    return { success: true, userId: user.id };
  }
};
```

### Progressive Enhancement
```svelte
<script>
import { enhance } from '$app/forms';
let formResult = $state(null);
</script>

<form method="POST" use:enhance={() => {
  return async ({ result }) => {
    formResult = result;
  };
}}>
  <input name="email">
  <button>Submit</button>
</form>
```

---

## State Management <a name="state-management"></a>

### URL-Based State
```svelte
<script>
import { page, goto } from '$app/state';

let filters = $derived({
  sort: page.url.searchParams.get('sort') || 'date',
  category: page.url.searchParams.get('category') || 'all'
});

function updateFilters(newFilters) {
  goto(`?sort=${newFilters.sort}&category=${newFilters.category}`);
}
</script>
```

### Persistent Client State
```javascript
// stores.js
export const recentSearches = $state([]);
```

---

## Server Endpoints <a name="server-endpoints"></a>

### REST API Endpoint
```javascript
// api/users/+server.js
export async function GET({ url }) {
  const limit = Number(url.searchParams.get('limit')) || 10;
  return new Response(JSON.stringify(await getUsers(limit)), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### Webhook Handler
```javascript
// webhooks/stripe/+server.js
export async function POST({ request }) {
  const event = await parseStripeEvent(request);
  await handleStripeEvent(event);
  return new Response('OK');
}
```

---

## Deployment & Configuration <a name="deployment--configuration"></a>

### Adapter Configuration
```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-vercel';

export default {
  kit: {
    adapter: adapter({
      runtime: 'edge'
    }),
    prerender: {
      crawl: true,
      entries: ['*']
    }
  }
};
```

### Environment Variables
```javascript
// .env
PUBLIC_API_URL=https://api.example.com
SECRET_API_KEY=xyz123

// Usage
const apiUrl = import.meta.env.PUBLIC_API_URL;
```

---

## Best Practices <a name="best-practices"></a>

1. **Data Loading**
```javascript
// Good
export async function load({ fetch }) {
  const [posts, user] = await Promise.all([
    fetch('/api/posts'),
    fetch('/api/user')
  ]);
  return { posts: await posts.json(), user: await user.json() };
}
```

2. **Error Handling**
```svelte
<!-- +error.svelte -->
<script>
import { page } from '$app/state';
</script>

{#if page.status === 404}
  <h1>Page not found</h1>
{:else}
  <h1>Error {page.status}</h1>
{/if}
```

3. **Performance**
```javascript
// Use $derived for expensive calculations
let sortedItems = $derived(
  [...items].sort((a, b) => a.price - b.price)
);
```

4. **Security**
```javascript
// Sanitize user input
import { sanitize } from 'dompurify';
let cleanHTML = $derived(sanitize(userContent));
```

---

# Official Resources
- [Svelte Documentation](https://svelte.dev/docs)
- [SvelteKit Documentation](https://kit.svelte.dev/docs)
- [Svelte Society](https://sveltesociety.dev/)
- [Svelte GitHub](https://github.com/sveltejs/svelte)