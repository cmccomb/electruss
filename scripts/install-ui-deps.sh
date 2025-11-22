#!/usr/bin/env bash
# UI test dependency installer
#
# Usage: scripts/install-ui-deps.sh
#
# Installs runtime libraries needed for Electron/Playwright UI tests when
# possible. If the current user lacks permission to use apt-get, the script logs
# a warning and continues so CI environments without root access can still run
# the test suite. Also ensures the Electron and Playwright Chromium binaries are
# downloaded before tests run.

set -euo pipefail

log() {
  printf '[ui-test-deps] %s\n' "$1"
}

install_libs_with_apt() {
  if ! command -v apt-get >/dev/null 2>&1; then
    log 'apt-get not available; assuming required system libraries are present.'
    return
  fi

  if [ "$(id -u)" -ne 0 ]; then
    log 'Skipping apt-get install because current user is not root. Ensure required system libraries are preinstalled.'
    return
  fi

  log 'Updating apt repositories to install UI test libraries.'
  if ! DEBIAN_FRONTEND=noninteractive apt-get update; then
    log 'apt-get update failed; proceeding without installing system libraries.'
    return
  fi

  log 'Installing Electron/Chromium runtime libraries.'
  if ! DEBIAN_FRONTEND=noninteractive apt-get install -y libxcursor1 libxss1 libxtst6 libgdk-pixbuf-2.0-0 libgtk-3-0; then
    log 'apt-get install failed; please ensure required libraries are available.'
  fi
}

ensure_electron_downloaded() {
  log 'Ensuring Electron binary is installed.'
  node node_modules/electron/install.js
}

ensure_playwright_browsers() {
  log 'Ensuring Playwright Chromium is installed.'
  if [ "$(id -u)" -eq 0 ]; then
    npx playwright install --with-deps chromium
  else
    npx playwright install chromium
  fi
}

install_libs_with_apt
ensure_electron_downloaded
ensure_playwright_browsers
