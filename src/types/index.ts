
export interface PointOfView {
  lat?: number;
  lng?: number;
  altitude?: number;
}

export interface LocationCoordinates {
  lat: number;
  lng: number;
  altitude?: number;
}

export interface PrehistoricMapOption {
  name: string;
  url: string;
  attribution: string;
  ageMa: number;
  slug: string;
}