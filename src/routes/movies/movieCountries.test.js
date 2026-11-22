import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countryCounts, hasCountry, productionCountries } from './movieCountries.js';
import world from '../../lib/data/world-countries.json' with { type: 'json' };
import { geoArea, geoEqualEarth, geoPath } from 'd3-geo';

test('production countries preserve ISO codes and deduplicate co-production credits', () => {
	assert.deepEqual(productionCountries({ production_countries: [
		{ iso_3166_1: 'IN', name: 'India' }, { iso_3166_1: 'US', name: 'United States of America' },
		{ iso_3166_1: 'IN', name: 'India' }, { iso_3166_1: '', name: 'Unknown' }
	] }), [{ code: 'IN', name: 'India' }, { code: 'US', name: 'United States of America' }]);
	assert.equal(productionCountries(null), null);
	assert.deepEqual(productionCountries({ production_countries: [] }), []);
});

test('counts each film once per country, including co-productions, regardless of language', () => {
	const india = { code: 'IN', name: 'India' };
	const us = { code: 'US', name: 'United States of America' };
	const movies = [
		{ id: 1, language: 'English', productionCountries: [india, us, india] },
		{ id: 2, language: 'Tamil', productionCountries: [india] },
		{ id: 1, productionCountries: [india, us] },
		{ id: 3, language: 'English', productionCountries: null },
		{ id: 4, productionCountries: [] }
	];
	assert.deepEqual(countryCounts(movies), [{ ...india, count: 2 }, { ...us, count: 1 }]);
	assert.deepEqual(countryCounts([]), []);
});

test('country filter handles co-productions, clearing and missing metadata', () => {
	const movie = { productionCountries: [{ code: 'IN', name: 'India' }, { code: 'FR', name: 'France' }] };
	assert.equal(hasCountry(movie, 'FR'), true);
	assert.equal(hasCountry(movie, 'US'), false);
	assert.equal(hasCountry({ productionCountries: null }, 'IN'), false);
	assert.equal(hasCountry({}, ''), true);
});

test('all country shapes have unique identifiers and render bounded D3 paths', () => {
	assert.equal(new Set(world.features.map(feature => feature.properties.code)).size, world.features.length);
	const projection = geoEqualEarth().fitExtent([[16, 12], [984, 508]], { type: 'Sphere' });
	const path = geoPath(projection);
	for (const feature of world.features) {
		assert.ok(geoArea(feature) < 2 * Math.PI, feature.properties.name);
		const rendered = path(feature);
		assert.ok(rendered && !rendered.includes('NaN'), feature.properties.name);
	}
	for (const code of ['IN', 'US', 'GB', 'FR', 'NO', 'TW', 'KR']) {
		assert.ok(world.features.some(feature => feature.properties.code === code), code);
	}
});
