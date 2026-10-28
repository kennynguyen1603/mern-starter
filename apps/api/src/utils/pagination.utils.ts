import { Collection, Document, Filter, FindOptions } from 'mongodb';
import { IPaginationMeta, IPaginatedResponse } from '@mern/shared';
import _ from 'lodash';

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
  filters?: Record<string, unknown>;
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
export function validatePaginationParams(
  params: { page?: unknown; limit?: unknown } | undefined,
): IPaginationParams {
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
  /**
   * Build MongoDB query from list parameters
   */
  static buildMongoQuery(
    listQuery: IListQuery,
    filterOptions?: IFilterOptions,
  ): Record<string, unknown> {
    const query: Record<string, unknown> = {};

    // Text search
    if (listQuery.search && filterOptions?.textSearch) {
      const searchRegex = {
        $regex: _.escapeRegExp(listQuery.search),
        $options: 'i',
      };
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
      const dateFilter: { $gte?: Date; $lte?: Date } = {};
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
        // Reject operator keys and object values to prevent query injection
        if (key.startsWith('$')) return;
        if (_.isPlainObject(value)) return;

        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            query[key] = { $in: value.filter((v) => !_.isObject(v)) };
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
  static async paginate<T extends Document>(
    collection: Collection<T>,
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
    const findOptions: FindOptions = {
      projection: queryOptions.projection,
      sort: queryOptions.sort || mongoSort,
      skip,
      limit,
    };

    if (queryOptions.index) {
      findOptions.hint = queryOptions.index;
    }

    // Execute queries in parallel for better performance
    const [items, totalCount] = await Promise.all([
      collection.find(mongoQuery as Filter<T>, findOptions).toArray(),
      collection.countDocuments(mongoQuery as Filter<T>),
    ]);

    const meta = createPaginationMeta(page, limit, totalCount);

    return createPaginatedResponse(
      items as T[],
      meta,
      `Retrieved ${items.length} items`,
    );
  }
}
