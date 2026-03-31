/**
 * Standardized API Response Formatting Utilities
 * Ensures all API responses have consistent structure
 * 
 * Response format:
 * Success: { success: true, data?: T, message?: string }
 * Error: { success: false, error: { message, details?, statusCode?, code? } }
 * Paginated: { success: true, data: T[], pagination: { page, limit, total, pages } }
 */

/**
 * Success response interface
 */
interface SuccessResponse<T> {
  success: true;
  data?: T;
  message?: string;
}

/**
 * Error response interface
 */
interface ErrorResponse {
  success: false;
  error: {
    message: string;
    details?: any;
    statusCode?: number;
    code?: string;
  };
}

/**
 * Pagination metadata interface
 */
interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Paginated response interface
 */
interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Format successful API response
 * 
 * @template T - Data type being returned
 * @param data - Response payload (optional)
 * @param message - Custom success message
 * @returns Standardized success response
 * 
 * @example
 * return res.json(success(user, 'User created'));
 */
export const success = <T = any>(
  data?: T,
  message = 'Request successful'
): SuccessResponse<T> => {
  return {
    success: true,
    ...(data && { data }),
    message,
  };
};

/**
 * Format error API response
 * 
 * @param message - Error message
 * @param details - Additional error context (stack trace, field errors, etc.)
 * @returns Standardized error response
 * 
 * @example
 * return res.json(error('Validation failed', { field: 'email', reason: 'Invalid' }));
 */
export const error = (message: string, details?: any): ErrorResponse => {
  return {
    success: false,
    error: {
      message,
      ...(details && { details }),
    },
  };
};

/**
 * Format paginated API response with metadata
 * 
 * @template T - Item type in array
 * @param data - Array of items
 * @param page - Current page number (1-indexed)
 * @param limit - Items per page
 * @param total - Total item count
 * @returns Paginated response with pagination metadata
 * 
 * @example
 * const { requests, total } = await getRequests();
 * return res.json(paginated(requests, page, limit, total));
 */
export const paginated = <T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResponse<T> => {
  const pages = Math.ceil(total / limit) || 1;
  const hasNextPage = page < pages;
  const hasPrevPage = page > 1;

  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      pages,
      hasNextPage,
      hasPrevPage,
    },
  };
};

/**
 * Format success response with metadata
 * Useful for responses with additional context beyond just data
 * 
 * @template T - Data type
 * @param data - Response data
 * @param message - Success message
 * @param metadata - Additional metadata to include
 * @returns Success response with metadata
 * 
 * @example
 * return res.json(successWithMeta(result, 'Processed', { duration: '142ms' }));
 */
export const successWithMeta = <T = any>(
  data?: T,
  message = 'Request successful',
  metadata?: Record<string, any>
) => {
  return {
    success: true,
    ...(data && { data }),
    message,
    ...(metadata && { metadata }),
  };
};
