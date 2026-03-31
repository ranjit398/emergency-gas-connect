import { Request, Response } from 'express';
import { body } from 'express-validator';
import profileService from './services/ProfileService';
import { asyncHandler } from './middleware/index';
import { success, paginated } from './utils/response';

export class ProfileController {
  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const profile = await profileService.getProfile(req.userId!);
    res.json(success(profile));
  });

  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const profile = await profileService.updateProfile(req.userId!, req.body);
    res.json(success(profile, 'Profile updated'));
  });

  updateLocation = asyncHandler(async (req: Request, res: Response) => {
    const { latitude, longitude, address } = req.body;
    const profile = await profileService.updateLocation(
      req.userId!,
      latitude,
      longitude,
      address
    );
    res.json(success(profile, 'Location updated'));
  });

  setAvailability = asyncHandler(async (req: Request, res: Response) => {
    const { isAvailable } = req.body;
    const profile = await profileService.setAvailability(req.userId!, isAvailable);
    res.json(success(profile, 'Availability updated'));
  });

  getNearbyHelpers = asyncHandler(async (req: Request, res: Response) => {
    const { latitude, longitude, maxDistance } = req.query;
    const helpers = await profileService.getVerifiedHelpers(
      parseFloat(latitude as string),
      parseFloat(longitude as string),
      maxDistance ? parseInt(maxDistance as string) : 5
    );
    res.json(success(helpers));
  });

  searchProfiles = asyncHandler(async (req: Request, res: Response) => {
    const { query, role } = req.query;
    const profiles = await profileService.searchProfiles(
      query as string,
      role as string | undefined
    );
    res.json(success(profiles));
  });
}

export const updateProfileValidation = [
  body('fullName').optional().trim().notEmpty(),
  body('phone').optional().matches(/^[0-9]{10,}$/),
  body('bio').optional().isLength({ max: 500 }),
  body('avatarUrl').optional().isURL(),
];

export const updateLocationValidation = [
  body('latitude').isFloat({ min: -90, max: 90 }),
  body('longitude').isFloat({ min: -180, max: 180 }),
  body('address').trim().notEmpty(),
];

export const setAvailabilityValidation = [
  body('isAvailable').isBoolean(),
];

export default new ProfileController();
