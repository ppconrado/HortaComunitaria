export type IrrigationMode = 'manual' | 'automatic';

export type Telemetry = {
  soilMoisture: number;
  temperature: number;
  humidity: number;
  timestamp: string;
  irrigationOn?: boolean;
  mode?: IrrigationMode;
};

export type IrrigationState = {
  active: boolean;
  mode: IrrigationMode;
  updatedAt: string;
};

export type HortaStatus = Telemetry & {
  irrigation: IrrigationState;
};

export type Harvest = {
  id: string;
  crop: string;
  harvestDate: string;
  quantity: number;
  available: boolean;
  reservedBy?: string;
  reservedAt?: string;
};