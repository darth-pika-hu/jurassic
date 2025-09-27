# Changelog

## Unreleased
- Replace legacy jQuery- and Flash-based interactions with modern, module-scoped JavaScript while preserving the original Jurassic Systems UI.
- Remove YouTube intro modal and all video pop-up code so the console loads immediately without external requests.
- Add tolerant `access` command parsing and supporting unit tests covering valid and invalid variants.
- Refresh styling and markup for accessibility, focus visibility, and semantic structure without altering the visual design.
- Update supporting pages (About, The King, error) to modern HTML5 semantics and secure external resources.
- Replace outdated assets and dependencies, including `normalize.css`, and remove unused libraries and SWF files.
- Introduce a Cloudflare `_redirects` file at the repository root to ensure the correct landing page on deploy.
