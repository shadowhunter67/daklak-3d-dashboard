"""Documented downloader entry point; intentionally refuses unverified URLs."""
from gis_common import SOURCE
if SOURCE.exists(): print(f"Nguồn local đã sẵn sàng: {SOURCE}")
else: raise SystemExit("Clone nguồn MIT thanglequoc/vietnamese-provinces-database vào references trước.")
