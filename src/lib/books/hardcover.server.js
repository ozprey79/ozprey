import { normalizeBooks } from './data.js';

export const libraryQuery = `query PortfolioBooks($username: citext!, $offset: Int!) {
	user_books(where: {user: {username: {_eq: $username}}, privacy_setting_id: {_eq: 1}}, order_by: {id: asc}, limit: 100, offset: $offset) {
		id status_id rating privacy_setting_id first_read_date last_read_date
		book { id title slug pages release_year description cached_image cached_contributors cached_tags }
		edition { pages }
		user_book_reads { finished_at }
	}
}`;

export async function fetchLibrary(fetch, token, username) {
	const rows = [];
	for (let offset = 0; ; offset += 100) {
		const response = await fetch('https://api.hardcover.app/v1/graphql', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token.trim().replace(/^Bearer\s+/i, '')}`, 'User-Agent': 'Ozprey-Portfolio/1.0' },
			body: JSON.stringify({ query: libraryQuery, variables: { username, offset } }),
			signal: AbortSignal.timeout(15000)
		});
		if (!response.ok) throw new Error(`Hardcover returned ${response.status}`);
		const result = await response.json();
		if (result.errors?.length || !Array.isArray(result.data?.user_books)) throw new Error('Hardcover library unavailable');
		rows.push(...result.data.user_books);
		if (result.data.user_books.length < 100) break;
		if (offset >= 9900) throw new Error('Hardcover library exceeds the supported size');
	}
	return { username, books: normalizeBooks(rows), updatedAt: Date.now() };
}
