import { Request, Response } from 'express';
import { body } from 'express-validator';
import providerService from '@services/ProviderService';
import { asyncHandler } from '@middleware/index';
import { success } from '@utils/response';

export class ProviderController {
  createProvider = asyncHandler(async (req: Request, res: Response) => {
    const {
      businessName,
      businessType,
      contactNumber,
      registrationNumber,
      licenseNumber,
      licenseExpiry,
      latitude,
      longitude,
      address,
    } = req.body;

    const provider = await providerService.createProvider(req.userId!, {
      businessName,
      businessType,
      contactNumber,
      registrationNumber,
      licenseNumber,
      licenseExpiry: new Date(licenseExpiry),
      latitude,
      longitude,
      address,
    });

    res.status(201).json(success(provider, 'Provider account created'));
  });

  getProvider = asyncHandler(async (req: Request, res: Response) => {
    const provider = await providerService.getProvider(req.params.id);
    res.json(success(provider));
  });

  getMyProvider = asyncHandler(async (req: Request, res: Response) => {
    const provider = await providerService.getProviderByUserId(req.userId!);
    res.json(success(provider));
  });

  updateProvider = asyncHandler(async (req: Request, res: Response) => {
    const provider = await providerService.getProviderByUserId(req.userId!);
    const updated = await providerService.updateProvider(provider.id, req.body);
    res.json(success(updated, 'Provider updated'));
  });

  getNearbyProviders = asyncHandler(async (req: Request, res: Response) => {
    const { latitude, longitude, maxDistance, businessType } = req.query;
    const providers = await providerService.getNearbyProviders(
      parseFloat(latitude as string),
      parseFloat(longitude as string),
      maxDistance ? parseInt(maxDistance as string) : 10,
      businessType as string | undefined
    );
    res.json(success(providers));
  });

  searchProviders = asyncHandler(async (req: Request, res: Response) => {
    const { query, businessType } = req.query;
    const providers = await providerService.searchProviders(
      query as string,
      businessType as string | undefined
    );
    res.json(success(providers));
  });

  getTopProviders = asyncHandler(async (req: Request, res: Response) => {
    const { limit = 10 } = req.query;
    const providers = await providerService.getTopProviders(
      parseInt(limit as string)
    );
    res.json(success(providers));
  });
}

export const createProviderValidation = [
  body('businessName').trim().notEmpty(),
  body('businessType').isIn(['LPG', 'CNG', 'Both']),
  body('contactNumber').matches(/^[0-9]{10,}$/),
  body('registrationNumber').trim().notEmpty(),
  body('licenseNumber').trim().notEmpty(),
  body('licenseExpiry').isISO8601(),
  body('latitude').isFloat({ min: -90, max: 90 }),
  body('longitude').isFloat({ min: -180, max: 180 }),
  body('address').trim().notEmpty(),
];

export const updateProviderValidation = [
  body('businessName').optional().trim().notEmpty(),
  body('businessType').optional().isIn(['LPG', 'CNG', 'Both']),
  body('contactNumber').optional().matches(/^[0-9]{10,}$/),
  body('address').optional().trim().notEmpty(),
];

export default new ProviderController();
