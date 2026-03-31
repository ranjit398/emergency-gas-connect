/**
 * Centralized validation utilities and schemas
 * Ensures consistent validation rules across all endpoints
 */

import { body, query, param } from 'express-validator';

/**
 * Emergency Request creation validation rules
 * - Validates gas cylinder type, quantity, location, and address
 */
export const validateCreateRequest = () => [
  body('cylinderType')
    .isIn(['LPG', 'CNG'])
    .withMessage('Invalid cylinder type. Must be LPG or CNG'),

  body('quantity')
    .isInt({ min: 1, max: 100 })
    .withMessage('Quantity must be between 1 and 100'),

  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude. Must be between -90 and 90'),

  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude. Must be between -180 and 180'),

  body('address')
    .trim()
    .notEmpty()
    .withMessage('Address is required')
    .isLength({ min: 5, max: 500 })
    .withMessage('Address must be between 5 and 500 characters'),

  body('message')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Message must not exceed 1000 characters'),
];

/**
 * Complete request validation rules
 * - Validates rating and optional review
 */
export const validateCompleteRequest = () => [
  body('rating')
    .optional()
    .isFloat({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),

  body('review')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Review must be between 10 and 500 characters'),
];

/**
 * Pagination query validation
 * - Validates page and limit parameters
 */
export const validatePagination = () => [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

/**
 * Location-based search validation
 * - Validates coordinates and maxDistance for geospatial queries
 */
export const validateLocationSearch = () => [
  query('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude'),

  query('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude'),

  query('maxDistance')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Max distance must be between 1 and 100 km'),
];

/**
 * ID parameter validation
 * - Validates MongoDB ObjectId format
 */
export const validateMongoId = (paramName = 'id') => [
  param(paramName)
    .matches(/^[0-9a-fA-F]{24}$/)
    .withMessage(`Invalid ${paramName} format`),
];

/**
 * User profile update validation
 */
export const validateProfileUpdate = () => [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),

  body('phone')
    .optional()
    .matches(/^[0-9\-\+\(\)]{7,15}$/)
    .withMessage('Invalid phone number format'),

  body('profilePicture')
    .optional()
    .isURL()
    .withMessage('Invalid profile picture URL'),

  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must not exceed 500 characters'),
];

/**
 * Authentication validation
 */
export const validateEmail = () => [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address'),
];

export const validatePassword = () => [
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*]/)
    .withMessage('Password must contain at least one special character'),
];

export const validateSignup = () => [
  ...validateEmail(),
  ...validatePassword(),
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  body('role')
    .isIn(['seeker', 'helper', 'provider', 'admin'])
    .withMessage('Invalid role'),
  body('phone')
    .optional()
    .matches(/^[0-9\-\+\(\)]{7,15}$/)
    .withMessage('Invalid phone number format'),
];

/**
 * Message validation
 */
export const validateSendMessage = () => [
  body('recipientId')
    .matches(/^[0-9a-fA-F]{24}$/)
    .withMessage('Invalid recipient ID'),
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message cannot be empty')
    .isLength({ max: 5000 })
    .withMessage('Message must not exceed 5000 characters'),
];

/**
 * Provider information validation
 */
export const validateProviderInfo = () => [
  body('companyName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Company name must be between 2 and 100 characters'),
  body('licenseNumber')
    .optional()
    .trim()
    .isLength({ min: 5, max: 50 })
    .withMessage('License number must be between 5 and 50 characters'),
  body('serviceArea')
    .optional()
    .isArray()
    .withMessage('Service area must be an array'),
];
