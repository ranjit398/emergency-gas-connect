import mongoose from 'mongoose';

/**
 * Validate MongoDB ObjectId
 */
export const validateMongoId = (id: string): boolean => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Convert string to MongoDB ObjectId
 */
export const toObjectId = (id: string): mongoose.Types.ObjectId => {
  return new mongoose.Types.ObjectId(id);
};

/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number
 */
export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[0-9]{10,}$/;
  return phoneRegex.test(phone);
};

/**
 * Validate coordinates
 */
export const validateCoordinates = (
  latitude: number,
  longitude: number
): boolean => {
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
};

/**
 * Validate rating value
 */
export const validateRating = (rating: number): boolean => {
  return rating >= 1 && rating <= 5 && Number.isInteger(rating);
};
