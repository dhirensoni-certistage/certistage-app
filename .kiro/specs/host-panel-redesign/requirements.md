# Requirements Document

## Introduction

This document defines the requirements for a comprehensive Host Panel redesign for CertiStage - a certificate generation and distribution platform. The Host Panel serves as the administrative control center where the platform owner (host) can manage all users, events, certificates, payments, and system settings. The redesign transforms the current basic admin panel into a professional, feature-rich dashboard with real-time analytics, user management, event oversight, and revenue tracking capabilities.

## Glossary

- **Host**: The platform administrator/owner who manages the entire CertiStage system
- **User**: A client who signs up on CertiStage to create events and generate certificates
- **Event**: A certificate distribution campaign created by a user (e.g., conference, workshop)
- **Certificate Type**: A specific certificate template within an event (e.g., Participation, Winner)
- **Recipient**: An individual who receives a certificate
- **Plan**: Subscription tier (Free, Professional, Enterprise, Premium)
- **Host Panel**: The administrative dashboard for the platform owner

## Requirements

### Requirement 1: Dashboard Overview

**User Story:** As a host, I want to see key platform metrics at a glance, so that I can quickly understand the health and activity of my platform.

#### Acceptance Criteria

1. WHEN the host navigates to the dashboard THEN the Host Panel SHALL display metric cards showing total users count, active events count, certificates generated this month, and revenue this month
2. WHEN viewing the dashboard THEN the Host Panel SHALL display a user growth line chart showing registrations over the last 30 days
3. WHEN viewing the dashboard THEN the Host Panel SHALL display a plan distribution pie chart showing users by subscription tier
4. WHEN viewing the dashboard THEN the Host Panel SHALL display a recent activity feed showing the last 10 platform activities (signups, events created, payments)
5. WHEN new data is available THEN the Host Panel SHALL refresh dashboard metrics without requiring page reload

---

### Requirement 2: Users Management

**User Story:** As a host, I want to view and manage all registered users, so that I can monitor user activity and handle account issues.

#### Acceptance Criteria

1. WHEN the host navigates to Users page THEN the Host Panel SHALL display a paginated table with columns: Name, Email, Plan, Status, Events Count, Join Date
2. WHEN the host searches for a user THEN the Host Panel SHALL filter the user list by name, email, or organization
3. WHEN the host filters by plan THEN the Host Panel SHALL show only users with the selected subscription tier
4. WHEN the host clicks on a user row THEN the Host Panel SHALL navigate to a detailed user profile view
5. WHEN viewing user details THEN the Host Panel SHALL display profile info, subscription history, events created, certificates generated, and payment history
6. WHEN the host toggles user status THEN the Host Panel SHALL activate or deactivate the user account and persist the change to the database
7. WHEN a user account is deactivated THEN the Host Panel SHALL prevent that user from logging in while preserving their data

---

### Requirement 3: Events Management

**User Story:** As a host, I want to view and manage all events across all users, so that I can monitor platform usage and assist users when needed.

#### Acceptance Criteria

1. WHEN the host navigates to Events page THEN the Host Panel SHALL display a paginated table with columns: Event Name, Owner, Certificate Types Count, Recipients Count, Status, Created Date
2. WHEN the host searches for an event THEN the Host Panel SHALL filter events by name or owner email
3. WHEN the host filters by status THEN the Host Panel SHALL show only active or inactive events
4. WHEN the host clicks on an event row THEN the Host Panel SHALL navigate to a detailed event view
5. WHEN viewing event details THEN the Host Panel SHALL display event info, owner details, all certificate types, recipient counts, and download statistics
6. WHEN the host toggles event status THEN the Host Panel SHALL activate or deactivate the event and persist the change to the database
7. WHEN an event is deactivated THEN the Host Panel SHALL prevent certificate downloads for that event

---

### Requirement 4: Revenue & Payments

**User Story:** As a host, I want to track all payments and revenue, so that I can monitor business performance and handle payment issues.

#### Acceptance Criteria

1. WHEN the host navigates to Revenue page THEN the Host Panel SHALL display total revenue, monthly revenue, and payment success rate
2. WHEN viewing revenue THEN the Host Panel SHALL display a revenue trend chart showing monthly revenue for the last 12 months
3. WHEN viewing revenue THEN the Host Panel SHALL display a plan-wise revenue breakdown showing revenue by subscription tier
4. WHEN the host views payments list THEN the Host Panel SHALL display a paginated table with columns: User, Plan, Amount, Status, Payment ID, Date
5. WHEN the host filters payments THEN the Host Panel SHALL filter by status (pending, success, failed) or by plan type
6. WHEN the host clicks on a payment row THEN the Host Panel SHALL display full payment details including Razorpay order ID and signature

---

### Requirement 5: Analytics & Reports

**User Story:** As a host, I want to view detailed analytics, so that I can understand usage patterns and make data-driven decisions.

#### Acceptance Criteria

1. WHEN the host navigates to Analytics page THEN the Host Panel SHALL display certificate generation trends over time
2. WHEN viewing analytics THEN the Host Panel SHALL display top 10 most active users by events created
3. WHEN viewing analytics THEN the Host Panel SHALL display top 10 events by recipient count
4. WHEN viewing analytics THEN the Host Panel SHALL display download rate statistics (downloaded vs pending certificates)
5. WHEN the host selects a date range THEN the Host Panel SHALL filter all analytics data to the selected period

---

### Requirement 6: System Settings

**User Story:** As a host, I want to manage system-wide settings, so that I can configure platform behavior and maintain security.

#### Acceptance Criteria

1. WHEN the host navigates to Settings page THEN the Host Panel SHALL display current platform configuration options
2. WHEN the host updates Razorpay credentials THEN the Host Panel SHALL validate and save the new API keys
3. WHEN the host updates MongoDB connection THEN the Host Panel SHALL validate connectivity before saving
4. WHEN the host manages admin accounts THEN the Host Panel SHALL allow adding or removing admin users
5. WHEN the host views system health THEN the Host Panel SHALL display database connection status and API health indicators

---

### Requirement 7: Navigation & Layout

**User Story:** As a host, I want an intuitive navigation structure, so that I can quickly access all panel features.

#### Acceptance Criteria

1. WHEN the host views the sidebar THEN the Host Panel SHALL display navigation items: Dashboard, Users, Events, Revenue, Analytics, Settings
2. WHEN the host hovers over a navigation item THEN the Host Panel SHALL provide visual feedback indicating the item is interactive
3. WHEN the host is on a specific page THEN the Host Panel SHALL highlight the corresponding navigation item as active
4. WHEN the sidebar is collapsed THEN the Host Panel SHALL display icon-only navigation with tooltips
5. WHEN the host clicks the logo THEN the Host Panel SHALL navigate to the Dashboard page

---

### Requirement 8: Data Export

**User Story:** As a host, I want to export platform data, so that I can create reports and backups.

#### Acceptance Criteria

1. WHEN the host requests user export THEN the Host Panel SHALL generate a CSV file containing all user data
2. WHEN the host requests event export THEN the Host Panel SHALL generate a CSV file containing all event data with owner information
3. WHEN the host requests payment export THEN the Host Panel SHALL generate a CSV file containing all payment transactions
4. WHEN export is in progress THEN the Host Panel SHALL display a loading indicator until the file is ready for download
