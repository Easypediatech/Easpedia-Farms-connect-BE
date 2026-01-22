# Wallet Withdrawal & Admin Management Implementation

## Overview

Implemented comprehensive wallet withdrawal functionality for USSD users and admin endpoints for wallet management, following clean architecture principles and coding standards.

## Features Implemented

### 1. USSD Wallet Withdrawal Flow

#### Option 1: Withdraw to Saved Account

- Users can withdraw to their previously saved bank account
- Flow: Main Menu → Wallet → Withdraw → Saved Account → Amount → PIN → Success
- **USSD Path**: `*347*2277# → 1 → 1 → 1 → [amount] → [PIN]`

#### Option 2: Withdraw to Different Account

- Users can withdraw to any bank account
- Includes bank selection with pagination
- Account verification via Paystack
- Flow: Main Menu → Wallet → Withdraw → Different Account → Select Bank → Account Number → Verify → Amount → PIN → Success
- **USSD Path**: `*347*2277# → 1 → 1 → 2 → [bank] → [account] → [amount] → [PIN]`

#### Option 3: Set Withdrawal Account

- Users can save a default withdrawal account
- Flow: Main Menu → Wallet → Set Account → Select Bank → Account Number → Verify → PIN → Success
- **USSD Path**: `*347*2277# → 1 → 2 → [bank] → [account] → [PIN]`

### 2. Paystack Integration

#### PaystackService (`src/modules/wallet/paystack.service.ts`)

- **`getBankList()`**: Fetches Nigerian banks from Paystack API
- **`verifyAccountNumber()`**: Verifies account number and retrieves account name
- **`getBankByCode()`**: Retrieves specific bank details by code
- **`formatBanksForUssd()`**: Paginates bank list for USSD display (5 per page)

**Key Features**:

- Proper error handling with typed exceptions
- Automatic filtering of active banks only
- Support for pagination in USSD flow
- Account name verification before withdrawal

### 3. Wallet Service Enhancements

#### New Methods in `WalletService`

**`withdrawFromWallet(userId, amount, bankDetails?)`**

- Validates sufficient balance
- Verifies account if bank details provided
- Deducts from wallet balance
- Updates `total_withdrawn` tracking
- Optional bank details for different account withdrawals

**`setWithdrawalAccount(userId, bankDetails)`**

- Verifies account with Paystack
- Saves verified account details to wallet
- Uses verified account name (prevents fraud)

**`adminFundWallet(userId, amount, reason)`**

- Admin-only wallet funding
- Updates `total_deposited` tracking
- Logs funding reason for audit trail

### 4. Admin Endpoints

#### POST `/api/admins/wallet/fund`

**Purpose**: Fund user wallets

**Request Body**:

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "amount": 5000,
  "reason": "Admin funding for customer support"
}
```

**Response**:

```json
{
  "message": "Wallet funded successfully",
  "wallet": {
    "balance": 15000,
    "escrowBalance": 0,
    "savingsBalance": 0,
    "totalDeposited": 20000
  }
}
```

**Authentication**: Requires JWT + Admin role
**Validation**: Minimum ₦100, valid MongoDB ObjectId

#### POST `/api/admins/wallet/set-account`

**Purpose**: Set or update user withdrawal account

**Request Body**:

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "bankName": "Access Bank",
  "bankCode": "044",
  "accountNumber": "0123456789",
  "accountName": "John Doe",
  "bvn": "12345678901"
}
```

**Response**:

```json
{
  "message": "Withdrawal account set successfully",
  "wallet": {
    "bankName": "Access Bank",
    "accountNumber": "0123456789",
    "accountName": "JOHN DOE"
  }
}
```

**Authentication**: Requires JWT + Admin role
**Validation**:

- 10-digit account number
- 11-digit BVN (optional)
- Valid bank code
- Account verification via Paystack

## Database Schema Updates

### Wallet Schema

No changes required - already has:

- `bank_name: string`
- `account_number: string`
- `account_name: string`
- `bvn: string`
- `total_withdrawn: number`
- `total_deposited: number`

## DTOs Created

### Admin DTOs

1. **AdminFundWalletDto** - Fund wallet validation
2. **AdminSetAccountDto** - Set account validation

### Wallet DTOs

1. **FundWalletDto** - General fund wallet DTO
2. **SetAccountDto** - General set account DTO
3. **WithdrawWalletDto** - Withdrawal validation

All DTOs include:

- Swagger API documentation
- Class-validator decorators
- Proper type safety
- Clear error messages

## USSD Session Flow

### Session States

- `wallet_menu` - Wallet menu selection
- `withdraw_menu` - Withdraw account type selection
- `withdraw_amount_saved` - Enter amount for saved account
- `withdraw_pin_saved` - PIN verification for saved account
- `withdraw_select_bank` - Bank selection for different account
- `withdraw_account_number` - Enter account number
- `withdraw_verify_account` - Account verification state
- `withdraw_amount_different` - Enter amount for different account
- `withdraw_pin_different` - PIN verification for different account
- `set_account_select_bank` - Bank selection for setting account
- `set_account_number` - Enter account number for setting
- `set_account_pin` - PIN verification for setting account

### Session Data Stored

```typescript
{
  withdrawPage: number,           // Current bank list page
  withdrawBank: PaystackBank,     // Selected bank details
  withdrawAccountNumber: string,  // Account number
  withdrawAccountName: string,    // Verified account name
  withdrawAmount: number,         // Withdrawal amount
  setAccountPage: number,         // Bank list page for set account
  setAccountBank: PaystackBank,   // Bank for setting account
  setAccountNumber: string,       // Account to save
  setAccountName: string          // Verified name to save
}
```

## Security Features

1. **PIN Verification**: All transactions require 4-digit PIN verification
2. **Account Verification**: Paystack verifies account details before processing
3. **Balance Validation**: Ensures sufficient funds before withdrawal
4. **Admin Authentication**: Admin endpoints require JWT + AdminGuard
5. **Input Validation**: All inputs validated with class-validator
6. **Error Logging**: Comprehensive error logging without exposing sensitive data

## Error Handling

### User-Friendly USSD Errors

- Insufficient balance with clear amounts
- Invalid PIN with retry option
- Account verification failures
- Invalid input guidance
- Network/API failures with retry option

### API Error Responses

- 400: Invalid input/validation errors
- 401: Unauthorized access
- 404: Wallet/user not found
- 502: Paystack API failures

## Testing Checklist

### USSD Flow Testing

- [ ] Withdraw to saved account (happy path)
- [ ] Withdraw to saved account (insufficient balance)
- [ ] Withdraw to saved account (wrong PIN)
- [ ] Withdraw to different account (happy path)
- [ ] Withdraw to different account (invalid account)
- [ ] Withdraw to different account (bank pagination)
- [ ] Set withdrawal account (happy path)
- [ ] Set withdrawal account (invalid account)
- [ ] Set withdrawal account (bank pagination)

### Admin Endpoints Testing

- [ ] Fund wallet successfully
- [ ] Fund wallet with invalid user ID
- [ ] Fund wallet with amount < ₦100
- [ ] Fund wallet without authentication
- [ ] Set account successfully
- [ ] Set account with invalid account number
- [ ] Set account with invalid bank code
- [ ] Set account without authentication

### Integration Testing

- [ ] Paystack bank list retrieval
- [ ] Paystack account verification
- [ ] Wallet balance updates
- [ ] Transaction logging
- [ ] Session management

## Environment Variables Required

```env
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx
```

## Next Steps / TODO

1. **Payment Gateway Integration**
   - Integrate actual bank transfer via Paystack Transfer API
   - Handle transfer webhooks and status updates
   - Implement transfer receipts

2. **Transaction History**
   - Create Transaction schema
   - Log all withdrawals with references
   - Add transaction history USSD menu
   - Admin endpoint to view transactions

3. **Withdrawal Limits**
   - Implement daily/weekly withdrawal limits
   - Add KYC verification levels
   - Enforce maximum withdrawal amounts

4. **SMS Notifications**
   - Send SMS on successful withdrawal
   - Send SMS on failed withdrawal
   - Send SMS when account is set/updated

5. **Redis Session Storage**
   - Replace in-memory sessions with Redis
   - Implement session expiry
   - Add session cleanup cron job

6. **Audit Trail**
   - Log all admin actions
   - Track who funded which wallet
   - Track who modified accounts

7. **Enhanced Security**
   - Add transaction OTP
   - Implement withdrawal PIN (separate from login PIN)
   - Add biometric verification support

## Code Quality

✅ Follows NestJS best practices
✅ SOLID principles applied
✅ Clean code standards
✅ Proper error handling
✅ TypeScript strict mode compliant
✅ Comprehensive logging
✅ Input validation
✅ Swagger documentation
✅ No circular dependencies

## Files Modified/Created

### Created

- `src/modules/wallet/paystack.service.ts`
- `src/modules/wallet/dto/fund-wallet.dto.ts`
- `src/modules/wallet/dto/set-account.dto.ts`
- `src/modules/wallet/dto/withdraw-wallet.dto.ts`
- `src/modules/wallet/dto/index.ts`
- `src/modules/admin/dto/admin-wallet.dto.ts`

### Modified

- `src/modules/wallet/wallet.service.ts` (added withdrawal methods)
- `src/modules/wallet/wallet.module.ts` (added PaystackService)
- `src/modules/ussd/ussd.service.ts` (added wallet withdrawal flow)
- `src/modules/admin/admin.controller.ts` (added wallet endpoints)
- `src/modules/admin/admin.service.ts` (added wallet methods)
- `src/modules/admin/admin.module.ts` (added WalletModule import)
- `src/modules/admin/dto/index.ts` (added wallet DTOs export)

## API Documentation

Full API documentation available at `/api/docs` (Swagger UI) after starting the server.

### Quick Test with cURL

**Fund Wallet:**

```bash
curl -X POST http://localhost:3000/api/admins/wallet/fund \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "507f1f77bcf86cd799439011",
    "amount": 5000,
    "reason": "Test funding"
  }'
```

**Set Account:**

```bash
curl -X POST http://localhost:3000/api/admins/wallet/set-account \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "507f1f77bcf86cd799439011",
    "bankName": "Access Bank",
    "bankCode": "044",
    "accountNumber": "0123456789",
    "accountName": "John Doe"
  }'
```

## Support

For issues or questions, contact the development team or create an issue in the repository.
