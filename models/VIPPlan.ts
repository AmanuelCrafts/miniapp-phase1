import mongoose, { Schema, model, type Model, type Types } from 'mongoose';

export interface IVIPPlan {
  _id: Types.ObjectId;
  level: number;
  name: string;
  depositAmount: number;
  dailyIncome: number;
  dailyTasksRequired: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const vipPlanSchema = new Schema<IVIPPlan>(
  {
    level: {
      type: Number,
      required: true,
      unique: true,
      index: true,
      min: 1,
      max: 8,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    depositAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    dailyIncome: {
      type: Number,
      required: true,
      min: 0,
    },
    dailyTasksRequired: {
      type: Number,
      required: true,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'vip_plans',
  },
);

export const VIPPlanModel: Model<IVIPPlan> =
  (mongoose.models.VIPPlan as Model<IVIPPlan>) ?? model<IVIPPlan>('VIPPlan', vipPlanSchema);
