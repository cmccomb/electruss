# electruss

An electron app (and webpage) for studying how people design trusses

## Development

Install dependencies with npm and run the quality gates headlessly:

- `npm run lint` to enforce ESLint and Prettier checks.
- `npm test` to execute Jest unit tests against renderer helpers.
- `npm run test:ui` to launch Playwright browser and Electron flows in headless mode.
