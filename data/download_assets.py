#!/usr/bin/env python3
"""
Download all PLY and image files from the hosted server based on the API data.
"""

import json
import os
import urllib.request
from pathlib import Path

BASE_URL = "https://lunar.doppellab.space"
LOCAL_WATCH_DIR = Path(__file__).parent / "watch" / "processed"

def get_folder_name(processed_path):
    """Extract the folder name from the processedPath."""
    # e.g., /home/yoda/AKALL-NODE/watch/processed/BP_LS240_LO-1740370460615
    return processed_path.split("/")[-1]

def download_file(url, local_path):
    """Download a file if it doesn't exist locally."""
    if local_path.exists():
        print(f"  ✓ Already exists: {local_path.name}")
        return True
    
    try:
        print(f"  ↓ Downloading: {local_path.name}...", end=" ", flush=True)
        urllib.request.urlretrieve(url, local_path)
        size_mb = local_path.stat().st_size / (1024 * 1024)
        print(f"({size_mb:.2f} MB)")
        return True
    except Exception as e:
        print(f"FAILED: {e}")
        return False

def process_record(record):
    """Download all files for a single record."""
    meta = record.get("meta", {})
    processed_path = meta.get("processedPath", "")
    outputs = meta.get("outputs", {})
    
    if not processed_path or not outputs:
        print(f"  ⚠ Skipping {record.get('originalFileName')}: missing metadata")
        return
    
    folder_name = get_folder_name(processed_path)
    local_folder = LOCAL_WATCH_DIR / folder_name
    local_folder.mkdir(parents=True, exist_ok=True)
    
    base_url = f"{BASE_URL}/watch/processed/{folder_name}"
    
    files_to_download = []
    
    # Original JPEG
    if outputs.get("originalJPEG"):
        files_to_download.append(outputs["originalJPEG"])
    
    # ND3 Reconstructions (PLY and color images)
    for recon in outputs.get("nd3Reconstruction", []):
        if recon.get("ply"):
            files_to_download.append(recon["ply"])
        if recon.get("colorImage"):
            files_to_download.append(recon["colorImage"])
    
    # Raw converted (depth and IR PNGs)
    for raw in outputs.get("rawConverted", []):
        files_to_download.append(raw)
    
    # Channel images
    channels = outputs.get("channels", {})
    for channel in ["blue", "green", "red"]:
        if channels.get(channel):
            files_to_download.append(channels[channel])
    
    # Depth and NIR (may duplicate rawConverted, but we'll skip if exists)
    if outputs.get("depth"):
        files_to_download.append(outputs["depth"])
    if outputs.get("nir"):
        files_to_download.append(outputs["nir"])
    
    # Remove duplicates while preserving order
    seen = set()
    unique_files = []
    for f in files_to_download:
        if f not in seen:
            seen.add(f)
            unique_files.append(f)
    
    print(f"\n📁 {folder_name} ({len(unique_files)} files)")
    
    for filename in unique_files:
        url = f"{base_url}/{filename}"
        local_path = local_folder / filename
        download_file(url, local_path)

def main():
    # Get data from local API
    print("Fetching data from API...")
    with urllib.request.urlopen("http://localhost:3000/api/nd3") as response:
        data = json.loads(response.read().decode())
    
    print(f"Found {len(data)} records\n")
    
    for record in data:
        process_record(record)
    
    print("\n✅ Download complete!")

if __name__ == "__main__":
    main()

