export interface Product {
  serialNumber: string;
  name: string;
  manufacturer: string;
}

export interface PackagingAnalysisResult {
  isAuthentic: boolean;
  confidence: number;
  reason: string;
}

export interface ScannedProductData extends Partial<Product> {
  serialNumber: string; // serialNumber is mandatory from scan
}
