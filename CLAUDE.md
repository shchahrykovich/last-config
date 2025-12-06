# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Next.js application for configuration management (feature flags, configuration, prompt library) deployed to Cloudflare Workers using OpenNext. The app is multi-tenant with Prisma ORM managing a D1 database (SQLite on Cloudflare).

## Development Commands

```bash
# Development
npm run dev              # Start Next.js dev server with Turbopack

# Building and Deployment
npm run build            # Build Next.js application
npm run deploy           # Build and deploy to Cloudflare
npm run upload           # Build and upload to Cloudflare (without deployment)
npm run preview          # Build and preview locally with Cloudflare

# Code Quality
npm run lint             # Run ESLint

# Database
# Use Prisma migrations directly - migrations are in prisma/migrations/
# Migrations are applied to D1 database defined in wrangler.jsonc
```

## Testing

The project has two types of tests with separate configurations:

### Service/Backend Tests (Cloudflare Workers)

Tests for services, infrastructure, and server-side logic using Vitest with Cloudflare Workers pool:

```bash
# Run service tests
npm test

# Run in watch mode
npm run test:watch

# Run specific test file
npx vitest tests/your-test-file.test.ts
```

Test configuration is in `vitest.config.ts` with:
- Global test timeout: 20 seconds
- File parallelism disabled
- Isolated worker mode (each test file runs in separate runtime)
- Uses `wrangler.jsonc` for Cloudflare bindings
- Integration tests excluded by default (Next.js/OpenNext incompatibilities)

### Component/UI Tests (jsdom)

Tests for React components and pages using Vitest with jsdom:

```bash
# Run component tests
npm run test:component

# Run in watch mode
npm run test:component:watch

# Run all tests (service + component)
npm run all-test
```

Component test configuration is in `vitest.config.component.ts` with:
- jsdom environment for React component testing
- React Testing Library for component interactions
- Setup file at `tests/setup-component-tests.ts` with mocks for:
  - `window.matchMedia` (for Ant Design responsive components)
  - `ResizeObserver` (for Ant Design modals)
  - `next/navigation` (Next.js router)
  - `next-auth/react` (authentication)

### How to Write Tests

**Prefer End-to-End Tests with Database**
- Use real database connections with Cloudflare D1 in tests
- Tests should use `PrismaClient` with D1 adapter to interact with actual database
- Migrations are automatically applied via `applyMigrations()` helper from `tests/helpers/db-setup.ts`
- Example pattern:
```typescript
import { env } from 'cloudflare:test'
import { PrismaD1 } from '@prisma/adapter-d1'
import { PrismaClient } from '@prisma/client'
import { applyMigrations } from '../helpers/db-setup'

describe('MyService', () => {
    let db: PrismaClient

    beforeAll(async () => {
        await applyMigrations()
        const adapter = new PrismaD1(env.DB)
        db = new PrismaClient({ adapter })
    })

    afterAll(async () => {
        // Cleanup test data
        await db.$disconnect()
    })
})
```

**CRITICAL: Test Multi-Tenant Leakages**
Every test for services/APIs that handle tenant data MUST verify tenant isolation:
- Create data for multiple tenants
- Verify that queries with one `tenantId` NEVER return data from another tenant
- Test that users cannot access/modify data from other tenants
- Example:
```typescript
it('should not return data from different tenant', async () => {
    // Create data for tenant A
    const tenantA = await db.tenants.create({ data: { isActive: true }})
    const projectA = await db.projects.create({
        data: { name: 'Project A', tenantId: tenantA.id }
    })

    // Create data for tenant B
    const tenantB = await db.tenants.create({ data: { isActive: true }})

    // Query with tenant B - should NOT see tenant A's data
    const projects = await service.getProjects(tenantB.id)
    expect(projects).not.toContainEqual(expect.objectContaining({ id: projectA.id }))
    expect(projects.length).toBe(0)
})
```

**Test Permissions and Access Control**
- Test that operations properly enforce tenant/project access
- Test that API key authentication works correctly
- Test both success and failure cases
- Example:
```typescript
it('should reject access with wrong tenant', async () => {
    const project = await db.projects.create({
        data: { name: 'Project', tenantId: tenant1.id }
    })

    // Try to access with wrong tenant
    await expect(
        service.getProject(project.id, tenant2.id)
    ).rejects.toThrow('Not found')
})

it('should reject invalid API key', async () => {
    const response = await middleware(request, { params: Promise.resolve({}) })
    expect(response.status).toBe(401)
})
```

**CRITICAL: Always Verify Database State**
After performing any operation that modifies data, always verify the database state directly:
- Query the database to confirm data was properly persisted
- Check that relationships are correctly established
- Verify that data isolation is maintained (no leakage between tenants)
- Confirm that updates/deletes actually affected the database
- Example:
```typescript
it('should create prompt and persist to database', async () => {
    const prompt = await service.createPrompt({
        name: 'Test Prompt',
        body: { role: 'system', content: 'Hello' },
        projectId,
        tenantId
    })

    // Verify in database
    const dbPrompt = await db.prompts.findUnique({
        where: { id: prompt.id }
    })
    expect(dbPrompt).not.toBeNull()
    expect(dbPrompt?.name).toBe('Test Prompt')
    expect(dbPrompt?.tenantId).toBe(tenantId)
    expect(JSON.parse(dbPrompt?.body || '{}')).toEqual({
        role: 'system',
        content: 'Hello'
    })
})

it('should update user and reflect in database', async () => {
    const user = await service.createUser({
        email: 'test@example.com',
        password: 'password',
        tenantId
    })

    await service.updateUser(user.id, tenantId, {
        name: 'Updated Name'
    })

    // Verify the update persisted
    const dbUser = await db.user.findUnique({
        where: { id: user.id }
    })
    expect(dbUser?.name).toBe('Updated Name')
})

it('should delete record from database', async () => {
    const project = await service.createProject({
        name: 'To Delete',
        tenantId
    })

    await service.deleteProject(project.id, tenantId)

    // Verify deletion in database
    const dbProject = await db.projects.findUnique({
        where: { id: project.id }
    })
    expect(dbProject).toBeNull()
})
```

**Test Organization**
- Place tests in `tests/` directory mirroring `src/` structure
- Service tests: `tests/services/[service-name]/[service-name].test.ts`
- Infrastructure tests: `tests/infrastructure/[file-name].test.ts`
- Lib tests: `tests/lib/[file-name].test.ts`
- Component tests: `tests/app/[page-name]/page.test.tsx`

**Test Cleanup**
- Always clean up test data in `afterAll` hooks
- Delete in reverse dependency order (child records before parent records)
- Use `deleteMany` with `tenantId` filter for efficient cleanup

**Current Test Coverage**
- 163 tests across 13 test files
- Services: api-keys, config, feature-flags, projects, prompts, tenants, users, value-parser
- Infrastructure: api-requests, logging, middlewares
- Lib: utils
- Components: users page

### How to Write Component Tests

Component tests use React Testing Library and should focus on user interactions and UI behavior.

**Basic Component Test Pattern:**
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MyPage from '@/app/my-page/page'

// Mock child components or dependencies if needed
vi.mock('@/components/AppLayout', () => ({
  default: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid="app-layout">
      <h1>{title}</h1>
      {children}
    </div>
  ),
}))

describe('MyPage', () => {
  beforeEach(() => {
    // Reset mocks before each test
    global.fetch = vi.fn()
  })

  it('should render the page', () => {
    render(<MyPage />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })

  it('should handle user interactions', async () => {
    const user = userEvent.setup()

    // Mock API response
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: 'mock data' }),
    })

    render(<MyPage />)

    // Simulate user interaction
    const button = screen.getByRole('button', { name: 'Click Me' })
    await user.click(button)

    // Assert expected behavior
    await waitFor(() => {
      expect(screen.getByText('Success')).toBeInTheDocument()
    })
  })
})
```

**Component Testing Best Practices:**
- Test user behavior, not implementation details
- Use `screen.getByRole()` and semantic queries when possible
- Mock API calls with `global.fetch`
- Use `waitFor()` for async operations and state updates
- For Ant Design modals, wait for animations or check for functional results rather than DOM removal
- Mock complex child components to isolate the component under test
- Use `userEvent` for simulating user interactions (more realistic than `fireEvent`)

**Testing Ant Design Components:**
- Modals may not fully unmount immediately due to animations - test functional outcomes instead
- Use class selectors for Ant Design components when needed (e.g., `.ant-spin`, `.ant-modal`)
- Suppress expected warnings in `tests/setup-component-tests.ts`

## Architecture

### Deployment Stack
- **Next.js 16** with React 19, App Router
- **@opennextjs/cloudflare** for deploying Next.js to Cloudflare Workers
- **Cloudflare D1** (SQLite) as database
- **Wrangler** for Cloudflare deployment configuration

### Database & ORM
- **Prisma** with D1 driver adapter (`@prisma/adapter-d1`)
- Database access via `getDB()` helper in `src/lib/utils.ts`
- Schema location: `prisma/schema.prisma`
- Migrations: `prisma/migrations/` (configured in `wrangler.jsonc`)

### Domain and Business Logic
- Place domain services and business logic in `src/services`
- API must call domain services
- Domain service is class

### Customer Facing API
- Use API key authentication
- Located in `src/app/api/v1`

### API Structure
- Located in `src/app/api`
- For each endpoint create `dto.ts` with request and response schema
- Shared DTOs in `src/app/api/shared-dto.ts`
- Use `authMiddleware` from `src/infrastructure/middlewares.ts` for authenticated requests
- Use `secretApiKeyAuthMiddleware` from `src/infrastructure/middlewares.ts` for secret API key authentication (backend only, format: `sk_{public}_{private}`)
- Use `publicApiKeyAuthMiddleware` from `src/infrastructure/middlewares.ts` for public API key authentication (can be used in frontend, format: `pk_{public}`)

### Authentication
- **NextAuth v5** (beta) with Prisma adapter
- Credentials provider (email/password with bcrypt)
- JWT session strategy (30 day expiry)
- Auth configuration: `src/app/auth.ts`
- Middleware: `src/middleware.ts` with whitelist for public routes

### Cloudflare Context
Access Cloudflare bindings via `getCloudflareContext()`:
```typescript
import { getCloudflareContext } from "@opennextjs/cloudflare"
const context = await getCloudflareContext({ async: true })
const env = context.env as ServerEnv
```

Required bindings in `wrangler.jsonc`:
- `DB` - D1 database binding
- `ASSETS` - Static assets binding
- `AUTH_SECRET` - Secret for NextAuth (generate with `openssl rand -hex 32`)

Environment variables:
- `GITHUB_URL` - Repository URL
- `ALLOW_TO_CREATE_MORE_THAN_ONE_TENANT` - Multi-tenant flag

### Multi-Tenant Architecture
- All main entities (Projects, ApiKeys, Prompts, etc.) have `tenantId` field
- Users are linked to tenants via `User.tenantId`
- Tenant service: `src/services/tenant-service.ts`

### Data Models
Core entities in `prisma/schema.prisma`:
- **Tenants** - Tenant organizations
- **Projects** - Projects within tenants
- **ApiKeys** - API keys scoped to tenant/project (supports two types):
  - **Secret keys** (`sk_{public}_{private}`) - For backend use only, private part is bcrypt hashed
  - **Public keys** (`pk_{public}`) - Can be safely used in frontend code, no private part
- **Prompts** - Prompt library entries
- **PromptVersions** - Versioned prompts
- **FeatureFlags** - Feature flags
- **User/Account/Session** - NextAuth models

### UI Framework
- **Ant Design** for React with Next.js registry
- Components use Ant Design components
- Layout structure: `src/app/layout.tsx`, `src/components/AppLayout.tsx`

### Logging
Custom logging utilities in `src/infrastructure/logging.ts`:
- `logError()` - Structured error logging with AsyncLocalStorage context
- `logInfo()` - Info logging with context

## Important Files

- `wrangler.jsonc` - Cloudflare Workers config (bindings, routes, D1 database)
- `open-next.config.ts` - OpenNext configuration for Cloudflare
- `next.config.ts` - Next.js config with Cloudflare dev mode initialization
- `prisma.config.ts` - Prisma config pointing to schema directory
- `vitest.config.ts` - Service test configuration with Cloudflare Workers pool
- `vitest.config.component.ts` - Component test configuration with jsdom
- `tests/setup-component-tests.ts` - Component test setup with mocks
- `src/lib/utils.ts` - Core utilities (DB access, Cloudflare context)
- `src/middleware.ts` - Auth middleware with route protection

## Key Patterns

### Server-Only Code
Files with authentication, database access, and sensitive logic use `'server-only'` directive:
```typescript
import 'server-only'
```

### Database Access
Always use the `getDB()` helper which properly initializes Prisma with D1 adapter:
```typescript
import { getDB } from '@/lib/utils'
const db = await getDB()
```

### Path Aliases
Project uses `@/*` alias for `src/*` directory (configured in tsconfig and vitest config).

## Design System

The application follows a clean, minimal design system focused on content and usability.

### Color Palette

Colors are defined in `src/lib/theme.ts` as `lcColors`:

**Text Colors:**
- `textPrimary: #37352F` - Main text, headings
- `textSecondary: #787774` - Secondary text, labels
- `textTertiary: #9B9A97` - Tertiary text, hints

**Background Colors:**
- `bgBase: #FFFFFF` - Cards, modals, inputs
- `bgPage: #FBFBFA` - Page background
- `bgSidebar: #F7F6F3` - Sidebar background
- `bgHover: #F1F0EE` - Hover state
- `bgActive: #E9E8E6` - Active/selected state

**Border Colors:**
- `borderPrimary: #E9E9E7` - Primary borders
- `borderSecondary: #EDECE9` - Subtle dividers

**Accent Colors (use sparingly):**
- `accentBlue: #0B6E99` - Links, info
- `accentGreen: #0F7B6C` - Success
- `accentRed: #E03E3E` - Errors, danger
- `accentOrange: #D9730D` - Warnings

### Typography

**Font Stack:**
```css
-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif
```

**Size Scale:**
- Heading 1: 32px, weight 700 (page titles)
- Heading 2: 24px, weight 600 (section titles)
- Heading 3: 20px, weight 600 (subsections)
- Heading 4: 16px, weight 600 (card titles)
- Heading 5: 14px, weight 600 (small headings)
- Body: 14px, weight 400 (regular text)
- Small: 13px, weight 400 (secondary text)
- Tiny: 12px, weight 400 (captions, metadata)

**Best Practices:**
- Use negative letter-spacing (-0.5px) for large headings
- Maintain 1.5 line-height for body text
- Use 1.2-1.3 line-height for headings
- Never use pure black (#000000), use `textPrimary` instead

### Spacing System

Consistent spacing scale (defined in theme tokens):
- **XS**: 8px - Tight spacing, inline elements
- **SM**: 12px - Close relationships
- **MD**: 16px - Default spacing
- **LG**: 24px - Section spacing
- **XL**: 32px - Major sections
- **XXL**: 40px - Page-level spacing

**Padding:**
- Cards: 20-24px
- Modals: 24px
- Page content: 40px 60px
- Buttons: 16px horizontal, auto vertical

**Margins:**
- Between sections: 32px
- Between related items: 16px
- Between form fields: 24px

### Component Patterns

#### Reusable Components

**Always use these custom components for consistency:**

1. **PageHeader** (`@/components/PageHeader`)
   ```tsx
   <PageHeader
     title="Page Title"
     subtitle="Optional description"
     icon={<Icon />}
     breadcrumb={<Breadcrumb items={[...]} />}
     actions={<Button>Action</Button>}
   />
   ```

2. **ProjectCard** (`@/components/ProjectCard`)
   - Use for project listings
   - Built-in hover effects and animations
   ```tsx
   <ProjectCard
     name="Project Name"
     createdAt={isoDate}
     onClick={() => navigate()}
   />
   ```

3. **EmptyState** (`@/components/EmptyState`)
   - Use instead of Ant Design's `<Empty>`
   - Better visual design and UX
   ```tsx
   <EmptyState
     icon={<Icon />}
     title="No items yet"
     description="Create your first item to get started"
     action={{ label: 'Create', onClick: handler, icon: <PlusOutlined /> }}
   />
   ```

4. **Breadcrumb** (`@/components/Breadcrumb`)
   ```tsx
   <Breadcrumb items={[
     { label: 'Projects', href: '/' },
     { label: 'Project Name', href: '/projects/123' },
     { label: 'Current Page' }
   ]} />
   ```

#### Layout Pattern

**Standard page structure:**
```tsx
<AppLayout>
  <PageHeader
    title="Page Title"
    subtitle="Description"
    icon={<Icon />}
    breadcrumb={<Breadcrumb items={[...]} />}
    actions={<Button>Primary Action</Button>}
  />

  {/* Page content */}
</AppLayout>
```

**Do NOT pass `title` or `icon` props to `AppLayout` - use `PageHeader` instead.**

#### Cards

**Hover Effects:**
- Subtle lift: `transform: translateY(-2px)`
- Border color change: `borderSecondary` → `borderPrimary`
- Shadow elevation: subtle → `0 4px 12px rgba(0, 0, 0, 0.08)`
- Smooth transition: `0.2s cubic-bezier(0.4, 0, 0.2, 1)`

**Pattern:**
```tsx
const [isHovered, setIsHovered] = useState(false);

<Card
  onMouseEnter={() => setIsHovered(true)}
  onMouseLeave={() => setIsHovered(false)}
  style={{
    border: `1px solid ${isHovered ? lcColors.borderPrimary : lcColors.borderSecondary}`,
    transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
    boxShadow: isHovered ? '0 4px 12px rgba(0, 0, 0, 0.08)' : '0 1px 2px rgba(0, 0, 0, 0.04)',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  }}
>
  {content}
</Card>
```

#### Buttons

**Primary Actions:**
- Use `type="primary"` sparingly (1-2 per page max)
- For main page action (e.g., "Create Project")

**Secondary Actions:**
- Use `type="default"` for most buttons
- Clear borders, subtle hover

**Text Buttons:**
- Use `type="text"` for tertiary actions
- Navigation, cancel, dismiss

**Danger Actions:**
- Use `danger` prop for destructive actions
- Delete, remove, clear

**Button Sizes:**
- `size="large"` - Page-level primary actions
- Default size - Most buttons
- `size="small"` - Compact spaces, tables

#### Forms

**Layout:**
- Always use `layout="vertical"` for forms
- Label above input (better for scanning)

**Validation:**
- Show errors on blur or submit, not on every keystroke
- Use clear, actionable error messages
- Required fields marked with asterisk (automatic with Ant Design)

**Spacing:**
- 24px between form fields
- Group related fields with less spacing (16px)

**Pattern:**
```tsx
<Form layout="vertical" onFinish={handleSubmit}>
  <Form.Item
    label="Field Label"
    name="fieldName"
    rules={[
      { required: true, message: 'Please enter a value' },
      { max: 255, message: 'Must be less than 255 characters' }
    ]}
  >
    <Input placeholder="Placeholder text" />
  </Form.Item>

  <Form.Item style={{ marginTop: '24px' }}>
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
      <Button onClick={handleCancel}>Cancel</Button>
      <Button type="primary" htmlType="submit">Submit</Button>
    </div>
  </Form.Item>
</Form>
```

#### Modals

**Structure:**
```tsx
<Modal
  title="Modal Title"
  open={isOpen}
  onCancel={handleClose}
  footer={null}  // Always null, use form buttons
  width={500}    // Default width for most modals
>
  <Form layout="vertical" onFinish={handleSubmit}>
    {/* Form content */}
  </Form>
</Modal>
```

**Best Practices:**
- Set `footer={null}` and use form buttons instead
- Close on cancel and after successful submit
- Reset form on close
- Use controlled state for `open` prop

### Animations & Transitions

**Page Transitions:**
- All page content wrapped in `.page-content` class
- Automatic fade-in animation (0.3s ease-out)
- Subtle upward motion (8px translateY)

**Interactive Elements:**
- Hover transitions: 0.15s - 0.2s
- Use `cubic-bezier(0.4, 0, 0.2, 1)` for natural easing
- Button press: `scale(0.98)` on `:active`

**Loading States:**
- Use skeleton screens (`.skeleton` class) over spinners when possible
- For full-page loading, center spinner with padding
- Show loading state immediately on action

**Available Animations:**
```css
/* Fade-in for pages */
.page-content { animation: fadeIn 0.3s ease-out; }

/* Skeleton loading */
.skeleton { /* shimmer animation */ }

/* Button press */
button:active { transform: scale(0.98); }
```

### Icons

**Usage:**
- Use Ant Design icons (`@ant-design/icons`)
- Outlined style preferred (not filled)
- Consistent sizing:
  - Page headers: 28px
  - Card headers: 20-24px
  - Buttons: 14-16px
  - Menu items: 18px

**Colors:**
- Primary text color: `lcColors.textSecondary`
- Hover: `lcColors.textPrimary`
- Disabled: `lcColors.textTertiary`

### Borders & Shadows

**Borders:**
- Default: 1px solid `lcColors.borderSecondary`
- Hover/focus: 1px solid `lcColors.borderPrimary`
- Never use thick borders (max 1px)

**Shadows:**
- Resting: `0 1px 2px rgba(0, 0, 0, 0.04)`
- Hover: `0 4px 12px rgba(0, 0, 0, 0.08)`
- Elevated: `0 8px 24px rgba(0, 0, 0, 0.12)`
- Never use harsh, dark shadows

**Border Radius:**
- Small: 2-3px (buttons, inputs, tags)
- Medium: 6px (cards, modals)
- Never use large border radius (max 6px)

### Accessibility

**Focus States:**
- Custom focus outline: `2px solid rgba(0, 0, 0, 0.1)`
- 2px offset for visibility
- Never remove focus outlines

**Keyboard Navigation:**
- All interactive elements must be keyboard accessible
- Modal should close on `Escape`
- Forms submit on `Enter`
- Use semantic HTML (`button`, `nav`, `main`)

**Screen Readers:**
- Use `aria-label` for icon-only buttons
- Breadcrumb should have `aria-label="Breadcrumb"`
- Loading states should announce to screen readers

**Color Contrast:**
- Text colors meet WCAG AA standards
- Don't rely on color alone to convey meaning
- Use icons + text for actions

### Best Practices

**DO:**
- ✅ Use `lcColors` constants for all colors
- ✅ Use reusable components (`PageHeader`, `EmptyState`, etc.)
- ✅ Add subtle hover effects to interactive elements
- ✅ Maintain consistent spacing (8px scale)
- ✅ Use page fade-in animations
- ✅ Keep shadows subtle
- ✅ Test keyboard navigation
- ✅ Use semantic HTML
- ✅ Group related content visually
- ✅ Add loading states for async operations

**DON'T:**
- ❌ Use bright, saturated colors
- ❌ Add heavy shadows or borders
- ❌ Use large border radius (max 6px)
- ❌ Put multiple primary buttons on one page
- ❌ Use pure black (#000) or pure white (#FFF) for text
- ❌ Skip loading states
- ❌ Ignore hover states
- ❌ Mix different card styles
- ❌ Use inline styles when theme tokens exist
- ❌ Create new spacing values (use the scale)

### Design Checklist

Before committing new UI components:

- [ ] Uses `lcColors` from theme
- [ ] Has hover state (if interactive)
- [ ] Has loading state (if async)
- [ ] Has empty state (if lists data)
- [ ] Uses consistent spacing (8px scale)
- [ ] Uses proper typography scale
- [ ] Has keyboard support
- [ ] Has focus indicators
- [ ] Tested on mobile (responsive)
- [ ] Follows existing component patterns
- [ ] No hardcoded colors or spacing
- [ ] Smooth transitions (0.15-0.3s)

### File Organization

**Component Files:**
```
src/components/
  ├── AppLayout.tsx        # Main layout wrapper
  ├── AppMenu.tsx          # Sidebar navigation
  ├── PageHeader.tsx       # Page header with breadcrumb
  ├── Breadcrumb.tsx       # Navigation breadcrumb
  ├── ProjectCard.tsx      # Project card with hover
  ├── EmptyState.tsx       # Better empty states
  └── [feature]Component.tsx
```

**Theme Files:**
```
src/lib/
  └── theme.ts             # Color palette & Ant Design theme config
```

**Style Files:**
```
src/app/
  └── globals.css          # Global styles, animations, utilities
```
