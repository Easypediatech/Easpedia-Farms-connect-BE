# FarmConnect Database Schema Documentation

## Overview

This document outlines all database tables/collections for the FarmConnect USSD Cassava Marketplace system. The schema is designed for MongoDB with optimized indexing for high-frequency queries.

**Total Entities:** 17 core collections  
**Database:** MongoDB Atlas  
**ORM/ODM:** Mongoose (NestJS)

---

## 1. USER MANAGEMENT SCHEMAS (3 Collections)

### 1.1 Farmer Collection

**Purpose:** Store farmer/seller profile and account information

| Field                | Type     | Required | Indexed | Description                                  |
| -------------------- | -------- | -------- | ------- | -------------------------------------------- |
| `_id`                | ObjectId | Yes      | Primary | Auto-generated unique ID                     |
| `phone`              | String   | Yes      | Unique  | Phone number (format: 08012345678)           |
| `phone_code`         | String   | No       | No      | Country code (default: "234")                |
| `first_name`         | String   | Yes      | No      | Farmer's first name                          |
| `last_name`          | String   | Yes      | No      | Farmer's last name                           |
| `lga`                | String   | Yes      | Yes     | Local Government Area                        |
| `farm_size_hectares` | Number   | Yes      | No      | Farm size in hectares                        |
| `password`           | String   | Yes      | No      | Hashed 4-digit PIN (bcrypt, 10 rounds)       |
| `ussd_stage`         | String   | No       | No      | Current USSD session stage (default: "menu") |
| `ussd_token`         | String   | No       | No      | Session identifier for USSD flows            |
| `ussd_listing_draft` | Object   | No       | No      | Temporary data during listing creation       |
| `total_sales`        | Number   | No       | No      | Total number of completed sales (default: 0) |
| `total_earnings`     | Number   | No       | No      | Lifetime earnings in kobo (default: 0)       |
| `completed_sales`    | Number   | No       | No      | Count of completed transactions (default: 0) |
| `listings_count`     | Number   | No       | No      | Total listings created (default: 0)          |
| `credit_score`       | Number   | No       | Yes     | Credit score 300-850 (default: 500)          |
| `loan_defaults`      | Number   | No       | No      | Number of loan defaults (default: 0)         |
| `active_loan`        | Boolean  | No       | Yes     | Has active loan? (default: false)            |
| `average_rating`     | Number   | No       | No      | Average rating from buyers (1-5 stars)       |
| `total_ratings`      | Number   | No       | No      | Number of ratings received (default: 0)      |
| `created_at`         | Date     | No       | Yes     | Account creation timestamp                   |
| `last_login`         | Date     | No       | No      | Last login timestamp                         |
| `last_activity`      | Date     | No       | No      | Last activity for session timeout            |
| `status`             | String   | No       | Yes     | Account status: active/suspended/banned      |

**Indexes:**

```javascript
{ phone: 1 } // Unique
{ lga: 1 }
{ credit_score: 1, active_loan: 1 }
{ created_at: -1 }
{ status: 1 }
```

---

### 1.2 Buyer Collection

**Purpose:** Store buyer/processor profile and business information

| Field              | Type     | Required | Indexed | Description                                |
| ------------------ | -------- | -------- | ------- | ------------------------------------------ |
| `_id`              | ObjectId | Yes      | Primary | Auto-generated unique ID                   |
| `phone`            | String   | Yes      | Unique  | Phone number                               |
| `phone_code`       | String   | No       | No      | Country code (default: "234")              |
| `first_name`       | String   | Yes      | No      | Buyer's first name                         |
| `last_name`        | String   | Yes      | No      | Buyer's last name                          |
| `business_name`    | String   | Yes      | No      | Business/company name                      |
| `lga`              | String   | Yes      | Yes     | Local Government Area                      |
| `buyer_type`       | String   | Yes      | Yes     | Type: processor/aggregator/trader/exporter |
| `password`         | String   | Yes      | No      | Hashed 4-digit PIN (bcrypt)                |
| `ussd_stage`       | String   | No       | No      | Current USSD session stage                 |
| `ussd_token`       | String   | No       | No      | Session identifier                         |
| `total_purchases`  | Number   | No       | No      | Total purchase count (default: 0)          |
| `total_spent`      | Number   | No       | No      | Lifetime spending in kobo (default: 0)     |
| `completed_orders` | Number   | No       | No      | Completed order count (default: 0)         |
| `average_rating`   | Number   | No       | No      | Average rating from farmers (1-5)          |
| `total_ratings`    | Number   | No       | No      | Number of ratings received                 |
| `created_at`       | Date     | No       | Yes     | Account creation timestamp                 |
| `last_login`       | Date     | No       | No      | Last login timestamp                       |
| `last_activity`    | Date     | No       | No      | Last activity timestamp                    |
| `status`           | String   | No       | Yes     | Account status: active/suspended/banned    |

**Indexes:**

```javascript
{
  phone: 1;
} // Unique
{
  lga: 1;
}
{
  buyer_type: 1;
}
{
  created_at: -1;
}
{
  status: 1;
}
```

---

### 1.3 Admin Collection

**Purpose:** Store admin user accounts for platform management

| Field         | Type          | Required | Indexed | Description                                 |
| ------------- | ------------- | -------- | ------- | ------------------------------------------- |
| `_id`         | ObjectId      | Yes      | Primary | Auto-generated unique ID                    |
| `username`    | String        | Yes      | Unique  | Admin username                              |
| `email`       | String        | Yes      | Unique  | Admin email address                         |
| `password`    | String        | Yes      | No      | Hashed password (bcrypt)                    |
| `first_name`  | String        | Yes      | No      | Admin first name                            |
| `last_name`   | String        | Yes      | No      | Admin last name                             |
| `role`        | String        | Yes      | Yes     | Role: super_admin/support/verifier/finance  |
| `permissions` | Array[String] | No       | No      | Array of permission strings                 |
| `is_active`   | Boolean       | No       | No      | Account active status (default: true)       |
| `created_at`  | Date          | No       | No      | Account creation timestamp                  |
| `last_login`  | Date          | No       | No      | Last login timestamp                        |
| `created_by`  | ObjectId      | No       | No      | Reference to Admin who created this account |

**Indexes:**

```javascript
{
  username: 1;
} // Unique
{
  email: 1;
} // Unique
{
  role: 1;
}
```

---

## 2. MARKETPLACE SCHEMAS (2 Collections)

### 2.1 Listing Collection

**Purpose:** Store cassava listings created by farmers

| Field                  | Type     | Required | Indexed | Description                                           |
| ---------------------- | -------- | -------- | ------- | ----------------------------------------------------- |
| `_id`                  | ObjectId | Yes      | Primary | Auto-generated unique ID                              |
| `farmer_id`            | ObjectId | Yes      | Yes     | Reference to Farmer                                   |
| `farmer_name`          | String   | Yes      | No      | Denormalized farmer name                              |
| `farmer_phone`         | String   | Yes      | No      | Denormalized farmer phone                             |
| `variety`              | String   | Yes      | Yes     | Cassava variety (TME 419, TME 348, etc.)              |
| `quality_grade`        | String   | Yes      | Yes     | Quality: premium/standard/processing                  |
| `quantity_kg`          | Number   | Yes      | No      | Quantity in kilograms (100-50,000)                    |
| `price_per_kg`         | Number   | Yes      | Yes     | Price per kg in kobo                                  |
| `total_value`          | Number   | Yes      | No      | Total value in kobo (qty × price)                     |
| `harvest_status`       | String   | Yes      | Yes     | Status: ready_now/1_week/2_4_weeks/pre_order          |
| `harvest_date`         | Date     | No       | No      | Expected/actual harvest date                          |
| `location_lga`         | String   | Yes      | Yes     | Local Government Area                                 |
| `location_coordinates` | Object   | No       | No      | GPS coordinates {lat, lng} for future                 |
| `status`               | String   | No       | Yes     | Status: active/pending/sold/expired (default: active) |
| `views_count`          | Number   | No       | No      | Number of views by buyers (default: 0)                |
| `offers_count`         | Number   | No       | No      | Number of offers received (default: 0)                |
| `reference`            | String   | Yes      | Unique  | Listing reference (LST20251123001)                    |
| `created_at`           | Date     | No       | Yes     | Listing creation timestamp                            |
| `expires_at`           | Date     | No       | Yes     | Listing expiration (7 days default)                   |
| `sold_at`              | Date     | No       | No      | Timestamp when sold                                   |
| `updated_at`           | Date     | No       | No      | Last update timestamp                                 |

**Indexes:**

```javascript
{ farmer_id: 1, status: 1, created_at: -1 }
{ location_lga: 1, status: 1, harvest_status: 1, created_at: -1 }
{ variety: 1, quality_grade: 1, status: 1, created_at: -1 }
{ price_per_kg: 1, status: 1 }
{ status: 1, expires_at: 1 }
{ reference: 1 } // Unique
```

---

### 2.2 Order Collection

**Purpose:** Store orders/offers between buyers and farmers

| Field                 | Type     | Required | Indexed | Description                                                                         |
| --------------------- | -------- | -------- | ------- | ----------------------------------------------------------------------------------- |
| `_id`                 | ObjectId | Yes      | Primary | Auto-generated unique ID                                                            |
| `listing_id`          | ObjectId | Yes      | Yes     | Reference to Listing                                                                |
| `farmer_id`           | ObjectId | Yes      | Yes     | Reference to Farmer                                                                 |
| `buyer_id`            | ObjectId | Yes      | Yes     | Reference to Buyer                                                                  |
| `quantity_kg`         | Number   | Yes      | No      | Ordered quantity in kg                                                              |
| `price_per_kg`        | Number   | Yes      | No      | Agreed price per kg in kobo                                                         |
| `total_amount`        | Number   | Yes      | No      | Total order value in kobo                                                           |
| `platform_fee`        | Number   | No       | No      | Platform fee in kobo (1%)                                                           |
| `grand_total`         | Number   | Yes      | No      | Total + fees in kobo                                                                |
| `pickup_date`         | Date     | No       | No      | Scheduled pickup date                                                               |
| `pickup_time`         | String   | No       | No      | Scheduled pickup time                                                               |
| `payment_method`      | String   | Yes      | No      | Method: wallet/bank_transfer/mobile_money/cash                                      |
| `status`              | String   | No       | Yes     | Status: pending/accepted/rejected/in_transit/delivered/completed/cancelled/disputed |
| `farmer_confirmed`    | Boolean  | No       | No      | Farmer confirmed delivery? (default: false)                                         |
| `buyer_confirmed`     | Boolean  | No       | No      | Buyer confirmed receipt? (default: false)                                           |
| `farmer_rating`       | Number   | No       | No      | Farmer's rating of buyer (1-5)                                                      |
| `buyer_rating`        | Number   | No       | No      | Buyer's rating of farmer (1-5)                                                      |
| `farmer_review`       | String   | No       | No      | Optional review text from farmer                                                    |
| `buyer_review`        | String   | No       | No      | Optional review text from buyer                                                     |
| `reference`           | String   | Yes      | Unique  | Order reference (ORD20251123001)                                                    |
| `created_at`          | Date     | No       | Yes     | Order creation timestamp                                                            |
| `accepted_at`         | Date     | No       | No      | Timestamp when accepted                                                             |
| `delivered_at`        | Date     | No       | No      | Timestamp when delivered                                                            |
| `completed_at`        | Date     | No       | Yes     | Timestamp when completed                                                            |
| `disputed_at`         | Date     | No       | No      | Timestamp if disputed                                                               |
| `cancelled_at`        | Date     | No       | No      | Timestamp if cancelled                                                              |
| `cancellation_reason` | String   | No       | No      | Reason for cancellation                                                             |

**Indexes:**

```javascript
{ farmer_id: 1, status: 1, created_at: -1 }
{ buyer_id: 1, status: 1, created_at: -1 }
{ listing_id: 1, status: 1 }
{ status: 1, completed_at: -1 }
{ reference: 1 } // Unique
```

---

## 3. FINANCIAL SCHEMAS (4 Collections)

### 3.1 Wallet Collection

**Purpose:** Store user wallet balances and bank account details

| Field             | Type     | Required | Indexed | Description                            |
| ----------------- | -------- | -------- | ------- | -------------------------------------- |
| `_id`             | ObjectId | Yes      | Primary | Auto-generated unique ID               |
| `user_id`         | ObjectId | Yes      | Yes     | Reference to Farmer or Buyer           |
| `user_type`       | String   | Yes      | Yes     | Type: farmer/buyer                     |
| `balance`         | Number   | No       | No      | Available balance in kobo (default: 0) |
| `escrow_balance`  | Number   | No       | No      | Locked funds in kobo (default: 0)      |
| `savings_balance` | Number   | No       | No      | Savings account in kobo (default: 0)   |
| `total_earned`    | Number   | No       | No      | Lifetime earnings in kobo (default: 0) |
| `total_spent`     | Number   | No       | No      | Lifetime spending in kobo (default: 0) |
| `total_withdrawn` | Number   | No       | No      | Total withdrawals in kobo (default: 0) |
| `total_deposited` | Number   | No       | No      | Total deposits in kobo (default: 0)    |
| `bank_name`       | String   | No       | No      | Bank name for withdrawals              |
| `account_number`  | String   | No       | No      | Bank account number                    |
| `account_name`    | String   | No       | No      | Account holder name                    |
| `bvn`             | String   | No       | No      | Bank Verification Number (optional)    |
| `created_at`      | Date     | No       | No      | Wallet creation timestamp              |
| `updated_at`      | Date     | No       | No      | Last update timestamp                  |

**Indexes:**

```javascript
{ user_id: 1, user_type: 1 } // Compound Unique
```

---

### 3.2 Transaction Collection

**Purpose:** Store all financial transactions with audit trail

| Field            | Type     | Required | Indexed | Description                                                                                                                           |
| ---------------- | -------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `_id`            | ObjectId | Yes      | Primary | Auto-generated unique ID                                                                                                              |
| `user_id`        | ObjectId | Yes      | Yes     | Reference to Farmer or Buyer                                                                                                          |
| `user_type`      | String   | Yes      | No      | Type: farmer/buyer                                                                                                                    |
| `type`           | String   | Yes      | Yes     | Type: sale/purchase/withdrawal/deposit/loan_disbursement/loan_repayment/savings_deposit/savings_withdrawal/escrow_hold/escrow_release |
| `amount`         | Number   | Yes      | No      | Transaction amount in kobo                                                                                                            |
| `balance_before` | Number   | Yes      | No      | Wallet balance before transaction                                                                                                     |
| `balance_after`  | Number   | Yes      | No      | Wallet balance after transaction                                                                                                      |
| `order_id`       | ObjectId | No       | Yes     | Reference to Order (if applicable)                                                                                                    |
| `listing_id`     | ObjectId | No       | No      | Reference to Listing (if applicable)                                                                                                  |
| `loan_id`        | ObjectId | No       | Yes     | Reference to Loan (if applicable)                                                                                                     |
| `status`         | String   | No       | Yes     | Status: pending/completed/failed/cancelled                                                                                            |
| `reference`      | String   | Yes      | Unique  | Transaction reference (TXN20251123001)                                                                                                |
| `description`    | String   | No       | No      | Transaction description                                                                                                               |
| `metadata`       | Object   | No       | No      | Additional transaction data (JSON)                                                                                                    |
| `created_at`     | Date     | No       | Yes     | Transaction creation timestamp                                                                                                        |
| `completed_at`   | Date     | No       | No      | Transaction completion timestamp                                                                                                      |
| `failed_at`      | Date     | No       | No      | Transaction failure timestamp                                                                                                         |

**Indexes:**

```javascript
{ user_id: 1, created_at: -1 }
{ user_id: 1, type: 1, status: 1 }
{ reference: 1 } // Unique
{ status: 1, created_at: -1 }
{ order_id: 1 }
{ loan_id: 1 }
```

---

### 3.3 Loan Collection

**Purpose:** Store microfinance loan records for farmers

| Field                      | Type     | Required | Indexed | Description                                          |
| -------------------------- | -------- | -------- | ------- | ---------------------------------------------------- |
| `_id`                      | ObjectId | Yes      | Primary | Auto-generated unique ID                             |
| `farmer_id`                | ObjectId | Yes      | Yes     | Reference to Farmer                                  |
| `farmer_name`              | String   | Yes      | No      | Denormalized farmer name                             |
| `farmer_phone`             | String   | Yes      | No      | Denormalized farmer phone                            |
| `amount`                   | Number   | Yes      | No      | Principal amount in kobo                             |
| `interest_rate`            | Number   | Yes      | No      | Interest rate percentage (10% or 15%)                |
| `interest_amount`          | Number   | Yes      | No      | Interest amount in kobo                              |
| `total_repayment`          | Number   | Yes      | No      | Total to repay (principal + interest)                |
| `purpose`                  | String   | Yes      | No      | Loan purpose (cassava stems, fertilizer, etc.)       |
| `duration_months`          | Number   | Yes      | No      | Loan duration (3 or 6 months)                        |
| `monthly_payment`          | Number   | Yes      | No      | Monthly payment amount in kobo                       |
| `amount_paid`              | Number   | No       | No      | Total amount paid so far (default: 0)                |
| `amount_outstanding`       | Number   | Yes      | No      | Remaining balance in kobo                            |
| `status`                   | String   | No       | Yes     | Status: active/completed/defaulted (default: active) |
| `reference`                | String   | Yes      | Unique  | Loan reference (LOAN20251123001)                     |
| `disbursed_at`             | Date     | No       | No      | Disbursement timestamp                               |
| `due_date`                 | Date     | Yes      | Yes     | Final repayment due date                             |
| `completed_at`             | Date     | No       | No      | Loan completion timestamp                            |
| `defaulted_at`             | Date     | No       | No      | Default timestamp                                    |
| `last_payment_date`        | Date     | No       | No      | Last repayment timestamp                             |
| `credit_score_at_approval` | Number   | No       | No      | Credit score when loan approved                      |

**Indexes:**

```javascript
{ farmer_id: 1, status: 1 }
{ status: 1, due_date: 1 }
{ reference: 1 } // Unique
```

---

### 3.4 SavingsAccount Collection

**Purpose:** Store savings account data with interest tracking

| Field                       | Type     | Required | Indexed | Description                                   |
| --------------------------- | -------- | -------- | ------- | --------------------------------------------- |
| `_id`                       | ObjectId | Yes      | Primary | Auto-generated unique ID                      |
| `farmer_id`                 | ObjectId | Yes      | Unique  | Reference to Farmer                           |
| `balance`                   | Number   | No       | Yes     | Current savings balance in kobo (default: 0)  |
| `interest_rate`             | Number   | No       | No      | Annual interest rate (default: 8%)            |
| `total_interest_earned`     | Number   | No       | No      | Lifetime interest earned in kobo (default: 0) |
| `total_deposits`            | Number   | No       | No      | Total deposited in kobo (default: 0)          |
| `total_withdrawals`         | Number   | No       | No      | Total withdrawn in kobo (default: 0)          |
| `last_interest_calculation` | Date     | No       | No      | Last interest calculation timestamp           |
| `created_at`                | Date     | No       | No      | Account creation timestamp                    |
| `updated_at`                | Date     | No       | No      | Last update timestamp                         |

**Indexes:**

```javascript
{
  farmer_id: 1;
} // Unique
{
  balance: 1;
} // For daily interest calculation cron
```

---

## 4. MARKET ANALYTICS SCHEMAS (2 Collections)

### 4.1 MarketPrice Collection

**Purpose:** Store calculated market prices for varieties

| Field               | Type     | Required | Indexed | Description                                  |
| ------------------- | -------- | -------- | ------- | -------------------------------------------- |
| `_id`               | ObjectId | Yes      | Primary | Auto-generated unique ID                     |
| `variety`           | String   | Yes      | Yes     | Cassava variety                              |
| `quality_grade`     | String   | Yes      | Yes     | Quality: premium/standard/processing         |
| `avg_price`         | Number   | Yes      | No      | Average price per kg in kobo                 |
| `min_price`         | Number   | Yes      | No      | Minimum price in kobo                        |
| `max_price`         | Number   | Yes      | No      | Maximum price in kobo                        |
| `sample_size`       | Number   | Yes      | No      | Number of orders used for calculation        |
| `lga`               | String   | No       | Yes     | LGA (optional for location-specific pricing) |
| `date`              | Date     | Yes      | Yes     | Price calculation date                       |
| `trend`             | String   | No       | No      | Trend: rising/falling/stable                 |
| `percentage_change` | Number   | No       | No      | % change from previous period                |
| `created_at`        | Date     | No       | No      | Record creation timestamp                    |

**Indexes:**

```javascript
{ variety: 1, quality_grade: 1, date: -1 }
{ date: -1 }
{ lga: 1, variety: 1, date: -1 }
```

---

### 4.2 PriceHistory Collection

**Purpose:** Store historical price data for trend analysis

| Field           | Type     | Required | Indexed | Description                 |
| --------------- | -------- | -------- | ------- | --------------------------- |
| `_id`           | ObjectId | Yes      | Primary | Auto-generated unique ID    |
| `variety`       | String   | Yes      | Yes     | Cassava variety             |
| `quality_grade` | String   | Yes      | No      | Quality grade               |
| `price`         | Number   | Yes      | No      | Price per kg in kobo        |
| `quantity_kg`   | Number   | Yes      | No      | Quantity sold at this price |
| `lga`           | String   | No       | No      | Location                    |
| `date`          | Date     | Yes      | Yes     | Transaction date            |
| `order_id`      | ObjectId | No       | No      | Reference to Order          |

**Indexes:**

```javascript
{ variety: 1, date: -1 }
{ date: -1 }
```

---

## 5. COMMUNICATION SCHEMAS (2 Collections)

### 5.1 SMSLog Collection

**Purpose:** Store SMS sending logs for audit and tracking

| Field             | Type     | Required | Indexed | Description                                                                                                                                                       |
| ----------------- | -------- | -------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `_id`             | ObjectId | Yes      | Primary | Auto-generated unique ID                                                                                                                                          |
| `recipient_phone` | String   | Yes      | Yes     | Recipient phone number                                                                                                                                            |
| `sender_id`       | String   | No       | No      | Sender ID (e.g., "FarmConnect")                                                                                                                                   |
| `message`         | String   | Yes      | No      | SMS message content                                                                                                                                               |
| `message_type`    | String   | Yes      | Yes     | Type: registration/listing_created/offer_received/offer_sent/offer_accepted/payment_confirmed/delivery_confirmed/loan_approved/withdrawal_processed/market_update |
| `status`          | String   | No       | Yes     | Status: sent/delivered/failed (default: sent)                                                                                                                     |
| `message_id`      | String   | No       | No      | Message ID from Africa's Talking                                                                                                                                  |
| `cost`            | Number   | No       | No      | SMS cost in kobo                                                                                                                                                  |
| `failure_reason`  | String   | No       | No      | Reason if failed                                                                                                                                                  |
| `sent_at`         | Date     | No       | Yes     | SMS sent timestamp                                                                                                                                                |
| `delivered_at`    | Date     | No       | No      | SMS delivered timestamp                                                                                                                                           |
| `user_id`         | ObjectId | No       | Yes     | Reference to user (optional)                                                                                                                                      |
| `user_type`       | String   | No       | No      | Type: farmer/buyer (optional)                                                                                                                                     |

**Indexes:**

```javascript
{ recipient_phone: 1, sent_at: -1 }
{ message_type: 1, status: 1 }
{ sent_at: -1 }
{ user_id: 1, sent_at: -1 }
```

---

### 5.2 Notification Collection

**Purpose:** Store in-app notifications for future mobile app

| Field        | Type     | Required | Indexed | Description                              |
| ------------ | -------- | -------- | ------- | ---------------------------------------- |
| `_id`        | ObjectId | Yes      | Primary | Auto-generated unique ID                 |
| `user_id`    | ObjectId | Yes      | Yes     | Reference to Farmer or Buyer             |
| `user_type`  | String   | Yes      | No      | Type: farmer/buyer                       |
| `title`      | String   | Yes      | No      | Notification title                       |
| `message`    | String   | Yes      | No      | Notification message                     |
| `type`       | String   | Yes      | Yes     | Type: offer/payment/delivery/loan/system |
| `read`       | Boolean  | No       | Yes     | Read status (default: false)             |
| `action_url` | String   | No       | No      | Deep link or action URL                  |
| `metadata`   | Object   | No       | No      | Additional data (JSON)                   |
| `created_at` | Date     | No       | Yes     | Notification creation timestamp          |
| `read_at`    | Date     | No       | No      | Timestamp when read                      |

**Indexes:**

```javascript
{ user_id: 1, read: 1, created_at: -1 }
{ type: 1, created_at: -1 }
```

---

## 6. SUPPORT & ADMIN SCHEMAS (2 Collections)

### 6.1 Report Collection

**Purpose:** Store user-submitted issue reports

| Field              | Type     | Required | Indexed | Description                                                                           |
| ------------------ | -------- | -------- | ------- | ------------------------------------------------------------------------------------- |
| `_id`              | ObjectId | Yes      | Primary | Auto-generated unique ID                                                              |
| `reporter_id`      | ObjectId | Yes      | Yes     | Reference to Farmer or Buyer                                                          |
| `reporter_type`    | String   | Yes      | No      | Type: farmer/buyer                                                                    |
| `reporter_name`    | String   | Yes      | No      | Denormalized reporter name                                                            |
| `reporter_phone`   | String   | Yes      | No      | Denormalized reporter phone                                                           |
| `order_id`         | ObjectId | No       | Yes     | Reference to Order (if applicable)                                                    |
| `issue_type`       | String   | Yes      | Yes     | Type: buyer_no_show/payment_issue/quality_dispute/technical_issue/fraud_attempt/other |
| `description`      | String   | Yes      | No      | Issue description                                                                     |
| `status`           | String   | No       | Yes     | Status: pending/investigating/resolved/closed (default: pending)                      |
| `priority`         | String   | No       | Yes     | Priority: low/medium/high/urgent (default: medium)                                    |
| `reference`        | String   | Yes      | Unique  | Report reference (RPT20251123001)                                                     |
| `assigned_to`      | ObjectId | No       | Yes     | Reference to Admin                                                                    |
| `created_at`       | Date     | No       | Yes     | Report creation timestamp                                                             |
| `assigned_at`      | Date     | No       | No      | Assignment timestamp                                                                  |
| `resolved_at`      | Date     | No       | No      | Resolution timestamp                                                                  |
| `resolution_notes` | String   | No       | No      | Admin resolution notes                                                                |
| `admin_actions`    | Array    | No       | No      | Array of admin action logs                                                            |

**Indexes:**

```javascript
{ reporter_id: 1, status: 1, created_at: -1 }
{ order_id: 1 }
{ status: 1, priority: 1, created_at: -1 }
{ assigned_to: 1, status: 1 }
{ reference: 1 } // Unique
```

---

### 6.2 Dispute Collection

**Purpose:** Store order disputes for resolution

| Field              | Type          | Required | Indexed | Description                                                                     |
| ------------------ | ------------- | -------- | ------- | ------------------------------------------------------------------------------- |
| `_id`              | ObjectId      | Yes      | Primary | Auto-generated unique ID                                                        |
| `order_id`         | ObjectId      | Yes      | Unique  | Reference to Order                                                              |
| `raised_by`        | ObjectId      | Yes      | Yes     | Reference to user who raised dispute                                            |
| `raised_by_type`   | String        | Yes      | No      | Type: farmer/buyer                                                              |
| `dispute_type`     | String        | Yes      | Yes     | Type: non_delivery/quality_issue/quantity_mismatch/payment_issue                |
| `description`      | String        | Yes      | No      | Dispute description                                                             |
| `evidence_urls`    | Array[String] | No       | No      | Array of photo/document URLs                                                    |
| `status`           | String        | No       | Yes     | Status: open/under_review/resolved_farmer/resolved_buyer/closed (default: open) |
| `escrow_amount`    | Number        | Yes      | No      | Amount held in escrow (kobo)                                                    |
| `resolution`       | String        | No       | No      | Resolution decision                                                             |
| `refund_amount`    | Number        | No       | No      | Refund amount in kobo                                                           |
| `resolved_by`      | ObjectId      | No       | No      | Reference to Admin                                                              |
| `reference`        | String        | Yes      | Unique  | Dispute reference (DSP20251123001)                                              |
| `created_at`       | Date          | No       | Yes     | Dispute creation timestamp                                                      |
| `resolved_at`      | Date          | No       | No      | Resolution timestamp                                                            |
| `farmer_statement` | String        | No       | No      | Farmer's statement                                                              |
| `buyer_statement`  | String        | No       | No      | Buyer's statement                                                               |

**Indexes:**

```javascript
{ order_id: 1 } // Unique
{ raised_by: 1, status: 1 }
{ status: 1, created_at: -1 }
{ reference: 1 } // Unique
```

---

## 7. RELATIONSHIP SCHEMAS (2 Collections)

### 7.1 SupplierNetwork Collection

**Purpose:** Store buyer-farmer relationships for repeat orders

| Field                    | Type     | Required | Indexed | Description                                                                        |
| ------------------------ | -------- | -------- | ------- | ---------------------------------------------------------------------------------- |
| `_id`                    | ObjectId | Yes      | Primary | Auto-generated unique ID                                                           |
| `buyer_id`               | ObjectId | Yes      | Yes     | Reference to Buyer                                                                 |
| `farmer_id`              | ObjectId | Yes      | Yes     | Reference to Farmer                                                                |
| `buyer_name`             | String   | Yes      | No      | Denormalized buyer name                                                            |
| `farmer_name`            | String   | Yes      | No      | Denormalized farmer name                                                           |
| `total_orders`           | Number   | No       | No      | Total orders between them (default: 0)                                             |
| `total_volume_kg`        | Number   | No       | No      | Total volume traded in kg (default: 0)                                             |
| `total_value`            | Number   | No       | No      | Total value traded in kobo (default: 0)                                            |
| `avg_rating`             | Number   | No       | No      | Average rating                                                                     |
| `last_order_date`        | Date     | No       | No      | Last order timestamp                                                               |
| `standing_order_active`  | Boolean  | No       | No      | Has standing order? (default: false)                                               |
| `standing_order_details` | Object   | No       | No      | Standing order config {frequency, quantity_kg, variety, quality, max_price_per_kg} |
| `created_at`             | Date     | No       | No      | Relationship creation timestamp                                                    |
| `updated_at`             | Date     | No       | No      | Last update timestamp                                                              |

**Indexes:**

```javascript
{ buyer_id: 1, farmer_id: 1 } // Compound Unique
{ buyer_id: 1, total_orders: -1 }
{ standing_order_active: 1 }
```

---

### 7.2 FarmInputsOrder Collection

**Purpose:** Store farm inputs purchased by farmers (credit/cash)

| Field              | Type     | Required | Indexed | Description                                                              |
| ------------------ | -------- | -------- | ------- | ------------------------------------------------------------------------ |
| `_id`              | ObjectId | Yes      | Primary | Auto-generated unique ID                                                 |
| `farmer_id`        | ObjectId | Yes      | Yes     | Reference to Farmer                                                      |
| `farmer_name`      | String   | Yes      | No      | Denormalized farmer name                                                 |
| `item_type`        | String   | Yes      | Yes     | Type: cassava_stems/fertilizer/herbicide/farm_tools/processing_equipment |
| `item_name`        | String   | Yes      | No      | Item name (e.g., "TME 419 stems")                                        |
| `quantity`         | Number   | Yes      | No      | Quantity ordered                                                         |
| `unit`             | String   | Yes      | No      | Unit: stems/bags/liters/pieces                                           |
| `unit_price`       | Number   | Yes      | No      | Unit price in kobo                                                       |
| `total_amount`     | Number   | Yes      | No      | Total amount in kobo                                                     |
| `payment_type`     | String   | Yes      | Yes     | Type: wallet/cash/credit                                                 |
| `interest_amount`  | Number   | No       | No      | Interest if credit (kobo)                                                |
| `total_due`        | Number   | No       | No      | Total due if credit (kobo)                                               |
| `due_date`         | Date     | No       | Yes     | Payment due date if credit                                               |
| `supplier_name`    | String   | No       | No      | Supplier/vendor name                                                     |
| `supplier_phone`   | String   | No       | No      | Supplier phone                                                           |
| `delivery_status`  | String   | No       | Yes     | Status: pending/dispatched/delivered/completed                           |
| `delivery_address` | String   | No       | No      | Delivery address                                                         |
| `reference`        | String   | Yes      | Unique  | Order reference (INP20251123001)                                         |
| `created_at`       | Date     | No       | No      | Order creation timestamp                                                 |
| `delivered_at`     | Date     | No       | No      | Delivery timestamp                                                       |
| `paid_at`          | Date     | No       | No      | Payment timestamp                                                        |

**Indexes:**

```javascript
{ farmer_id: 1, delivery_status: 1 }
{ payment_type: 1, due_date: 1 }
{ item_type: 1 }
{ reference: 1 } // Unique
```

---

## SCHEMA RELATIONSHIP DIAGRAM

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Farmer    │         │    Buyer    │         │    Admin    │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                        │
       │ 1:1                   │ 1:1                    │
       ├──────────────────────┐│                        │
       │                      ││                        │
       ▼                      ▼▼                        │
┌─────────────┐         ┌─────────────┐                │
│   Wallet    │         │   Wallet    │                │
└─────────────┘         └─────────────┘                │
       │                                                │
       │ 1:1                                            │
       ▼                                                │
┌─────────────┐                                         │
│SavingsAcct  │                                         │
└─────────────┘                                         │
       │                                                │
       │ 1:N                                            │
       ├─────────┬──────────┬──────────┐               │
       ▼         ▼          ▼          ▼               │
┌──────────┐ ┌────────┐ ┌──────┐ ┌──────────┐         │
│ Listing  │ │  Loan  │ │ Farm │ │Transaction│         │
│          │ │        │ │Inputs│ │          │         │
└────┬─────┘ └────────┘ └──────┘ └──────────┘         │
     │                                                  │
     │ 1:N                                              │
     ▼                                                  │
┌──────────┐                                            │
│  Order   │◄───────────────┐                          │
└────┬─────┘                │                          │
     │                      │                          │
     │ 1:1                  │ N:1                      │
     ▼                      │                          │
┌──────────┐                │                          │
│ Dispute  │                │                          │
└──────────┘                │                          │
                            │                          │
                            │                          │
┌─────────────────────────┐ │                          │
│ SupplierNetwork         │ │                          │
│ (Buyer ↔ Farmer M:N)    │─┘                          │
└─────────────────────────┘                            │
                                                       │
┌──────────────┐                                       │
│   Report     │───────────────────────────────────────┘
└──────────────┘              Assigned to Admin

┌──────────────┐         ┌──────────────┐
│ MarketPrice  │         │ PriceHistory │
└──────────────┘         └──────────────┘

┌──────────────┐         ┌──────────────┐
│   SMSLog     │         │ Notification │
└──────────────┘         └──────────────┘
```

---

## INDEXING STRATEGY SUMMARY

### High Priority Indexes (Create First)

1. **User Authentication:** `Farmer.phone`, `Buyer.phone` (Unique)
2. **Location Searches:** `Listing.location_lga + status + created_at`
3. **User Orders:** `Order.farmer_id + status + created_at`, `Order.buyer_id + status + created_at`
4. **Transaction History:** `Transaction.user_id + created_at`
5. **Wallet Lookup:** `Wallet.user_id + user_type` (Unique)

### Medium Priority Indexes

6. **Market Pricing:** `MarketPrice.variety + quality_grade + date`
7. **Loan Management:** `Loan.farmer_id + status`, `Loan.status + due_date`
8. **SMS Tracking:** `SMSLog.recipient_phone + sent_at`
9. **Admin Management:** `Report.status + priority + created_at`

### Low Priority Indexes (Add As Needed)

10. **Analytics:** `Listing.variety + status`, `Order.completed_at`
11. **Supplier Network:** `SupplierNetwork.buyer_id + total_orders`
12. **Farm Inputs:** `FarmInputsOrder.payment_type + due_date`

---

## REFERENCE NUMBER FORMATS

| Entity      | Format                    | Example         |
| ----------- | ------------------------- | --------------- |
| Listing     | `LST{YYYYMMDD}{COUNTER}`  | LST20251123001  |
| Order       | `ORD{YYYYMMDD}{COUNTER}`  | ORD20251123001  |
| Transaction | `TXN{YYYYMMDD}{COUNTER}`  | TXN20251123001  |
| Loan        | `LOAN{YYYYMMDD}{COUNTER}` | LOAN20251123001 |
| Withdrawal  | `WTH{YYYYMMDD}{COUNTER}`  | WTH20251123001  |
| Report      | `RPT{YYYYMMDD}{COUNTER}`  | RPT20251123001  |
| Dispute     | `DSP{YYYYMMDD}{COUNTER}`  | DSP20251123001  |
| Farm Inputs | `INP{YYYYMMDD}{COUNTER}`  | INP20251123001  |

---

## DATA TYPES & UNITS

### Monetary Values

- **Storage:** All amounts stored in **kobo** (smallest unit, ₦1 = 100 kobo)
- **Example:** ₦50,000 stored as 5,000,000 kobo
- **Reason:** Avoid floating-point precision errors

### Phone Numbers

- **Format:** 11 digits without country code (e.g., `08012345678`)
- **Country Code:** Stored separately in `phone_code` field (default: `"234"`)
- **Full Format:** `+234-801-234-5678`

### Dates

- **Type:** MongoDB Date (ISODate)
- **Timezone:** UTC (convert to user timezone on display)
- **Indexing:** Use descending index (`-1`) for recent-first queries

### Enums

- **Storage:** Lowercase with underscores (e.g., `ready_now`, `in_transit`)
- **Validation:** Mongoose enum validation on schema level

---

## TOTAL COLLECTION COUNT: 17

1. ✅ **Farmer** - User management
2. ✅ **Buyer** - User management
3. ✅ **Admin** - Platform management
4. ✅ **Listing** - Marketplace
5. ✅ **Order** - Marketplace
6. ✅ **Wallet** - Financial
7. ✅ **Transaction** - Financial
8. ✅ **Loan** - Financial
9. ✅ **SavingsAccount** - Financial
10. ✅ **MarketPrice** - Analytics
11. ✅ **PriceHistory** - Analytics
12. ✅ **SMSLog** - Communication
13. ✅ **Notification** - Communication
14. ✅ **Report** - Support
15. ✅ **Dispute** - Support
16. ✅ **SupplierNetwork** - Relationships
17. ✅ **FarmInputsOrder** - Relationships

---



---

**Document Version:** 1.0  
**Last Updated:** 24 November 2025  
**Author:** FarmConnect Development Team
