import Provider, { IProvider } from '@models/Provider';
import { ValidationError, NotFoundError } from '@middleware/errorHandler';

export class ProviderService {
  async createProvider(userId: string, data: {
    businessName: string; businessType: 'LPG' | 'CNG' | 'Both';
    contactNumber: string; registrationNumber: string;
    licenseNumber: string; licenseExpiry: Date;
    latitude: number; longitude: number; address: string;
  }): Promise<IProvider> {
    const existing = await Provider.findOne({ userId });
    if (existing) throw new ValidationError('Provider account already exists');

    return Provider.create({
      userId,
      businessName: data.businessName,
      businessType: data.businessType,
      contactNumber: data.contactNumber,
      registrationNumber: data.registrationNumber,
      licenseNumber: data.licenseNumber,
      licenseExpiry: data.licenseExpiry,
      location: { type: 'Point', coordinates: [data.longitude, data.latitude] },
      address: data.address,
    });
  }

  async getProvider(providerId: string): Promise<IProvider> {
    const provider = await Provider.findById(providerId).populate('userId', 'email');
    if (!provider) throw new NotFoundError('Provider not found');
    return provider;
  }

  async getProviderByUserId(userId: string): Promise<IProvider> {
    const provider = await Provider.findOne({ userId });
    if (!provider) throw new NotFoundError('Provider not found');
    return provider;
  }

  async updateProvider(providerId: string, updates: Partial<IProvider>): Promise<IProvider> {
    const provider = await Provider.findByIdAndUpdate(providerId, updates, { new: true, runValidators: true });
    if (!provider) throw new NotFoundError('Provider not found');
    return provider;
  }

  async getNearbyProviders(
    latitude: number, longitude: number,
    maxDistance = 10, businessType?: string
  ): Promise<IProvider[]> {
    const filter: any = {
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [longitude, latitude] },
          $maxDistance: maxDistance * 1000,
        },
      },
    };

    if (businessType && businessType !== 'Both') {
      filter.businessType = { $in: [businessType, 'Both'] };
    }

    return Provider.find(filter).limit(20);
  }

  async searchProviders(query: string, businessType?: string): Promise<IProvider[]> {
    const filter: any = {
      $or: [
        { businessName: { $regex: query, $options: 'i' } },
        { address: { $regex: query, $options: 'i' } },
        { contactNumber: { $regex: query, $options: 'i' } },
      ],
    };

    if (businessType && businessType !== 'Both') {
      filter.businessType = { $in: [businessType, 'Both'] };
    }

    return Provider.find(filter).limit(20);
  }

  async getTopProviders(limit = 10): Promise<IProvider[]> {
    return Provider.find({})
      .sort({ rating: -1, completedRequests: -1 })
      .limit(limit);
  }

  async verifyProvider(providerId: string): Promise<IProvider> {
    const provider = await Provider.findByIdAndUpdate(
      providerId, { isVerified: true }, { new: true }
    );
    if (!provider) throw new NotFoundError('Provider not found');
    return provider;
  }

  async addRating(providerId: string, rating: number): Promise<IProvider | null> {
    const provider = await Provider.findById(providerId);
    if (!provider) throw new NotFoundError('Provider not found');

    const newTotal = provider.totalRatings + 1;
    const newAvg = (provider.rating * provider.totalRatings + rating) / newTotal;

    return Provider.findByIdAndUpdate(
      providerId,
      { rating: parseFloat(newAvg.toFixed(2)), totalRatings: newTotal },
      { new: true }
    );
  }

  async incrementCompletedRequests(providerId: string): Promise<IProvider | null> {
    return Provider.findByIdAndUpdate(
      providerId, { $inc: { completedRequests: 1 } }, { new: true }
    );
  }
}

export default new ProviderService();