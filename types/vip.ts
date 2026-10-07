/** Public shape of a VIP plan as exposed to clients. */
export interface VipPlanDto {
  level: number;
  name: string;
  depositAmount: number;
  dailyIncome: number;
  dailyTasksRequired: number;
}

export interface VipPlansResponse {
  plans: VipPlanDto[];
}

export interface CurrentVipResponse {
  hasVip: boolean;
  vip: VipPlanDto | null;
}
