import {
  Schema,
  model,
  models,
  type Document,
  type Model,
  type Types,
} from "mongoose";

export type UserStatus = "ACTIVE" | "SUSPENDED";

export interface UserDocument extends Document<Types.ObjectId> {
  telegramId: number;
  username: string | null;
  firstName: string;
  lastName: string | null;
  avatarUrl: string | null;
  status: UserStatus;
  /** ObjectId of the user's active VIP plan. NEW USERS HAVE NONE. */
  currentVipPlan: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserDocument>(
  {
    telegramId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    username: { type: String, default: null, maxlength: 32 },
    firstName: { type: String, required: true, maxlength: 64 },
    lastName: { type: String, default: null, maxlength: 64 },
    avatarUrl: { type: String, default: null, maxlength: 512 },
    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED"],
      default: "ACTIVE",
      required: true,
    },
    currentVipPlan: {
      type: Schema.Types.ObjectId,
      ref: "VIPPlan",
      default: null,
    },
  },
  { timestamps: true, collection: "users" },
);

export const User: Model<UserDocument> =
  models.User ?? model<UserDocument>("User", UserSchema);

export default User;
