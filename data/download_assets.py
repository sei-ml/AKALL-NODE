#!/usr/bin/env python3
"""Download all public AKALL capture assets into this repository's watch tree."""

import json
import os
import re
import sys
import argparse
import time
import threading
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

BASE_URL = "https://lunar.doppellab.space"
API_URL = f"{BASE_URL}/api/nd3"
LOCAL_WATCH_DIR = Path(__file__).resolve().parent.parent / "watch" / "processed"
SAFE_NAME = re.compile(r"^[A-Za-z0-9._-]+$")


def open_with_retry(request, timeout):
    for attempt in range(4):
        try:
            return urllib.request.urlopen(request, timeout=timeout)
        except urllib.error.HTTPError as error:
            if error.code not in (429, 502, 503, 504) or attempt == 3:
                raise
            error.close()
            time.sleep(2 ** attempt)


def fetch_json(url):
    request = urllib.request.Request(url, headers={"User-Agent": "AKALL-local-archive/1.0"})
    with open_with_retry(request, timeout=45) as response:
        return json.loads(response.read().decode("utf-8"))


def record_files(outputs):
    candidates = [outputs.get("originalJPEG")]
    for recon in outputs.get("nd3Reconstruction", []):
        candidates.extend([recon.get("ply"), recon.get("colorImage")])
    candidates.extend(outputs.get("rawConverted", []))
    candidates.extend((outputs.get("channels") or {}).values())
    candidates.extend([outputs.get("depth"), outputs.get("nir")])
    return list(dict.fromkeys(name for name in candidates if name))


def asset_url(folder, filename):
    return f"{BASE_URL}/watch/processed/{urllib.parse.quote(folder.name)}/{urllib.parse.quote(filename)}"


def remote_size(url):
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "AKALL-local-archive/1.0"},
        method="HEAD",
    )
    with open_with_retry(request, timeout=45) as response:
        length = response.headers.get("Content-Length")
        if length is None:
            raise IOError("archive did not provide a Content-Length")
        return int(length)


def download_one(folder, filename):
    if not SAFE_NAME.fullmatch(filename):
        raise ValueError(f"Unsafe asset filename: {filename!r}")
    destination = folder / filename
    url = asset_url(folder, filename)
    expected_size = remote_size(url)
    if destination.exists() and destination.stat().st_size == expected_size:
        return 0, "verified"

    partial = destination.with_name(
        f"{destination.name}.{os.getpid()}.{threading.get_ident()}.part"
    )
    request = urllib.request.Request(url, headers={"User-Agent": "AKALL-local-archive/1.0"})
    try:
        total = 0
        with open_with_retry(request, timeout=120) as response, partial.open("wb") as output:
            response_size = response.headers.get("Content-Length")
            while chunk := response.read(1024 * 1024):
                output.write(chunk)
                total += len(chunk)
        if not total:
            raise IOError("server returned an empty asset")
        if total != expected_size or (response_size and total != int(response_size)):
            raise IOError(f"size mismatch: expected {expected_size} bytes, received {total}")
        os.replace(partial, destination)
        return total, "downloaded"
    except Exception:
        partial.unlink(missing_ok=True)
        raise


def process_record(record):
    meta = record.get("meta") or {}
    processed_path = meta.get("processedPath", "")
    folder_name = Path(processed_path).name
    if not processed_path or not SAFE_NAME.fullmatch(folder_name):
        raise ValueError(f"Invalid processedPath for {record.get('originalFileName')!r}")
    outputs = meta.get("outputs") or {}
    files = record_files(outputs)
    if not files:
        raise ValueError(f"No assets listed for {folder_name}")

    folder = LOCAL_WATCH_DIR / folder_name
    folder.mkdir(parents=True, exist_ok=True)
    meta_file = folder / "meta.json"
    metadata_text = json.dumps(meta, indent=2, ensure_ascii=False) + "\n"
    if not meta_file.exists() or meta_file.read_text(encoding="utf-8") != metadata_text:
        temp_meta = folder / f"meta.json.{os.getpid()}.part"
        temp_meta.write_text(metadata_text, encoding="utf-8")
        os.replace(temp_meta, meta_file)
    return folder, files


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--scene", help="verify/download only this processed scene folder")
    args = parser.parse_args()

    print(f"Reading public archive index: {API_URL}", flush=True)
    records = fetch_json(API_URL)
    if not isinstance(records, list):
        raise ValueError("Archive API did not return a record list")
    if args.scene:
        records = [record for record in records
                   if Path(record.get("meta", {}).get("processedPath", "")).name == args.scene]
        if not records:
            raise ValueError(f"Scene not found in archive index: {args.scene}")
    print(f"Found {len(records)} scenes", flush=True)

    jobs = []
    for record in records:
        folder, files = process_record(record)
        print(f"\n{folder.name}: {len(files)} assets", flush=True)
        jobs.extend((folder, filename) for filename in files)

    downloaded = 0
    kept = 0
    failures = []
    with ThreadPoolExecutor(max_workers=3) as pool:
        futures = {pool.submit(download_one, folder, filename): (folder.name, filename)
                   for folder, filename in jobs}
        for future in as_completed(futures):
            folder_name, filename = futures[future]
            try:
                byte_count, state = future.result()
                downloaded += byte_count
                kept += state == "verified"
                if state == "downloaded":
                    print(f"  {folder_name}/{filename}: {byte_count / 1024 / 1024:.1f} MiB", flush=True)
            except Exception as error:
                failures.append((folder_name, filename, str(error)))
                print(f"  FAILED {folder_name}/{filename}: {error}", flush=True)

    print(f"\nNew data: {downloaded / (1024 ** 3):.2f} GiB; existing assets kept: {kept}", flush=True)
    print(f"Asset root: {LOCAL_WATCH_DIR}", flush=True)
    if failures:
        print(f"Incomplete: {len(failures)} file(s)", file=sys.stderr)
        return 1
    print("All listed assets are present.", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
