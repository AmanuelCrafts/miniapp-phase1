import { connectDB } from '@/lib/mongodb';
import { VIPPlanModel } from '@/models/VIPPlan';

const VIP_PLANS = [
  { level: 1, name: 'VIP 1', depositAmount: 100, dailyIncome: 3, dailyTasksRequired: 2 },
  { level: 2, name: 'VIP 2', depositAmount: 250, dailyIncome: 7.5, dailyTasksRequired: 4 },
  { level: 3, name: 'VIP 3', depositAmount: 500, dailyIncome: 15, dailyTasksRequired: 6 },
  { level: 4, name: 'VIP 4', depositAmount: 1000, dailyIncome: 30, dailyTasksRequired: 8 },
  { level: 5, name: 'VIP 5', depositAmount: 2500, dailyIncome: 75, dailyTasksRequired: 10 },
  { level: 6, name: 'VIP 6', depositAmount: 5000, dailyIncome: 150, dailyTasksRequired: 12 },
  { level: 7, name: 'VIP 7', depositAmount: 10000, dailyIncome: 300, dailyTasksRequired: 14 },
  { level: 8, name: 'VIP 8', depositAmount: 20000, dailyIncome: 600, dailyTasksRequired: 16 },
];

async function seedVipPlans() {
  await connectDB();

  for (const plan of VIP_PLANS) {
    await VIPPlanModel.findOneAndUpdate(
      { level: plan.level },
      { $set: { ...plan, isActive: true } },
      { upsert: true, new: true },
    );
  }

  const count = await VIPPlanModel.countDocuments();
  console.log(`VIP plans seeded. Total: ${count}`);
  process.exit(0);
}

seedVipPlans().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
