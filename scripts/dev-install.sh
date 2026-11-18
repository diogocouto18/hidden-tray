#!/usr/bin/env bash
# Build and install the extension for the current user (development helper).
set -euo pipefail
cd "$(dirname "$0")/.."
make install
echo "Installed. On Wayland, log out and back in to load new shell code."
