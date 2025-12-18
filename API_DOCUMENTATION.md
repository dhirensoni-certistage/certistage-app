# CertiStage API Documentation

## Base URL
- Development: `http://localhost:3000/api`
- Production: `https://yourdomain.com/api`

---

## Health Check

### GET /api/health
Check system health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-18T10:00:00.000Z",
  "uptime": 12345,
  "environment": "production",
  "services": {
    "database": "connected"
  }
}
```

---

## Authentication APIs

### POST /api/client/auth/signup
Create a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword",
  "phone": "9876543210",
  "organization": "Company Name"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "plan": "free"
  }
}
```

### POST /api/client/auth/login
User login.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "plan": "professional",
    "planStatus": "active"
  },
  "event": {
    "id": "event_id",
    "name": "First Event"
  }
}
```

### POST /api/client/auth/forgot-password
Request password reset.

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

### POST /api/client/auth/reset-password
Reset password with token.

**Request Body:**
```json
{
  "token": "reset_token_here",
  "newPassword": "newpassword123"
}
```

### POST /api/client/auth/change-password
Change password for logged-in user.

**Request Body:**
```json
{
  "userId": "user_id",
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

---

## User Profile APIs

### GET /api/client/profile?userId={userId}
Get user profile.

### PUT /api/client/profile
Update user profile.

**Request Body:**
```json
{
  "userId": "user_id",
  "name": "Updated Name",
  "phone": "9876543210",
  "organization": "New Company"
}
```

---

## Events APIs

### GET /api/client/events?userId={userId}
List user's events with stats.

### POST /api/client/events
Create new event.

**Request Body:**
```json
{
  "userId": "user_id",
  "name": "Event Name",
  "description": "Event description"
}
```

### PUT /api/client/events
Update event.

**Request Body:**
```json
{
  "userId": "user_id",
  "eventId": "event_id",
  "name": "Updated Name",
  "description": "Updated description"
}
```

### DELETE /api/client/events?userId={userId}&eventId={eventId}&permanent={true|false}
Delete event.

---

## Certificate Types APIs

### GET /api/client/certificate-types?eventId={eventId}&userId={userId}
List certificate types for an event.

### GET /api/client/certificate-types?typeId={typeId}&userId={userId}
Get single certificate type.

### POST /api/client/certificate-types
Create certificate type.

**Request Body:**
```json
{
  "userId": "user_id",
  "eventId": "event_id",
  "name": "Certificate Name",
  "templateImage": "base64_or_url",
  "textFields": []
}
```

### PUT /api/client/certificate-types
Update certificate type.

**Request Body:**
```json
{
  "userId": "user_id",
  "typeId": "type_id",
  "name": "Updated Name",
  "templateImage": "new_image",
  "textFields": []
}
```

### DELETE /api/client/certificate-types?typeId={typeId}&userId={userId}&permanent={true|false}
Delete certificate type.

---

## Recipients APIs

### GET /api/client/recipients?certificateTypeId={typeId}&page={page}&limit={limit}&search={search}
List recipients with pagination.

### POST /api/client/recipients
Add recipients (single or bulk).

**Request Body:**
```json
{
  "userId": "user_id",
  "eventId": "event_id",
  "certificateTypeId": "type_id",
  "isBulkImport": false,
  "recipients": [
    {
      "name": "Recipient Name",
      "email": "recipient@example.com",
      "mobile": "9876543210",
      "regNo": "REG001",
      "customFields": {}
    }
  ]
}
```

### DELETE /api/client/recipients?recipientId={id}&userId={userId}
Delete single recipient.

### DELETE /api/client/recipients?certificateTypeId={typeId}&userId={userId}&clearAll=true
Clear all recipients from certificate type.

---

## Usage Stats API

### GET /api/client/usage?userId={userId}
Get user's plan usage statistics.

**Response:**
```json
{
  "success": true,
  "plan": "professional",
  "limits": {
    "maxEvents": 3,
    "maxCertificateTypes": 5,
    "maxCertificates": 2000
  },
  "usage": {
    "events": 2,
    "certificateTypes": 3,
    "certificates": 150
  },
  "remaining": {
    "events": 1,
    "certificateTypes": 2,
    "certificates": 1850
  }
}
```

---

## Payment APIs

### POST /api/razorpay/create-order
Create Razorpay order.

**Request Body:**
```json
{
  "plan": "professional",
  "userId": "user_id",
  "userEmail": "user@example.com",
  "userName": "User Name"
}
```

### POST /api/razorpay/verify-payment
Verify payment and activate plan.

**Request Body:**
```json
{
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "signature",
  "plan": "professional",
  "userId": "user_id"
}
```

---

## Download APIs

### GET /api/download?eventId={eventId}
Get event info for download page.

### GET /api/download?eventId={eventId}&typeId={typeId}
Get certificate type info.

### POST /api/download
Search for recipient certificate.

**Request Body:**
```json
{
  "eventId": "event_id",
  "typeId": "type_id",
  "searchQuery": "john@example.com",
  "searchType": "email"
}
```

### PUT /api/download
Track certificate download.

**Request Body:**
```json
{
  "recipientId": "recipient_id"
}
```

---

## Admin APIs

### POST /api/admin/setup
Create first admin account (one-time).

**Request Body:**
```json
{
  "name": "Admin Name",
  "email": "admin@example.com",
  "password": "adminpassword",
  "setupSecret": "ADMIN_SETUP_SECRET"
}
```

### POST /api/admin/login
Admin login.

### GET /api/admin/dashboard
Get dashboard metrics.

### GET /api/admin/users?page={page}&limit={limit}&search={search}&plan={plan}
List users with pagination.

### GET /api/admin/users/{userId}
Get user details.

### PATCH /api/admin/users/{userId}
Update user status.

### GET /api/admin/events?page={page}&limit={limit}
List all events.

### GET /api/admin/events/{eventId}
Get event details.

### PATCH /api/admin/events/{eventId}
Update event status.

### GET /api/admin/payments?page={page}&status={status}&plan={plan}
List payments.

### POST /api/admin/payments/sync
Sync single payment from Razorpay.

### PUT /api/admin/payments/sync
Bulk sync all pending payments.

### GET /api/admin/revenue
Get revenue analytics.

### GET /api/admin/analytics
Get platform analytics.

### GET /api/admin/export/users
Export users as CSV.

### GET /api/admin/export/events
Export events as CSV.

### GET /api/admin/export/payments
Export payments as CSV.

---

## Error Responses

All APIs return errors in this format:
```json
{
  "error": "Error message here",
  "limitReached": true,
  "currentCount": 3,
  "maxAllowed": 3
}
```

## HTTP Status Codes

- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden (plan limit reached)
- `404` - Not Found
- `409` - Conflict (duplicate)
- `500` - Server Error

---

## Plan Limits

| Plan | Events | Cert Types | Certificates | Features |
|------|--------|------------|--------------|----------|
| Free | 0 | 1 | 50 | Limited |
| Professional | 3 | 5 | 2,000 | All |
| Enterprise | 10 | 100 | 25,000 | All |
| Premium | 25 | 200 | 50,000 | All |
