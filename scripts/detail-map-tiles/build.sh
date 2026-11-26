#!/bin/sh
# Stages B-F of the detail-map pipeline, run INSIDE the daklak-tiles container.
# Expects in /data: vietnam.osm.pbf, daklak-extract-polygon.geojson, extract-config.json,
# roads-filter.json and {roads,buildings,places,services}.json. Writes to /data/out.
# See docs/detail-map-integration.md, "Building the real PMTiles source".
set -eu
cd /data
mkdir -p out

osmium extract --overwrite --strategy=complete_ways --config extract-config.json vietnam.osm.pbf

osmium tags-filter --overwrite -o out/roads.osm.pbf out/daklak.osm.pbf \
  "w/highway=motorway,motorway_link,trunk,trunk_link,primary,primary_link,secondary,secondary_link,tertiary,tertiary_link,unclassified,residential,living_street,service,track"
osmium tags-filter --overwrite -o out/buildings.osm.pbf out/daklak.osm.pbf "wr/building"
osmium tags-filter --overwrite -o out/places.osm.pbf out/daklak.osm.pbf \
  "n/place=city,town,village,hamlet,suburb,quarter,neighbourhood,isolated_dwelling"
osmium tags-filter --overwrite -o out/services.osm.pbf out/daklak.osm.pbf \
  "n/amenity=hospital,clinic,doctors,pharmacy,school,university,college,kindergarten,townhall,police,post_office,courthouse" \
  "n/office=government"

# One geometry type per layer: without this, tagged nodes (highway=crossing, traffic_signals...)
# leak into the roads layer.
for spec in roads:linestring buildings:polygon places:point services:point; do
  layer=${spec%:*}
  osmium export --overwrite "--geometry-types=${spec#*:}" -c "$layer.json" -f geojsonseq \
    -o "out/$layer.geojsonseq" "out/$layer.osm.pbf"
done

# tippecanoe options are verbatim from the 2026-09-02 archives' generator_options metadata.
tippecanoe -o out/places.mbtiles --force -l places '--name=Đắk Lắk places' -Z5 -z15 -r1 \
  --drop-densest-as-needed out/places.geojsonseq
tippecanoe -o out/roads.mbtiles --force -l roads '--name=Đắk Lắk roads' -Z5 -z15 --drop-densest-as-needed \
  --extend-zooms-if-still-dropping --coalesce-densest-as-needed --simplification=4 \
  --feature-filter-file=roads-filter.json out/roads.geojsonseq
tippecanoe -o out/buildings.mbtiles --force -l buildings '--name=Đắk Lắk buildings' -Z13 -z15 \
  --drop-densest-as-needed --extend-zooms-if-still-dropping --simplification=2 \
  --no-tiny-polygon-reduction out/buildings.geojsonseq
tile-join -o out/daklak.mbtiles --force '--name=Đắk Lắk detail map' \
  '--attribution=© OpenStreetMap contributors (ODbL 1.0)' \
  out/roads.mbtiles out/buildings.mbtiles out/places.mbtiles
pmtiles convert --force out/daklak.mbtiles out/daklak.pmtiles

tippecanoe --force -o out/services.mbtiles -l services -Z10 -z15 --no-feature-limit \
  --no-tile-size-limit out/services.geojsonseq
pmtiles convert --force out/services.mbtiles out/services.pmtiles

echo "== counts"
osmium fileinfo -e -g data.count.ways out/roads.osm.pbf
osmium fileinfo -e -g data.count.ways out/buildings.osm.pbf
