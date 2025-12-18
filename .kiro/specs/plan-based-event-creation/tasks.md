# Implementation Plan

## 1. Add Event Management Functions

- [x] 1.1 Add `canUserCreateEvent()` function to `lib/events.ts`
  - Check user's current event count against plan limit
  - Return object with `canCreate`, `currentCount`, `maxEvents`, and optional `reason`
  - Handle unlimited (-1) case for Premium Plus
  - _Requirements: 2.1_

- [ ]* 1.2 Write property test for plan limit enforcement
  - **Property 2: Plan Limit Enforcement**
  - **Validates: Requirements 2.1**

- [x] 1.3 Add `createEventForUser()` function to `lib/events.ts`
  - Validate user can create event using `canUserCreateEvent()`
  - Create event with `ownerId` set to user ID
  - Return created event or error object
  - _Requirements: 2.3_

- [ ]* 1.4 Write property test for event creation with owner
  - **Property 3: Event Creation with Owner Association**
  - **Validates: Requirements 2.3**

- [x] 1.5 Add `updateSessionEvent()` function to `lib/auth.ts`
  - Update session's `eventId` and `eventName`
  - Persist to localStorage
  - _Requirements: 3.3_

- [ ]* 1.6 Write property test for session update consistency
  - **Property 4: Session Event Update Consistency**
  - **Validates: Requirements 3.3, 3.4**

- [ ]* 1.7 Write property test for event ownership filtering
  - **Property 1: Event Ownership Filtering**
  - **Validates: Requirements 1.1, 3.2**

## 2. Checkpoint - Ensure all tests pass
- Ensure all tests pass, ask the user if questions arise.

## 3. Create Event Switcher Component

- [x] 3.1 Create `EventSwitcher` component at `components/client/event-switcher.tsx`
  - Dropdown showing current event name
  - List all user's events from `getUserEvents()`
  - Call `updateSessionEvent()` on selection
  - Include "Manage Events" link to `/client/events`
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 3.2 Integrate EventSwitcher into ClientSidebar
  - Add EventSwitcher below logo section
  - Only show for user login type (not event login)
  - _Requirements: 3.1_

## 4. Create Events List Page

- [x] 4.1 Create Events page at `app/client/events/page.tsx`
  - Display list of user's events using `getUserEvents()`
  - Show event name, description, creation date, certificate count
  - Show empty state when no events
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 4.2 Create `EventUsageBar` component at `components/client/event-usage-bar.tsx`
  - Show current count / max limit with progress bar
  - Display warning state at 80%+ usage
  - Show "Unlimited" for Premium Plus users
  - Include upgrade CTA when at limit
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ]* 4.3 Write property test for event count display accuracy
  - **Property 5: Event Count Display Accuracy**
  - **Validates: Requirements 4.1**

- [ ]* 4.4 Write property test for warning threshold calculation
  - **Property 6: Warning Threshold Calculation**
  - **Validates: Requirements 4.2, 4.3**

## 5. Create Event Creation Flow

- [x] 5.1 Create `CreateEventDialog` component at `components/client/create-event-dialog.tsx`
  - Modal with name and description inputs
  - Validate name is not empty
  - Call `createEventForUser()` on submit
  - Show success toast and close on success
  - _Requirements: 2.2, 2.3_

- [x] 5.2 Add create event button to Events page
  - Show button when user can create events
  - Show upgrade prompt when at limit or Free plan
  - Open CreateEventDialog on click
  - _Requirements: 2.2, 2.4, 2.5_

## 6. Add Event Edit and Delete Functionality

- [x] 6.1 Create `EditEventDialog` component at `components/client/edit-event-dialog.tsx`
  - Modal with pre-filled name and description
  - Call `updateEvent()` on submit
  - Show success toast on update
  - _Requirements: 5.1, 5.2_

- [ ]* 6.2 Write property test for event update persistence
  - **Property 7: Event Update Persistence**
  - **Validates: Requirements 5.2**

- [x] 6.3 Create `DeleteEventDialog` component at `components/client/delete-event-dialog.tsx`
  - Confirmation dialog with event name
  - Call `deleteEvent()` on confirm
  - Handle active event deletion - switch to another or redirect
  - _Requirements: 5.3, 5.4, 5.5_

- [ ]* 6.4 Write property test for event deletion completeness
  - **Property 8: Event Deletion Completeness**
  - **Validates: Requirements 5.4**

- [x] 6.5 Add edit/delete actions to event cards on Events page
  - Edit button opens EditEventDialog
  - Delete button opens DeleteEventDialog
  - _Requirements: 5.1, 5.3_

## 7. Add Navigation and Polish

- [x] 7.1 Add "Events" link to ClientSidebar navigation
  - Add Calendar/Folder icon for Events
  - Link to `/client/events`
  - _Requirements: 1.1_

- [x] 7.2 Update event click behavior on Events page
  - Set clicked event as active using `updateSessionEvent()`
  - Redirect to dashboard
  - _Requirements: 1.4_

- [x] 7.3 Handle first-time user flow
  - Auto-create first event for new users during signup
  - Set as active event in session
  - _Requirements: 1.3_

## 8. Final Checkpoint - Ensure all tests pass
- Ensure all tests pass, ask the user if questions arise.
