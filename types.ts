
export enum OrderStatus {
  PENDING = 'PENDIENTE',
  COMPLETED = 'PREPARADO',
  DISPATCHED = 'DESPACHADO',
  ARCHIVED = 'FINALIZADO'
}

export interface PackagingEntry {
  id: string;
  deposit: string;
  type: string;
  quantity: number;
}

export interface DeliveryData {
  deliveredAt?: string;
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerNumber: string; 
  customerName: string;
  locality: string;
  status: OrderStatus;
  detailedPackaging?: PackagingEntry[];
  reviewer?: string;
  notes: string;
  carrier?: string; 
  warehouse?: string;
  packageType?: string;
  packageQuantity?: number;
  dispatchType?: string;
  dispatchValue?: string;
  createdAt: string;
  source: 'IA' | 'Manual';
  deliveryData?: DeliveryData;
}

export type View = 'DASHBOARD' | 'PENDING' | 'COMPLETED' | 'DISPATCHED' | 'ALL' | 'MAINTENANCE';
