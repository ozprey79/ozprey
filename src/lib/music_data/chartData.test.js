import test from 'node:test';
import assert from 'node:assert/strict';
import { releaseYear, releaseBins, topTen } from './chartData.js';

const tracks = [
	{ title: 'Older', artist: 'A', composer: 'One', year: 2003, plays: 2, durationMs: 1000 },
	{ title: 'Recent', artist: 'B', composer: 'Two', year: 2020, plays: 5, durationMs: 2000 },
	{ title: 'New', artist: 'A', composer: 'One', year: 2026, plays: 3, durationMs: 3000 },
	{ title: 'Undated', artist: 'C', composer: '', year: null, plays: 9, durationMs: 0 }
];

test('release-year tags reject missing and invalid values without treating them as year zero', () => {
	for (const value of [undefined, null, '', '0', '<unknown>', 'not a year', '2020.5']) assert.equal(releaseYear(value), null);
	assert.equal(releaseYear('2003'), 2003);
});

test('decades exclude undated tracks, preserve metric totals, and sort chronologically', () => {
	assert.deepEqual(releaseBins(tracks), [[2000, 2], [2020, 8]]);
	assert.deepEqual(releaseBins(tracks, { metric: 'tracks' }), [[2000, 1], [2020, 2]]);
	assert.deepEqual(releaseBins(tracks, { metric: 'time' }), [[2000, 2000], [2020, 19000]]);
});

test('decade drilldown includes ten years with gaps at zero and no tracks from other decades', () => {
	const bins = releaseBins(tracks, { level: 'years', decade: 2020 });
	assert.equal(bins.length, 10);
	assert.deepEqual(bins[0], [2020, 5]);
	assert.deepEqual(bins[1], [2021, 0]);
	assert.deepEqual(bins[6], [2026, 3]);
	assert.deepEqual(bins[9], [2029, 0]);
	assert.deepEqual(releaseBins([], { level: 'years' }), []);
});

test('top ten includes undated tracks overall and ranks the supplied year selection independently', () => {
	assert.deepEqual(topTen(tracks), [['Unknown composer', 9], ['One', 5], ['Two', 5]]);
	assert.deepEqual(topTen(tracks.filter(track => track.year === 2026)), [['One', 3]]);
	assert.deepEqual(topTen(tracks, 'artist', 'time'), [['A', 11000], ['B', 10000]]);
	assert.deepEqual(topTen([], 'artist'), []);
});
