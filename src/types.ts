export interface Table {
  id: string;
  name: string;
  status: 'empty' | 'occupied';
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
}

export interface Order {
  tableId: string;
  items: Record<string, number>; // menu_item_id -> quantity
  total: number;
}

export interface ReportItem {
  id: string;
  tableId: string;
  tableName: string;
  total: number;
  items: Record<string, number>;
  timestamp: number;
  date: string;
}

export type TabType = 'dashboard' | 'tables' | 'report';
