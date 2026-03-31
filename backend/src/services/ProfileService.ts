import Profile, { IProfile } from '@models/Profile';
import User from '@models/User';
import { ValidationError, NotFoundError } from '@middleware/errorHandler';

export class ProfileService {
  async getProfile(userId: string): Promise<IProfile> {
    const profile = await Profile.findOne({ userId }).populate('userId', 'email role');
    if (!profile) {
      throw new NotFoundError('Profile not found');
    }
    return profile;
  }

  async updateProfile(
    userId: string,
    updates: Partial<IProfile>
  ): Promise<IProfile> {
    const profile = await Profile.findOneAndUpdate({ userId }, updates, {
      new: true,
      runValidators: true,
    });

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    return profile;
  }

  async updateLocation(
    userId: string,
    latitude: number,
    longitude: number,
    address: string
  ): Promise<IProfile> {
    const profile = await Profile.findOneAndUpdate(
      { userId },
      {
        location: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        address,
      },
      { new: true }
    );

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    return profile;
  }

  async setAvailability(userId: string, isAvailable: boolean): Promise<IProfile> {
    const profile = await Profile.findOneAndUpdate(
      { userId },
      { isAvailable },
      { new: true }
    );

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    return profile;
  }

  async getVerifiedHelpers(
    latitude: number,
    longitude: number,
    maxDistance = 5 // km
  ): Promise<IProfile[]> {
    return Profile.find({
      role: 'helper',
      isAvailable: true,
      verificationStatus: 'verified',
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: maxDistance * 1000, // Convert to meters
        },
      },
    }).limit(10);
  }

  async searchProfiles(
    query: string,
    role?: string
  ): Promise<IProfile[]> {
    const filter: any = {
      $or: [
        { fullName: { $regex: query, $options: 'i' } },
        { phone: { $regex: query, $options: 'i' } },
        { address: { $regex: query, $options: 'i' } },
      ],
    };

    if (role) {
      filter.role = role;
    }

    return Profile.find(filter).limit(20);
  }

  async incrementCompletedRequests(userId: string): Promise<IProfile | null> {
    return Profile.findOneAndUpdate(
      { userId },
      { $inc: { completedRequests: 1 } },
      { new: true }
    );
  }

  async addRating(
    userId: string,
    rating: number
  ): Promise<IProfile | null> {
    const profile = await Profile.findOne({ userId });
    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    const newTotalRatings = profile.totalRatings + 1;
    const newAverageRating =
      (profile.ratings * profile.totalRatings + rating) / newTotalRatings;

    return Profile.findOneAndUpdate(
      { userId },
      {
        ratings: parseFloat(newAverageRating.toFixed(2)),
        totalRatings: newTotalRatings,
      },
      { new: true }
    );
  }
}

export default new ProfileService();
