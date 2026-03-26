## ADDED Requirements

### Requirement: Overview aggregate statistics
The system SHALL provide aggregate click and link statistics for the dashboard home page.

#### Scenario: Fetch overview stats
- **WHEN** `GET /api/stats/overview` is called with a valid authenticated request
- **THEN** the system SHALL return `todayClicks`, `weekClicks`, `totalLinks`, `topLinks`, and `clicksByDay`

#### Scenario: Today and week click counts
- **WHEN** overview stats are returned
- **THEN** `todayClicks` SHALL be the total click count for the current calendar day (UTC)
- **THEN** `weekClicks` SHALL be the total click count for the past 7 days

#### Scenario: Top links
- **WHEN** overview stats are returned
- **THEN** `topLinks` SHALL contain up to 5 links with the highest click counts, each with `id`, `url`, `shortUrl`, `longUrl`, and `clickCount`

#### Scenario: Clicks by day chart
- **WHEN** overview stats are returned
- **THEN** `clicksByDay` SHALL contain the past 14 days of daily click counts as `{ date: string, count: number }[]`

#### Scenario: Empty state
- **WHEN** there are no links and no clicks
- **THEN** `totalLinks` SHALL be 0, `topLinks` SHALL be empty, and `clicksByDay` SHALL be empty

### Requirement: Dashboard home page
The system SHALL display the overview statistics on the dashboard home page.

#### Scenario: Display aggregate stats
- **WHEN** user visits the dashboard home page
- **THEN** the system SHALL display today's clicks, this week's clicks, total links count, top links list, and a bar chart of clicks over the past 14 days

#### Scenario: Empty state display
- **WHEN** there are no links and no clicks
- **THEN** the system SHALL display an empty state message instead of blank charts
