## ADDED Requirements

### Requirement: QR code generation per link
The system SHALL generate a QR code PNG image for any link, encoding either the short or long URL.

#### Scenario: Generate short URL QR code
- **WHEN** `GET /api/links/:id/qr?type=short` is called with a valid ID
- **THEN** the system SHALL return a PNG image encoding the short URL

#### Scenario: Generate long URL QR code
- **WHEN** `GET /api/links/:id/qr?type=long` is called with a valid ID
- **THEN** the system SHALL return a PNG image encoding the long URL

#### Scenario: Default type is short
- **WHEN** `GET /api/links/:id/qr` is called without a `type` parameter
- **THEN** the system SHALL default to `type=short`

#### Scenario: Invalid link ID
- **WHEN** `GET /api/links/:id/qr` is called with a non-existent ID
- **THEN** the system SHALL return 404

### Requirement: QR code modal in dashboard
The system SHALL provide a modal UI for viewing and downloading QR codes.

#### Scenario: Open QR modal
- **WHEN** user clicks the QR button on a link
- **THEN** the system SHALL display a modal with the short URL QR code by default

#### Scenario: Switch between short and long URL
- **WHEN** user clicks the "Long" tab in the QR modal
- **THEN** the system SHALL fetch and display the long URL QR code

#### Scenario: Download QR code
- **WHEN** user clicks "Download" in the QR modal
- **THEN** the system SHALL download the QR PNG file to the user's device

#### Scenario: Share QR code
- **WHEN** user clicks "Share" in the QR modal
- **THEN** the system SHALL trigger the native share dialog with the QR image
