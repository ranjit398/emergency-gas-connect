
import mongoose, { Schema, Document } from 'mongoose';
import { UserRole, GeoLocation } from '@types';

export interface IProfile extends Document {
  userId: mongoose.Types.ObjectId;
  fullName: string;
  phone: string;
  role: UserRole;
  avatarUrl: string | null;
  location: GeoLocation | null;
  address: string;
  bio: string | null;
  isAvailable: boolean;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  ratings: number;
  totalRatings: number;
  completedRequests: number;
  // ── NEW: Performance metrics for matching ────────────────
  avgResponseTimeMin: number; // average minutes to accept a request
  // ────────────────────────────────────────────────────────
  createdAt: Date;
  updatedAt: Date;
}

const profileSchema = new Schema<IProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      match: [/^[0-9]{10,}$/, 'Valid phone number is required'],
    },
    role: {
      type: String,
      enum: ['seeker', 'helper', 'provider'],
      default: 'seeker',
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
      },
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    bio: {
      type: String,
      default: null,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    ratings: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalRatings: {
      type: Number,
      default: 0,
    },
    completedRequests: {
      type: Number,
      default: 0,
    },

    // ── Performance metric (used in matching algorithm) ─────
    avgResponseTimeMin: {
      type: Number,
      default: 15, // Default 15 minutes until real data accumulates
      min: 0,
    },
    // ───────────────────────────────────────────────────────
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
profileSchema.index({ location: '2dsphere' }, { sparse: true }); // sparse = skip null locations
profileSchema.index({ role: 1, isAvailable: 1 });
profileSchema.index({ verificationStatus: 1 });
profileSchema.index({ role: 1, isAvailable: 1, ratings: -1 });
profileSchema.index({ avgResponseTimeMin: 1 });

// ── Instance method: update avgResponseTimeMin after accepting a request ──────
profileSchema.methods.recordResponseTime = async function (
  minutesTaken: number
): Promise<void> {
  // Rolling average: weight existing average more once there's data
  const n = this.completedRequests || 1;
  this.avgResponseTimeMin =
    Math.round(
      ((this.avgResponseTimeMin * Math.min(n, 20) + minutesTaken) /
        (Math.min(n, 20) + 1)) *
        10
    ) / 10;
  await this.save({ validateBeforeSave: false });
};

export default mongoose.model<IProfile>('Profile', profileSchema, 'profiles');