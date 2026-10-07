import mongoose, { Schema, model, type Model, type Types } from 'mongoose';

export interface ISession {
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'sessions',
  },
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'expiresAt_ttl' });

export const SessionModel: Model<ISession> =
  (mongoose.models.Session as Model<ISession>) ?? model<ISession>('Session', sessionSchema);
