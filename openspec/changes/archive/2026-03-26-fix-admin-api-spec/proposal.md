## Why

The current `admin-api` spec is outdated and mismatched with the actual implementation. This causes agent-generated changes to use wrong response fields, miss required endpoints, and ignore pagination/search behavior.

## What Changes

- Correct `admin-api` spec to match implemented API contracts
- Add missing endpoints and request/response behaviors
- Standardize requirement format to OpenSpec requirement/scenario structure
- Clarify KV cache payload fields including `ogEnabled`

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `admin-api`: Update requirements to match current API surface and payloads

## Impact

- `openspec/specs/admin-api/spec.md`
- Agent development accuracy for dashboard/admin features
