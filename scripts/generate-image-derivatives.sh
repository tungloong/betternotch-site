#!/bin/sh

set -eu

repo_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
assets_dir="$repo_dir/assets"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "error: ffmpeg is required to regenerate AVIF derivatives" >&2
  exit 1
fi

generate_avif() {
  source_file=$1
  output_file=$2
  width=$3
  height=$4

  if ! ffmpeg \
    -hide_banner \
    -loglevel quiet \
    -y \
    -i "$source_file" \
    -vf "format=rgb24,scale=${width}:${height}:flags=lanczos,format=yuv420p" \
    -frames:v 1 \
    -c:v libsvtav1 \
    -preset 6 \
    -qp 8 \
    "$output_file" \
    >/dev/null 2>&1; then
    echo "error: failed to generate $output_file; ffmpeg must provide the libsvtav1 encoder" >&2
    exit 1
  fi
}

for effect_name in original gradient solid-black; do
  source_file="$assets_dir/menubar-${effect_name}-web.png"
  generate_avif "$source_file" "$assets_dir/menubar-${effect_name}-330.avif" 330 75
  generate_avif "$source_file" "$assets_dir/menubar-${effect_name}-396.avif" 396 90
  generate_avif "$source_file" "$assets_dir/menubar-${effect_name}-528.avif" 528 120
done

generate_avif \
  "$assets_dir/betternotch-icon-128.png" \
  "$assets_dir/betternotch-icon-128.avif" \
  128 \
  128

echo "Generated deterministic AVIF derivatives from committed PNG sources."
