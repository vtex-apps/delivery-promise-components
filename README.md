# delivery-promise-components

VTEX IO app (`vtex.delivery-promise-components`) that exports Store Framework blocks
allowing shoppers to set a postal code, choose a shipping method (delivery vs. pickup),
and select a pickup point — all driven by the [Delivery Promise](https://help.vtex.com/en/tutorial/delivery-promise-beta--p9EJH9GgxL0JceA6dBswd) platform service.

> **Closed beta:** only stores with Delivery Promise enabled can use this app.

See [`docs/README.md`](docs/README.md) for the full block reference, props, CSS handles,
and integration guide.

---

## Prerequisites

- [Node.js 20](https://nodejs.org/) (managed via `.nvmrc` — use `nvm use`)
- [Yarn](https://yarnpkg.com/) (v1)
- [VTEX Toolbelt](https://github.com/vtex/toolbelt): `npm i -g vtex`
- An active VTEX account and development workspace: `vtex login <account>`

## How to run

Install dependencies and refresh VTEX IO typings:

```sh
make dev
```

Link the app to your development workspace (requires a logged-in Toolbelt session):

```sh
make link
# or equivalently: make run
```

The terminal will watch for file changes and hot-reload in the linked workspace.
Confirm the active account/workspace with `vtex whoami` before linking.

## How to test

Run the React unit test suite:

```sh
make test
```

Run all quality checks (lint + test) before opening a PR:

```sh
make check
```

Run with coverage report:

```sh
make coverage
```

## How to publish

> ⚠️ These commands affect production. Always confirm the target account/workspace first.

```sh
vtex publish        # publishes a new app package to the registry
vtex deploy         # promotes a release candidate to stable
```

Use `vtex release patch stable` (or `minor`/`major`) via the standard VTEX IO release workflow to bump the version in `manifest.json` and create the corresponding git tag.

## Documentation

- **Block reference, props, CSS handles:** [`docs/README.md`](docs/README.md)
- **Domain glossary:** [`docs/glossary.md`](docs/glossary.md)
- **Data model:** [`docs/data-model.md`](docs/data-model.md)
- **VTEX IO developer docs:** https://developers.vtex.com/docs/guides/setting-up-delivery-promise-components
- **AI agent guidance:** [`AGENTS.md`](AGENTS.md)
