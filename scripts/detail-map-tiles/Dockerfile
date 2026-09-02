# Pinned toolchain for the detail-map PMTiles pipeline (osmium + tippecanoe + go-pmtiles CLI).
# Build-time only — never a runtime dependency, never run in CI. See
# docs/detail-map-integration.md's "Building the real PMTiles source" section for the full
# pipeline this image feeds. No official, trustworthy single image bundles all three tools, so
# this Dockerfile pins each explicitly rather than depending on an unverified third-party image —
# consistent with this project's "pin everything by digest/version/hash" convention
# (scripts/gis-source.json, scripts/osm-pbf-source.json).
FROM debian:bookworm-slim

# osmium-tool ships as a Debian package (bookworm has 1.16.x). tippecanoe has no official
# packaged/image release — build from a pinned tag. go-pmtiles ships prebuilt Linux release
# tarballs (spec v3, matching this repo's pmtiles npm client — see package.json).
ARG TIPPECANOE_VERSION=2.79.0
ARG PMTILES_VERSION=1.31.2

RUN apt-get update && apt-get install -y --no-install-recommends \
      osmium-tool ca-certificates curl git \
      build-essential libsqlite3-dev zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

RUN git clone --depth 1 --branch "${TIPPECANOE_VERSION}" https://github.com/felt/tippecanoe /src/tippecanoe \
    && make -C /src/tippecanoe -j"$(nproc)" \
    && make -C /src/tippecanoe install \
    && rm -rf /src/tippecanoe

RUN curl -fsSL -o /tmp/pmtiles.tar.gz \
      "https://github.com/protomaps/go-pmtiles/releases/download/v${PMTILES_VERSION}/go-pmtiles_${PMTILES_VERSION}_Linux_x86_64.tar.gz" \
    && tar -xzf /tmp/pmtiles.tar.gz -C /usr/local/bin pmtiles \
    && rm /tmp/pmtiles.tar.gz \
    && pmtiles version

WORKDIR /data
