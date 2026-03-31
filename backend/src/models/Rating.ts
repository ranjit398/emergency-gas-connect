import mongoose, { Schema, Document } from 'mongoose';

export interface IRating extends Document {
  requestId: mongoose.Types.ObjectId;
  fromUserId: mongoose.Types.ObjectId;
  toUserId: mongoose.Types.ObjectId;
  providerId: mongoose.Types.ObjectId | null;
  rating: number;
  review: string;
  createdAt: Date;
  updatedAt: Date;
}

const ratingSchema = new Schema<IRating>(
  {
    requestId: {
      type: Schema.Types.ObjectId,
      ref: 'EmergencyRequest',
      required: true,
    },
    fromUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    toUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    providerId: {
      type: Schema.Types.ObjectId,
      ref: 'Provider',
      default: null,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    review: {
      type: String,
      maxlength: [1000, 'Review cannot exceed 1000 characters'],
      trim: true,
    },
  },
  { timestamps: true }
);

// Compound index to prevent duplicate ratings
ratingSchema.index({ requestId: 1, fromUserId: 1 }, { unique: true });
ratingSchema.index({ toUserId: 1, createdAt: -1 });
ratingSchema.index({ providerId: 1 });

export default mongoose.model<IRating>('Rating', ratingSchema, 'ratings');
