import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, ClipboardList, CheckCircle2, Truck, Search, 
  ChevronRight, Menu, X, ArrowLeft, Loader2, 
  History, Trash2, PlusSquare, MapPin, 
  Plus, Check, LogOut, MessageCircle, 
  Activity, Layers, Package, Lock, AlertTriangle, RefreshCcw,
  Database, ServerCrash, Copy, Terminal, Info, ShieldAlert, Wifi, WifiOff, Settings, ExternalLink, HelpCircle, AlertCircle, Sparkles, Send, UserCircle2, UserPlus2
} from 'lucide-react';
import { Order, OrderStatus, View, PackagingEntry } from './types';
import { supabase, connectionStatus } from './supabaseClient';
import { analyzeOrderText } from './geminiService';

export default function App() {
  const [isCustomerMode, setIsCustomerMode] = useState(false);
  const [view, setView] = useState<View>('DASHBOARD');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [dbError, setDbError] = useState<{message: string, code?: string} | null>(null);
  
  const [currentUser, setCurrentUser] = useState<{ name: string } | null>(() => {
    try {
      const saved = localStorage.getItem('dg_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [orders, setOrders] = useState<Order[]>([]);

  const fetchOrders = async () => {
    if (!connectionStatus.isConfigured) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setDbError(null);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      const mappedData = (data || []).map((o: any) => ({
        id: o.id,
        orderNumber: o.order_number,
        customerNumber: o.customer_number,
        customerName: o.customer_name,
        locality: o.locality,
        status: o.status as OrderStatus,
        notes: o.notes,
        reviewer: o.reviewer,
        source: o.source,
        carrier: o.carrier,
        detailedPackaging: o.detailed_packaging || [],
        createdAt: o.created_at
      }));

      setOrders(mappedData);
      
      if (selectedOrder) {
        const updated = mappedData.find(o => o.id === selectedOrder.id);
        if (updated) setSelectedOrder(updated);
      }
    } catch (error: any) {
      console.error("Fetch Error:", error);
      setDbError({ message: error.message, code: error.code });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchOrders();
      const channels = supabase.channel('orders-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
          fetchOrders();
        })
        .subscribe();
      return () => { supabase.removeChannel(channels); };
    } else {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('dg_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('dg_user');
    }
  }, [currentUser]);

  const stats = useMemo(() => ({
    pending: orders.filter(o => o.status === OrderStatus.PENDING).length,
    completed: orders.filter(o => o.status === OrderStatus.COMPLETED).length,
    dispatched: orders.filter(o => o.status === OrderStatus.DISPATCHED).length,
    total: orders.filter(o => o.status === OrderStatus.ARCHIVED).length
  }), [orders]);

  const filteredOrders = useMemo(() => {
    let base = orders;
    if (view === 'PENDING') base = orders.filter(o => o.status === OrderStatus.PENDING);
    if (view === 'COMPLETED') base = orders.filter(o => o.status === OrderStatus.COMPLETED);
    if (view === 'DISPATCHED') base = orders.filter(o => o.status === OrderStatus.DISPATCHED);
    if (view === 'ALL') base = orders.filter(o => o.status === OrderStatus.ARCHIVED);
    
    const lowSearch = searchTerm.toLowerCase();
    return base.filter(o => 
      (o.customerName?.toLowerCase() || '').includes(lowSearch) || 
      (o.customerNumber || '').includes(lowSearch) ||
      (o.locality?.toLowerCase() || '').includes(lowSearch) ||
      (o.orderNumber || '').includes(lowSearch)
    );
  }, [orders, view, searchTerm]);

  const handleUpdateOrder = async (updatedOrder: Order) => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from('orders').update({
        status: updatedOrder.status,
        notes: updatedOrder.notes,
        carrier: updatedOrder.carrier?.toUpperCase(),
        detailed_packaging: updatedOrder.detailedPackaging,
        customer_number: updatedOrder.customerNumber,
        order_number: updatedOrder.orderNumber,
        reviewer: updatedOrder.reviewer
      }).eq('id', updatedOrder.id);
      
      if (error) throw error;
      
      await fetchOrders();
    } catch (err: any) {
      console.error("Update failed:", err);
      alert(`❌ ERROR AL GUARDAR: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCollaborator = async (order: Order) => {
    const newName = prompt("Ingrese el nombre del colaborador a añadir:");
    if (newName && newName.trim()) {
      const updatedReviewer = order.reviewer ? `${order.reviewer} + ${newName.trim().toUpperCase()}` : newName.trim().toUpperCase();
      const updatedOrder = { ...order, reviewer: updatedReviewer };
      // Actualizamos inmediatamente el estado local para respuesta