import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { CreateAdminDto, AdminRole } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { LoginAdminDto } from './dto/login-admin.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AdminResponseDto } from './dto/admin-response.dto';

describe('AdminController', () => {
  let controller: AdminController;
  let service: jest.Mocked<AdminService>;

  const mockAdminResponse: AdminResponseDto = {
    id: '507f1f77bcf86cd799439011',
    email: 'test@farmconnect.com',
    firstName: 'John',
    lastName: 'Doe',
    fullName: 'John Doe',
    role: AdminRole.SUPPORT,
    permissions: ['manage_users'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockService = {
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    login: jest.fn(),
    changePassword: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    service = module.get(AdminService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new admin', async () => {
      const createAdminDto: CreateAdminDto = {
        email: 'new@farmconnect.com',
        password: 'Password123',
        firstName: 'Jane',
        lastName: 'Smith',
        role: AdminRole.SUPPORT,
        permissions: ['view_reports'],
      };

      service.create.mockResolvedValue(mockAdminResponse);

      const result = await controller.create(createAdminDto);

      expect(service.create).toHaveBeenCalledWith(createAdminDto);
      expect(result).toEqual(mockAdminResponse);
    });
  });

  describe('getAllAdmins', () => {
    it('should return paginated list of admins', async () => {
      const filters = { page: 1, limit: 20, search: 'john' };
      const mockResponse = {
        admins: [mockAdminResponse],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      service.getAllAdmins = jest.fn().mockResolvedValue(mockResponse);

      const result = await controller.getAllAdmins(filters as any);

      expect(service.getAllAdmins).toHaveBeenCalledWith(filters);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('findById', () => {
    it('should return admin by ID', async () => {
      service.findById.mockResolvedValue(mockAdminResponse);

      const result = await controller.findById('507f1f77bcf86cd799439011');

      expect(service.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result).toEqual(mockAdminResponse);
    });
  });

  describe('update', () => {
    it('should update admin', async () => {
      const updateDto: UpdateAdminDto = {
        firstName: 'Updated',
        email: 'updated@farmconnect.com',
      };

      const updatedResponse = { ...mockAdminResponse, ...updateDto };
      service.update.mockResolvedValue(updatedResponse);

      const result = await controller.update('507f1f77bcf86cd799439011', updateDto);

      expect(service.update).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        updateDto,
      );
      expect(result.firstName).toBe('Updated');
    });
  });

  describe('delete', () => {
    it('should delete admin', async () => {
      service.delete.mockResolvedValue({
        ...mockAdminResponse,
        isActive: false,
      });

      const result = await controller.delete('507f1f77bcf86cd799439011');

      expect(service.delete).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result.isActive).toBe(false);
    });
  });

  describe('login', () => {
    it('should login admin', async () => {
      const loginDto: LoginAdminDto = {
        email: 'test@farmconnect.com',
        password: 'Password123',
      };

      service.login.mockResolvedValue(mockAdminResponse);

      const result = await controller.login(loginDto);

      expect(service.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(mockAdminResponse);
    });
  });

  describe('changePassword', () => {
    it('should change admin password', async () => {
      const changePasswordDto: ChangePasswordDto = {
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword123',
      };

      service.changePassword.mockResolvedValue(mockAdminResponse);

      const result = await controller.changePassword(
        '507f1f77bcf86cd799439011',
        changePasswordDto,
      );

      expect(service.changePassword).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        changePasswordDto,
      );
      expect(result).toEqual(mockAdminResponse);
    });
  });

  describe('getAllFarmers', () => {
    it('should return paginated list of farmers', async () => {
      const filters = { page: 1, limit: 20 };
      const mockResponse = {
        farmers: [
          {
            id: '507f1f77bcf86cd799439011',
            userId: '507f1f77bcf86cd799439012',
            firstName: 'John',
            lastName: 'Farmer',
            fullName: 'John Farmer',
            phone: '08012345678',
            lga: 'Oshodi-Isolo',
            farmSizeHectares: 5.5,
            totalSales: 100,
            totalEarnings: 5000000,
            completedSales: 95,
            listingsCount: 20,
            creditScore: 720,
            loanDefaults: 0,
            activeLoan: false,
            averageRating: 4.5,
            totalRatings: 80,
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      service.getAllFarmers = jest.fn().mockResolvedValue(mockResponse);

      const result = await controller.getAllFarmers(filters as any);

      expect(service.getAllFarmers).toHaveBeenCalledWith(filters);
      expect(result).toEqual(mockResponse);
      expect(result.farmers).toHaveLength(1);
    });
  });

  describe('getFarmerById', () => {
    it('should return farmer by ID', async () => {
      const mockFarmer = {
        id: '507f1f77bcf86cd799439011',
        userId: '507f1f77bcf86cd799439012',
        firstName: 'John',
        lastName: 'Farmer',
        fullName: 'John Farmer',
        phone: '08012345678',
        lga: 'Oshodi-Isolo',
        farmSizeHectares: 5.5,
        totalSales: 100,
        totalEarnings: 5000000,
        completedSales: 95,
        listingsCount: 20,
        creditScore: 720,
        loanDefaults: 0,
        activeLoan: false,
        averageRating: 4.5,
        totalRatings: 80,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      service.getFarmerById = jest.fn().mockResolvedValue(mockFarmer);

      const result = await controller.getFarmerById('507f1f77bcf86cd799439011');

      expect(service.getFarmerById).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
      expect(result).toEqual(mockFarmer);
    });
  });

  describe('getAllBuyers', () => {
    it('should return paginated list of buyers', async () => {
      const filters = { page: 1, limit: 20 };
      const mockResponse = {
        buyers: [
          {
            id: '507f1f77bcf86cd799439011',
            userId: '507f1f77bcf86cd799439012',
            firstName: 'Jane',
            lastName: 'Buyer',
            fullName: 'Jane Buyer',
            phone: '08087654321',
            businessName: 'Jane Processors',
            lga: 'Oshodi-Isolo',
            buyerType: 'processor',
            totalPurchases: 50,
            totalSpent: 10000000,
            completedOrders: 48,
            averageRating: 4.7,
            totalRatings: 40,
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      service.getAllBuyers = jest.fn().mockResolvedValue(mockResponse);

      const result = await controller.getAllBuyers(filters as any);

      expect(service.getAllBuyers).toHaveBeenCalledWith(filters);
      expect(result).toEqual(mockResponse);
      expect(result.buyers).toHaveLength(1);
    });
  });

  describe('getBuyerById', () => {
    it('should return buyer by ID', async () => {
      const mockBuyer = {
        id: '507f1f77bcf86cd799439011',
        userId: '507f1f77bcf86cd799439012',
        firstName: 'Jane',
        lastName: 'Buyer',
        fullName: 'Jane Buyer',
        phone: '08087654321',
        businessName: 'Jane Processors',
        lga: 'Oshodi-Isolo',
        buyerType: 'processor',
        totalPurchases: 50,
        totalSpent: 10000000,
        completedOrders: 48,
        averageRating: 4.7,
        totalRatings: 40,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      service.getBuyerById = jest.fn().mockResolvedValue(mockBuyer);

      const result = await controller.getBuyerById('507f1f77bcf86cd799439011');

      expect(service.getBuyerById).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
      expect(result).toEqual(mockBuyer);
    });
  });

  describe('activateAdmin', () => {
    it('should activate admin account', async () => {
      const activateDto = { reason: 'Reactivating account' };
      const mockResponse = {
        message: 'Admin account for John Doe has been successfully activated',
        admin: mockAdminResponse,
      };

      service.activateAdmin = jest.fn().mockResolvedValue(mockResponse);

      const result = await controller.activateAdmin(
        '507f1f77bcf86cd799439011',
        activateDto,
      );

      expect(service.activateAdmin).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        activateDto,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deactivateAdmin', () => {
    it('should deactivate admin account', async () => {
      const deactivateDto = { reason: 'Policy violation' };
      const mockResponse = {
        message: 'Admin account for John Doe has been successfully deactivated',
        admin: { ...mockAdminResponse, isActive: false },
      };

      service.deactivateAdmin = jest.fn().mockResolvedValue(mockResponse);

      const result = await controller.deactivateAdmin(
        '507f1f77bcf86cd799439011',
        deactivateDto,
      );

      expect(service.deactivateAdmin).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        deactivateDto,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getAllAdmins', () => {
    it('should return paginated list of admins', async () => {
      const filters = { page: 1, limit: 20, search: 'john' };
      const mockResponse = {
        admins: [mockAdminResponse],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      service.getAllAdmins = jest.fn().mockResolvedValue(mockResponse);

      const result = await controller.getAllAdmins(filters as any);

      expect(service.getAllAdmins).toHaveBeenCalledWith(filters);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateFarmer', () => {
    it('should update farmer information', async () => {
      const updateDto = { firstName: 'Updated', farmSizeHectares: 10 };
      const mockResponse = {
        id: '507f1f77bcf86cd799439011',
        firstName: 'Updated',
        farmSizeHectares: 10,
      };

      service.updateFarmer = jest.fn().mockResolvedValue(mockResponse);

      const result = await controller.updateFarmer(
        '507f1f77bcf86cd799439011',
        updateDto as any,
      );

      expect(service.updateFarmer).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        updateDto,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deactivateFarmer', () => {
    it('should deactivate farmer account', async () => {
      const mockResponse = {
        message: 'Farmer account has been successfully deactivated',
        farmer: { id: '507f1f77bcf86cd799439011', status: 'inactive' },
      };

      service.deactivateFarmer = jest.fn().mockResolvedValue(mockResponse);

      const result = await controller.deactivateFarmer('507f1f77bcf86cd799439011');

      expect(service.deactivateFarmer).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('activateFarmer', () => {
    it('should activate farmer account', async () => {
      const mockResponse = {
        message: 'Farmer account has been successfully activated',
        farmer: { id: '507f1f77bcf86cd799439011', status: 'active' },
      };

      service.activateFarmer = jest.fn().mockResolvedValue(mockResponse);

      const result = await controller.activateFarmer('507f1f77bcf86cd799439011');

      expect(service.activateFarmer).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getDashboardKPIs', () => {
    it('should return comprehensive dashboard KPIs', async () => {
      const mockKPIs = {
        transactions: {
          totalTransactions: 1500,
          totalValue: 50000000,
          successfulTransactions: 1450,
          failedTransactions: 50,
          todayTransactions: 25,
          thisWeekTransactions: 180,
          thisMonthTransactions: 750,
        },
        farmers: {
          totalFarmers: 500,
          activeFarmers: 480,
          newFarmersThisMonth: 45,
          topPerformingFarmer: 'John Farmer',
        },
        purchases: {
          totalPurchases: 800,
          totalValue: 25000000,
          completedPurchases: 780,
          pendingPurchases: 20,
        },
        ussdSessions: {
          totalSessions: 2500,
          activeSessions: 15,
          completedSessions: 2400,
          failedSessions: 85,
          networkProviders: {
            MTN: 1200,
            GLO: 800,
            AIRTEL: 400,
            NMOBILE: 100,
          },
        },
        systemHealth: {
          uptime: '99.9%',
          responseTime: 120,
          errorRate: 0.1,
        },
      };

      service.getDashboardKPIs = jest.fn().mockResolvedValue(mockKPIs);

      const result = await controller.getDashboardKPIs();

      expect(service.getDashboardKPIs).toHaveBeenCalled();
      expect(result).toEqual(mockKPIs);
    });
  });

  describe('createProduct', () => {
    it('should create a new product', async () => {
      const createDto = {
        name: 'Cassava',
        category: 'Tubers',
        pricePerKg: 500,
        description: 'Fresh cassava',
      };
      const mockResponse = {
        id: '507f1f77bcf86cd799439011',
        ...createDto,
        isActive: true,
        createdAt: new Date(),
      };

      service.createProduct = jest.fn().mockResolvedValue(mockResponse);

      const result = await controller.createProduct(createDto as any);

      expect(service.createProduct).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('listProducts', () => {
    it('should return paginated list of products', async () => {
      const mockResponse = {
        products: [{
          id: '507f1f77bcf86cd799439011',
          name: 'Cassava',
          category: 'Tubers',
          pricePerKg: 500,
          isActive: true,
        }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      service.getAllProducts = jest.fn().mockResolvedValue(mockResponse);

      const result = await controller.listProducts();

      expect(service.getAllProducts).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getProduct', () => {
    it('should return product by ID', async () => {
      const mockProduct = {
        id: '507f1f77bcf86cd799439011',
        name: 'Cassava',
        category: 'Tubers',
        pricePerKg: 500,
        isActive: true,
      };

      service.getProductById = jest.fn().mockResolvedValue(mockProduct);

      const result = await controller.getProduct('507f1f77bcf86cd799439011');

      expect(service.getProductById).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
      expect(result).toEqual(mockProduct);
    });
  });

  describe('updateProduct', () => {
    it('should update product', async () => {
      const updateDto = { pricePerKg: 600, description: 'Updated description' };
      const mockResponse = {
        id: '507f1f77bcf86cd799439011',
        name: 'Cassava',
        ...updateDto,
      };

      service.updateProduct = jest.fn().mockResolvedValue(mockResponse);

      const result = await controller.updateProduct(
        '507f1f77bcf86cd799439011',
        updateDto as any,
      );

      expect(service.updateProduct).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        updateDto,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateProductStatus', () => {
    it('should update product status', async () => {
      const statusUpdate = { isActive: false };
      const mockResponse = {
        id: '507f1f77bcf86cd799439011',
        name: 'Cassava',
        isActive: false,
      };

      service.updateProduct = jest.fn().mockResolvedValue(mockResponse);

      const result = await controller.updateProductStatus(
        '507f1f77bcf86cd799439011',
        statusUpdate,
      );

      expect(service.updateProduct).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        { isActive: false },
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteProduct', () => {
    it('should delete product', async () => {
      const mockResponse = { message: 'Product deleted successfully' };

      service.deleteProduct = jest.fn().mockResolvedValue(mockResponse);

      const result = await controller.deleteProduct('507f1f77bcf86cd799439011');

      expect(service.deleteProduct).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getLoanKPIs', () => {
    it('should return loan KPIs', async () => {
      const mockKPIs = {
        totalLoans: 150,
        activeLoans: 45,
        totalLoanValue: 15000000,
        defaultRate: 2.5,
        averageLoanAmount: 100000,
      };

      service.getLoanKPIs = jest.fn().mockResolvedValue(mockKPIs);

      const result = await controller.getLoanKPIs();

      expect(service.getLoanKPIs).toHaveBeenCalled();
      expect(result).toEqual(mockKPIs);
    });
  });

  describe('getAllLoans', () => {
    it('should return paginated list of loans', async () => {
      const filters = { page: 1, limit: 20, status: 'active' };
      const mockResponse = {
        loans: [{
          id: '507f1f77bcf86cd799439011',
          farmerId: '507f1f77bcf86cd799439012',
          amount: 100000,
          status: 'active',
        }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      service.getAllLoans = jest.fn().mockResolvedValue(mockResponse);

      const result = await controller.getAllLoans(filters as any);

      expect(service.getAllLoans).toHaveBeenCalledWith(filters);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getLoanRequests', () => {
    it('should return paginated list of loan requests', async () => {
      const filters = { page: 1, limit: 20, status: 'pending' };
      const mockResponse = {
        loanRequests: [{
          id: '507f1f77bcf86cd799439011',
          farmerId: '507f1f77bcf86cd799439012',
          amount: 100000,
          status: 'pending',
        }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      service.getLoanRequests = jest.fn().mockResolvedValue(mockResponse);

      const result = await controller.getLoanRequests(filters as any);

      expect(service.getLoanRequests).toHaveBeenCalledWith(filters);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getLoanById', () => {
    it('should return loan by ID', async () => {
      const mockLoan = {
        id: '507f1f77bcf86cd799439011',
        farmerId: '507f1f77bcf86cd799439012',
        amount: 100000,
        status: 'active',
        createdAt: new Date(),
      };

      service.getLoanById = jest.fn().mockResolvedValue(mockLoan);

      const result = await controller.getLoanById('507f1f77bcf86cd799439011');

      expect(service.getLoanById).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
      expect(result).toEqual(mockLoan);
    });
  });

  describe('createLoan', () => {
    it('should create a new loan', async () => {
      const createDto = {
        farmerId: '507f1f77bcf86cd799439012',
        amount: 100000,
        purpose: 'Seeds and fertilizer',
        repaymentTerms: '6 months',
      };
      const mockResponse = {
        id: '507f1f77bcf86cd799439011',
        ...createDto,
        status: 'approved',
        createdAt: new Date(),
      };

      service.createLoan = jest.fn().mockResolvedValue(mockResponse);

      const result = await controller.createLoan(createDto as any);

      expect(service.createLoan).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('approveLoanRequest', () => {
    it('should approve loan request', async () => {
      const approveDto = {
        pickupLocation: 'Main Branch',
        pickupDate: new Date(),
        notes: 'Approved for full amount',
      };
      const mockResponse = {
        id: '507f1f77bcf86cd799439011',
        status: 'approved',
        pickupLocation: 'Main Branch',
        approvedAt: new Date(),
      };

      service.approveLoanRequest = jest.fn().mockResolvedValue(mockResponse);

      const result = await controller.approveLoanRequest(
        '507f1f77bcf86cd799439011',
        approveDto as any,
      );

      expect(service.approveLoanRequest).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        approveDto,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('activateLoan', () => {
    it('should activate approved loan', async () => {
      const mockResponse = {
        id: '507f1f77bcf86cd799439011',
        status: 'active',
        activatedAt: new Date(),
      };

      service.activateLoan = jest.fn().mockResolvedValue(mockResponse);

      const result = await controller.activateLoan('507f1f77bcf86cd799439011');

      expect(service.activateLoan).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('introspect', () => {
    it('should introspect valid token', async () => {
      const mockIntrospection = {
        active: true,
        sub: '507f1f77bcf86cd799439011',
        email: 'test@farmconnect.com',
        role: AdminRole.SUPPORT,
        exp: Math.floor(Date.now() / 1000) + 86400,
      };

      service.introspectToken = jest.fn().mockResolvedValue(mockIntrospection);

      const result = await controller.introspect('Bearer valid-token');

      expect(service.introspectToken).toHaveBeenCalledWith('valid-token');
      expect(result).toEqual(mockIntrospection);
    });

    it('should throw UnauthorizedException for missing token', async () => {
      await expect(controller.introspect('')).rejects.toThrow(
        'No token provided',
      );
    });

    it('should throw UnauthorizedException for invalid token format', async () => {
      await expect(controller.introspect('InvalidToken')).rejects.toThrow(
        'No token provided',
      );
    });
  });

  describe('fundWallet', () => {
    it('should fund user wallet', async () => {
      const fundDto = {
        userId: '507f1f77bcf86cd799439012',
        amount: 50000,
        reason: 'Bonus credit',
      };
      const mockResponse = {
        message: 'Wallet funded successfully',
        wallet: {
          userId: '507f1f77bcf86cd799439012',
          balance: 100000,
          lastFunded: new Date(),
        },
      };

      service.fundUserWallet = jest.fn().mockResolvedValue(mockResponse);

      const result = await controller.fundWallet(fundDto as any);

      expect(service.fundUserWallet).toHaveBeenCalledWith(fundDto);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('setWithdrawalAccount', () => {
    it('should set user withdrawal account', async () => {
      const setAccountDto = {
        userId: '507f1f77bcf86cd799439012',
        bankName: 'GTBank',
        bankCode: '058',
        accountNumber: '0123456789',
        accountName: 'John Farmer',
        bvn: '12345678901',
      };
      const mockResponse = {
        message: 'Withdrawal account set successfully',
        wallet: {
          userId: '507f1f77bcf86cd799439012',
          withdrawalAccount: {
            bankName: 'GTBank',
            accountNumber: '0123456789',
            accountName: 'John Farmer',
          },
        },
      };

      service.setUserWithdrawalAccount = jest.fn().mockResolvedValue(mockResponse);

      const result = await controller.setWithdrawalAccount(setAccountDto as any);

      expect(service.setUserWithdrawalAccount).toHaveBeenCalledWith(setAccountDto);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getCassavaPricing', () => {
    it('should return cassava pricing configuration', () => {
      const result = controller.getCassavaPricing();

      expect(result).toEqual({
        pricePerKg: 500,
        pricePerTon: 450000,
      });
    });
  });
});
