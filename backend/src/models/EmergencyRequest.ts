
import mongoose, { Schema, Document } from 'mongoose';
import { RequestStatus, CylinderType, GeoLocation } from '@types';

export interface IEmergencyRequest extends Document {
  seekerId: mongoose.Types.ObjectId;
  helperId: mongoose.Types.ObjectId | null;
  providerId: mongoose.Types.ObjectId | null;
  cylinderType: CylinderType;
  quantity: number;
  status: RequestStatus;
  message: string | null;
  location: GeoLocation;
  address: string;
  estimatedDistance: number | null;
  rating: number | null;
  review: string | null;
  assignedAt: Date | null;
  acceptedAt?: Date | null;
  inProgressAt?: Date | null;
  completedAt: Date | null;
  expiredAt?: Date | null;
  reassignmentCount?: number;
  // ── NEW FIELDS ──────────────────────────────────────────
  priorityScore: number;
  priorityLevel: 'critical' | 'high' | 'medium' | 'low';
  helperRating?: number | null;
  helperResponseTime?: number | null; // in seconds
  // ────────────────────────────────────────────────────────
  createdAt: Date;
  updatedAt: Date;
}

const emergencyRequestSchema = new Schema<IEmergencyRequest>(
  {
    seekerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    helperId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    providerId: {
      type: Schema.Types.ObjectId,
      ref: 'Provider',
      default: null,
    },
    cylinderType: {
      type: String,
      enum: ['LPG', 'CNG'],
      required: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'rejected', 'expired'],
      default: 'pending',
      index: true,
    },
    message: {
      type: String,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
      default: null,
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
    estimatedDistance: {
      type: Number,
      default: null,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    review: {
      type: String,
      maxlength: [1000, 'Review cannot exceed 1000 characters'],
      default: null,
    },
    assignedAt: {
      type: Date,
      default: null,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    inProgressAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    expiredAt: {
      type: Date,
      default: null,
    },
    reassignmentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    helperRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    helperResponseTime: {
      type: Number,
      default: null, // in seconds
    },

    // ── Priority fields ─────────────────────────────────────
    priorityScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      index: true, // Index for fast priority-sorted queries
    },
    priorityLevel: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'low',
      index: true,
    },
    // ───────────────────────────────────────────────────────
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
emergencyRequestSchema.index({ location: '2dsphere' });
emergencyRequestSchema.index({ seekerId: 1, createdAt: -1 });
emergencyRequestSchema.index({ helperId: 1 });
emergencyRequestSchema.index({ providerId: 1 });
emergencyRequestSchema.index({ status: 1, createdAt: -1 });
emergencyRequestSchema.index({ status: 1, priorityScore: -1 });
emergencyRequestSchema.index({ priorityLevel: 1, status: 1 });
emergencyRequestSchema.index({ expiredAt: 1 });
emergencyRequestSchema.index({ acceptedAt: 1 });
emergencyRequestSchema.index({ helperId: 1, status: 1 });

export default mongoose.model<IEmergencyRequest>(
  'EmergencyRequest',
  emergencyRequestSchema,
  'emergency_requests'
);