
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

export interface Order {
  id: string;
  orderNumber: string;
  customerNumber: string; 
  customerName: string;
  locality: string;
  status: OrderStatus;
  detailedPackaging?: PackagingEntry[];
  reviewer?: string;
  notes: string; // Instrucciones de despacho y logística únicamente
  carrier?: string; 
  createdAt: string;
  source: 'IA' | 'Manual';
}

export type View = 'DASHBOARD' | 'PENDING' | 'COMPLETED' | 'DISPATCHED' | 'NEW_ORDER_MANUAL' | 'ALL' | 'TRACKING';
