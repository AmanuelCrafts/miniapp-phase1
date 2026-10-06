import mongoose, { Schema, model, type HydratedDocument, type InferSchemaType, type Model } from 'mongoose';

import { USER_STATUSES } from '../types/domain.js';

/**
 * `mongoose.models` has to be read off the default export.
 *
 * Mongoose is CommonJS and assigns `models` at runtime, so Node's static
 * named-export detection cannot see it. Importing it as a named binding
 * (`import { models } from 'mongoose'`) throws "does not provide an export
 * named 'models'" under native ESM - it only appears to work under a bundler
 * that shims CJS interop, which is exactly the kind of bug that breaks
 * `npm run dev` and `npm start` while unit tests keep passing.
 */
const { models } = mongoose;

/**
 * A Mini App user. The Telegram identity (`telegramId`) is the single source of
 * truth for who the person is - it is the only field derived from cryptographically
 * verified Telegram data.
 *
 * Phase 1 intentionally contains no financial fields (balance, deposits,
 * rewards, wallet, transactions, streak, tasks, referrals). Those belong to
 * later phases and must be added with their own validation and migrations.
 */
const userSchema = new Schema(
  {
    // `unique: true` is declared on the field so Mongoose emits the index
    // `telegramId_1` with `unique: true`. Declaring a second, separately named
    // index for the same key would make MongoDB reject the model with
    // "Index already exists with a different name".
    telegramId: {
      type: String,
      required: [true, 'telegramId is required'],
      unique: true,
      trim: true,
    },
    username: {
      type: String,
      trim: true,
      default: null,
    },
    firstName: {
      type: String,
      required: [true, 'firstName is required'],
      trim: true,
      maxlength: 128,
    },
    lastName: {
      type: String,
      trim: true,
      default: null,
      maxlength: 128,
    },
    avatarUrl: {
      type: String,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: USER_STATUSES,
      default: 'ACTIVE',
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    minimize: false,
    collection: 'users',
  },
);

// Supports future admin listings ("newest users") without a collection scan.
userSchema.index({ createdAt: -1 }, { name: 'createdAt_desc' });

export type UserShape = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<UserShape>;

export const UserModel: Model<UserShape> =
  (models.User as Model<UserShape> | undefined) ?? model<UserShape>('User', userSchema);
