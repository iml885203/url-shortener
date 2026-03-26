## Context

This is a specification-correction change only. No runtime code behavior changes are introduced.

## Goals / Non-Goals

**Goals:**
- Align `admin-api` spec with current implementation
- Ensure endpoint contracts are testable and unambiguous

**Non-Goals:**
- No API behavior changes
- No database/schema migration

## Decisions

- Use a full normalized requirement/scenario structure in `admin-api/spec.md`
- Document response fields in camelCase JSON format as returned by handlers
- Include all implemented admin endpoints used by frontend and dashboard flows

## Risks / Trade-offs

- [Risk] Existing informal text may overlap with new requirements if not replaced → Mitigation: replace spec content with a single canonical version.

## Migration Plan

1. Update admin-api spec content in this change.
2. Archive change to apply updated spec.
3. Run `openspec validate --specs`.

## Open Questions

- None.
