import mongoose, { Schema, Document } from 'mongoose';
import { BusinessType, GeoLocation } from '@types';

export interface IProvider extends Document {
  userId: mongoose.Types.ObjectId;
  businessName: string;
  businessType: BusinessType;
  location: GeoLocation;
  address: string;
  contactNumber: string;
  registrationNumber: string;
  licenseNumber: string;
  licenseExpiry: Date;
  isVerified: boolean;
  verificationDocument: string | null;
  operatingHours: {
    open: string;
    close: string;
  };
  availableCylinders: {
    type: CylinderType;
    quantity: number;
  }[];
  rating: number;
  totalRatings: number;
  completedRequests: number;
  bankDetails: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    ifsc: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

import { CylinderType } from '@types';

const providerSchema = new Schema<IProvider>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    businessName: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
    },
    businessType: {
      type: String,
      enum: ['LPG', 'CNG', 'Both'],
      required: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: [true, 'Location is required'],
      },
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    contactNumber: {
      type: String,
      required: true,
      match: [/^[0-9]{10,}$/, 'Valid phone number is required'],
    },
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
    },
    licenseNumber: {
      type: String,
      required: true,
      unique: true,
    },
    licenseExpiry: {
      type: Date,
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationDocument: {
      type: String,
      default: null,
    },
    operatingHours: {
      open: {
        type: String,
        default: '08:00',
      },
      close: {
        type: String,
        default: '20:00',
      },
    },
    availableCylinders: [
      {
        type: {
          type: String,
          enum: ['LPG', 'CNG'],
        },
        quantity: {
          type: Number,
          min: 0,
        },
      },
    ],
    rating: {
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
    bankDetails: {
      accountName: String,
      accountNumber: String,
      bankName: String,
      ifsc: String,
    },
  },
  { timestamps: true }
);

// Create indexes
providerSchema.index({ location: '2dsphere' });
providerSchema.index({ isVerified: 1 });
providerSchema.index({ businessType: 1 });
providerSchema.index({ rating: -1 });

export default mongoose.model<IProvider>('Provider', providerSchema, 'providers');
