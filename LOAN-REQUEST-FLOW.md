# Loan Request Flow Implementation

## Overview

Implemented a complete loan request system where farmers can request loans via USSD, and admins can review and approve these requests with pickup dates for factory inputs.

## Architecture

### 1. Schema Updates (`loan.schema.ts`)

- **New Status Values**: Added `'requested'` and `'approved'` to loan status enum
  - `requested`: Initial status when farmer submits via USSD
  - `approved`: Admin approved with pickup date set
  - `active`: Loan disbursed (existing)
  - `completed`: Fully repaid (existing)
  - `defaulted`: Payment default (existing)

- **New Fields**:
  - `pickup_date?: Date` - Date farmer should pick up inputs from factory
  - `approved_at?: Date` - Timestamp when admin approved the request
  - `disbursed_at?: Date` - Changed to optional (only set when active/approved)

### 2. DTOs (`dto/create-loan.dto.ts`)

- **ApproveLoanRequestDto**: For admin approval

  ```typescript
  {
    pickup_date: string; // ISO 8601 date
    admin_notes?: string; // Optional notes
  }
  ```

- **CreateLoanRequestDto**: For USSD farmer requests

  ```typescript
  {
    loan_type_id: string; // MongoDB ObjectId
    purpose?: string; // Optional loan purpose
  }
  ```

- **Updated UpdateLoanStatusDto**: Now includes all 5 status values

### 3. Service Methods (`loan.service.ts`)

#### `createLoanRequest(farmerId, createDto)`

- Creates loan with `'requested'` status
- Validates farmer eligibility:
  - No active loans
  - No loan defaults
  - Farmer exists with valid user account
- Sets principal_amount to 0 (admin will set items later)
- Items array starts empty
- Generates unique reference

#### `getRequestedLoans()`

- Returns all loans with status `'requested'`
- Sorted by creation date (newest first)
- Used by admin dashboard to view pending requests

#### `approveLoanRequest(id, approveDto)`

- Updates loan status from `'requested'` to `'approved'`
- Sets `pickup_date` from admin input
- Sets `approved_at` timestamp
- Validates loan is in `'requested'` status

### 4. API Endpoints (`loan.controller.ts`)

#### `GET /loans/requests`

- **Auth**: Requires JWT (admin only)
- **Returns**: Array of loan requests (status = 'requested')
- **Use Case**: Admin dashboard to view pending loan requests

#### `PATCH /loans/:id/approve`

- **Auth**: Requires JWT (admin only)
- **Body**: `ApproveLoanRequestDto`
- **Returns**: Approved loan with pickup date
- **Use Case**: Admin approves request and sets factory pickup date

### 5. USSD Flow (`ussd.service.ts`)

#### Main Menu Option 5: "Get Loan"

```
CON Welcome back, John!

1. Wallet
2. List Product
3. Check Market Price
4. My Balance
5. Get Loan         <- Triggers loan flow
6. Change PIN
7. Help & Support
```

#### Loan Flow Steps:

**Step 1: Show Loan Types**

```
CON Get Loan
Select loan type:

1. Input Credit (Fertilizer/Stems)
2. Farm Tools Package
3. Equipment Loan

00. Main menu
```

**Step 2: Show Loan Details**

```
CON Loan Details

Type: Input Credit (Fertilizer/Stems)
Interest: 10%
Duration: 6 months

1. Request Loan
2. Back

00. Main menu
```

**Step 3: Optional Purpose**

```
CON Enter purpose for loan:
(e.g., Buy fertilizer)

Or press # to skip

00. Main menu
```

**Step 4: Confirmation**

```
END Loan Request Submitted!

Reference: LOAN20251127001

Your loan request is being reviewed.
You will receive an SMS with pickup date.

Dial *347*2277# to continue
```

#### Error Handling:

- **Active Loan**: "You already have an active loan. Please repay existing loan first."
- **Loan Defaults**: "You have X loan defaults. Please contact support."
- **Inactive Loan Type**: "Loan type not currently available"

### 6. Response DTOs (`dto/loan-response.dto.ts`)

Updated `LoanResponseDto` to include:

- `pickup_date?: Date`
- `approved_at?: Date`
- `disbursed_at?: Date` (now optional)

## Admin Workflow

### 1. View Loan Requests

```bash
GET /loans/requests
Authorization: Bearer <admin_token>
```

**Response**:

```json
[
  {
    "id": "...",
    "reference": "LOAN20251127001",
    "status": "requested",
    "farmer_id": "...",
    "farmer_name": "John Doe",
    "farmer_phone": "08012345678",
    "loan_type_id": "...",
    "loan_type_name": "Input Credit (Fertilizer/Stems)",
    "interest_rate": 10,
    "duration_months": 6,
    "principal_amount": 0,
    "items": [],
    "purpose": "Need fertilizer for cassava farm",
    "createdAt": "2025-11-27T10:00:00.000Z"
  }
]
```

### 2. Approve Request

```bash
PATCH /loans/:id/approve
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "pickup_date": "2025-12-01T10:00:00.000Z",
  "admin_notes": "Approved. Please bring ID card."
}
```

**Response**:

```json
{
  "id": "...",
  "reference": "LOAN20251127001",
  "status": "approved",
  "pickup_date": "2025-12-01T10:00:00.000Z",
  "approved_at": "2025-11-27T14:30:00.000Z",
  "farmer_name": "John Doe",
  "loan_type_name": "Input Credit (Fertilizer/Stems)",
  ...
}
```

### 3. Future: Farmer Picks Up Inputs

- Admin manually updates loan with actual items and amounts
- Admin changes status to `'active'` after disbursement
- Sets `disbursed_at` timestamp
- Loan repayment schedule begins

## Testing

### Controller Tests (`loan.controller.spec.ts`)

- ✅ `getRequestedLoans()` - Returns loans with 'requested' status
- ✅ `approveLoanRequest()` - Approves request with pickup date
- ✅ Error handling for non-requested status

### Service Tests (`loan.service.spec.ts`)

- ✅ `createLoanRequest()` - Creates request with validations
- ✅ Rejects farmers with active loans
- ✅ Rejects farmers with loan defaults
- ✅ `getRequestedLoans()` - Fetches only requested loans
- ✅ `approveLoanRequest()` - Updates status and sets dates
- ✅ Error handling for invalid loan states

## Key Features

### 1. Farmer Benefits

- Easy USSD loan application
- No need to visit office
- Instant submission confirmation
- SMS notification with pickup date

### 2. Admin Benefits

- Centralized loan request dashboard
- Review farmer eligibility before approval
- Set convenient pickup dates
- Track request → approval workflow

### 3. Data Integrity

- Loan starts with status 'requested'
- Principal and items are 0/empty initially
- Admin must explicitly approve and set pickup date
- Prevents premature loan activation
- Clear audit trail (requested → approved → active)

## Database Queries

### Find Pending Requests

```javascript
db.loans.find({ status: 'requested' }).sort({ createdAt: -1 });
```

### Find Approved Loans Awaiting Pickup

```javascript
db.loans
  .find({
    status: 'approved',
    pickup_date: { $gte: new Date() },
  })
  .sort({ pickup_date: 1 });
```

### Find Overdue Pickups

```javascript
db.loans.find({
  status: 'approved',
  pickup_date: { $lt: new Date() },
});
```

## Future Enhancements

1. **SMS Notifications**
   - Send SMS to farmer when approved
   - Include pickup date and location
   - Reminder SMS 1 day before pickup

2. **Admin Dashboard**
   - Real-time count of pending requests
   - Overdue pickup alerts
   - Farmer eligibility score display

3. **Pickup Confirmation**
   - QR code scan at factory
   - Photo verification
   - Automatic status change to 'active'

4. **Items Management**
   - Admin can add/edit items during approval
   - Calculate actual principal amount
   - Generate itemized receipt

5. **Workflow Automation**
   - Auto-reject if farmer ineligible
   - Auto-reminder for pending approvals
   - Integration with inventory system

## Module Dependencies

```
UssdModule
  ├── FarmerModule
  ├── BuyerModule
  ├── WalletModule
  └── LoanModule ← New dependency

LoanModule
  ├── FarmerModule (injected)
  ├── UserModule (via Mongoose models)
  └── WalletModule (future: for disbursement)
```

## API Summary

| Endpoint             | Method | Auth | Description                    |
| -------------------- | ------ | ---- | ------------------------------ |
| `/loans/types`       | GET    | JWT  | List loan types (used by USSD) |
| `/loans/requests`    | GET    | JWT  | Get pending requests (admin)   |
| `/loans/:id/approve` | PATCH  | JWT  | Approve request (admin)        |
| `/loans`             | GET    | JWT  | All loans with filters         |
| `/loans/:id`         | GET    | JWT  | Get loan details               |

## Error Codes

| Error              | Status | Message                              |
| ------------------ | ------ | ------------------------------------ |
| Active loan exists | 400    | "You already have an active loan"    |
| Loan defaults      | 400    | "You have X loan defaults"           |
| Inactive loan type | 400    | "Loan type not currently available"  |
| Invalid status     | 400    | "Cannot approve loan with status: X" |
| Loan not found     | 404    | "Loan with ID X not found"           |
| Farmer not found   | 404    | "Farmer with ID X not found"         |

## Conclusion

This implementation provides a complete farmer-initiated loan request system with admin approval workflow. Farmers can easily request loans via USSD, and admins have full control over the approval process with the ability to set convenient pickup dates for factory inputs.
