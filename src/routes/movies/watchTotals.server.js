import { env } from '$env/dynamic/private';

const cache = new Map();
const pending = new Map();

export function watchRuntime(type, id, fetch) {
	const key = `${type}/${id}`;
	const cached = cache.get(key);
	if (cached && Date.now() - cached.time < 60 * 60_000) return Promise.resolve(cached.value);
	if (pending.has(key)) return pending.get(key);
	const request = (async () => {
		try {
			const response = await fetch(`https://api.themoviedb.org/3/${key}`, {
				headers: { Authorization: `Bearer ${env.TMDB_ACCESS_TOKEN}` },
				signal: AbortSignal.timeout(12000)
			});
			if (!response.ok) return 0;
			const details = await response.json();
			// A list records whole series, not episode viewing history.
			const episodeRuntimes = (details.episode_run_time ?? []).filter(value => value > 0);
			const episodeRuntime = episodeRuntimes.length
				? episodeRuntimes.reduce((sum, value) => sum + value, 0) / episodeRuntimes.length
				: details.last_episode_to_air?.runtime || 0;
			const value = type === 'tv' ? episodeRuntime * (details.number_of_episodes || 0) : details.runtime || 0;
			if (value > 0) cache.set(key, { value, time: Date.now() });
			return value;
		} catch { return 0; }
		finally { pending.delete(key); }
	})();
	pending.set(key, request);
	return request;
}

export async function runtimeTotals(items, fetch) {
	let minutes = 0;
	let missing = 0;
	for (let index = 0; index < items.length; index += 8) {
		const runtimes = await Promise.all(items.slice(index, index + 8).map(item =>
			watchRuntime(item.type, item.id ?? item.key.split('/')[1], fetch)));
		for (const runtime of runtimes) {
			minutes += runtime;
			if (!runtime) missing++;
		}
	}
	return { minutes, missing };
}
