# electruss

An electron app (and webpage) for studying how people design trusses

## Development

Install dependencies with npm and run the quality gates headlessly:

- `npm run lint` to enforce ESLint and Prettier checks.
- `npm test` to execute Jest unit tests against renderer helpers.
- `npm run test:ui` to launch Playwright browser and Electron flows in headless mode. The pre-test helper installs the libXcursor, libxss, libxtst, libgdk-pixbuf, and libgtk runtime dependencies when apt-get is available and writable; otherwise it warns and continues. It always downloads the Electron binary (even when install scripts are skipped) and ensures Playwright Chromium is present before executing tests.

## Production builds

- Electron windows are created with `contextIsolation` enabled and the remote module disabled. Keep `ELECTRUSS_ENABLE_DEVTOOLS` unset (or set to `false`) to block DevTools in production binaries; opt in explicitly during development when debugging is required.
- Provide a preload script at `preload.js` to expose only the IPC handlers you need. The bundled preload surface currently exposes metadata via `window.electruss.app.getMetadata()` to avoid leaking powerful Electron primitives into the renderer.
