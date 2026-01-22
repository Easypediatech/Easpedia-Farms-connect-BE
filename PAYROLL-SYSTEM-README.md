# Staff Payroll and Pension Management System

## Overview

This document describes the complete staff payroll and pension management system implementation for FarmConnect. The system automates monthly salary disbursement with pension deductions following Nigerian Contributory Pension standards.

---

## Architecture

### 1. **Wallet System**

- **Organization Wallet**: Central salary wallet funded by admin for payroll disbursement
- **Staff Wallets**: Individual wallets for each staff member
- **Pension Balance**: Tracked within staff wallets (cumulative pension contributions)

### 2. **Schemas**

#### **Payroll Schema** (`src/schemas/payroll.schema.ts`)

Represents a monthly payroll period:

```typescript
{
  period_start: Date,
  period_end: Date,
  period_label: string, // e.g., "December 2025"
  status: 'pending' | 'processing' | 'completed' | 'failed',
  total_staff_count: number,
  processed_count: number,
  failed_count: number,
  total_gross_amount: number, // in kobo
  total_net_amount: number, // in kobo
  total_pension_employee: number, // 8% employee contribution
  total_pension_employer: number, // 10% employer contribution
  total_tax_deducted: number,
  is_automated: boolean,
  initiated_by?: ObjectId, // Admin who created manual payroll
  processed_at?: Date,
  error_logs: string[]
}
```

#### **PayrollTransaction Schema** (`src/schemas/payroll-transaction.schema.ts`)

Represents individual staff payment:

```typescript
{
  payroll_id: ObjectId,
  staff_id: ObjectId,
  user_id: ObjectId,
  employee_id: string,
  staff_name: string,
  department: string,
  role: string,
  gross_salary: number, // in kobo
  pension_employee_contribution: number, // 8%
  pension_employer_contribution: number, // 10%
  total_pension_contribution: number, // employee + employer
  tax_deduction: number,
  other_deductions: number,
  total_deductions: number,
  net_salary: number, // Amount paid to staff wallet
  status: 'pending' | 'processing' | 'completed' | 'failed',
  paid_at?: Date,
  failed_reason?: string,
  retry_count: number
}
```

### 3. **Pension Flow (Nigerian Contributory Pension Standard)**

#### **Rates:**

- **Employee Contribution**: 8% of gross salary (deducted from salary)
- **Employer Contribution**: 10% of gross salary (paid by organization)
- **Total Pension**: 18% of gross salary

#### **Calculation Example:**

```
Gross Salary: ₦500,000
Employee Pension (8%): ₦40,000
Employer Pension (10%): ₦50,000
Total Pension: ₦90,000
Net Salary Paid: ₦460,000 (₦500,000 - ₦40,000)
```

#### **Flow:**

1. Employee contribution (8%) is **deducted from gross salary**
2. Employer contribution (10%) is **paid by organization**
3. **Both contributions** are added to staff `pension_balance`
4. Net salary (gross - employee pension) is transferred to staff wallet
5. Staff pension balance is cumulative and tracked over time

---

## API Endpoints

### **Admin Endpoints** (Requires JWT + Admin Guard)

#### 1. Create Organization Wallet

```http
POST /admin/wallet/organization/create
Authorization: Bearer <admin_token>

Body:
{
  "organization_name": "FarmConnect Ltd"
}

Response:
{
  "success": true,
  "message": "Organization wallet created successfully",
  "data": {
    "_id": "...",
    "user_type": "organization",
    "organization_name": "FarmConnect Ltd",
    "balance": 0,
    ...
  }
}
```

#### 2. Get Organization Wallet

```http
GET /admin/wallet/organization
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "message": "Organization wallet retrieved successfully",
  "data": {
    "_id": "...",
    "balance": 50000000, // ₦500,000.00 in kobo
    "organization_name": "FarmConnect Ltd"
  }
}
```

#### 3. Create Payroll Period

```http
POST /payroll
Authorization: Bearer <admin_token>

Body:
{
  "period_start": "2025-12-01",
  "period_end": "2025-12-31",
  "notes": "December 2025 payroll"
}

Response:
{
  "success": true,
  "message": "Payroll period created successfully",
  "data": {
    "_id": "...",
    "period_label": "December 2025",
    "status": "pending",
    "total_staff_count": 25,
    "total_gross_amount": 12500000000, // ₦125,000,000 in kobo
    "total_net_amount": 11500000000, // After 8% employee pension
    "total_pension_employee": 1000000000, // 8%
    "total_pension_employer": 1250000000, // 10%
  }
}
```

#### 4. Process Payroll (Disburse Salaries)

```http
POST /payroll/:payrollId/process
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "message": "Payroll processed successfully. 25 staff members paid.",
  "data": {
    "processed": 25,
    "failed": 0
  }
}
```

#### 5. Get All Payrolls

```http
GET /payroll?page=1&limit=20&status=completed
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "data": {
    "payrolls": [...],
    "total": 12,
    "pages": 1
  }
}
```

#### 6. Get Payroll Transactions (Staff Payments)

```http
GET /payroll/:payrollId/transactions?page=1&limit=50&status=completed
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "data": {
    "transactions": [
      {
        "staff_name": "John Doe",
        "employee_id": "EMP-20251213-0001",
        "gross_salary": 500000000,
        "pension_employee_contribution": 40000000,
        "pension_employer_contribution": 50000000,
        "net_salary": 460000000,
        "status": "completed",
        "paid_at": "2025-12-31T09:00:00.000Z"
      }
    ],
    "total": 25,
    "pages": 1
  }
}
```

#### 7. Get Staff Payroll History

```http
GET /payroll/staff/:staffId/history?page=1&limit=20
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "data": {
    "transactions": [...],
    "total": 6,
    "pages": 1
  }
}
```

#### 8. Retry Failed Transaction

```http
POST /payroll/transaction/:transactionId/retry
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "message": "Transaction retried successfully for John Doe"
}
```

---

## Automated Payroll (Cron Job)

### **Configuration** (`src/modules/payroll/payroll-cron.service.ts`)

**Schedule**: Last day of every month at 9:00 AM (West Africa Time)

**Cron Expression**: `0 9 28-31 * *`

- `0`: Minute 0
- `9`: 9:00 AM
- `28-31`: Days 28-31 (ensures it runs on the last day of any month)
- `*`: Every month
- `*`: Every day of the week
- **Timezone**: `Africa/Lagos` (WAT)

### **Process:**

1. **Detects last day of month** (checks if tomorrow is the 1st)
2. **Creates payroll** for current month (1st to last day)
3. **Processes immediately** (disburses salaries)
4. **Logs results** (success/failures)
5. **Error handling** with detailed logging

### **Manual Testing:**

```typescript
// Uncomment the testPayrollCron method in PayrollCronService
async testPayrollCron() {
  this.logger.log('🧪 Testing payroll cron manually...');
  await this.handleMonthlyPayroll();
}
```

---

## Setup Instructions

### 1. **Install Dependencies**

```bash
npm install @nestjs/schedule
```

✅ Already installed

### 2. **Create Organization Wallet**

```bash
# First, fund this wallet with sufficient balance for payroll
POST /admin/wallet/organization/create
Body: { "organization_name": "FarmConnect Ltd" }
```

### 3. **Fund Organization Wallet**

```bash
# Use existing admin fund wallet endpoint
POST /admin/wallet/fund
Body: {
  "user_id": "<organization_wallet_user_id>",
  "amount": 100000000000, // ₦1,000,000,000 in kobo
  "payment_reference": "Initial payroll funding"
}
```

### 4. **Create Staff Members**

Ensure staff have:

- `is_active: true`
- `is_approved: true`
- `monthly_salary` set in kobo

### 5. **Manual Payroll (First Time)**

```bash
POST /payroll
Body: {
  "period_start": "2025-12-01",
  "period_end": "2025-12-31",
  "notes": "December 2025"
}

# Then process
POST /payroll/<payroll_id>/process
```

### 6. **Automated Payroll**

Cron job runs automatically on the last day of each month at 9:00 AM WAT.

---

## Error Handling

### **Insufficient Funds**

```
Error: Insufficient funds in organization wallet.
Required: ₦1,000,000.00, Available: ₦500,000.00
```

**Solution**: Fund organization wallet before processing

### **Staff Wallet Not Found**

```
Error: Staff wallet not found
```

**Solution**: Ensure staff has been approved (approval creates wallet automatically)

### **Duplicate Payroll Period**

```
Error: Payroll for period December 2025 already exists with ID: ...
```

**Solution**: Use existing payroll or create for different period

### **Failed Transactions**

Individual staff payment failures are logged in:

- `payroll.error_logs[]`
- `payrollTransaction.failed_reason`

Retry with:

```
POST /payroll/transaction/:transactionId/retry
```

---

## Database Queries

### **Check Organization Wallet Balance**

```javascript
db.wallets.findOne({ user_type: 'organization' });
```

### **Get Current Month Payroll**

```javascript
db.payrolls.findOne({ period_label: 'December 2025' });
```

### **Find Failed Transactions**

```javascript
db.payrolltransactions.find({
  payroll_id: ObjectId('...'),
  status: 'failed',
});
```

### **Staff Total Pension Balance**

```javascript
db.wallets.find({
  user_type: 'staff',
  pension_balance: { $gt: 0 },
});
```

---

## Future Enhancements

### **Tax Deductions (PAYE)**

Currently set to `0`. Implement Nigerian PAYE tax brackets:

- ₦0 - ₦300,000: 7%
- ₦300,000 - ₦600,000: 11%
- ₦600,000 - ₦1,100,000: 15%
- ... (see Nigerian tax law)

### **Other Deductions**

- Health insurance
- Union dues
- Loan repayments
- Advances

### **Notifications**

- Email payslips to staff
- SMS notifications on salary payment
- Admin alerts for payroll failures

### **Reports**

- Monthly payroll summary PDF
- Staff payslip generation
- Pension contribution statements
- Tax deduction reports

### **Pension Withdrawal**

Implement rules for pension withdrawal:

- Retirement age reached
- Medical emergency
- Termination of employment

---

## Testing

### **Unit Tests** (To be created)

```bash
npm test -- payroll.service.spec.ts
npm test -- payroll.repository.spec.ts
npm test -- payroll.controller.spec.ts
```

### **Integration Tests**

1. Create organization wallet
2. Create and approve staff
3. Fund organization wallet
4. Create payroll period
5. Process payroll
6. Verify transactions
7. Check pension balances

---

## Maintenance

### **Monthly Checklist**

- [ ] Verify organization wallet has sufficient funds
- [ ] Review pending staff approvals
- [ ] Check payroll cron job logs
- [ ] Review failed transactions
- [ ] Verify pension balances
- [ ] Generate monthly reports

### **Monitoring**

- Organization wallet balance alerts
- Cron job execution logs
- Failed transaction alerts
- Pension contribution tracking

---

## Contact & Support

For issues or questions, contact the development team or refer to the main README.md.
