
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
  photo?: string; // Base64
  signature?: string; // Base64
  coordinates?: {
    lat: number;
    lng: number;
  };
  deliveredAt?: string;
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
  createdAt: string;
  source: 'IA' | 'Manual';
  deliveryData?: DeliveryData;
}

export type View = 'DASHBOARD' | 'PENDING' | 'COMPLETED' | 'DISPATCHED' | 'NEW_ORDER_MANUAL' | 'ALL' | 'TRACKING' | 'MAP' | 'DELIVERY_FLOW' | 'CARRIERS' | 'MAINTENANCE';
