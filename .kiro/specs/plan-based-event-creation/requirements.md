# Requirements Document

## Introduction

This feature implements a plan-based event creation flow for Certistage. Users can create multiple events based on their subscription plan limits. Free plan users cannot create events (they get one auto-created event), Professional users can create up to 3 events, Enterprise Gold users can create up to 10 events, and Premium Plus users have unlimited event creation. The system provides an event management interface where users can view, switch between, and manage their events.

## Glossary

- **Event**: A certificate distribution batch/campaign (e.g., "Annual Conference 2024", "Workshop Series")
- **Plan**: User subscription tier (Free, Professional, Enterprise Gold, Premium Plus)
- **Event Limit**: Maximum number of events a user can create based on their plan
- **Active Event**: The currently selected event in the user's session
- **Event Switcher**: UI component to switch between user's events

## Requirements

### Requirement 1

**User Story:** As a user, I want to see all my events in a list, so that I can manage and switch between them easily.

#### Acceptance Criteria

1. WHEN a user navigates to the events page THEN the System SHALL display a list of all events owned by that user
2. WHEN displaying events THEN the System SHALL show event name, description, creation date, and certificate count for each event
3. WHEN a user has no events THEN the System SHALL display an empty state with guidance to create their first event
4. WHEN a user clicks on an event THEN the System SHALL set that event as the active event and redirect to the dashboard

### Requirement 2

**User Story:** As a user, I want to create new events based on my plan limits, so that I can organize certificates for different occasions.

#### Acceptance Criteria

1. WHEN a user attempts to create an event THEN the System SHALL check if the user has reached their plan's event limit
2. WHEN a user has not reached their event limit THEN the System SHALL display a create event form with name and description fields
3. WHEN a user submits a valid event creation form THEN the System SHALL create the event and associate it with the user
4. WHEN a user has reached their event limit THEN the System SHALL display an upgrade prompt instead of the create form
5. WHEN a Free plan user attempts to create an event THEN the System SHALL block creation and show upgrade options

### Requirement 3

**User Story:** As a user, I want to switch between my events quickly, so that I can manage certificates for different events efficiently.

#### Acceptance Criteria

1. WHEN a user is logged in THEN the System SHALL display an event switcher in the sidebar
2. WHEN a user clicks the event switcher THEN the System SHALL show a dropdown with all user's events
3. WHEN a user selects a different event from the switcher THEN the System SHALL update the active event in the session
4. WHEN the active event changes THEN the System SHALL refresh the dashboard to show the new event's data

### Requirement 4

**User Story:** As a user, I want to see my event usage status, so that I can understand how many more events I can create.

#### Acceptance Criteria

1. WHEN displaying the events page THEN the System SHALL show current event count and plan limit
2. WHEN a user is near their event limit (80% or more) THEN the System SHALL display a warning indicator
3. WHEN a user has reached their event limit THEN the System SHALL prominently display upgrade options
4. WHEN a Premium Plus user views event usage THEN the System SHALL display "Unlimited" instead of a numeric limit

### Requirement 5

**User Story:** As a user, I want to edit or delete my events, so that I can keep my event list organized.

#### Acceptance Criteria

1. WHEN a user clicks edit on an event THEN the System SHALL display a form to modify event name and description
2. WHEN a user submits valid event edits THEN the System SHALL update the event and confirm the changes
3. WHEN a user clicks delete on an event THEN the System SHALL display a confirmation dialog
4. WHEN a user confirms event deletion THEN the System SHALL remove the event and all associated certificate types and recipients
5. WHEN a user deletes their active event THEN the System SHALL switch to another event or show the events list
