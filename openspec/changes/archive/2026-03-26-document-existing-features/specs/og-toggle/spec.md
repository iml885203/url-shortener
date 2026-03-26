## ADDED Requirements

### Requirement: Per-link OG meta enable/disable
The system SHALL allow each link to have its OG meta rendering independently enabled or disabled via an `ogEnabled` boolean field.

#### Scenario: OG enabled with crawler
- **WHEN** a crawler accesses a link with `ogEnabled: true`
- **THEN** the system SHALL return an HTML page with OG meta tags instead of redirecting

#### Scenario: OG disabled with crawler
- **WHEN** a crawler accesses a link with `ogEnabled: false`
- **THEN** the system SHALL redirect the crawler to the target URL (no OG HTML)

#### Scenario: OG force preview
- **WHEN** any request includes `?og=1` or `?og=true`
- **THEN** the system SHALL return the OG HTML regardless of User-Agent (for debugging)

#### Scenario: Legacy links without ogEnabled
- **WHEN** a link was created before `ogEnabled` existed and has at least one non-empty OG field (title, description, or image)
- **THEN** the system SHALL treat it as `ogEnabled: true` (backward compatibility)

#### Scenario: Legacy links with no OG content
- **WHEN** a link was created before `ogEnabled` existed and has no OG fields set
- **THEN** the system SHALL treat it as `ogEnabled: false`

#### Scenario: Toggle OG via admin API
- **WHEN** `PUT /api/links/:id` is called with `{ ogEnabled: false }`
- **THEN** the system SHALL update the link and crawlers will no longer receive OG HTML for that link

### Requirement: OG toggle in dashboard edit form
The system SHALL provide a toggle control in the link edit form for enabling or disabling OG meta.

#### Scenario: Edit OG toggle
- **WHEN** user edits a link and toggles the OG meta switch
- **THEN** the system SHALL save the `ogEnabled` value and reflect it immediately
