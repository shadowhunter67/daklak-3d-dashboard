"""Fetch and verify the pinned GIS snapshot into the project cache."""
from __future__ import annotations
import argparse, hashlib, json, shutil, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "scripts" / "gis-source.json"
CACHE_ROOT = ROOT / ".cache" / "gis-source"
REPOSITORY = CACHE_ROOT / "repository"

def run(*arguments: str) -> str:
    result = subprocess.run(arguments, cwd=ROOT, text=True, capture_output=True, check=False)
    if result.returncode:
        detail = result.stderr.strip() or result.stdout.strip()
        raise RuntimeError(f"Command failed ({' '.join(arguments)}): {detail}")
    return result.stdout.strip()

def directory_checksum(directory: Path) -> str:
    digest = hashlib.sha256()
    files = sorted(path for path in directory.rglob("*") if path.is_file())
    if not files: raise RuntimeError(f"Pinned source contains no files: {directory}")
    for path in files:
        digest.update(path.relative_to(directory).as_posix().encode("utf-8")); digest.update(b"\0")
        digest.update(path.read_bytes()); digest.update(b"\0")
    return digest.hexdigest()

def validate(config: dict[str, str]) -> tuple[bool, str]:
    if not (REPOSITORY / ".git").exists(): return False, "cache repository is missing"
    try:
        commit = run("git", "-C", str(REPOSITORY), "rev-parse", "HEAD")
        if commit != config["commit"]: return False, f"cached commit is {commit}, expected {config['commit']}"
        checksum = directory_checksum(REPOSITORY / config["sourcePath"])
        if checksum != config["sha256"]: return False, f"source checksum is {checksum}, expected {config['sha256']}"
    except (OSError, RuntimeError) as error: return False, str(error)
    return True, "cache is valid"

def download(config: dict[str, str]) -> None:
    CACHE_ROOT.mkdir(parents=True, exist_ok=True)
    if REPOSITORY.exists(): shutil.rmtree(REPOSITORY)
    run("git", "clone", "--filter=blob:none", "--no-checkout", config["repositoryUrl"], str(REPOSITORY))
    run("git", "-C", str(REPOSITORY), "sparse-checkout", "set", config["sourcePath"])
    run("git", "-C", str(REPOSITORY), "checkout", "--detach", config["commit"])

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--offline", action="store_true", help="Validate cache without network access")
    parser.add_argument("--refresh", action="store_true", help="Replace the cache even when valid")
    arguments = parser.parse_args()
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    valid, reason = validate(config)
    if valid and not arguments.refresh:
        print(f"GIS source ready: {reason} ({config['commit']})"); return
    if arguments.offline: raise SystemExit(f"GIS source cache is not usable offline: {reason}")
    print(f"Preparing GIS source: {reason}")
    try:
        download(config); valid, reason = validate(config)
        if not valid: raise RuntimeError(reason)
    except (OSError, RuntimeError) as error:
        raise SystemExit(f"Unable to prepare pinned GIS source: {error}") from error
    print(f"GIS source downloaded and verified: {config['commit']}")

if __name__ == "__main__": main()
