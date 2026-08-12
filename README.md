# Pebble

Pebble is the desktop app for configuring Pebble hardware, discovering Pebbles over Bluetooth, configuring docks, and triggering desktop actions when a Pebble is placed on a configured dock.

## Desktop build

The Windows/Tauri application uses a standalone Vite + TanStack Router client build. The web/Lovable build remains on TanStack Start; the desktop bundle deliberately does not depend on SSR or prerender output.
