# Movie map boundaries

`world-countries.json` is derived from Natural Earth's public-domain 1:110m
Admin 0 Countries GeoJSON:
https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson

Downloaded 2026-11-21. Terms: https://www.naturalearthdata.com/about/terms-of-use/

To regenerate after downloading the source, run:

```sh
node scripts/prepare-movie-map.mjs path/to/ne_110m_admin_0_countries.geojson
```

The preparation keeps only names, ISO alpha-2 identifiers and geometry, rounds
coordinates to four decimal places, omits Antarctica, and normalizes polygon
winding for D3 Geo. `ISO_A2_EH` supplies France and Norway's identifiers, which
are missing from the source's `ISO_A2` field. Regions without an ISO identifier
keep a unique Natural Earth identifier and cannot match TMDB production countries.

The component adds point markers for Hong Kong, Macao, Singapore and Malta,
which are absent at this resolution. Other small countries remain accessible
through the country selector. Movie counts use TMDB production countries;
co-productions count once in every credited country.
