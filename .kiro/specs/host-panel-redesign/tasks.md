# Implementation Plan

## Phase 1: Foundation & Navigation

- [x] 1. Update Admin Sidebar Navigation

  - [x] 1.1 Update admin-sidebar.tsx with new navigation items (Dashboard, Users, Events, Revenue, Analytics, Settings)


  - Add icons: LayoutDashboard, Users, Calendar, IndianRupee, BarChart3, Settings
  - Add active state highlighting for current page
  - Remove old events list from sidebar
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 2. Create Shared Admin Components

  - [x] 2.1 Create metric-card.tsx component for dashboard stats


  - Props: title, value, icon, trend (optional), trendLabel (optional)
  - Support for loading skeleton state
  - _Requirements: 1.1_

  - [x] 2.2 Create data-table.tsx reusable table component


  - Props: columns, data, pagination, onPageChange, loading
  - Support for clickable rows, action buttons
  - _Requirements: 2.1, 3.1, 4.4_



  - [ ] 2.3 Create search-filter.tsx component
  - Props: searchPlaceholder, filters (array of filter configs), onSearch, onFilter
  - _Requirements: 2.2, 2.3, 3.2, 3.3, 4.5_

---



## Phase 2: Dashboard API & Page

- [ ] 3. Create Dashboard API Route
  - [ ] 3.1 Create /api/admin/dashboard/route.ts
  - Implement GET handler with MongoDB aggregations
  - Return metrics: totalUsers, activeEvents, certificatesThisMonth, revenueThisMonth
  - Return userGrowth array (last 30 days)
  - Return planDistribution array
  - Return recentActivity array (last 10)
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ] 3.2 Write property test for dashboard metrics
  - **Property 1: Dashboard Metrics Consistency**
  - **Validates: Requirements 1.1**

  - [ ] 3.3 Write property test for plan distribution
  - **Property 2: Plan Distribution Invariant**
  - **Validates: Requirements 1.3**




  - [ ] 3.4 Write property test for activity feed
  - **Property 3: Activity Feed Ordering and Limit**
  - **Validates: Requirements 1.4**



- [ ] 4. Create Dashboard Page
  - [x] 4.1 Create /admin/dashboard/page.tsx


  - Fetch data from dashboard API
  - Display 4 metric cards in grid


  - _Requirements: 1.1_



  - [ ] 4.2 Create user-growth-chart.tsx using Recharts
  - Line chart showing registrations over 30 days
  - _Requirements: 1.2_

  - [ ] 4.3 Create plan-distribution-chart.tsx using Recharts
  - Pie chart showing users by plan
  - _Requirements: 1.3_



  - [ ] 4.4 Create activity-feed.tsx component
  - List of recent activities with icons and timestamps


  - _Requirements: 1.4_

  - [ ] 4.5 Update /admin/page.tsx to redirect to /admin/dashboard
  - _Requirements: 7.5_

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 3: Users Management

- [ ] 6. Create Users API Routes
  - [ ] 6.1 Create /api/admin/users/route.ts
  - GET: List users with pagination, search, filter

  - Include eventsCount for each user via aggregation

  - _Requirements: 2.1, 2.2, 2.3_


  - [x] 6.2 Create /api/admin/users/[userId]/route.ts

  - GET: User details with events, payments, stats

  - PATCH: Update user status (isActive)
  - _Requirements: 2.5, 2.6_

  - [x] 6.3 Write property test for user list completeness

  - **Property 4: User List Completeness**

  - **Validates: Requirements 2.1**

  - [ ] 6.4 Write property test for user filter
  - **Property 5: User Filter Correctness**
  - **Validates: Requirements 2.2, 2.3**

  - [ ] 6.5 Write property test for user status toggle
  - **Property 6: User Status Toggle Round-Trip**


  - **Validates: Requirements 2.6**

- [x] 7. Create Users Pages

  - [-] 7.1 Create /admin/users/page.tsx

  - Users table with search and plan filter
  - Clickable rows to navigate to user details
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 7.2 Create /admin/users/[userId]/page.tsx
  - User profile info card
  - Events list created by user
  - Payment history table
  - Status toggle button
  - _Requirements: 2.5, 2.6_

  - [ ] 7.3 Create user-status-toggle.tsx component
  - Toggle switch with confirmation dialog
  - _Requirements: 2.6, 2.7_




- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---



## Phase 4: Events Management

- [ ] 9. Create Events API Routes
  - [x] 9.1 Create /api/admin/events/route.ts (update existing or create new)

  - GET: List all events with owner info, counts

  - Support pagination, search, status filter
  - _Requirements: 3.1, 3.2, 3.3_

  - [ ] 9.2 Create /api/admin/events/[eventId]/route.ts
  - GET: Event details with certificate types, recipients, stats
  - PATCH: Update event status (isActive)
  - _Requirements: 3.5, 3.6_



  - [ ] 9.3 Write property test for event list completeness
  - **Property 8: Event List Completeness**
  - **Validates: Requirements 3.1**

  - [ ] 9.4 Write property test for event filter
  - **Property 9: Event Filter Correctness**
  - **Validates: Requirements 3.2, 3.3**

  - [ ] 9.5 Write property test for event status toggle
  - **Property 10: Event Status Toggle Round-Trip**
  - **Validates: Requirements 3.6**

- [ ] 10. Create Events Pages
  - [ ] 10.1 Create /admin/events/page.tsx (update existing)
  - Events table showing all events across all users
  - Search by name or owner email


  - Filter by status
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ] 10.2 Update /admin/events/[eventId]/page.tsx
  - Event info with owner details
  - Certificate types list with recipient counts
  - Download statistics
  - Status toggle
  - _Requirements: 3.5, 3.6_

  - [ ] 10.3 Create event-status-toggle.tsx component
  - Toggle with confirmation and warning about download prevention
  - _Requirements: 3.6, 3.7_

- [ ] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 5: Revenue & Payments

- [ ] 12. Create Revenue API Route
  - [ ] 12.1 Create /api/admin/revenue/route.ts
  - GET: Revenue totals, monthly trends, plan breakdown


  - GET: Payments list with user info, pagination, filters
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 12.2 Write property test for revenue calculation
  - **Property 12: Revenue Calculation Correctness**
  - **Validates: Requirements 4.1**

  - [ ] 12.3 Write property test for plan revenue breakdown
  - **Property 13: Plan Revenue Breakdown Invariant**
  - **Validates: Requirements 4.3**

  - [ ] 12.4 Write property test for payment filter
  - **Property 14: Payment Filter Correctness**
  - **Validates: Requirements 4.5**

- [ ] 13. Create Revenue Page
  - [ ] 13.1 Create /admin/revenue/page.tsx
  - Revenue metric cards (total, monthly, success rate)
  - _Requirements: 4.1_


  - [-] 13.2 Create revenue-chart.tsx using Recharts

  - Bar chart showing monthly revenue for 12 months
  - _Requirements: 4.2_

  - [ ] 13.3 Create plan-revenue-breakdown.tsx
  - Horizontal bar chart or table showing revenue by plan
  - _Requirements: 4.3_

  - [ ] 13.4 Create payments-table.tsx
  - Table with user, plan, amount, status, date
  - Filter by status and plan
  - Click to view payment details
  - _Requirements: 4.4, 4.5, 4.6_

- [ ] 14. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 6: Analytics

- [ ] 15. Create Analytics API Route
  - [ ] 15.1 Create /api/admin/analytics/route.ts
  - GET: Certificate trends, top users, top events, download stats
  - Support date range filter
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_



  - [x] 15.2 Write property test for top users ordering

  - **Property 15: Top Users Ordering**

  - **Validates: Requirements 5.2**



  - [ ] 15.3 Write property test for top events ordering
  - **Property 16: Top Events Ordering**
  - **Validates: Requirements 5.3**

  - [x] 15.4 Write property test for download rate calculation

  - **Property 17: Download Rate Calculation**


  - **Validates: Requirements 5.4**




  - [-] 15.5 Write property test for date range filter

  - **Property 18: Date Range Filter Correctness**
  - **Validates: Requirements 5.5**



- [x] 16. Create Analytics Page



  - [x] 16.1 Create /admin/analytics/page.tsx


  - Date range picker at top
  - _Requirements: 5.5_

  - [ ] 16.2 Create certificate-trends-chart.tsx
  - Line chart showing certificate generation over time
  - _Requirements: 5.1_

  - [ ] 16.3 Create top-users-list.tsx
  - Table/list of top 10 users by events created
  - _Requirements: 5.2_

  - [ ] 16.4 Create top-events-list.tsx
  - Table/list of top 10 events by recipient count
  - _Requirements: 5.3_

  - [ ] 16.5 Create download-stats.tsx
  - Stats cards showing total, downloaded, pending, rate
  - _Requirements: 5.4_

- [ ] 17. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Phase 7: Data Export

- [ ] 18. Create Export API Routes
  - [ ] 18.1 Create /api/admin/export/users/route.ts
  - GET: Generate CSV with all user data
  - _Requirements: 8.1_

  - [ ] 18.2 Create /api/admin/export/events/route.ts
  - GET: Generate CSV with all events and owner info
  - _Requirements: 8.2_

  - [ ] 18.3 Create /api/admin/export/payments/route.ts
  - GET: Generate CSV with all payment transactions
  - _Requirements: 8.3_

  - [ ] 18.4 Write property test for CSV export completeness
  - **Property 19: CSV Export Completeness**
  - **Validates: Requirements 8.1, 8.2, 8.3**

- [ ] 19. Add Export Buttons to Pages
  - [ ] 19.1 Add export button to Users page
  - _Requirements: 8.1, 8.4_

  - [ ] 19.2 Add export button to Events page
  - _Requirements: 8.2, 8.4_

  - [ ] 19.3 Add export button to Revenue page
  - _Requirements: 8.3, 8.4_

---

## Phase 8: Settings Enhancement

- [ ] 20. Enhance Settings Page
  - [ ] 20.1 Update /admin/settings/page.tsx
  - Add system health indicators (DB status, API health)
  - _Requirements: 6.5_

  - [ ] 20.2 Add admin user management section
  - List current admins
  - Add/remove admin functionality
  - _Requirements: 6.4_

- [ ] 21. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
