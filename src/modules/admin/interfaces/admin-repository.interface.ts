import { Admin } from '../../../schemas/admin.schema';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { UpdateAdminDto } from '../dto/update-admin.dto';

export interface IAdminRepository {
  /**
   * Find admin by ID
   * @param id - Admin ID
   * @returns Admin or undefined
   */
  findById(id: string): Promise<Admin | undefined>;

  /**
   * Find admin by email
   * @param email - Admin email
   * @returns Admin or undefined
   */
  findByEmail(email: string): Promise<Admin | undefined>;

  /**
   * Create new admin
   * @param createAdminDto - Admin data
   * @returns Created admin
   */
  create(createAdminDto: CreateAdminDto): Promise<Admin>;

  /**
   * Update admin
   * @param id - Admin ID
   * @param updateAdminDto - Update data
   * @returns Updated admin
   */
  update(id: string, updateAdminDto: UpdateAdminDto): Promise<Admin | undefined>;

  /**
   * Delete admin (soft delete by setting isActive to false)
   * @param id - Admin ID
   * @returns Deleted admin
   */
  delete(id: string): Promise<Admin | undefined>;

  /**
   * Find all active admins
   * @returns Array of admins
   */
  findAll(): Promise<Admin[]>;

  /**
   * Find all admins with query, pagination and sorting
   * @param options - Query options
   * @returns Array of admins
   */
  findAllWithQuery(options: {
    query: any;
    skip: number;
    limit: number;
    sort: any;
  }): Promise<Admin[]>;

  /**
   * Count admins matching query
   * @param query - Query filters
   * @returns Count
   */
  countWithQuery(query: any): Promise<number>;
}
