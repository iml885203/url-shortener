## ADDED Requirements

### Requirement: Users can create links with a custom slug
The system MUST allow an optional `customSlug` field on link creation and update.

#### Scenario: Custom slug resolves correctly
- **WHEN** a visitor accesses `/{customSlug}`
- **THEN** the system MUST redirect to the target URL via the custom slug resolution path
