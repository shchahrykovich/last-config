# Last Config

A multi-tenant configuration management platform for feature flags, prompts library, and application configuration. Built with Next.js 15 and deployed to Cloudflare Workers.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/shchahrykovich/last-config)

## Features

### Feature Flags
- Priority-based feature flag evaluation (user-specific > role-specific > account-specific > default)
- Support for boolean, string, and number value types
- Public and secret API key access levels
- Query feature flags by user ID, role, or account ID
- Multiple flag retrieval in a single request

### Prompts Library
- Store and version LLM prompts
- Organize prompts by project
- Retrieve prompts via API for runtime use
- JSON body support for structured prompt data

### Multi-Tenant Architecture
- Isolated data per tenant organization
- Project-based organization within tenants
- Scoped API keys to tenant and project

### API Key Authentication
- **Secret Keys** (`sk_{public}_{private}`) - For backend use, full access to all features
- **Public Keys** (`pk_{public}`) - Frontend-safe, limited to public feature flags

### Infrastructure
- Next.js 15 with App Router and React 19
- Cloudflare Workers deployment via OpenNext
- Cloudflare D1 (SQLite) database
- Prisma ORM with D1 adapter
- NextAuth v5 for authentication

## API Examples

### Health Check

Verify API key authentication:

```bash
curl -H "Authorization: Bearer sk_{public}_{private}" \
  https://your-domain.com/api/v1/health
```

Response:
```json
{
  "status": "Ok"
}
```

### Get Feature Flags (Secret Key)

Retrieve feature flags with full access using a secret API key:

```bash
# Single flag
curl -H "Authorization: Bearer sk_{public}_{private}" \
  "https://your-domain.com/api/v1/feature-flags?names=dark_mode"

# Multiple flags (comma-separated)
curl -H "Authorization: Bearer sk_{public}_{private}" \
  "https://your-domain.com/api/v1/feature-flags?names=dark_mode,new_ui,max_users"

# With user context for priority-based evaluation
curl -H "Authorization: Bearer sk_{public}_{private}" \
  "https://your-domain.com/api/v1/feature-flags?names=dark_mode&userId=user123&userRole=admin"
```

Response:
```json
{
  "featureFlags": [
    {
      "name": "dark_mode",
      "value": true
    },
    {
      "name": "max_users",
      "value": 100
    }
  ]
}
```

### Get Feature Flags (Public Key)

Retrieve only public feature flags using a public API key (safe for frontend):

```bash
curl -H "Authorization: Bearer pk_{public}" \
  "https://your-domain.com/api/v1/public/feature-flags?names=dark_mode,theme"
```

Response:
```json
{
  "featureFlags": [
    {
      "name": "dark_mode",
      "value": false
    },
    {
      "name": "theme",
      "value": "light"
    }
  ]
}
```

### List All Prompts

Retrieve all prompts for the project:

```bash
curl -H "Authorization: Bearer sk_{public}_{private}" \
  https://your-domain.com/api/v1/prompts
```

Response:
```json
{
  "items": [
    {
      "id": 1,
      "name": "welcome_message",
      "body": {
        "system": "You are a helpful assistant",
        "user": "Hello!"
      },
      "projectId": 42,
      "createdAt": "2025-01-15T10:00:00Z",
      "updatedAt": "2025-01-15T10:00:00Z"
    }
  ]
}
```

### Get Single Prompt by ID

Retrieve a specific prompt:

```bash
curl -H "Authorization: Bearer sk_{public}_{private}" \
  https://your-domain.com/api/v1/prompts/123
```

Response:
```json
{
  "id": 123,
  "name": "code_review_prompt",
  "body": {
    "system": "You are a code reviewer",
    "instructions": "Review the following code for best practices"
  },
  "projectId": 42,
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-01-15T10:00:00Z"
}
```

## Development

See [CLAUDE.md](./CLAUDE.md) for detailed development instructions.

```bash
# Start development server
npm run dev

# Build and deploy to Cloudflare
npm run deploy

# Run tests
npx vitest
```