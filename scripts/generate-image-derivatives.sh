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

generate_avif "$assets_dir/menubar-gradient-web.png" "$assets_dir/menubar-gradient-696.avif" 696 144
generate_avif "$assets_dir/menubar-gradient-web.png" "$assets_dir/menubar-gradient-928.avif" 928 192
generate_avif "$assets_dir/menubar-gradient-web.png" "$assets_dir/menubar-gradient-1392.avif" 1392 288

for strip_name in glass-ink ink; do
  source_file="$assets_dir/menubar-${strip_name}-web.png"
  generate_avif "$source_file" "$assets_dir/menubar-${strip_name}-464.avif" 464 90
  generate_avif "$source_file" "$assets_dir/menubar-${strip_name}-928.avif" 928 180
  generate_avif "$source_file" "$assets_dir/menubar-${strip_name}-1392.avif" 1392 270
done

# AVIF here is only for opaque menu-bar photos. rgb24 → yuv420p drops alpha, so
# the 2.0 icon, main window, and detail panels stay PNG.

echo "Generated deterministic AVIF derivatives from committed PNG sources."
