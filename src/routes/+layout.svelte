<script>
	import '../app.pcss';
	import { browser } from '$app/environment';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';

	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				refetchOnWindowFocus: false,
				enabled: browser
			}
		}
	});
</script>

<QueryClientProvider client="{queryClient}">
	<slot />
</QueryClientProvider>
