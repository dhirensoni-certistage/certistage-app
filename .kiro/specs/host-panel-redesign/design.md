# Host Panel Redesign - Design Document

## Overview

The Host Panel Redesign transforms the current basic admin interface into a comprehensive, professional-grade administrative dashboard for CertiStage. The redesign focuses on providing real-time insights, efficient user/event management, revenue tracking, and system configuration capabilities.

The panel will be built using Next.js 14 App Router with server components for data fetching, client components for interactivity, and MongoDB for data persistence. The UI will leverage the existing shadcn/ui component library with Tailwind CSS for consistent styling.

## Architecture

```mermaid
graph TB
    subgraph "Host Panel Frontend"
        HP[Host Panel Layout]
        HP --> DB[Dashboard Page]
        HP --> UP[Users Page]
        HP --> EP[Events Page]
        HP --> RP[Revenue Page]
        HP --> AP[Analytics Page]
        HP --> SP[Settings Page]
    end
    
    subgraph "API Routes"
        API1[/api/admin/dashboard]
        API2[/api/admin/users]
        API3[/api/admin/events]
        API4[/api/admin/payments]
        API5[/api/admin/analytics]
        API6[/api/admin/export]
    end
    
    subgraph "Database Models"
        User[(User)]
        Event[(Event)]
        CertType[(CertificateType)]
        Recipient[(Recipient)]
        Payment[(Payment)]
        Admin[(Admin)]
    end
    
    DB --> API1
    UP --> API2
    EP --> API3
    RP --> API4
    AP --> API5
    
    API1 --> User
    API1 --> Event
    API1 --> Payment
    API2 --> User
    API2 --> Event
    API3 --> Event
    API3 --> CertType
    API3 --> Recipient
    API4 --> Payment
    API5 --> User
    API5 --> Event
    API5 --> Recipient
```

## Components and Interfaces

### Page Structure

```
app/admin/
├── layout.tsx              # Admin layout with sidebar
├── page.tsx                # Dashboard (redirect or main)
├── dashboard/
│   └── page.tsx            # Dashboard overview
├── users/
│   ├── page.tsx            # Users list
│   └── [userId]/
│       └── page.tsx        # User details
├── events/
│   ├── page.tsx            # Events list (all users)
│   └── [eventId]/
│       └── page.tsx        # Event details
├── revenue/
│   └── page.tsx            # Revenue & payments
├── analytics/
│   └── page.tsx            # Analytics & reports
├── settings/
│   └── page.tsx            # System settings (existing)
└── login/
    └── page.tsx            # Admin login (existing)
```

### Component Structure

```
components/admin/
├── admin-sidebar.tsx       # Navigation sidebar (update)
├── admin-header.tsx        # Page header (existing)
├── dashboard/
│   ├── metric-card.tsx     # Stats card component
│   ├── user-growth-chart.tsx
│   ├── plan-distribution-chart.tsx
│   └── activity-feed.tsx
├── users/
│   ├── users-table.tsx
│   ├── user-filters.tsx
│   └── user-status-toggle.tsx
├── events/
│   ├── events-table.tsx
│   ├── event-filters.tsx
│   └── event-status-toggle.tsx
├── revenue/
│   ├── revenue-cards.tsx
│   ├── revenue-chart.tsx
│   ├── plan-revenue-breakdown.tsx
│   └── payments-table.tsx
└── analytics/
    ├── certificate-trends-chart.tsx
    ├── top-users-list.tsx
    ├── top-events-list.tsx
    └── download-stats.tsx
```

### API Interfaces

```typescript
// Dashboard API Response
interface DashboardData {
  metrics: {
    totalUsers: number
    activeEvents: number
    certificatesThisMonth: number
    revenueThisMonth: number
  }
  userGrowth: Array<{ date: string; count: number }>
  planDistribution: Array<{ plan: string; count: number }>
  recentActivity: Array<{
    type: 'signup' | 'event_created' | 'payment'
    description: string
    timestamp: string
    userId?: string
  }>
}

// Users API Response
interface UsersListResponse {
  users: Array<{
    _id: string
    name: string
    email: string
    plan: string
    isActive: boolean
    eventsCount: number
    createdAt: string
  }>
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

// User Details Response
interface UserDetailsResponse {
  user: IUser
  events: Array<IEvent & { certificateTypesCount: number; recipientsCount: number }>
  payments: IPayment[]
  stats: {
    totalEvents: number
    totalCertificates: number
    totalRecipients: number
  }
}

// Events API Response
interface EventsListResponse {
  events: Array<{
    _id: string
    name: string
    owner: { _id: string; name: string; email: string }
    certificateTypesCount: number
    recipientsCount: number
    isActive: boolean
    createdAt: string
  }>
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

// Revenue API Response
interface RevenueData {
  totals: {
    allTime: number
    thisMonth: number
    lastMonth: number
    successRate: number
  }
  monthlyRevenue: Array<{ month: string; revenue: number }>
  planBreakdown: Array<{ plan: string; revenue: number; count: number }>
  payments: Array<IPayment & { user: { name: string; email: string } }>
}

// Analytics API Response
interface AnalyticsData {
  certificateTrends: Array<{ date: string; count: number }>
  topUsers: Array<{ user: IUser; eventsCount: number; recipientsCount: number }>
  topEvents: Array<{ event: IEvent; owner: IUser; recipientsCount: number }>
  downloadStats: {
    total: number
    downloaded: number
    pending: number
    downloadRate: number
  }
}
```

## Data Models

### Existing Models (No Changes Required)

The existing MongoDB models are sufficient for the Host Panel:

- **User**: Contains plan, isActive, timestamps - supports user management
- **Event**: Contains ownerId, isActive - supports event management
- **CertificateType**: Linked to events - supports certificate tracking
- **Recipient**: Contains downloadCount - supports analytics
- **Payment**: Contains status, amount, plan - supports revenue tracking
- **Admin**: Supports admin authentication

### Aggregation Queries

```typescript
// Dashboard Metrics
const dashboardMetrics = {
  totalUsers: await User.countDocuments(),
  activeEvents: await Event.countDocuments({ isActive: true }),
  certificatesThisMonth: await Recipient.countDocuments({
    createdAt: { $gte: startOfMonth }
  }),
  revenueThisMonth: await Payment.aggregate([
    { $match: { status: 'success', createdAt: { $gte: startOfMonth } } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ])
}

// User Growth (last 30 days)
const userGrowth = await User.aggregate([
  { $match: { createdAt: { $gte: thirtyDaysAgo } } },
  { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
  { $sort: { _id: 1 } }
])

// Plan Distribution
const planDistribution = await User.aggregate([
  { $group: { _id: '$plan', count: { $sum: 1 } } }
])
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Dashboard Metrics Consistency
*For any* database state, the dashboard metrics (total users, active events, certificates this month, revenue this month) SHALL return non-negative numbers that match the actual counts in the database.
**Validates: Requirements 1.1**

### Property 2: Plan Distribution Invariant
*For any* set of users in the database, the sum of users across all plan categories in the plan distribution SHALL equal the total users count.
**Validates: Requirements 1.3**

### Property 3: Activity Feed Ordering and Limit
*For any* set of platform activities, the recent activity feed SHALL return at most 10 items sorted by timestamp in descending order.
**Validates: Requirements 1.4**

### Property 4: User List Completeness
*For any* user in the database, the users list API response SHALL include all required fields: name, email, plan, isActive, eventsCount, createdAt.
**Validates: Requirements 2.1**

### Property 5: User Filter Correctness
*For any* search query or plan filter, the filtered user list SHALL only contain users that match the specified criteria (name/email contains search term, or plan equals filter value).
**Validates: Requirements 2.2, 2.3**

### Property 6: User Status Toggle Round-Trip
*For any* user, toggling their status (active/inactive) and then fetching the user SHALL return the updated status value.
**Validates: Requirements 2.6**

### Property 7: Deactivated User Login Prevention
*For any* deactivated user, authentication attempts SHALL fail while the user's data (events, payments) SHALL remain intact in the database.
**Validates: Requirements 2.7**

### Property 8: Event List Completeness
*For any* event in the database, the events list API response SHALL include all required fields: name, owner info, certificateTypesCount, recipientsCount, isActive, createdAt.
**Validates: Requirements 3.1**

### Property 9: Event Filter Correctness
*For any* search query or status filter, the filtered event list SHALL only contain events that match the specified criteria.
**Validates: Requirements 3.2, 3.3**

### Property 10: Event Status Toggle Round-Trip
*For any* event, toggling its status and then fetching the event SHALL return the updated status value.
**Validates: Requirements 3.6**

### Property 11: Deactivated Event Download Prevention
*For any* deactivated event, certificate download requests SHALL be rejected with an appropriate error.
**Validates: Requirements 3.7**

### Property 12: Revenue Calculation Correctness
*For any* set of successful payments, the total revenue SHALL equal the sum of all payment amounts with status 'success'.
**Validates: Requirements 4.1**

### Property 13: Plan Revenue Breakdown Invariant
*For any* set of payments, the sum of revenue across all plan categories SHALL equal the total revenue.
**Validates: Requirements 4.3**

### Property 14: Payment Filter Correctness
*For any* status or plan filter, the filtered payments list SHALL only contain payments matching the filter criteria.
**Validates: Requirements 4.5**

### Property 15: Top Users Ordering
*For any* set of users, the top 10 most active users list SHALL be sorted by events count in descending order and limited to 10 items.
**Validates: Requirements 5.2**

### Property 16: Top Events Ordering
*For any* set of events, the top 10 events by recipients list SHALL be sorted by recipient count in descending order and limited to 10 items.
**Validates: Requirements 5.3**

### Property 17: Download Rate Calculation
*For any* set of recipients, the download rate SHALL equal (downloaded count / total count) * 100, handling division by zero gracefully.
**Validates: Requirements 5.4**

### Property 18: Date Range Filter Correctness
*For any* date range selection, all analytics data SHALL only include items with timestamps within the specified range.
**Validates: Requirements 5.5**

### Property 19: CSV Export Completeness
*For any* export request (users, events, or payments), the generated CSV SHALL contain all records from the database with correct column headers.
**Validates: Requirements 8.1, 8.2, 8.3**



## Error Handling

### API Error Responses

```typescript
interface APIError {
  error: string
  code: string
  details?: Record<string, string>
}

// Error codes
const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',           // Not logged in as admin
  FORBIDDEN: 'FORBIDDEN',                 // Not enough permissions
  NOT_FOUND: 'NOT_FOUND',                 // Resource not found
  VALIDATION_ERROR: 'VALIDATION_ERROR',   // Invalid input
  DATABASE_ERROR: 'DATABASE_ERROR',       // MongoDB connection issue
  EXPORT_ERROR: 'EXPORT_ERROR',           // CSV generation failed
}
```

### Error Handling Strategy

1. **Authentication Errors**: Redirect to admin login page
2. **Authorization Errors**: Display "Access Denied" message
3. **Not Found Errors**: Display "Resource not found" with back navigation
4. **Validation Errors**: Display inline field errors
5. **Database Errors**: Display generic error with retry option
6. **Network Errors**: Display offline indicator with retry

### Client-Side Error Boundaries

```typescript
// Wrap each page section in error boundary
<ErrorBoundary fallback={<SectionError onRetry={refetch} />}>
  <DashboardMetrics />
</ErrorBoundary>
```

## Testing Strategy

### Unit Testing

Unit tests will be written using Jest and React Testing Library for:

1. **Utility Functions**
   - Date formatting and calculations
   - CSV generation logic
   - Metric calculations

2. **API Route Handlers**
   - Request validation
   - Response structure
   - Error handling

3. **React Components**
   - Rendering with different props
   - User interactions
   - Loading and error states

### Property-Based Testing

Property-based tests will be written using **fast-check** library to verify correctness properties. Each property test will:

- Run a minimum of 100 iterations
- Generate random but valid test data
- Verify the property holds for all generated inputs
- Be tagged with the corresponding property number from this design document

**Format for property test comments:**
```typescript
// **Feature: host-panel-redesign, Property 1: Dashboard Metrics Consistency**
```

### Integration Testing

Integration tests will verify:

1. **API to Database Flow**
   - CRUD operations persist correctly
   - Aggregations return accurate results

2. **Authentication Flow**
   - Admin login/logout
   - Session management

3. **Export Flow**
   - CSV generation with real data
   - File download functionality

### Test File Structure

```
__tests__/
├── admin/
│   ├── dashboard.test.ts       # Dashboard API tests
│   ├── users.test.ts           # Users API tests
│   ├── events.test.ts          # Events API tests
│   ├── revenue.test.ts         # Revenue API tests
│   ├── analytics.test.ts       # Analytics API tests
│   └── export.test.ts          # Export API tests
├── properties/
│   ├── dashboard.property.ts   # Dashboard property tests
│   ├── users.property.ts       # Users property tests
│   ├── events.property.ts      # Events property tests
│   ├── revenue.property.ts     # Revenue property tests
│   └── analytics.property.ts   # Analytics property tests
└── components/
    └── admin/
        ├── metric-card.test.tsx
        ├── users-table.test.tsx
        └── events-table.test.tsx
```

## UI/UX Design Guidelines

### Color Scheme

- **Primary**: Blue (#3B82F6) - Actions, links, active states
- **Success**: Green (#10B981) - Positive metrics, active status
- **Warning**: Amber (#F59E0B) - Pending states, warnings
- **Danger**: Red (#EF4444) - Errors, delete actions, inactive status
- **Neutral**: Gray scale for text and backgrounds

### Metric Cards Design

```
┌─────────────────────────────┐
│  📊 Total Users             │
│  ┌─────────────────────┐    │
│  │      1,234          │    │
│  └─────────────────────┘    │
│  ↑ 12% from last month      │
└─────────────────────────────┘
```

### Table Design

- Sticky header for scrollable tables
- Row hover highlight
- Clickable rows for navigation
- Action buttons on hover
- Pagination at bottom

### Responsive Breakpoints

- **Desktop (≥1024px)**: Full sidebar, 4-column metric grid
- **Tablet (768-1023px)**: Collapsed sidebar, 2-column metric grid
- **Mobile (<768px)**: Hidden sidebar with hamburger, 1-column layout

## Sidebar Navigation Structure

```typescript
const navigationItems = [
  { 
    name: 'Dashboard', 
    href: '/admin/dashboard', 
    icon: LayoutDashboard 
  },
  { 
    name: 'Users', 
    href: '/admin/users', 
    icon: Users,
    badge: 'totalUsers' // Dynamic badge
  },
  { 
    name: 'Events', 
    href: '/admin/events', 
    icon: Calendar,
    badge: 'activeEvents'
  },
  { 
    name: 'Revenue', 
    href: '/admin/revenue', 
    icon: IndianRupee 
  },
  { 
    name: 'Analytics', 
    href: '/admin/analytics', 
    icon: BarChart3 
  },
  { 
    name: 'Settings', 
    href: '/admin/settings', 
    icon: Settings 
  },
]
```
