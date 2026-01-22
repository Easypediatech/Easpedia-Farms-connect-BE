export class SettingsResponseDto {
  cassavaPricePerKg: number; // in kobo
  cassavaPricePerTon: number; // in kobo
  lastUpdated: Date;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}