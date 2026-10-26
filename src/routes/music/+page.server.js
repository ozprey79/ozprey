import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const API = 'https://ws.audioscrobbler.com/2.0/';
const DAY_SECONDS = 24 * 60 * 60;
const DAYS_SHOWN = 7;
const PAGE_SIZE = 200;
const MAX_PAGES = 10;

function asArray(value) {
	if (!value) return [];
	return Array.isArray(value) ? value : [value];
}

function text(value) {
  if (typeof value === 'string') return value.trim();
  return String(value?.['#text'] ?? value?.['name'] ?? '').trim(); // ← add value?.['name']
}

function keyFor(...parts) {
	return parts.map((part) => String(part).trim().toLocaleLowerCase()).join('\u0000');
}

function artwork(images) {
	return asArray(images)
		.map((image) => text(image))
		.filter(Boolean)
		.at(-1) ?? '';
}

function lastfmUrl(artist, name, type) {
	const base = `https://www.last.fm/music/${encodeURIComponent(artist)}`;
	return type === 'album'
		? `${base}/${encodeURIComponent(name)}`
		: `${base}/_/${encodeURIComponent(name)}`;
}

async function lastfm(fetch, method, params = {}) {
	const url = new URL(API);
	url.search = new URLSearchParams({
		method,
		api_key: env.LASTFM_API_KEY,
		format: 'json',
		...params
	}).toString();

	const response = await fetch(url, { headers: { Accept: 'application/json' } });
	if (!response.ok) {
		throw error(502, `Last.fm request failed (${response.status})`);
	}

	const data = await response.json();
	if (data.error) {
		throw error(502, `Last.fm request failed (${data.error})`);
	}

	return data;
}

function normalizeScrobble(track, index, now) {
	const artist = text(track.artist) || 'Unknown artist';
	const title = text(track.name) || 'Untitled track';
	const album = text(track.album);
	const nowPlaying = String(track?.['@attr']?.nowplaying ?? '').toLowerCase() === 'true';
	const timestamp = nowPlaying ? now : Number(track.date?.uts ?? 0);

	return {
		id: `${timestamp}-${index}`,
		artist,
		title,
		album,
		timestamp,
		nowPlaying,
		artwork: artwork(track.image),
		url: text(track.url) || lastfmUrl(artist, title, 'track')
	};
}

function aggregateAlbums(scrobbles) {
	const groups = new Map();

	for (const scrobble of scrobbles) {
		if (!scrobble.album) continue;
		const key = keyFor(scrobble.artist, scrobble.album);
		let group = groups.get(key);
		if (!group) {
			group = {
				id: `album-${groups.size}`,
				title: scrobble.album,
				artist: scrobble.artist,
				album: scrobble.album,
				artwork: scrobble.artwork,
				url: lastfmUrl(scrobble.artist, scrobble.album, 'album'),
				plays: 0,
				latestListen: 0,
				nowPlaying: false,
				trackNames: new Set()
			};
			groups.set(key, group);
		}

		group.plays += 1;
		group.latestListen = Math.max(group.latestListen, scrobble.timestamp);
		group.nowPlaying ||= scrobble.nowPlaying;
		group.trackNames.add(scrobble.title);
		if (!group.artwork && scrobble.artwork) group.artwork = scrobble.artwork;
	}

	return [...groups.values()]
		.map(({ trackNames, ...group }) => ({
			...group,
			kind: 'album',
			uniqueTracks: trackNames.size
		}))
		.sort((a, b) => b.latestListen - a.latestListen);
}

function aggregateSingles(scrobbles) {
	const groups = new Map();

	for (const scrobble of scrobbles) {
		const key = keyFor(scrobble.artist, scrobble.title);
		let group = groups.get(key);
		if (!group) {
			group = {
				id: `single-${groups.size}`,
				title: scrobble.title,
				artist: scrobble.artist,
				album: scrobble.album,
				artwork: scrobble.artwork,
				url: scrobble.url,
				plays: 0,
				latestListen: 0,
				nowPlaying: false,
				uniqueTracks: 1,
				kind: 'single'
			};
			groups.set(key, group);
		}

		group.plays += 1;
		group.latestListen = Math.max(group.latestListen, scrobble.timestamp);
		group.nowPlaying ||= scrobble.nowPlaying;
		if (!group.album && scrobble.album) group.album = scrobble.album;
		if (!group.artwork && scrobble.artwork) group.artwork = scrobble.artwork;
	}

	return [...groups.values()].sort((a, b) => b.latestListen - a.latestListen);
}

function aggregateArtists(scrobbles) {
	const groups = new Map();
	for (const scrobble of scrobbles) {
		const key = scrobble.artist.toLocaleLowerCase();
		const current = groups.get(key) ?? { name: scrobble.artist, plays: 0 };
		current.plays += 1;
		groups.set(key, current);
	}
	return [...groups.values()].sort((a, b) => b.plays - a.plays);
}

export async function load({ fetch, setHeaders }) {
	if (!env.LASTFM_API_KEY || !env.LASTFM_USERNAME) {
		throw error(500, 'LASTFM_API_KEY and LASTFM_USERNAME must be set');
	}

	const username = String(env.LASTFM_USERNAME).trim();
	const now = Math.floor(Date.now() / 1000);
	const today = Math.floor(now / DAY_SECONDS) * DAY_SECONDS;
	const from = today - (DAYS_SHOWN - 1) * DAY_SECONDS;
	const baseParams = {
		user: username,
		limit: String(PAGE_SIZE),
		extended: '1',
		from: String(from)
	};
	const firstPage = await lastfm(fetch, 'user.getRecentTracks', {
		...baseParams,
		page: '1'
	});
	const pageCount = Math.max(
		1,
		Number(firstPage.recenttracks?.['@attr']?.totalPages ?? 1)
	);
	const fetchedPageCount = Math.min(pageCount, MAX_PAGES);
	const remainingPages = await Promise.all(
		Array.from({ length: fetchedPageCount - 1 }, (_, index) =>
			lastfm(fetch, 'user.getRecentTracks', {
				...baseParams,
				page: String(index + 2)
			})
		)
	);
	const tracks = [firstPage, ...remainingPages]
		.flatMap((page) => asArray(page.recenttracks?.track));
	const scrobbles = tracks
		.map((track, index) => normalizeScrobble(track, index, now))
		.filter((track) => track.timestamp >= from);
	const completedScrobbles = scrobbles.filter((track) => !track.nowPlaying);
	const albums = aggregateAlbums(scrobbles);
	const singles = aggregateSingles(scrobbles);

	setHeaders({
		'cache-control': 'public, max-age=60, s-maxage=180, stale-while-revalidate=300'
	});

	return {
		profile: {
			username,
			url: `https://www.last.fm/user/${encodeURIComponent(username)}`
		},
		range: {
			from: from * 1000,
			to: now * 1000,
			days: DAYS_SHOWN
		},
		summary: {
			scrobbles: completedScrobbles.length,
			albumCount: albums.length,
			singleCount: singles.length,
			nowPlaying: scrobbles.some((track) => track.nowPlaying),
			truncated: pageCount > fetchedPageCount
		},
		albums,
		singles,
		artists: aggregateArtists(scrobbles)
	};
}
