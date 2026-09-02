"""Fetch and verify the pinned raw-OSM-PBF snapshot (Geofabrik Vietnam extract) into the project
cache. Structural clone of prepare_gis_source.py's --offline/--refresh/validate/download flow —
see that file's doc comment for the convention this mirrors. Geofabrik extracts have no git commit
to pin against, so the immutable identity here is the exact download URL + a streamed sha256 of
the downloaded file (not a directory checksum like prepare_gis_source.py, since this is one file).

Bootstrap ritual for a fresh/refreshed pin: the sha256 in osm-pbf-source.json is unknown before the
first real download. Run once with sha256 left as "" (fails validate(), forces a download, then
raises because "" != the real hash) — copy the printed "got sha256=..." value into
osm-pbf-source.json, then re-run to confirm it now validates. Repeat this ritual whenever
retentionNote's ~90-day Geofabrik retention window forces a re-pin to a new dated URL.
"""
from __future__ import annotations
import argparse, hashlib, json
import urllib.request
from pathlib import Path
from urllib.error import HTTPError, URLError

ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "scripts" / "osm-pbf-source.json"
CACHE_ROOT = ROOT / ".cache" / "osm-pbf"
CHUNK_SIZE = 1024 * 1024  # 1 MiB — stream sha256 rather than read_bytes() on a ~300MB file

def target_path(config: dict) -> Path:
    return CACHE_ROOT / config["fileName"]

def streamed_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(CHUNK_SIZE), b""):
            digest.update(chunk)
    return digest.hexdigest()

def validate(config: dict) -> tuple[bool, str]:
    path = target_path(config)
    if not path.exists():
        return False, "cache file is missing"
    size = path.stat().st_size
    if config.get("sizeBytes") and size != config["sizeBytes"]:
        return False, f"cached size is {size}, expected {config['sizeBytes']}"
    checksum = streamed_sha256(path)
    if not config.get("sha256"):
        raise SystemExit(
            f"osm-pbf-source.json has no sha256 pinned yet — fill in the value below, then re-run:\n"
            f"  \"sha256\": \"{checksum}\","
        )
    if checksum != config["sha256"]:
        return False, f"cached checksum is {checksum}, expected {config['sha256']}"
    return True, "cache is valid"

def download(config: dict) -> None:
    CACHE_ROOT.mkdir(parents=True, exist_ok=True)
    path = target_path(config)
    part = path.with_suffix(path.suffix + ".part")
    request = urllib.request.Request(
        config["downloadUrl"],
        headers={"User-Agent": "daklak-3d-dashboard/1.0 (detail-map OSM extract build)"},
    )
    try:
        with urllib.request.urlopen(request, timeout=600) as response, part.open("wb") as out:
            while True:
                chunk = response.read(CHUNK_SIZE)
                if not chunk:
                    break
                out.write(chunk)
    except (HTTPError, URLError, TimeoutError) as error:
        part.unlink(missing_ok=True)
        raise RuntimeError(f"{config['downloadUrl']}: {error}") from error
    part.replace(path)  # atomic rename — never leaves a half-downloaded file at the real name

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--offline", action="store_true", help="Validate cache without network access")
    parser.add_argument("--refresh", action="store_true", help="Replace the cache even when valid")
    arguments = parser.parse_args()
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    valid, reason = validate(config)
    if valid and not arguments.refresh:
        print(f"OSM PBF ready: {reason} ({config['fileName']})")
        return
    if arguments.offline:
        raise SystemExit(f"OSM PBF cache is not usable offline: {reason}")
    print(f"Preparing OSM PBF ({config['sizeBytes'] / 1_000_000:.0f} MB expected): {reason}")
    try:
        download(config)
        valid, reason = validate(config)
        if not valid:
            raise RuntimeError(reason)
    except (OSError, RuntimeError) as error:
        raise SystemExit(f"Unable to prepare pinned OSM PBF: {error}") from error
    print(f"OSM PBF downloaded and verified: {config['fileName']}")

if __name__ == "__main__":
    main()
