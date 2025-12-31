# Patient Encounter API

The Patient Encounter API provides secure endpoints for managing patient encounter records in healthcare environments.

### Available Endpoints:

    GET /api/v1/docs -> Interactive Swagger API Documentation
    POST /api/v1/encounters -> Create a new encounter record
    GET /api/v1/encounters/:id -> Retrieve specific encounter
    GET /api/v1/encounters -> Retrieve all encounters with filtering options
    GET /api/v1/audit/encounters -> Audit trail endpoint for compliance

## Service Workflow Overview

Below is a flowchart illustrating the request processing workflow of the service:

![Service Workflow](/assets/flowchart.png)

### Components

- **Patient Encounter Service** - Processes incoming requests and manages encounter records.
- **Redis** - An in-memory cache to speed up data retrieval and reduce dependency on the primary database.
- **PostgreSQL** - Stores patient encounter data, clinical information, and audit trails persistently.

## Prerequisites

- Node.js 20.0.0 or higher is required.
- Docker installed on your machine.
  Note: The API service, PostgreSQL database, and Redis cache all run in Docker containers, eliminating environment inconsistencies.

## Running the Service

- Clone this repo
- Navigate to root and run npm install: `cd patient-encounter-api && npm install`
- Start the services: `npm run start:docker`
- Navigate to: http://localhost:3000/api/v1/docs

## How this project is organized

See a high level overview below of how this project is structured.

```sh
├── Dockerfile               # Docker instructions for building the API container
├── docker-compose.yml       # Docker Compose setup for PostgreSQL and API services
├── src
│   ├── main.ts              # Application entry point
│   ├── app.module.ts        # Root application module
│   ├── common/              # Shared utilities and configurations
│   │   ├── audit/           # Audit logging interceptors and services
│   │   ├── auth/            # Authentication guards and decorators
│   │   ├── logging/         # Audit logging system
│   │   ├── prisma.module.ts # Database connection module
│   │   └── types.ts         # Shared type definitions
│   └── encounters/          # Encounter management module
│       ├── encounters.controller.ts
│       ├── encounters.service.ts
│       ├── domain/          # Business entities and schemas
│       └── encounter.repository.ts
├── test
│   ├── encounters.e2e-spec.ts # End-to-end tests
│   ├── setup.ts             # Test configuration and database setup
│   └── jest-e2e.json        # E2E test configuration
├── prisma/
│   ├── schema.prisma        # Database schema
│   ├── seed.ts              # Database seeding
│   └── migrations/          # Database migration files

```

## Running Tests

This service includes both unit and end-to-end tests to ensure that each part of the application functions as expected and to prevent regressions.

### Running Unit Tests

To run the unit tests, navigate to the root directory of the project and use the following command:

```sh
npm run test
```

This will run the tests within docker so that one won't need to have to deal with nodejs version issues.

If all goes well, you can begin seeing a console output similar to below

```sh
PASS src/encounters/domain/encounter.schemas.spec.ts
PASS src/common/logging/logger.service.spec.ts
PASS src/common/audit/audit.service.spec.ts
PASS src/encounters/encounters.service.spec.ts

Test Suites: 4 passed, 4 total
Tests:       40 passed, 40 total
Snapshots:   0 total
Time:        2.172 s
Ran all test suites.
```

### Running End-to-End Tests

The e2e tests verify the complete API functionality including authentication, audit logging, data validation, and security features. The test setup includes automatic database creation and migration.
To run e2e tests with automatic infrastructure setup:

```sh
npm run test:e2e:setup
```

This command will:
- Start PostgreSQL and Redis containers
- Create and migrate the test database automatically
- Run all e2e tests

if everything goes well, the console should print a message like below

```sh
PASS test/encounters.e2e-spec.ts
  Encounters API (e2e)
    Authentication
      ✓ requires API key (24 ms)
      ✓ rejects invalid API key (69 ms)
      ✓ accepts valid API key (88 ms)
    Audit Logging
      ✓ creates audit log for POST (77 ms)
      ✓ creates audit log for GET (161 ms)
      ✓ logs failed requests (73 ms)
      ✓ creates detailed audit log with new fields (148 ms)
    Data Validation
      ✓ validates encounter data (69 ms)
      ✓ creates valid encounter (71 ms)
      ✓ handles non-existent patient (74 ms)
    Response Security
      ✓ does not expose sensitive fields (73 ms)

Test Suites: 1 passed, 1 total
Tests:       11 passed, 11 total
Snapshots:   0 total
Time:        3.434 s
Ran all test suites.
```
## Design Decision

- **NestJS** - NestJS was chosen for its modular architecture, TypeScript support, and excellent integration with healthcare compliance requirements. Its built-in dependency injection simplifies code reuse, improves testability, and ensures maintainable development for complex healthcare applications.
- **Versioning**: API versioning is implemented via URL paths (e.g., /api/v1/encounters) to support future updates and ensure backward compatibility without breaking existing healthcare system integrations.
- **Caching: Redis**: Redis is used for in-memory caching due to its high performance and atomic operations, minimizing database load and improving response times for frequently accessed patient data.
- **Security: API Keys**: API key authentication with bcrypt hashing provides secure service-to-service communication while maintaining audit trails for compliance.
- **Database: PostgreSQL with Prisma**: PostgreSQL provides ACID compliance and strong consistency required for healthcare data, while Prisma ORM ensures type-safe database operations and simplified schema management.
- **HIPAA Compliance**: Audit logging, PHI redaction, and access control ensure healthcare regulation compliance.
- **Audit System**: Complete audit trail of all data access and modifications for regulatory compliance and security monitoring.


### Observability Through Distributed Logging

The service leverages Winston for distributed logging with PHI redaction, ensuring high-level observability while maintaining patient privacy. Once the application is initiated, one can effortlessly monitor and analyze the logs in real-time. This is achieved through the following command: `docker-compose logs -f patient-encounter-api`, you'll be greeted with a similar log message below for a successful encounter creation for example.

```sh
patient-encounter-api  | info: Creating new encounter {"clinicalData":"[REDACTED - PHI]","encounterType":"TREATMENT_SESSION","patientId":"[REDACTED - PHI]","requestId":"3854da50-5df4-40d1-b261-c678f6ab56e2"}
patient-encounter-api  | info: Request completed successfully {"duration":2,"operation":"EncountersController.createEncounter","statusCode":201,"requestId":"3854da50-5df4-40d1-b261-c678f6ab56e2"}
patient-encounter-api  | info: Retrieved 2 encounters {"requestId":"76a38672-7d6e-4e95-8740-7c7c371cc879"}
```

Note: All sensitive patient information (PHI) is automatically redacted from logs to maintain compliance while preserving operational visibility.

### Environmental Variables

The project's environmental variables are stored in a `.env.docker` file in the project root. This file is intended for use during docker container creation. Moreover, it is readily adaptable for integration with Kubernetes, serving as a values file in Helm charts. This ensures that the application can be deployed consistently and reliably across various healthcare environments, from development setups to production clusters, while maintaining the ease of configuration management and regulatory compliance.

---

*For API usage examples and curl commands, see [API Examples](/assets/api-examples.md).*
