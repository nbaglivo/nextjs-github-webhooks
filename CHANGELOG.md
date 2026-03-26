# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-03-26

### Changed

- Webhook handling now uses `@octokit/webhooks` `verify()` and `receive()` separately for clearer control flow.
- HTTP responses: `400` for invalid JSON body; `500` when a registered handler throws or rejects; `401` remains for invalid signature.

### Documentation

- Documented why runtime payload schema validation is not included, and how consumers can validate in their own handlers if desired.
- Expanded the **Responses** table in the README.

[1.1.0]: https://github.com/nbaglivo/nextjs-github-webhooks/compare/v1.0.2...v1.1.0
