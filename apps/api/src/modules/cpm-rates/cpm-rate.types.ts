export type UpsertCpmRateInput = {
  countryCode: string;
  cpm: number;
  currency: string;
  isActive?: boolean;
  notes?: string;
};
