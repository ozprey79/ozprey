import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { geoArea } from 'd3-geo';

// Input: Natural Earth's ne_110m_admin_0_countries.geojson (see data README).
const source = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const rounded = coordinates => typeof coordinates[0] === 'number'
	? coordinates.map(value => Number(value.toFixed(4))) : coordinates.map(rounded);
const features = source.features.filter(feature => feature.properties.ISO_A2_EH !== 'AQ').map(feature => {
	const { ISO_A2_EH, ADM0_A3, NAME_EN } = feature.properties;
	const geometry = { ...feature.geometry, coordinates: rounded(feature.geometry.coordinates) };
	// D3's spherical polygons use clockwise exterior rings. Reverse per polygon,
	// including its holes, when the GeoJSON describes the complementary sphere.
	const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
	for (const coordinates of polygons) {
		if (geoArea({ type: 'Polygon', coordinates }) > 2 * Math.PI) coordinates.forEach(ring => ring.reverse());
	}
	return {
		type: 'Feature',
		properties: { code: /^[A-Z]{2}$/.test(ISO_A2_EH) ? ISO_A2_EH : `NE_${ADM0_A3}`, name: NAME_EN },
		geometry
	};
});
mkdirSync('src/lib/data', { recursive: true });
writeFileSync('src/lib/data/world-countries.json', JSON.stringify({ type: 'FeatureCollection', features }) + '\n');
console.log(`Prepared ${features.length} country boundaries.`);
