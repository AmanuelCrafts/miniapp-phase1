import mongoose, { Schema, model, type Model, type Types } from 'mongoose';

export type UserStatus = 'ACTIVE' | 'SUSPENDED';

export interface IUser {
  _id: Types.ObjectId;
  telegramId: string;
  username?: string;
  firstName: string;
  lastName?: string;
  avatarUrl?: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    telegramId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    username: {
      type: String,
      trim: true,
      default: null,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 128,
    },
    lastName: {
      type: String,
      trim: true,
      default: null,
    },
    avatarUrl: {
      type: String,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED'],
      default: 'ACTIVE',
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'users',
  },
);

export const UserModel: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ?? model<IUser>('User', userSchema);
