# Spec: encoding

## Purpose

Define the bidirectional slug encoding/decoding rules for the two codecs used by the system (`logan` and `sqids`) and the expected handling of valid and invalid inputs.

## Requirements

### Requirement: The system MUST support dual slug codecs for the same numeric ID
The shared codec layer MUST provide both Logan-style and Sqids-style mappings for link IDs.

#### Scenario: Same ID encoded by two codecs
- **WHEN** a non-negative integer ID is provided
- **THEN** the system MUST be able to encode it with Logan codec and Sqids codec as two distinct slugs

#### Scenario: Dual decode convergence
- **WHEN** two slugs (one Logan, one Sqids) both decode successfully for the same logical ID
- **THEN** each decode result MUST equal the original numeric ID

### Requirement: Logan codec MUST enforce Unicode-patterned slug format
Logan decode MUST only accept slugs matching `^l[oοоᴏ]{2,}gan$` (Unicode), and MUST decode by base-4 mapping.

#### Scenario: Valid Logan decode
- **WHEN** slug matches Logan pattern and contains only mapped `o` variants
- **THEN** `loganDecodeSlug` MUST return a numeric ID from base-4 conversion

#### Scenario: Invalid Logan shape
- **WHEN** slug does not match Logan pattern
- **THEN** `loganDecodeSlug` MUST return `null`

#### Scenario: ID zero in Logan
- **WHEN** ID is `0`
- **THEN** Logan encode MUST return a valid slug (`loogan`) and Logan decode of that slug MUST return `0`

### Requirement: Sqids codec MUST decode a single-number payload or return null
Sqids decode wrapper MUST treat only one-number decode output as valid.

#### Scenario: Valid Sqids decode
- **WHEN** `sqids.decode(slug)` returns an array with exactly one number
- **THEN** `sqidsDecodeSlug` MUST return that number

#### Scenario: Invalid Sqids decode payload
- **WHEN** `sqids.decode(slug)` returns zero numbers, multiple numbers, or throws
- **THEN** `sqidsDecodeSlug` MUST return `null`

#### Scenario: ID zero in Sqids
- **WHEN** ID is `0`
- **THEN** Sqids encode MUST produce a valid slug and Sqids decode of that slug MUST return `0`

### Requirement: Encode input validation MUST reject negative and non-integer IDs
Encoding APIs MUST reject unsupported numeric inputs.

#### Scenario: Logan negative or non-integer input
- **WHEN** `loganEncodeId` receives a negative value or non-integer value
- **THEN** the function MUST throw an error and MUST NOT return a slug

#### Scenario: Sqids negative input
- **WHEN** `sqids` encode path receives a negative value
- **THEN** the function MUST throw and MUST NOT return a slug

#### Scenario: Sqids non-integer input
- **WHEN** `sqids` encode path receives a non-integer value
- **THEN** the function MUST fail with an exception and MUST NOT return a slug
