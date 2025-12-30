# API Usage Examples

This document provides comprehensive examples of how to interact with the Patient Encounter API endpoints.

## Creating an Encounter

Create a new patient encounter record:

```bash
curl --location 'http://localhost:3000/api/v1/encounters' \
--header 'x-api-key: provider1-api-key-123' \
--header 'Content-Type: application/json' \
--data '{
    "patientId": "44fe57b8-289f-4928-a76f-d36ca510afb1",
    "encounterDate": "2025-12-28T14:28:00.000Z",
    "encounterType": "TREATMENT_SESSION",
    "clinicalData": {
        "notes": "Client presented with improved mood and energy levels. Discussed coping strategies for managing anxiety. Client was cooperative and engaged throughout the session.",
        "observations": "Improved eye contact, more relaxed body language, actively participated in session activities, good therapeutic rapport maintained",
        "assessment": "Client shows improved mood (euthymic), good cognitive status (alert and oriented x3), cooperative behavior, normal speech patterns, linear thought process, good insight and judgment. Progress noted in anxiety management."
    }
}'
```

## Retrieving All Encounters

Get a list of all encounters with optional filtering:

```bash
curl --location 'http://localhost:3000/api/v1/encounters' \
--header 'x-api-key: provider1-api-key-123'
```

## Retrieving a Single Encounter

Get a specific encounter by its ID:

```bash
curl --location 'http://localhost:3000/api/v1/encounters/44fe57b8-289f-4928-a76f-d36ca510afb1' \
--header 'x-api-key: provider1-api-key-123'
```

## Retrieving Audit Logs

Access the audit trail for compliance monitoring:

```bash
curl --location 'http://localhost:3000/api/v1/audit/encounters' \
--header 'x-api-key: provider1-api-key-123'
```

## Authentication

All endpoints require an API key passed in the `x-api-key` header. The examples above use the seeded test API key `provider1-api-key-123` which is available when running the application in development mode.

## Response Format

All API responses follow a consistent JSON format with appropriate HTTP status codes. Sensitive patient information (PHI) is automatically redacted from logs while maintaining full data availability through the API responses for authorized requests.
