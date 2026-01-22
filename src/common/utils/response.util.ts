/**
 * Format a successful API response
 * 
 * @param data - Response data
 * @param message - Optional success message
 * @returns Formatted response object
 */
export function formatSuccessResponse<T>(
  data: T,
  message?: string,
): {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
} {
  return {
    success: true,
    data,
    ...(message && { message }),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a standardized response format
 * 
 * @param success - Whether the operation was successful
 * @param message - Response message
 * @param data - Response data
 * @returns Formatted response
 */
export function createResponse<T>(
  success: boolean,
  message: string,
  data?: T,
): {
  status: boolean;
  message: string;
  data?: T;
} {
  return {
    status: success,
    message,
    ...(data && { data }),
  };
}

/**
 * Format an error response
 * 
 * @param errorCode - Error code
 * @param message - Error message
 * @param statusCode - HTTP status code
 * @returns Formatted error response
 */
export function formatErrorResponse(
  errorCode: string,
  message: string,
  statusCode: number,
): {
  success: boolean;
  errorCode: string;
  message: string;
  statusCode: number;
  timestamp: string;
} {
  return {
    success: false,
    errorCode,
    message,
    statusCode,
    timestamp: new Date().toISOString(),
  };
}
