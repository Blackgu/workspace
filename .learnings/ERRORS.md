# Errors

Command failures and integration errors.

---

## [ERR-20260715-001] sessions_send

**Logged**: 2026-07-15T16:09:00+08:00
**Priority**: low
**Status**: resolved
**Area**: infra

### Summary
Cross-session notification rejected because both `sessionKey` and `label` were supplied.

### Details
The tool requires exactly one target selector. Retry using `sessionKey: "main"` only.

### Suggested Action
Use one of `sessionKey` or `label`, never both.

### Metadata
- Source: error
- Tags: openclaw, sessions_send, parameter-validation

---

## [ERR-20260715-001] openclaw_gateway_restart

**Logged**: 2026-07-15T22:34:00+08:00
**Priority**: low
**Status**: resolved
**Area**: config

### Summary
Safe gateway restart rejects the `--wait` option.

### Details
`openclaw gateway restart --safe --wait 30s` failed because safe restart uses its own deferral mechanism; invoke `--safe` alone.

### Suggested Action
Use `openclaw gateway restart --safe` for a drain-aware restart, or `--wait` only without `--safe`.

---
