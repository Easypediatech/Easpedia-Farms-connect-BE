# FarmConnect Backend - Coding Standards & Design Principles

## Overview

This document establishes the architectural patterns, design principles, and coding standards for the FarmConnect USSD Cassava Marketplace backend. All developers and AI agents working on this project **MUST** adhere to these guidelines.

---

## Table of Contents

1. [Core Design Principles](#1-core-design-principles)
2. [NestJS Best Practices](#2-nestjs-best-practices)
3. [Clean Code Principles](#3-clean-code-principles)
4. [TypeScript Standards](#4-typescript-standards)
5. [Error Handling](#5-error-handling)
6. [Data Transfer Objects (DTOs)](#6-data-transfer-objects-dtos)
7. [Database & Repository Pattern](#7-database--repository-pattern)
8. [Testing Standards](#8-testing-standards)
9. [Security Best Practices](#9-security-best-practices)
10. [API Design Standards](#10-api-design-standards)
11. [Documentation Requirements](#11-documentation-requirements)
12. [Git Commit Standards](#12-git-commit-standards)

---

## 1. CORE DESIGN PRINCIPLES

### 1.1 SOLID Principles

#### Single Responsibility Principle (SRP)

- Each class/function should have ONE reason to change
- Services should handle ONE domain concern
- Controllers should only handle HTTP requests/responses

```typescript
// ❌ BAD: Service doing too much
export class UserService {
  createUser() {}
  sendWelcomeEmail() {}
  calculateCreditScore() {}
  processPayment() {}
}

// ✅ GOOD: Separated concerns
export class UserService {
  createUser() {}
  getUserById() {}
  updateUser() {}
}

export class EmailService {
  sendWelcomeEmail() {}
}

export class CreditScoreService {
  calculateCreditScore() {}
}

export class PaymentService {
  processPayment() {}
}
```

#### Open/Closed Principle (OCP)

- Open for extension, closed for modification
- Use interfaces and abstract classes

```typescript
// ✅ GOOD: Extensible payment processors
export interface PaymentProcessor {
  processPayment(amount: number): Promise<PaymentResult>;
}

export class PaystackProcessor implements PaymentProcessor {
  async processPayment(amount: number): Promise<PaymentResult> {
    // Paystack implementation
  }
}

export class FlutterwaveProcessor implements PaymentProcessor {
  async processPayment(amount: number): Promise<PaymentResult> {
    // Flutterwave implementation
  }
}
```

#### Liskov Substitution Principle (LSP)

- Subtypes must be substitutable for their base types
- Don't break parent class contracts

#### Interface Segregation Principle (ISP)

- Clients shouldn't depend on interfaces they don't use
- Create specific, focused interfaces

```typescript
// ❌ BAD: Fat interface
interface User {
  id: string;
  createListing(): void;
  makePurchase(): void;
  approveLoan(): void;
}

// ✅ GOOD: Segregated interfaces
interface Farmer {
  id: string;
  createListing(): void;
  applyForLoan(): void;
}

interface Buyer {
  id: string;
  makePurchase(): void;
  rateSupplier(): void;
}

interface Admin {
  id: string;
  approveLoan(): void;
  resolveDispute(): void;
}
```

#### Dependency Inversion Principle (DIP)

- Depend on abstractions, not concretions
- Use dependency injection

```typescript
// ✅ GOOD: Constructor injection with interfaces
export class OrderService {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly notificationService: INotificationService,
    private readonly paymentService: IPaymentService,
  ) {}
}
```

---

### 1.2 DRY (Don't Repeat Yourself)

- Extract repeated logic into utility functions
- Use inheritance/composition for shared behavior
- Create reusable components

```typescript
// ❌ BAD: Repeated validation
if (!phone || phone.length !== 11) throw new Error('Invalid phone');
if (!phone || phone.length !== 11) throw new Error('Invalid phone');

// ✅ GOOD: Reusable validator
export class PhoneValidator {
  static validate(phone: string): void {
    if (!phone || phone.length !== 11) {
      throw new ValidationException('Invalid phone number');
    }
  }
}
```

---

### 1.3 KISS (Keep It Simple, Stupid)

- Write simple, readable code
- Avoid over-engineering
- If it's complex, refactor it

```typescript
// ❌ BAD: Over-complicated
const isEligible =
  user.creditScore > 500 &&
  user.loanDefaults === 0 &&
  user.activeLoan === false &&
  user.totalSales > 10
    ? true
    : false;

// ✅ GOOD: Simple and clear
const isEligible =
  user.creditScore > 500 &&
  user.loanDefaults === 0 &&
  !user.activeLoan &&
  user.totalSales > 10;
```

---

### 1.4 YAGNI (You Aren't Gonna Need It)

- Don't build features you don't need yet
- Implement requirements, not assumptions
- Refactor when needed, not in advance

---

## 2. NESTJS BEST PRACTICES

### 2.1 Module Organization

```
src/
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── dto/
│   │   │   ├── login.dto.ts
│   │   │   └── register.dto.ts
│   │   ├── guards/
│   │   │   └── jwt-auth.guard.ts
│   │   └── strategies/
│   │       └── jwt.strategy.ts
│   ├── farmer/
│   │   ├── farmer.module.ts
│   │   ├── farmer.controller.ts
│   │   ├── farmer.service.ts
│   │   ├── farmer.repository.ts
│   │   └── dto/
│   ├── ussd/
│   └── ...
├── common/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   ├── pipes/
│   ├── decorators/
│   └── utils/
├── schemas/
└── config/
```

### 2.2 Dependency Injection

```typescript
// ✅ GOOD: Proper DI usage
@Injectable()
export class FarmerService {
  constructor(
    @InjectModel(Farmer.name)
    private readonly farmerModel: Model<FarmerDocument>,
    private readonly walletService: WalletService,
    private readonly creditScoreService: CreditScoreService,
    private readonly logger: Logger,
  ) {}
}
```

### 2.3 Module Structure

```typescript
// ✅ GOOD: Well-structured module
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Farmer.name, schema: FarmerSchema }]),
    WalletModule,
    CreditScoreModule,
  ],
  controllers: [FarmerController],
  providers: [FarmerService, FarmerRepository],
  exports: [FarmerService], // Export for other modules
})
export class FarmerModule {}
```

### 2.4 Controller Best Practices

```typescript
// ✅ GOOD: Clean controller
@Controller('farmers')
@UseGuards(JwtAuthGuard)
export class FarmerController {
  constructor(private readonly farmerService: FarmerService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get farmer by ID' })
  @ApiResponse({ status: 200, type: FarmerResponseDto })
  async getFarmerById(@Param('id') id: string): Promise<FarmerResponseDto> {
    return this.farmerService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new farmer' })
  @UsePipes(ValidationPipe)
  async createFarmer(
    @Body() createFarmerDto: CreateFarmerDto,
  ): Promise<FarmerResponseDto> {
    return this.farmerService.create(createFarmerDto);
  }
}
```

### 2.5 Service Best Practices

```typescript
// ✅ GOOD: Service with proper error handling
@Injectable()
export class FarmerService {
  private readonly logger = new Logger(FarmerService.name);

  constructor(
    private readonly farmerRepository: FarmerRepository,
    private readonly walletService: WalletService,
  ) {}

  async findById(id: string): Promise<Farmer> {
    const farmer = await this.farmerRepository.findById(id);

    if (!farmer) {
      throw new NotFoundException(`Farmer with ID ${id} not found`);
    }

    return farmer;
  }

  async create(createFarmerDto: CreateFarmerDto): Promise<Farmer> {
    this.logger.log(`Creating farmer: ${createFarmerDto.phone}`);

    // Business logic here
    const farmer = await this.farmerRepository.create(createFarmerDto);

    // Create associated wallet
    await this.walletService.createWallet(farmer.id, 'farmer');

    return farmer;
  }
}
```

---

## 3. CLEAN CODE PRINCIPLES

### 3.1 Meaningful Names

```typescript
// ❌ BAD: Unclear names
const d = new Date();
const arr = [];
function calc(x: number): number {}

// ✅ GOOD: Descriptive names
const createdAt = new Date();
const farmerListings: Listing[] = [];
function calculateMonthlyPayment(loanAmount: number): number {}
```

### 3.2 Function Guidelines

**Rules:**

- Functions should do ONE thing
- Keep functions small (max 20-30 lines)
- Maximum 3 parameters (use objects for more)
- No side effects
- Return early to reduce nesting

```typescript
// ❌ BAD: Too many parameters, complex logic
function createOrder(
  farmerId: string,
  buyerId: string,
  listingId: string,
  quantity: number,
  price: number,
  pickupDate: Date,
  paymentMethod: string,
) {}

// ✅ GOOD: Use DTO
interface CreateOrderParams {
  farmerId: string;
  buyerId: string;
  listingId: string;
  quantity: number;
  price: number;
  pickupDate: Date;
  paymentMethod: string;
}

function createOrder(params: CreateOrderParams): Order {}

// ✅ GOOD: Early return
function calculateDiscount(user: User, amount: number): number {
  if (!user) return 0;
  if (amount < 10000) return 0;
  if (user.completedSales < 5) return 0;

  return amount * 0.05;
}
```

### 3.3 Comments

```typescript
// ❌ BAD: Obvious comments
// Increment i
i++;

// Get farmer by id
const farmer = await this.farmerService.findById(id);

// ✅ GOOD: Explain WHY, not WHAT
// Apply 24-hour hold period for escrow as per business rules
const escrowReleaseTime = addHours(new Date(), 24);

// Credit score calculation based on CBN microfinance guidelines
const creditScore = this.calculateCreditScore(farmer);

// ✅ GOOD: TODO comments
// TODO: Implement SMS retry mechanism for failed deliveries
// FIXME: Race condition when two buyers accept same listing
// NOTE: This endpoint will be deprecated in v2.0
```

### 3.4 Code Formatting

- Use Prettier for consistent formatting
- 2 spaces for indentation
- Max line length: 100 characters
- Use trailing commas
- Single quotes for strings

```typescript
// ✅ GOOD: Consistent formatting
const config = {
  apiKey: 'xxx',
  timeout: 5000,
  retries: 3,
};

const listings = await this.listingRepository.find({
  status: 'active',
  location: 'Kaduna',
  variety: 'TME 419',
});
```

---

## 4. TYPESCRIPT STANDARDS

### 4.1 Avoid `null` - Use `undefined` or Optional Properties

```typescript
// ❌ BAD: Using null
interface User {
  email: string | null;
  phone: string | null;
}

const user: User = {
  email: null,
  phone: null,
};

// ✅ GOOD: Use optional properties or undefined
interface User {
  email?: string;
  phone?: string;
}

const user: User = {
  email: undefined,
  // phone is implicitly undefined
};

// ✅ GOOD: Check with optional chaining
const hasPhone = user.phone !== undefined;
const phoneLength = user.phone?.length ?? 0;
```

### 4.2 Strict Type Safety

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}

// ❌ BAD: Using 'any'
function processData(data: any): any {
  return data.map((item: any) => item.value);
}

// ✅ GOOD: Proper typing
interface DataItem {
  id: string;
  value: number;
}

function processData(data: DataItem[]): number[] {
  return data.map((item) => item.value);
}
```

### 4.3 Type vs Interface

```typescript
// ✅ Use Interface for objects/classes
interface Farmer {
  id: string;
  name: string;
  lga: string;
}

// ✅ Use Type for unions, intersections, primitives
type UserType = 'farmer' | 'buyer' | 'admin';
type ID = string | number;
type FarmerWithWallet = Farmer & { wallet: Wallet };
```

### 4.4 Enums

```typescript
// ✅ GOOD: Use const enums for better tree-shaking
export const enum OrderStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
}

// ✅ GOOD: Use union types for simple cases
export type PaymentMethod = 'wallet' | 'bank_transfer' | 'mobile_money';
```

### 4.5 Generic Types

```typescript
// ✅ GOOD: Use generics for reusable code
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

class Repository<T> {
  async findById(id: string): Promise<T | undefined> {}
  async findAll(): Promise<T[]> {}
  async create(entity: T): Promise<T> {}
}
```

---

## 5. ERROR HANDLING

### 5.1 Custom Exception Hierarchy

```typescript
// ✅ GOOD: Custom exceptions
export class AppException extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number,
    public readonly errorCode: string,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationException extends AppException {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class NotFoundException extends AppException {
  constructor(resource: string, id: string) {
    super(`${resource} with ID ${id} not found`, 404, 'NOT_FOUND');
  }
}

export class InsufficientBalanceException extends AppException {
  constructor(required: number, available: number) {
    super(
      `Insufficient balance. Required: ₦${required}, Available: ₦${available}`,
      400,
      'INSUFFICIENT_BALANCE',
    );
  }
}
```

### 5.2 Global Exception Filter

```typescript
// ✅ GOOD: Centralized error handling
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = 500;
    let message = 'Internal server error';
    let errorCode = 'INTERNAL_ERROR';

    if (exception instanceof AppException) {
      status = exception.statusCode;
      message = exception.message;
      errorCode = exception.errorCode;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
    }

    this.logger.error(
      `Error: ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      success: false,
      errorCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

### 5.3 Error Handling in Services

```typescript
// ✅ GOOD: Proper error handling
async transferFunds(
  fromUserId: string,
  toUserId: string,
  amount: number,
): Promise<void> {
  // Validate inputs
  if (amount <= 0) {
    throw new ValidationException('Amount must be greater than 0');
  }

  // Check sender balance
  const senderWallet = await this.walletRepository.findByUserId(fromUserId);
  if (!senderWallet) {
    throw new NotFoundException('Wallet', fromUserId);
  }

  if (senderWallet.balance < amount) {
    throw new InsufficientBalanceException(amount, senderWallet.balance);
  }

  // Check receiver exists
  const receiverWallet = await this.walletRepository.findByUserId(toUserId);
  if (!receiverWallet) {
    throw new NotFoundException('Wallet', toUserId);
  }

  // Execute transfer in transaction
  try {
    await this.executeTransfer(senderWallet, receiverWallet, amount);
  } catch (error) {
    this.logger.error('Transfer failed', error.stack);
    throw new AppException(
      'Transfer failed. Please try again.',
      500,
      'TRANSFER_FAILED',
    );
  }
}
```

---

## 6. DATA TRANSFER OBJECTS (DTOs)

### 6.1 Request DTOs

```typescript
// ✅ GOOD: Request DTO with validation
export class CreateFarmerDto {
  @ApiProperty({ example: '08012345678' })
  @IsString()
  @Length(11, 11)
  @Matches(/^0[7-9][0-1]\d{8}$/, {
    message: 'Invalid Nigerian phone number',
  })
  phone: string;

  @ApiProperty({ example: 'Ibrahim' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'Yusuf' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @ApiProperty({ example: "Jema'a" })
  @IsString()
  @IsIn(["Jema'a", 'Kachia', 'Kagarko', 'Kaduna North', 'Kaduna South'])
  lga: string;

  @ApiProperty({ example: 3 })
  @IsNumber()
  @Min(0.1)
  @Max(1000)
  farmSizeHectares: number;

  @ApiProperty({ example: '1234' })
  @IsString()
  @Length(4, 4)
  @Matches(/^\d{4}$/, { message: 'PIN must be 4 digits' })
  pin: string;
}
```

### 6.2 Response DTOs

```typescript
// ✅ GOOD: Response DTO with transformations
export class FarmerResponseDto {
  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  firstName: string;

  @ApiProperty()
  @Expose()
  lastName: string;

  @ApiProperty()
  @Expose()
  fullName: string;

  @ApiProperty()
  @Expose()
  phone: string;

  @ApiProperty()
  @Expose()
  lga: string;

  @ApiProperty()
  @Expose()
  farmSizeHectares: number;

  @ApiProperty()
  @Expose()
  creditScore: number;

  @ApiProperty()
  @Expose()
  totalSales: number;

  @ApiProperty()
  @Expose()
  @Transform(({ value }) => value / 100) // Convert kobo to naira
  totalEarnings: number;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  // Exclude sensitive fields
  @Exclude()
  password?: string;

  @Exclude()
  ussdToken?: string;
}
```

### 6.3 Update DTOs

```typescript
// ✅ GOOD: Use PartialType for updates
export class UpdateFarmerDto extends PartialType(
  OmitType(CreateFarmerDto, ['phone', 'pin'] as const),
) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;
}
```

### 6.4 DTO Transformation

```typescript
// ✅ GOOD: Transform entities to DTOs
@Injectable()
export class FarmerService {
  async findById(id: string): Promise<FarmerResponseDto> {
    const farmer = await this.farmerRepository.findById(id);

    if (!farmer) {
      throw new NotFoundException('Farmer', id);
    }

    return plainToInstance(FarmerResponseDto, farmer, {
      excludeExtraneousValues: true,
    });
  }
}
```

---

## 7. DATABASE & REPOSITORY PATTERN

### 7.1 Repository Pattern

```typescript
// ✅ GOOD: Repository abstraction
export interface IFarmerRepository {
  findById(id: string): Promise<Farmer | undefined>;
  findByPhone(phone: string): Promise<Farmer | undefined>;
  create(farmer: CreateFarmerDto): Promise<Farmer>;
  update(id: string, updates: Partial<Farmer>): Promise<Farmer>;
  delete(id: string): Promise<void>;
}

@Injectable()
export class FarmerRepository implements IFarmerRepository {
  constructor(
    @InjectModel(Farmer.name)
    private readonly farmerModel: Model<FarmerDocument>,
  ) {}

  async findById(id: string): Promise<Farmer | undefined> {
    const farmer = await this.farmerModel.findById(id).lean().exec();
    return farmer ?? undefined; // Avoid null
  }

  async findByPhone(phone: string): Promise<Farmer | undefined> {
    const farmer = await this.farmerModel.findOne({ phone }).lean().exec();
    return farmer ?? undefined;
  }

  async create(data: CreateFarmerDto): Promise<Farmer> {
    const farmer = new this.farmerModel(data);
    return farmer.save();
  }
}
```

### 7.2 Query Optimization

```typescript
// ❌ BAD: N+1 query problem
async getOrdersWithDetails(farmerId: string): Promise<Order[]> {
  const orders = await this.orderModel.find({ farmerId });

  for (const order of orders) {
    order.buyer = await this.buyerModel.findById(order.buyerId); // N queries
  }

  return orders;
}

// ✅ GOOD: Use population/joins
async getOrdersWithDetails(farmerId: string): Promise<Order[]> {
  return this.orderModel
    .find({ farmerId })
    .populate('buyer')
    .populate('listing')
    .lean()
    .exec();
}
```

### 7.3 Transactions

```typescript
// ✅ GOOD: Use transactions for atomic operations
async transferFunds(
  fromUserId: string,
  toUserId: string,
  amount: number,
): Promise<void> {
  const session = await this.connection.startSession();

  try {
    await session.withTransaction(async () => {
      // Deduct from sender
      await this.walletModel.updateOne(
        { userId: fromUserId },
        { $inc: { balance: -amount } },
        { session },
      );

      // Add to receiver
      await this.walletModel.updateOne(
        { userId: toUserId },
        { $inc: { balance: amount } },
        { session },
      );

      // Create transaction records
      await this.transactionModel.insertMany(
        [
          { userId: fromUserId, amount: -amount, type: 'debit' },
          { userId: toUserId, amount: amount, type: 'credit' },
        ],
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
}
```

---

## 8. TESTING STANDARDS

### 8.1 Unit Tests

```typescript
// ✅ GOOD: Unit test structure
describe('FarmerService', () => {
  let service: FarmerService;
  let repository: MockType<FarmerRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        FarmerService,
        {
          provide: FarmerRepository,
          useFactory: mockRepository,
        },
      ],
    }).compile();

    service = module.get<FarmerService>(FarmerService);
    repository = module.get(FarmerRepository);
  });

  describe('findById', () => {
    it('should return farmer when found', async () => {
      const mockFarmer = { id: '123', firstName: 'Ibrahim' };
      repository.findById.mockResolvedValue(mockFarmer);

      const result = await service.findById('123');

      expect(result).toEqual(mockFarmer);
      expect(repository.findById).toHaveBeenCalledWith('123');
    });

    it('should throw NotFoundException when farmer not found', async () => {
      repository.findById.mockResolvedValue(undefined);

      await expect(service.findById('999')).rejects.toThrow(NotFoundException);
    });
  });
});
```

### 8.2 Test Coverage Requirements

- **Minimum 80% code coverage**
- Unit tests for all services
- Integration tests for critical flows
- E2E tests for main user journeys

---

## 9. SECURITY BEST PRACTICES

### 9.1 Input Validation

```typescript
// ✅ GOOD: Always validate and sanitize inputs
@Post('create-listing')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
async createListing(@Body() dto: CreateListingDto) {
  // Input is validated by ValidationPipe
  return this.listingService.create(dto);
}
```

### 9.2 Authentication & Authorization

```typescript
// ✅ GOOD: Use guards for protection
@Controller('farmers')
@UseGuards(JwtAuthGuard)
export class FarmerController {
  @Get('profile')
  @UseGuards(RolesGuard)
  @Roles('farmer')
  async getProfile(@CurrentUser() user: User) {
    return this.farmerService.getProfile(user.farmerProfileId);
  }
}
```

### 9.3 Sensitive Data

```typescript
// ✅ GOOD: Never log sensitive data
this.logger.log(`User logged in: ${user.phone}`); // OK
this.logger.log(`PIN: ${user.pin}`); // ❌ NEVER DO THIS

// ✅ GOOD: Hash passwords/PINs before storing
const hashedPin = await bcrypt.hash(pin, 10);
```

---

## 10. API DESIGN STANDARDS

### 10.1 RESTful Conventions

```
GET    /api/farmers           - Get all farmers
GET    /api/farmers/:id       - Get single farmer
POST   /api/farmers           - Create farmer
PUT    /api/farmers/:id       - Update farmer (full)
PATCH  /api/farmers/:id       - Update farmer (partial)
DELETE /api/farmers/:id       - Delete farmer

GET    /api/farmers/:id/listings - Get farmer's listings
POST   /api/farmers/:id/listings - Create listing for farmer
```

### 10.2 Response Format

```typescript
// ✅ GOOD: Consistent response structure
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

// Success response
{
  "success": true,
  "data": { "id": "123", "name": "Ibrahim" },
  "timestamp": "2025-11-24T10:30:00Z"
}

// Error response
{
  "success": false,
  "errorCode": "VALIDATION_ERROR",
  "message": "Invalid phone number",
  "timestamp": "2025-11-24T10:30:00Z",
  "path": "/api/farmers"
}
```

### 10.3 Pagination

```typescript
// ✅ GOOD: Paginated response
interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}
```

---

## 11. DOCUMENTATION REQUIREMENTS

### 11.1 Code Documentation

```typescript
/**
 * Calculates the credit score for a farmer based on multiple factors
 *
 * Algorithm:
 * - Base score: 500
 * - +10 per completed sale (max +200)
 * - +1 per ₦10,000 earned (max +150)
 * - +100 if zero loan defaults
 * - +5 per month since registration (max +100)
 * - -50 if active loan exists
 * - -100 per loan default
 *
 * @param farmer - The farmer entity with sales history
 * @returns Credit score between 300 and 850
 * @throws ValidationException if farmer data is invalid
 */
calculateCreditScore(farmer: Farmer): number {
  // Implementation
}
```

### 11.2 API Documentation (Swagger)

```typescript
// ✅ GOOD: Comprehensive API docs
@ApiTags('Farmers')
@Controller('farmers')
export class FarmerController {
  @Post()
  @ApiOperation({
    summary: 'Create new farmer',
    description: 'Register a new farmer account with profile details',
  })
  @ApiResponse({
    status: 201,
    description: 'Farmer created successfully',
    type: FarmerResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 409,
    description: 'Phone number already registered',
  })
  async createFarmer(@Body() dto: CreateFarmerDto): Promise<FarmerResponseDto> {
    return this.farmerService.create(dto);
  }
}
```

---

## 12. GIT COMMIT STANDARDS

### 12.1 Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding/updating tests
- `chore`: Build process or auxiliary tool changes

**Examples:**

```
feat(farmer): add credit score calculation

Implement credit score algorithm based on sales history,
loan defaults, and account age.

Closes #123

---

fix(wallet): prevent race condition in balance updates

Use MongoDB transactions to ensure atomic balance updates
when processing concurrent transactions.

---

docs(api): update Swagger documentation for order endpoints
```

### 12.2 Branch Naming

```
feature/farmer-registration
bugfix/wallet-race-condition
hotfix/sms-delivery-failure
refactor/credit-score-calculation
```

---

## ENFORCEMENT CHECKLIST

Before submitting code, ensure:

- [ ] All TypeScript errors resolved
- [ ] No `null` types used (use `undefined` or optional)
- [ ] All DTOs have proper validation decorators
- [ ] Request and Response DTOs separated
- [ ] Services follow single responsibility
- [ ] Proper error handling with custom exceptions
- [ ] No sensitive data in logs
- [ ] Repository pattern used for database access
- [ ] Unit tests written for new code
- [ ] Code formatted with Prettier
- [ ] ESLint warnings resolved
- [ ] API documented with Swagger decorators
- [ ] Commit messages follow convention

---

## CODE REVIEW STANDARDS

Reviewers must check for:

1. **Architecture**: Follows NestJS patterns and SOLID principles
2. **Type Safety**: No `any` or `null` types
3. **Error Handling**: Proper exceptions and error messages
4. **DTOs**: Request/Response DTOs present and validated
5. **Testing**: Adequate test coverage
6. **Security**: No security vulnerabilities
7. **Performance**: No obvious performance issues
8. **Documentation**: Code and API properly documented
9. **Clean Code**: Readable, maintainable, follows standards

---

## AUTOMATED ENFORCEMENT

### ESLint Configuration

```json
{
  "extends": [
    "@nestjs/eslint-config-nestjs",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "no-console": "warn",
    "no-debugger": "error"
  }
}
```

### Husky Pre-commit Hooks

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "npm test"
    }
  },
  "lint-staged": {
    "*.ts": ["eslint --fix", "prettier --write"]
  }
}
```

---

**Document Version:** 1.0  
**Last Updated:** 24 November 2025  
**Mandatory Reading:** All developers must read and understand this document before contributing  
**Review Cycle:** Quarterly or as needed

---

## SUMMARY

This document establishes the foundation for building a **clean, maintainable, type-safe, and scalable** NestJS backend. Adherence to these standards is **mandatory** for all contributors, including AI agents and developers.

**Key Takeaways:**

- ✅ Follow SOLID principles
- ✅ Avoid `null`, use `undefined` or optional types
- ✅ Always use Request and Response DTOs
- ✅ Implement repository pattern for database access
- ✅ Write meaningful tests
- ✅ Handle errors properly with custom exceptions
- ✅ Document your code
- ✅ Keep it clean and simple

**Questions?** Refer to this document or consult the tech lead.
