import { env } from '$env/dynamic/private';
import { fetchLibrary } from '$lib/books/hardcover.server.js';
import snapshot from '$lib/books/snapshot.json';

const ttl = 5 * 60_000;
let cached;
let pending;
let pendingUser;
let attemptedAt = 0;
let attemptedUser;

export async function load({ fetch, setHeaders }) {
	const username = env.HARDCOVER_USERNAME?.trim() || 'ozprey7';
	const token = env.HARDCOVER_API_TOKEN?.trim();
	if (token && (attemptedUser !== username || Date.now() - attemptedAt >= ttl) && !pending) {
		attemptedAt = Date.now();
		attemptedUser = username;
		pendingUser = username;
		pending = fetchLibrary(fetch, token, username)
			.then(result => { cached = result; })
			.catch(() => {})
			.finally(() => { pending = null; pendingUser = null; });
	}
	if (pendingUser === username) await pending;
	const library = cached?.username === username ? cached : snapshot.username === username ? snapshot : null;
	setHeaders({ 'cache-control': 'public, max-age=60, s-maxage=300' });
	return {
		books: library?.books ?? [],
		profile: { username, url: `https://hardcover.app/@${encodeURIComponent(username)}` },
		updatedAt: library?.updatedAt ?? null,
		stale: !library || !token || library !== cached || Date.now() - library.updatedAt >= ttl,
		unavailable: !library
	};
}
