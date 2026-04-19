import { Collection, Document } from 'mongodb';
import { IPaginationMeta, IPaginatedResponse } from '@mern/shared';

export const PAGINATION_CONSTANTS = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

// ==========================================
// INTERFACES (Internal — không share cho FE)
// ==========================================

export interface IPaginationParams {
  page: number;
  limit: number;
}

export interface IListQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  filters?: Record<string, any>;
}

// Enhanced query options for MongoDB operations
export interface IQueryOptions {
  sort?: Record<string, 1 | -1>;
  projection?: Record<string, 1 | 0>;
  populate?: string[];
  index?: string; // Hint for index usage
}

// Advanced filtering options
export interface IFilterOptions {
  dateRange?: {
    field: string;
    start?: Date;
    end?: Date;
  };
  textSearch?: {
    query: string;
    fields: string[];
  };
  statusFilters?: {
    isActive?: boolean;
    isDeleted?: boolean;
    status?: string | string[];
  };
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Validate and normalize pagination parameters
 */
export function validatePaginationParams(params: any): IPaginationParams {
  const page = Math.max(
    1,
    Number(params?.page) || PAGINATION_CONSTANTS.DEFAULT_PAGE,
  );
  const limit = Math.min(
    Math.max(1, Number(params?.limit) || PAGINATION_CONSTANTS.DEFAULT_LIMIT),
    PAGINATION_CONSTANTS.MAX_LIMIT,
  );
  return { page, limit };
}

/**
 * Create pagination metadata from page, limit, and total count
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number,
): IPaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

/**
 * Create standardized paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  meta: IPaginationMeta,
  message?: string,
): IPaginatedResponse<T> {
  return { data, meta, message };
}

// ==========================================
// PAGINATION UTILS CLASS
// ==========================================

export class PaginationUtils {
  // Re-export constants for backward compatibility
  static readonly DEFAULT_PAGE = PAGINATION_CONSTANTS.DEFAULT_PAGE;
  static readonly DEFAULT_LIMIT = PAGINATION_CONSTANTS.DEFAULT_LIMIT;
  static readonly MAX_LIMIT = PAGINATION_CONSTANTS.MAX_LIMIT;

  /**
   * Validate and normalize pagination parameters
   */
  static validateParams(params: any): IPaginationParams {
    return validatePaginationParams(params);
  }

  /**
   * Get pagination object from page and limit
   */
  static getPagination(
    page?: number,
    limit?: number,
  ): { page: number; limit: number } {
    return {
      page: Math.max(1, page || PAGINATION_CONSTANTS.DEFAULT_PAGE),
      limit: Math.min(
        limit || PAGINATION_CONSTANTS.DEFAULT_LIMIT,
        PAGINATION_CONSTANTS.MAX_LIMIT,
      ),
    };
  }

  /**
   * Get sort object from sortBy and sortOrder
   */
  static getSort(
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
  ): Record<string, 1 | -1> {
    if (!sortBy) return { createdAt: -1 };
    return { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
  }

  /**
   * Generate pagination metadata
   */
  static generatePagination(options: {
    page: number;
    limit: number;
    total: number;
  }): IPaginationMeta {
    const { page, limit, total } = options;
    return createPaginationMeta(page, limit, total);
  }

  /**
   * Create pagination metadata
   */
  static createMeta(
    page: number,
    limit: number,
    total: number,
  ): IPaginationMeta {
    return createPaginationMeta(page, limit, total);
  }

  /**
   * Create standardized paginated response
   */
  static createResponse<T>(
    data: T[],
    meta: IPaginationMeta,
    message?: string,
  ): IPaginatedResponse<T> {
    return createPaginatedResponse(data, meta, message);
  }

  /**
   * Build MongoDB query from list parameters
   */
  static buildMongoQuery(
    listQuery: IListQuery,
    filterOptions?: IFilterOptions,
  ): Record<string, any> {
    const query: Record<string, any> = {};

    // Text search
    if (listQuery.search && filterOptions?.textSearch) {
      const searchRegex = { $regex: listQuery.search, $options: 'i' };
      if (filterOptions.textSearch.fields.length === 1) {
        query[filterOptions.textSearch.fields[0]] = searchRegex;
      } else {
        query.$or = filterOptions.textSearch.fields.map((field) => ({
          [field]: searchRegex,
        }));
      }
    }

    // Date range filter
    if (filterOptions?.dateRange) {
      const dateFilter: any = {};
      if (filterOptions.dateRange.start) {
        dateFilter.$gte = filterOptions.dateRange.start;
      }
      if (filterOptions.dateRange.end) {
        dateFilter.$lte = filterOptions.dateRange.end;
      }
      if (Object.keys(dateFilter).length > 0) {
        query[filterOptions.dateRange.field] = dateFilter;
      }
    }

    // Status filters
    if (filterOptions?.statusFilters) {
      const { isActive, isDeleted, status } = filterOptions.statusFilters;

      if (typeof isActive === 'boolean') {
        query.isActive = isActive;
      }
      if (typeof isDeleted === 'boolean') {
        query.isDeleted = isDeleted;
      }
      if (status) {
        query.status = Array.isArray(status) ? { $in: status } : status;
      }
    }

    // Custom filters
    if (listQuery.filters) {
      Object.entries(listQuery.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            query[key] = { $in: value };
          } else {
            query[key] = value;
          }
        }
      });
    }

    return query;
  }

  /**
   * Build MongoDB sort options
   */
  static buildMongoSort(
    listQuery: IListQuery,
    defaultSortField = 'createdAt',
  ): Record<string, 1 | -1> {
    const sortField = listQuery.sortBy || defaultSortField;
    const sortOrder = listQuery.sortOrder === 'ASC' ? 1 : -1;
    return { [sortField]: sortOrder };
  }

  /**
   * Enhanced pagination method for MongoDB collections
   */
  static async paginate<T>(
    collection: Collection<T & Document>,
    listQuery: IListQuery,
    queryOptions: IQueryOptions = {},
    filterOptions?: IFilterOptions,
  ): Promise<IPaginatedResponse<T>> {
    const { page, limit } = validatePaginationParams(listQuery);
    const skip = (page - 1) * limit;

    // Build query and sort
    const mongoQuery = this.buildMongoQuery(listQuery, filterOptions);
    const mongoSort = this.buildMongoSort(listQuery);

    // Apply query options
    const findOptions: any = {
      projection: queryOptions.projection,
      sort: queryOptions.sort || mongoSort,
      skip,
      limit,
    };

    if (queryOptions.index) {
      findOptions.hint = queryOptions.index;
    }

    try {
      // Execute queries in parallel for better performance
      const [items, totalCount] = await Promise.all([
        collection.find(mongoQuery, findOptions).toArray(),
        collection.countDocuments(mongoQuery),
      ]);

      const meta = createPaginationMeta(page, limit, totalCount);

      return createPaginatedResponse(
        items as T[],
        meta,
        `Retrieved ${items.length} items`,
      );
    } catch (error) {
      throw new Error(`Pagination query failed: ${error}`);
    }
  }

  /**
   * Get skip value for manual pagination
   */
  static getSkipValue(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  /**
   * Calculate total pages
   */
  static getTotalPages(totalItems: number, limit: number): number {
    return Math.ceil(totalItems / limit);
  }

  /**
   * Check if there are more pages
   */
  static hasNextPage(page: number, totalPages: number): boolean {
    return page < totalPages;
  }

  /**
   * Check if there are previous pages
   */
  static hasPreviousPage(page: number): boolean {
    return page > 1;
  }

  /**
   * Generate pagination URLs (for API responses)
   */
  static generatePaginationUrls(
    baseUrl: string,
    currentPage: number,
    totalPages: number,
    queryParams: Record<string, any> = {},
  ): {
    first?: string;
    previous?: string;
    next?: string;
    last?: string;
  } {
    const createUrl = (page: number) => {
      const params = new URLSearchParams({
        ...queryParams,
        page: page.toString(),
      });
      return `${baseUrl}?${params.toString()}`;
    };

    const urls: any = {};

    if (currentPage > 1) {
      urls.first = createUrl(1);
      urls.previous = createUrl(currentPage - 1);
    }

    if (currentPage < totalPages) {
      urls.next = createUrl(currentPage + 1);
      urls.last = createUrl(totalPages);
    }

    return urls;
  }
}
