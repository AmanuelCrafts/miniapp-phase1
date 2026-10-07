import {
  Schema,
  model,
  models,
  type Document,
  type Model,
} from "mongoose";

export interface VIPPlanDocument extends Document {
  level: number;
  name: string;
  depositAmount: number;
  dailyIncome: number;
  dailyTasksRequired: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VIPPlanSchema = new Schema<VIPPlanDocument>(
  {
    level: {
      type: Number,
      required: true,
      unique: true,
      index: true,
      min: 1,
      max: 8,
    },
    name: { type: String, required: true, maxlength: 32 },
    depositAmount: { type: Number, required: true, min: 0 },
    dailyIncome: { type: Number, required: true, min: 0 },
    dailyTasksRequired: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true, required: true },
  },
  { timestamps: true, collection: "vip_plans" },
);

export const VIPPlan: Model<VIPPlanDocument> =
  models.VIPPlan ?? model<VIPPlanDocument>("VIPPlan", VIPPlanSchema);

export default VIPPlan;
