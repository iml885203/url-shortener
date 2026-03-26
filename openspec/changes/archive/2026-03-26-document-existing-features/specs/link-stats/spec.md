## ADDED Requirements

### Requirement: Per-link click analytics
The system SHALL provide click analytics for each individual link, broken down by day, referrer, and country.

#### Scenario: Fetch link stats
- **WHEN** `GET /api/links/:id/stats` is called with a valid authenticated request
- **THEN** the system SHALL return `byDay`, `byReferrer`, and `byCountry` arrays

#### Scenario: By-day breakdown
- **WHEN** stats are returned
- **THEN** `byDay` SHALL contain objects with `{ date: string, count: number }`, sorted chronologically

#### Scenario: By-referrer breakdown
- **WHEN** stats are returned
- **THEN** `byReferrer` SHALL contain objects with `{ referrer: string | null, count: number }`, where `null` represents direct traffic

#### Scenario: By-country breakdown
- **WHEN** stats are returned
- **THEN** `byCountry` SHALL contain objects with `{ country: string | null, count: number }`, where `null` represents unknown country

#### Scenario: Link with no clicks
- **WHEN** a link has no recorded clicks
- **THEN** all three arrays SHALL be empty (not null)

#### Scenario: Invalid link ID
- **WHEN** `GET /api/links/:id/stats` is called with a non-existent ID
- **THEN** the system SHALL return 404

### Requirement: Stats page in dashboard
The system SHALL display per-link analytics on a dedicated stats page.

#### Scenario: View stats page
- **WHEN** user navigates to `/links/:id/stats`
- **THEN** the system SHALL display bar charts for clicks by day, referrer breakdown, and country breakdown
