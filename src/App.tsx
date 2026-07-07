import React, { useState, useEffect, useMemo } from 'react';
import { 
  onValue, 
  ref, 
  set, 
  push, 
  remove, 
  update 
} from 'firebase/database';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth, rtdb } from './firebase';
import { Table, MenuItem, ReportItem, TabType } from './types';
import { 
  motion, 
  AnimatePresence 
} from 'motion/react';
import { 
  Coffee, 
  Plus, 
  Minus, 
  Trash2, 
  Edit2, 
  LogOut, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Check, 
  X, 
  Search, 
  Utensils, 
  ShoppingBag, 
  Clock, 
  RotateCcw, 
  Layers, 
  ChevronRight, 
  BarChart2, 
  CheckSquare, 
  FileText,
  UserCheck
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  PieChart,
  Cell,
  Pie
} from 'recharts';

export default function App() {
  // --- Auth State ---
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // --- Core Application State ---
  const [tables, setTables] = useState<Record<string, Table>>({});
  const [menu, setMenu] = useState<Record<string, MenuItem>>({});
  const [orders, setOrders] = useState<Record<string, { items: Record<string, number>; total: number }>>({});
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  // --- UI Helpers / Filters ---
  const [searchTable, setSearchTable] = useState('');
  const [searchMenu, setSearchMenu] = useState('');
  const [tableFilter, setTableFilter] = useState<'all' | 'empty' | 'occupied'>('all');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // --- Modals & Advanced Controls ---
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [showAddMenuModal, setShowAddMenuModal] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newMenuName, setNewMenuName] = useState('');
  const [newMenuPrice, setNewMenuPrice] = useState('');
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  
  // Table Merging Mode
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null);

  // Invoice Preview
  const [invoiceTableId, setInvoiceTableId] = useState<string | null>(null);
  const [invoiceDateStr, setInvoiceDateStr] = useState('');

  // Report Date picker & Mode
  const [reportDate, setReportDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [reportType, setReportType] = useState<'day' | 'month' | 'year'>('day');

  // --- Custom Notification Helper ---
  const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- Auth Observer ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currUser) => {
      setUser(currUser);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  // --- Database Realtime Listeners ---
  useEffect(() => {
    if (!user) return;

    const uid = user.uid;
    const tablesRef = ref(rtdb, `${uid}/tables`);
    const menuRef = ref(rtdb, `${uid}/menu`);
    const ordersRef = ref(rtdb, `${uid}/orders`);
    const reportsRef = ref(rtdb, `${uid}/reports`);

    const unsubTables = onValue(tablesRef, (snap) => {
      setTables(snap.val() || {});
    });

    const unsubMenu = onValue(menuRef, (snap) => {
      setMenu(snap.val() || {});
    });

    const unsubOrders = onValue(ordersRef, (snap) => {
      setOrders(snap.val() || {});
    });

    const unsubReports = onValue(reportsRef, (snap) => {
      const data = snap.val() || {};
      const list: ReportItem[] = Object.entries(data).map(([id, val]: [string, any]) => ({
        id,
        ...val
      }));
      // Sort reports by newest timestamp
      list.sort((a, b) => b.timestamp - a.timestamp);
      setReports(list);
    });

    return () => {
      unsubTables();
      unsubMenu();
      unsubOrders();
      unsubReports();
    };
  }, [user]);

  // --- Auth Handlers ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setAuthError('Vui lòng nhập đầy đủ email và mật khẩu');
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      triggerToast('Đăng nhập thành công!', 'success');
    } catch (err: any) {
      let msg = 'Đăng nhập thất bại.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        msg = 'Email hoặc mật khẩu không chính xác.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Định dạng email không hợp lệ.';
      }
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) {
      setAuthError('Vui lòng điền đầy đủ thông tin');
      return;
    }
    if (password.length < 6) {
      setAuthError('Mật khẩu phải từ 6 ký tự trở lên');
      return;
    }
    if (password !== confirmPassword) {
      setAuthError('Mật khẩu xác nhận không khớp');
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    setAuthSuccess('');
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setAuthSuccess('Tạo tài khoản thành công! Đang tự động đăng nhập...');
      triggerToast('Tạo tài khoản thành công!', 'success');
    } catch (err: any) {
      let msg = 'Đăng ký thất bại.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'Email này đã được sử dụng bởi tài khoản khác.';
      }
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Bạn có chắc muốn đăng xuất?')) {
      signOut(auth);
      setSelectedTableId(null);
      setMergeMode(false);
      setMergeSourceId(null);
      triggerToast('Đã đăng xuất', 'info');
    }
  };

  // --- Table CRUD & Management ---
  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim() || !user) return;
    try {
      const newTableRef = push(ref(rtdb, `${user.uid}/tables`));
      await set(newTableRef, {
        name: newTableName.trim(),
        status: 'empty'
      });
      setNewTableName('');
      setShowAddTableModal(false);
      triggerToast('Đã thêm bàn mới thành công!', 'success');
    } catch (err) {
      triggerToast('Không thể thêm bàn', 'error');
    }
  };

  const handleDeleteTable = async (tableId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    const table = tables[tableId];
    if (table.status === 'occupied') {
      triggerToast('Không thể xóa bàn đang phục vụ!', 'error');
      return;
    }
    if (window.confirm(`Bạn có chắc muốn xóa bàn "${table.name}"?`)) {
      try {
        await remove(ref(rtdb, `${user.uid}/tables/${tableId}`));
        await remove(ref(rtdb, `${user.uid}/orders/${tableId}`));
        if (selectedTableId === tableId) {
          setSelectedTableId(null);
        }
        triggerToast('Đã xóa bàn', 'info');
      } catch (err) {
        triggerToast('Xóa bàn thất bại', 'error');
      }
    }
  };

  // --- Menu CRUD ---
  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMenuName.trim() || !newMenuPrice || !user) return;
    const priceNum = parseInt(newMenuPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      triggerToast('Giá đồ uống không hợp lệ!', 'error');
      return;
    }
    try {
      const newMenuRef = push(ref(rtdb, `${user.uid}/menu`));
      await set(newMenuRef, {
        name: newMenuName.trim(),
        price: priceNum
      });
      setNewMenuName('');
      setNewMenuPrice('');
      setShowAddMenuModal(false);
      triggerToast('Đã thêm vào thực đơn!', 'success');
    } catch (err) {
      triggerToast('Thêm thực đơn thất bại', 'error');
    }
  };

  const handleEditMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !user) return;
    if (!editingItem.name.trim() || editingItem.price < 0) {
      triggerToast('Thông tin không hợp lệ', 'error');
      return;
    }
    try {
      await update(ref(rtdb, `${user.uid}/menu/${editingItem.id}`), {
        name: editingItem.name.trim(),
        price: editingItem.price
      });
      setEditingItem(null);
      triggerToast('Cập nhật thực đơn thành công!', 'success');
    } catch (err) {
      triggerToast('Cập nhật thất bại', 'error');
    }
  };

  const handleDeleteMenuItem = async (itemId: string) => {
    if (!user) return;
    const item = menu[itemId];
    if (window.confirm(`Xóa món "${item?.name}" khỏi thực đơn?`)) {
      try {
        await remove(ref(rtdb, `${user.uid}/menu/${itemId}`));
        triggerToast('Đã xóa món ăn/đồ uống', 'info');
      } catch (err) {
        triggerToast('Xóa thất bại', 'error');
      }
    }
  };

  // --- Order & Service Logic ---
  const handleServeItem = async (tableId: string, itemId: string) => {
    if (!user) return;
    
    // Auto mark table as occupied
    if (tables[tableId]?.status !== 'occupied') {
      await update(ref(rtdb, `${user.uid}/tables/${tableId}`), { status: 'occupied' });
    }

    const currentQty = orders[tableId]?.items?.[itemId] || 0;
    const itemPrice = menu[itemId]?.price || 0;
    
    const newItems = {
      ...(orders[tableId]?.items || {}),
      [itemId]: currentQty + 1
    };

    // Calculate new total
    const total = Object.entries(newItems).reduce((sum, [id, qty]) => {
      const price = menu[id]?.price || 0;
      return sum + Number(qty) * price;
    }, 0);

    await set(ref(rtdb, `${user.uid}/orders/${tableId}`), {
      items: newItems,
      total: total
    });

    triggerToast(`Đã thêm 1 ${menu[itemId]?.name}`, 'success');
  };

  const updateOrderQuantity = async (tableId: string, itemId: string, delta: number) => {
    if (!user) return;
    const currentQty = orders[tableId]?.items?.[itemId] || 0;
    const nextQty = currentQty + delta;

    const newItems = { ...(orders[tableId]?.items || {}) };
    if (nextQty <= 0) {
      delete newItems[itemId];
    } else {
      newItems[itemId] = nextQty;
    }

    const total = Object.entries(newItems).reduce((sum, [id, qty]) => {
      const price = menu[id]?.price || 0;
      return sum + Number(qty) * price;
    }, 0);

    if (Object.keys(newItems).length === 0) {
      // Empty order, but keep occupied until explicitly cleared or checked out
      await set(ref(rtdb, `${user.uid}/orders/${tableId}`), {
        items: {},
        total: 0
      });
    } else {
      await set(ref(rtdb, `${user.uid}/orders/${tableId}`), {
        items: newItems,
        total: total
      });
    }
  };

  const handleClearTable = async (tableId: string) => {
    if (!user) return;
    if (window.confirm('Bạn có chắc muốn trả bàn trống và xóa các món đã gọi của bàn này?')) {
      await remove(ref(rtdb, `${user.uid}/orders/${tableId}`));
      await update(ref(rtdb, `${user.uid}/tables/${tableId}`), { status: 'empty' });
      setSelectedTableId(null);
      triggerToast('Đã làm trống bàn', 'info');
    }
  };

  const handleCheckout = async (tableId: string) => {
    if (!user) return;
    const tableOrder = orders[tableId];
    if (!tableOrder || !tableOrder.total || tableOrder.total === 0) {
      triggerToast('Bàn chưa gọi đồ uống để thanh toán!', 'error');
      return;
    }

    try {
      // 1. Add to reports
      const reportsRef = ref(rtdb, `${user.uid}/reports`);
      const newReportRef = push(reportsRef);
      await set(newReportRef, {
        tableId: tableId,
        tableName: tables[tableId]?.name || `Bàn ${tableId}`,
        total: tableOrder.total,
        items: tableOrder.items || {},
        timestamp: Date.now(),
        date: new Date().toISOString().split('T')[0]
      });

      // 2. Clear current orders & free table
      await remove(ref(rtdb, `${user.uid}/orders/${tableId}`));
      await update(ref(rtdb, `${user.uid}/tables/${tableId}`), { status: 'empty' });
      
      setSelectedTableId(null);
      setInvoiceTableId(null);
      triggerToast(`Đã thanh toán thành công: ${tableOrder.total.toLocaleString()}đ`, 'success');
    } catch (err) {
      triggerToast('Thanh toán thất bại', 'error');
    }
  };

  // --- Guided Merge Tables Logic ---
  const startMergeMode = (tableId: string) => {
    if (tables[tableId]?.status !== 'occupied') {
      triggerToast('Chỉ có thể chọn ghép bàn đang phục vụ!', 'error');
      return;
    }
    setMergeMode(true);
    setMergeSourceId(tableId);
    triggerToast('Hãy chọn bàn thứ 2 muốn ghép vào', 'info');
  };

  const executeMerge = async (targetId: string) => {
    if (!user || !mergeSourceId) return;
    if (targetId === mergeSourceId) {
      triggerToast('Không thể ghép một bàn với chính nó!', 'error');
      return;
    }
    const sourceTable = tables[mergeSourceId];
    const targetTable = tables[targetId];

    if (targetTable.status !== 'occupied') {
      triggerToast('Bàn đích phải là bàn đang phục vụ!', 'error');
      return;
    }

    if (window.confirm(`Bạn có chắc muốn ghép toàn bộ món của "${sourceTable.name}" vào "${targetTable.name}"?`)) {
      const sourceOrder = orders[mergeSourceId] || { items: {}, total: 0 };
      const targetOrder = orders[targetId] || { items: {}, total: 0 };

      const mergedItems = { ...(targetOrder.items || {}) };
      Object.entries(sourceOrder.items || {}).forEach(([itemId, qty]) => {
        mergedItems[itemId] = (mergedItems[itemId] || 0) + Number(qty);
      });

      const total = Object.entries(mergedItems).reduce((sum, [id, qty]) => {
        const price = menu[id]?.price || 0;
        return sum + Number(qty) * price;
      }, 0);

      // Save merged to target
      await set(ref(rtdb, `${user.uid}/orders/${targetId}`), {
        items: mergedItems,
        total: total
      });

      // Clear source order & free source table
      await remove(ref(rtdb, `${user.uid}/orders/${mergeSourceId}`));
      await update(ref(rtdb, `${user.uid}/tables/${mergeSourceId}`), { status: 'empty' });

      // Suggest rename
      const autoNewName = `${targetTable.name} + ${sourceTable.name}`;
      await update(ref(rtdb, `${user.uid}/tables/${targetId}`), { name: autoNewName });

      // Clean state
      setMergeMode(false);
      setMergeSourceId(null);
      setSelectedTableId(targetId);
      triggerToast(`Đã ghép bàn thành công vào ${targetTable.name}!`, 'success');
    }
  };

  // --- Computed Analytics for Dashboard ---
  const dashboardStats = useMemo(() => {
    const totalCount = Object.keys(tables).length;
    let occupiedCount = 0;
    (Object.values(tables) as Table[]).forEach(t => {
      if (t.status === 'occupied') occupiedCount++;
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const todayReports = reports.filter(r => r.date === todayStr);
    
    const todayRevenue = todayReports.reduce((sum, r) => sum + r.total, 0);
    const todayOrdersCount = todayReports.length;

    let itemsSoldToday = 0;
    todayReports.forEach(r => {
      Object.values(r.items || {}).forEach(qty => {
        itemsSoldToday += Number(qty);
      });
    });

    return {
      totalTables: totalCount,
      occupiedTables: occupiedCount,
      todayRevenue,
      todayOrdersCount,
      itemsSoldToday
    };
  }, [tables, reports]);

  // --- Filtered Tables & Menu List ---
  const filteredTables = useMemo(() => {
    return (Object.entries(tables) as [string, Table][])
      .map(([id, t]) => ({ id, ...t }))
      .filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(searchTable.toLowerCase());
        const matchesFilter = 
          tableFilter === 'all' ? true :
          tableFilter === 'empty' ? t.status === 'empty' :
          t.status === 'occupied';
        return matchesSearch && matchesFilter;
      });
  }, [tables, searchTable, tableFilter]);

  const filteredMenuItems = useMemo(() => {
    return (Object.entries(menu) as [string, MenuItem][])
      .map(([id, item]) => ({ id, ...item }))
      .filter(item => item.name.toLowerCase().includes(searchMenu.toLowerCase()));
  }, [menu, searchMenu]);

  // --- Computed Reports for Selected Period ---
  const reportDataComputed = useMemo(() => {
    let list = reports;
    if (reportType === 'day') {
      list = reports.filter(r => r.date === reportDate);
    } else if (reportType === 'month') {
      const monthPrefix = reportDate.substring(0, 7); // YYYY-MM
      list = reports.filter(r => r.date.startsWith(monthPrefix));
    } else if (reportType === 'year') {
      const yearPrefix = reportDate.substring(0, 4); // YYYY
      list = reports.filter(r => r.date.startsWith(yearPrefix));
    }

    let revenueSum = 0;
    let orderCount = list.length;
    let itemsSoldSum = 0;
    const itemRankings: Record<string, number> = {};

    list.forEach(r => {
      revenueSum += r.total;
      Object.entries(r.items || {}).forEach(([itemId, qty]) => {
        itemsSoldSum += Number(qty);
        itemRankings[itemId] = (itemRankings[itemId] || 0) + Number(qty);
      });
    });

    // Top Selling Items data for Recharts Pie
    const topItemsChartData = Object.entries(itemRankings).map(([itemId, qty]) => {
      return {
        name: menu[itemId]?.name || 'Món uống (Đã xóa)',
        value: qty
      };
    }).sort((a, b) => b.value - a.value).slice(0, 5);

    // Revenue Chronology chart data
    // Group reports by date or time to make a beautiful line chart
    const timelineData: Record<string, number> = {};
    list.forEach(r => {
      const key = reportType === 'day' 
        ? new Date(r.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        : r.date;
      timelineData[key] = (timelineData[key] || 0) + r.total;
    });

    const revenueChartData = Object.entries(timelineData).map(([timeLabel, rev]) => ({
      time: timeLabel,
      DoanhThu: rev
    })).sort((a, b) => a.time.localeCompare(b.time));

    return {
      list,
      revenueSum,
      orderCount,
      itemsSoldSum,
      topItemsChartData,
      revenueChartData
    };
  }, [reports, reportType, reportDate, menu]);

  const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'];

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-0 md:p-6 lg:p-8 select-none relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-blue-600/5 blur-[100px] rounded-full pointer-events-none"></div>

      {/* Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[999] px-6 py-3.5 rounded-full shadow-2xl flex items-center gap-3 text-sm font-semibold text-white max-w-[90%] md:max-w-md ${
              toast.type === 'error' ? 'bg-rose-600' : toast.type === 'success' ? 'bg-emerald-600' : 'bg-slate-800'
            }`}
          >
            {toast.type === 'success' && <Check className="w-4 h-4 flex-shrink-0" />}
            {toast.type === 'error' && <X className="w-4 h-4 flex-shrink-0" />}
            <span className="truncate">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container: Scaled for Phone Display on Large Screens */}
      <div id="appContainer" className="w-full max-w-[500px] min-h-screen md:min-h-[850px] md:max-h-[920px] md:rounded-[48px] md:border-[10px] md:border-slate-800 bg-[#0F172A] shadow-2xl relative overflow-y-auto flex flex-col scroll-smooth border-slate-800/80">
        
        {/* --- AUTHENTICATION SPLASH SCREEN --- */}
        {authLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#0F172A]">
            <Coffee className="w-16 h-16 text-indigo-500 animate-bounce mb-4" />
            <p className="text-slate-300 font-semibold text-base">Đang kết nối cơ sở dữ liệu...</p>
            <div className="mt-4 w-12 h-1 bg-indigo-500 rounded-full animate-pulse" />
          </div>
        ) : !user ? (
          <div className="flex-1 flex flex-col justify-between p-6 bg-[#0F172A]">
            <div className="my-auto flex flex-col items-center">
              {/* App Identity */}
              <div className="flex items-center gap-3.5 mb-2">
                <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400 shadow-sm">
                  <Coffee className="w-8 h-8" />
                </div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">
                  Cafe<span className="text-indigo-400">Manager</span>
                </h1>
              </div>
              <p className="text-slate-400 font-medium text-sm mb-8 text-center max-w-[280px]">
                Ứng dụng quản lý gọi món, thanh toán và báo cáo quán cafe chuyên nghiệp
              </p>

              {/* Login / Register Toggle */}
              <div className="w-full bg-slate-900/60 p-1.5 rounded-full border border-slate-800 flex mb-6">
                <button
                  type="button"
                  onClick={() => { setIsRegisterMode(false); setAuthError(''); }}
                  className={`flex-1 py-2.5 rounded-full text-xs font-bold transition-all ${!isRegisterMode ? 'bg-slate-800 text-white shadow-sm border border-slate-700/50' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  onClick={() => { setIsRegisterMode(true); setAuthError(''); }}
                  className={`flex-1 py-2.5 rounded-full text-xs font-bold transition-all ${isRegisterMode ? 'bg-slate-800 text-white shadow-sm border border-slate-700/50' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Tạo tài khoản
                </button>
              </div>

              {/* Form Card */}
              <motion.div 
                key={isRegisterMode ? 'reg' : 'log'}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full bg-slate-900/40 p-6 rounded-3xl border border-slate-800/80 shadow-md"
              >
                <form onSubmit={isRegisterMode ? handleRegister : handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">Email tài khoản</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="demo@cafe.com"
                      className="w-full bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:bg-[#0c1322] transition-all text-slate-100 placeholder:text-slate-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5">Mật khẩu</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:bg-[#0c1322] transition-all text-slate-100 placeholder:text-slate-600"
                      required
                    />
                  </div>

                  {isRegisterMode && (
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1.5">Xác nhận mật khẩu</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:bg-[#0c1322] transition-all text-slate-100 placeholder:text-slate-600"
                        required
                      />
                    </div>
                  )}

                  {authError && (
                    <div className="text-xs text-rose-400 bg-rose-950/20 p-3 rounded-xl font-medium border border-rose-900/30">
                      {authError}
                    </div>
                  )}

                  {authSuccess && (
                    <div className="text-xs text-emerald-400 bg-emerald-950/20 p-3 rounded-xl font-medium border border-emerald-900/30">
                      {authSuccess}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isRegisterMode ? 'Đăng ký tài khoản' : 'Đăng nhập hệ thống'}
                  </button>
                </form>
              </motion.div>

              {/* Demo Hint */}
              {!isRegisterMode && (
                <div className="mt-5 text-center text-xs text-slate-400 font-medium">
                  Tài khoản dùng thử:{' '}
                  <code className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-300 font-semibold select-all">
                    demo@cafe.com
                  </code>{' '}
                  mật khẩu:{' '}
                  <code className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-300 font-semibold">
                    123456
                  </code>
                </div>
              )}
            </div>

            <p className="text-center text-[10px] text-slate-500 mt-6">
              © 2026 CafeManager Pro. Thiết kế tối ưu hóa cho di động.
            </p>
          </div>
        ) : (
          
          // --- FULL REACT MOBILE APPLICATION ---
          <div className="flex-1 flex flex-col bg-[#0F172A] min-h-full">
            
            {/* Header */}
            <header className="sticky top-0 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 z-40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                  <Coffee className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-white">Cafe 1A</h2>
                  <p className="text-[10px] text-slate-400 font-semibold truncate max-w-[140px]">
                    {user.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('report')}
                  className="p-2 hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 rounded-xl transition-all cursor-pointer"
                  title="Báo cáo nhanh"
                >
                  <BarChart2 className="w-4 h-4" />
                </button>
                <div className="w-px h-5 bg-slate-800 mx-1" />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 rounded-xl transition-all cursor-pointer"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </header>

            {/* Navigation Tabs */}
            <div className="bg-slate-900/80 backdrop-blur-md p-2 border-b border-slate-800/80 flex items-center justify-between sticky top-[53px] z-30">
              <div className="grid grid-cols-3 gap-1.5 w-full bg-slate-950 p-1 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('dashboard')}
                  className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'dashboard' ? 'bg-slate-800 text-white shadow-sm border border-slate-700/50' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Tổng quan</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('tables')}
                  className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'tables' ? 'bg-slate-800 text-white shadow-sm border border-slate-700/50' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Utensils className="w-3.5 h-3.5" />
                  <span>Bàn & Món</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('report')}
                  className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'report' ? 'bg-slate-800 text-white shadow-sm border border-slate-700/50' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Báo cáo</span>
                </button>
              </div>
            </div>

            {/* --- TAB CONTENT AREA --- */}
            <div className="flex-1 p-4 pb-20">
              
              {/* ======================================= */}
              {/* 1. DASHBOARD VIEW                       */}
              {/* ======================================= */}
              {activeTab === 'dashboard' && (
                <div className="space-y-4">
                  {/* Greeting Block */}
                  <div className="bg-gradient-to-r from-indigo-600 to-blue-700 text-white p-5 rounded-3xl shadow-lg relative overflow-hidden border border-indigo-500/20">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                      <Coffee className="w-36 h-36" />
                    </div>
                    <p className="text-xs text-indigo-100/80 font-bold mb-1">XIN CHÀO CHỦ QUÁN</p>
                    <h3 className="text-xl font-extrabold tracking-tight">Hôm nay thế nào?</h3>
                    <p className="text-[11px] text-indigo-100/60 mt-1">
                      {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>

                  {/* Stat Bento Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800/80 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hôm nay</span>
                        <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
                          <DollarSign className="w-4 h-4" />
                        </div>
                      </div>
                      <h4 className="text-lg font-extrabold text-white leading-none">
                        {dashboardStats.todayRevenue.toLocaleString()}đ
                      </h4>
                      <p className="text-[10px] text-slate-500 font-semibold mt-1">Doanh thu tích lũy</p>
                    </div>

                    <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800/80 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hoạt động</span>
                        <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                          <Users className="w-4 h-4" />
                        </div>
                      </div>
                      <h4 className="text-lg font-extrabold text-white leading-none">
                        {dashboardStats.occupiedTables} / {dashboardStats.totalTables}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-semibold mt-1">Bàn đang phục vụ</p>
                    </div>

                    <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800/80 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Đơn hàng</span>
                        <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
                          <ShoppingBag className="w-4 h-4" />
                        </div>
                      </div>
                      <h4 className="text-lg font-extrabold text-white leading-none">
                        {dashboardStats.todayOrdersCount}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-semibold mt-1">Tổng đơn thanh toán</p>
                    </div>

                    <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800/80 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sản lượng</span>
                        <div className="p-1.5 bg-pink-500/10 text-pink-400 rounded-lg border border-pink-500/20">
                          <Utensils className="w-4 h-4" />
                        </div>
                      </div>
                      <h4 className="text-lg font-extrabold text-white leading-none">
                        {dashboardStats.itemsSoldToday}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-semibold mt-1">Món ăn & uống đã bán</p>
                    </div>
                  </div>

                  {/* Fast Navigation Shortcuts */}
                  <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800/80 shadow-sm space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hành động nhanh</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => { setActiveTab('tables'); setSelectedTableId(null); }}
                        className="py-3 px-2 bg-slate-950 hover:bg-indigo-500/10 text-slate-300 hover:text-indigo-400 hover:border-indigo-500/30 text-xs font-bold rounded-xl border border-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Utensils className="w-3.5 h-3.5" />
                        Gọi món mới
                      </button>

                      <button
                        type="button"
                        onClick={() => { setActiveTab('tables'); setShowAddTableModal(true); }}
                        className="py-3 px-2 bg-slate-950 hover:bg-indigo-500/10 text-slate-300 hover:text-indigo-400 hover:border-indigo-500/30 text-xs font-bold rounded-xl border border-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Thêm bàn mới
                      </button>
                    </div>
                  </div>

                  {/* Informational Guidance Banner */}
                  <div className="p-4 bg-indigo-950/20 rounded-2xl border border-indigo-900/30 text-indigo-200 text-xs flex items-start gap-3">
                    <Clock className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold mb-0.5">Mẹo tối ưu hóa quy trình</p>
                      <p className="text-indigo-300/80 leading-relaxed font-medium">
                        Bạn có thể sử dụng điện thoại để thao tác trực tiếp tại bàn khách. Hãy nhấn chọn một bàn bất kỳ trong tab <strong>Bàn & Món</strong> để phục vụ.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ======================================= */}
              {/* 2. TABLES & MENU VIEW                    */}
              {/* ======================================= */}
              {activeTab === 'tables' && (
                <div className="space-y-4">
                  
                  {/* Table Control Block */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-indigo-400" />
                        <span>Danh sách bàn ({filteredTables.length})</span>
                      </h3>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setShowAddTableModal(true)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-lg shadow-indigo-600/10 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Mở bàn</span>
                        </button>
                      </div>
                    </div>

                    {/* Filter & Search Table row */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Tìm bàn..."
                          value={searchTable}
                          onChange={(e) => setSearchTable(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 pl-8 pr-3 py-2 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500 focus:bg-[#0c1322] transition-all placeholder:text-slate-600"
                        />
                        {searchTable && (
                          <button
                            type="button"
                            onClick={() => setSearchTable('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Filter category toggles */}
                      <div className="bg-slate-950 p-0.5 rounded-xl flex border border-slate-800">
                        <button
                          type="button"
                          onClick={() => setTableFilter('all')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${tableFilter === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                          Tất cả
                        </button>
                        <button
                          type="button"
                          onClick={() => setTableFilter('occupied')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${tableFilter === 'occupied' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                          Phục vụ
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* TABLE SELECTION AREA (Interactive Grid) */}
                  {mergeMode && (
                    <div className="p-3 bg-indigo-950/20 border border-indigo-900/30 rounded-2xl flex items-center justify-between">
                      <p className="text-xs text-indigo-300 font-bold">
                        Đang ghép bàn: <span className="underline">{tables[mergeSourceId!]?.name}</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => { setMergeMode(false); setMergeSourceId(null); }}
                        className="px-2 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                      >
                        Huỷ ghép
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2.5">
                    {filteredTables.map((t) => {
                      const isOccupied = t.status === 'occupied';
                      const isSelected = selectedTableId === t.id;
                      const hasItems = orders[t.id]?.items && Object.keys(orders[t.id].items).length > 0;
                      
                      return (
                        <motion.button
                          key={t.id}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => {
                            if (mergeMode) {
                              executeMerge(t.id);
                            } else {
                              setSelectedTableId(t.id);
                            }
                          }}
                          className={`relative text-left p-3 rounded-2xl border transition-all flex flex-col justify-between h-[85px] cursor-pointer ${
                            isOccupied 
                              ? isSelected 
                                ? 'bg-emerald-950/40 border-emerald-500 shadow-lg shadow-emerald-500/5' 
                                : 'bg-slate-900 border-emerald-900/60 hover:border-emerald-800'
                              : isSelected
                                ? 'bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-500/5'
                                : 'bg-slate-900 border-slate-800 hover:border-slate-750'
                          }`}
                        >
                          {/* Top row */}
                          <div className="flex items-center justify-between w-full">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                              isOccupied ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800/80 text-slate-400 border-slate-700/50'
                            }`}>
                              {isOccupied ? 'Đang gọi' : 'Trống'}
                            </span>
                            
                            {/* X button only if empty */}
                            {!isOccupied && (
                              <button
                                type="button"
                                onClick={(e) => handleDeleteTable(t.id, e)}
                                className="text-slate-500 hover:text-rose-400 transition-all p-0.5 rounded-lg"
                                title="Xóa bàn"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Bottom Row: Name and price summary */}
                          <div className="mt-2">
                            <h4 className="text-xs font-bold text-slate-200 truncate">{t.name}</h4>
                            {isOccupied && orders[t.id]?.total ? (
                              <p className="text-[10px] font-extrabold text-emerald-400 mt-0.5 truncate">
                                {orders[t.id].total.toLocaleString()}đ
                              </p>
                            ) : (
                              <p className="text-[9px] font-medium text-slate-500 mt-0.5">Sẵn sàng</p>
                            )}
                          </div>
                        </motion.button>
                      );
                    })}
                    {filteredTables.length === 0 && (
                      <div className="col-span-3 text-center py-8 text-xs text-slate-500 bg-slate-900 rounded-3xl border border-dashed border-slate-800 font-medium">
                        Không tìm thấy bàn nào phù hợp
                      </div>
                    )}
                  </div>

                  {/* ACTIVE TABLE DETAIL PANEL */}
                  {selectedTableId && tables[selectedTableId] && (
                    <div className="bg-slate-900 rounded-3xl border border-slate-800/80 shadow-lg p-4 space-y-4">
                      {/* Active Table Header */}
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                        <div>
                          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-md">
                            BÀN HOẠT ĐỘNG
                          </span>
                          <h3 className="text-base font-extrabold text-white mt-1.5">
                            {tables[selectedTableId]?.name}
                          </h3>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {tables[selectedTableId]?.status === 'occupied' && (
                            <button
                              type="button"
                              onClick={() => startMergeMode(selectedTableId)}
                              className="p-2 bg-slate-950 hover:bg-slate-850 text-slate-300 border border-slate-800 rounded-xl transition-all cursor-pointer text-xs font-bold flex items-center gap-1"
                              title="Ghép bàn này vào bàn khác"
                            >
                              <RotateCcw className="w-3.5 h-3.5 rotate-45" />
                              <span>Ghép</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleClearTable(selectedTableId)}
                            className="p-2 bg-rose-950/20 hover:bg-rose-900/30 text-rose-400 border border-rose-900/30 rounded-xl transition-all cursor-pointer text-xs font-bold flex items-center gap-1"
                            title="Xoá và trả bàn trống"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Xoá đơn</span>
                          </button>
                        </div>
                      </div>

                      {/* List of Ordered items */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Đơn hàng của bàn</h4>
                        
                        <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1">
                          {orders[selectedTableId]?.items && Object.keys(orders[selectedTableId].items).length > 0 ? (
                            Object.entries(orders[selectedTableId].items).map(([itemId, qty]) => {
                              const item = menu[itemId];
                              const price = item?.price || 0;
                              const subtotal = Number(qty) * price;
                              return (
                                <div key={itemId} className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                                  <div className="min-width-0 flex-1 pr-2">
                                    <h5 className="text-xs font-extrabold text-slate-200 truncate">
                                      {item ? item.name : 'Đồ uống (Đã xóa)'}
                                    </h5>
                                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                                      {price.toLocaleString()}đ / món
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    {/* Numeric Controls */}
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => updateOrderQuantity(selectedTableId, itemId, -1)}
                                        className="w-7 h-7 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 rounded-full flex items-center justify-center font-bold text-sm active:scale-90"
                                      >
                                        <Minus className="w-3 h-3" />
                                      </button>
                                      <span className="text-xs font-black text-slate-200 min-w-[14px] text-center">
                                        {qty}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => updateOrderQuantity(selectedTableId, itemId, 1)}
                                        className="w-7 h-7 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 rounded-full flex items-center justify-center font-bold text-sm active:scale-90"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </button>
                                    </div>

                                    {/* Subtotal */}
                                    <span className="text-xs font-extrabold text-slate-300 min-w-[65px] text-right">
                                      {subtotal.toLocaleString()}đ
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center py-6 text-slate-500 text-xs font-medium border border-dashed border-slate-800 rounded-2xl bg-slate-950/30">
                              Chưa có món nào được gọi. Chọn món bên dưới để thêm!
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Total and Checkout */}
                      <div className="border-t border-slate-800/80 pt-3">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-sm font-bold text-slate-400">Tổng thanh toán</span>
                          <span className="text-xl font-black text-emerald-400">
                            {(orders[selectedTableId]?.total || 0).toLocaleString()}đ
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {/* Invoice Preview */}
                          <button
                            type="button"
                            onClick={() => {
                              if (!orders[selectedTableId]?.total) {
                                triggerToast('Đơn hàng trống!', 'error');
                                return;
                              }
                              setInvoiceTableId(selectedTableId);
                              setInvoiceDateStr(new Date().toLocaleString('vi-VN'));
                            }}
                            className="w-full py-3 bg-slate-950 hover:bg-slate-850 text-slate-300 border border-slate-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <FileText className="w-4 h-4" />
                            Xuất hóa đơn
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCheckout(selectedTableId)}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/15 cursor-pointer"
                          >
                            <CheckSquare className="w-4 h-4" />
                            Thanh toán
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* THỰC ĐƠN MENU MANAGEMENT SECTION */}
                  <div className="bg-slate-900 rounded-3xl border border-slate-800/80 shadow-md p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                        <Utensils className="w-4 h-4 text-indigo-400" />
                        <span>Menu đồ uống ({filteredMenuItems.length})</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowAddMenuModal(true)}
                        className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-850 text-slate-300 border border-slate-800 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm món</span>
                      </button>
                    </div>

                    {/* Search menu bar */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Tìm đồ uống trong thực đơn..."
                        value={searchMenu}
                        onChange={(e) => setSearchMenu(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 pl-8 pr-3 py-2 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500 focus:bg-[#0c1322] transition-all placeholder:text-slate-600"
                      />
                    </div>

                    {/* Scrollable menu items list */}
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {filteredMenuItems.map((item) => (
                        <div 
                          key={item.id} 
                          className="flex items-center justify-between p-2.5 bg-slate-950 rounded-2xl border border-slate-850 hover:border-slate-800 transition-all"
                        >
                          <div className="min-width-0 flex-1 pr-2">
                            <h4 className="text-xs font-bold text-slate-100 truncate">{item.name}</h4>
                            <p className="text-[11px] font-bold text-indigo-400 mt-0.5">
                              {item.price.toLocaleString()}đ
                            </p>
                          </div>

                          <div className="flex items-center gap-1">
                            {/* Call item to selected table */}
                            <button
                              type="button"
                              onClick={() => {
                                if (!selectedTableId) {
                                  triggerToast('Vui lòng chọn một Bàn trước khi gọi món!', 'error');
                                  return;
                                }
                                handleServeItem(selectedTableId, item.id);
                              }}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold flex items-center gap-0.5 active:scale-95 transition-all cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Gọi</span>
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => setEditingItem(item)}
                              className="p-1.5 text-slate-500 hover:text-indigo-400 transition-all rounded-lg cursor-pointer"
                              title="Sửa"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleDeleteMenuItem(item.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 transition-all rounded-lg cursor-pointer"
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {filteredMenuItems.length === 0 && (
                        <div className="text-center py-8 text-xs text-slate-500 bg-slate-950 rounded-2xl border border-dashed border-slate-800 font-medium">
                          Chưa có thực đơn món uống nào
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ======================================= */}
              {/* 3. REPORTS VIEW                          */}
              {/* ======================================= */}
              {activeTab === 'report' && (
                <div className="space-y-4">
                  {/* Filter Panel */}
                  <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800 shadow-sm space-y-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thời gian thống kê</h3>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={reportDate}
                        onChange={(e) => setReportDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs text-slate-100 font-semibold focus:outline-none focus:border-indigo-500"
                      />

                      <div className="bg-slate-950 p-0.5 rounded-xl flex w-full border border-slate-800">
                        <button
                          type="button"
                          onClick={() => setReportType('day')}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${reportType === 'day' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                          Ngày
                        </button>
                        <button
                          type="button"
                          onClick={() => setReportType('month')}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${reportType === 'month' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                          Tháng
                        </button>
                        <button
                          type="button"
                          onClick={() => setReportType('year')}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${reportType === 'year' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                          Năm
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Stats Cards */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg shadow-indigo-600/10 text-center">
                      <span className="text-[9px] font-bold opacity-80 uppercase tracking-wider block">Doanh thu</span>
                      <h4 className="text-sm font-extrabold mt-1 truncate">{reportDataComputed.revenueSum.toLocaleString()}đ</h4>
                    </div>

                    <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800/80 text-center shadow-sm">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Đơn hàng</span>
                      <h4 className="text-sm font-extrabold text-white mt-1">{reportDataComputed.orderCount} đơn</h4>
                    </div>

                    <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800/80 text-center shadow-sm">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Sản lượng</span>
                      <h4 className="text-sm font-extrabold text-white mt-1">{reportDataComputed.itemsSoldSum} ly</h4>
                    </div>
                  </div>

                  {/* Recharts Graphical Visuals */}
                  {reportDataComputed.list.length > 0 && (
                    <div className="space-y-4">
                      {/* Revenue Timeline chart */}
                      <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800/80 shadow-sm space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Đồ thị doanh thu</h4>
                        <div className="h-[150px] w-full text-xs">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={reportDataComputed.revenueChartData}>
                              <XAxis dataKey="time" stroke="#64748b" fontSize={9} tickLine={false} />
                              <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} labelStyle={{ color: '#94a3b8' }} formatter={(value) => [`${value.toLocaleString()}đ`, 'Doanh Thu']} />
                              <Line type="monotone" dataKey="DoanhThu" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Top Sold Items breakdown */}
                      {reportDataComputed.topItemsChartData.length > 0 && (
                        <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800/80 shadow-sm space-y-3">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top 5 đồ uống bán chạy</h4>
                          <div className="grid grid-cols-2 gap-4 items-center">
                            <div className="h-[120px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={reportDataComputed.topItemsChartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={25}
                                    outerRadius={45}
                                    paddingAngle={3}
                                    dataKey="value"
                                  >
                                    {reportDataComputed.topItemsChartData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                  </Pie>
                                </PieChart>
                              </ResponsiveContainer>
                            </div>

                            <div className="space-y-1 text-slate-300">
                              {reportDataComputed.topItemsChartData.map((item, index) => (
                                <div key={item.name} className="flex items-center gap-1.5 text-[10px] font-bold">
                                  <span 
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                                    style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                                  />
                                  <span className="truncate flex-1 max-w-[100px] text-slate-200">{item.name}</span>
                                  <span className="text-slate-500">({item.value} ly)</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* List of checkout receipts in the report period */}
                  <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800/80 shadow-sm space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Danh sách hóa đơn</h4>
                    
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {reportDataComputed.list.map((r) => (
                        <div key={r.id} className="p-3 bg-slate-950 rounded-2xl border border-slate-850 flex items-center justify-between text-xs font-semibold text-slate-300">
                          <div>
                            <div className="font-extrabold text-slate-200">{r.tableName}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {new Date(r.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {r.date}
                            </div>
                          </div>
                          <span className="font-black text-emerald-400 text-sm">
                            {r.total.toLocaleString()}đ
                          </span>
                        </div>
                      ))}

                      {reportDataComputed.list.length === 0 && (
                        <div className="text-center py-8 text-xs text-slate-500 bg-slate-950 rounded-2xl border border-dashed border-slate-800 font-medium">
                          Không có hóa đơn thanh toán nào trong thời gian này
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* --- MODAL DIALOGS --- */}

            {/* 1. Add Table Modal */}
            <AnimatePresence>
              {showAddTableModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-[340px] p-5 shadow-2xl space-y-4"
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-extrabold text-white">Mở thêm bàn / khu vực</h4>
                      <button type="button" onClick={() => setShowAddTableModal(false)} className="text-slate-500 hover:text-slate-300 transition-all">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleAddTable} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5">Tên bàn hoặc mã bàn</label>
                        <input
                          type="text"
                          value={newTableName}
                          onChange={(e) => setNewTableName(e.target.value)}
                          placeholder="Ví dụ: Bàn 5, Khu VIP..."
                          className="w-full bg-slate-950 border border-slate-800 px-3.5 py-2.5 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500 focus:bg-[#0c1322] transition-all placeholder:text-slate-600"
                          required
                          autoFocus
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/10 cursor-pointer"
                      >
                        Xác nhận mở bàn
                      </button>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* 2. Add Menu Item Modal */}
            <AnimatePresence>
              {showAddMenuModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-[340px] p-5 shadow-2xl space-y-4"
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-extrabold text-white">Thêm đồ uống vào menu</h4>
                      <button type="button" onClick={() => setShowAddMenuModal(false)} className="text-slate-500 hover:text-slate-300 transition-all">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleAddMenuItem} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5">Tên đồ uống / món ăn</label>
                        <input
                          type="text"
                          value={newMenuName}
                          onChange={(e) => setNewMenuName(e.target.value)}
                          placeholder="Ví dụ: Cà phê sữa đá, Trà đào..."
                          className="w-full bg-slate-950 border border-slate-800 px-3.5 py-2.5 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500 focus:bg-[#0c1322] transition-all placeholder:text-slate-600"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5">Đơn giá (đ)</label>
                        <input
                          type="number"
                          value={newMenuPrice}
                          onChange={(e) => setNewMenuPrice(e.target.value)}
                          placeholder="Ví dụ: 25000"
                          inputMode="numeric"
                          className="w-full bg-slate-950 border border-slate-800 px-3.5 py-2.5 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500 focus:bg-[#0c1322] transition-all placeholder:text-slate-600"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/10 cursor-pointer"
                      >
                        Thêm vào thực đơn
                      </button>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* 3. Edit Menu Item Modal */}
            <AnimatePresence>
              {editingItem && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-[340px] p-5 shadow-2xl space-y-4"
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-extrabold text-white">Chỉnh sửa thực đơn</h4>
                      <button type="button" onClick={() => setEditingItem(null)} className="text-slate-500 hover:text-slate-300 transition-all">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleEditMenuItem} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5">Tên đồ uống</label>
                        <input
                          type="text"
                          value={editingItem.name}
                          onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 px-3.5 py-2.5 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500 focus:bg-[#0c1322] transition-all"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5">Đơn giá (đ)</label>
                        <input
                          type="number"
                          value={editingItem.price}
                          onChange={(e) => setEditingItem({ ...editingItem, price: parseInt(e.target.value) || 0 })}
                          inputMode="numeric"
                          className="w-full bg-slate-950 border border-slate-800 px-3.5 py-2.5 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500 focus:bg-[#0c1322] transition-all"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/10 cursor-pointer"
                      >
                        Lưu thay đổi
                      </button>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* 4. Invoice Receipt Print Modal */}
            <AnimatePresence>
              {invoiceTableId && tables[invoiceTableId] && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-3xl w-full max-w-[360px] p-6 shadow-2xl text-slate-800 space-y-4 select-text border border-slate-100"
                  >
                    {/* Invoice header */}
                    <div className="text-center space-y-1">
                      <h3 className="text-base font-black text-slate-900 tracking-tight uppercase">CAFE 1A BILL</h3>
                      <p className="text-[10px] text-slate-500 font-semibold">Địa chỉ: Kiot 1A, Đường Điện Biên Phủ, Hà Nội</p>
                      <p className="text-[10px] text-slate-500 font-semibold">Điện thoại: 0987.654.321</p>
                      <div className="border-t border-dashed border-slate-300 my-2 pt-2" />
                    </div>

                    {/* Invoice details */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-bold">Bàn:</span>
                        <span className="font-black text-slate-800">{tables[invoiceTableId].name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-bold">Thời gian in:</span>
                        <span className="font-semibold text-slate-600">{invoiceDateStr}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-bold">Thu ngân:</span>
                        <span className="font-semibold text-slate-600">{user.email?.split('@')[0]}</span>
                      </div>
                    </div>

                    <div className="border-t border-dashed border-slate-300 my-2" />

                    {/* Items table */}
                    <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                      <div className="grid grid-cols-12 gap-1 text-[11px] font-black text-slate-400 uppercase tracking-wider pb-1">
                        <span className="col-span-6">Tên món</span>
                        <span className="col-span-2 text-center">SL</span>
                        <span className="col-span-4 text-right">T.Tiền</span>
                      </div>
                      
                      {orders[invoiceTableId]?.items && Object.entries(orders[invoiceTableId].items).map(([itemId, qty]) => {
                        const item = menu[itemId];
                        const price = item?.price || 0;
                        const subtotal = Number(qty) * price;
                        return (
                          <div key={itemId} className="grid grid-cols-12 gap-1 text-xs font-bold text-slate-700">
                            <span className="col-span-6 truncate">{item?.name || 'Món'}</span>
                            <span className="col-span-2 text-center text-slate-500">x{qty}</span>
                            <span className="col-span-4 text-right">{subtotal.toLocaleString()}đ</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="border-t border-dashed border-slate-300 my-2 pt-3" />

                    {/* Invoice total */}
                    <div className="flex justify-between items-center text-sm font-black text-slate-900">
                      <span>TỔNG THANH TOÁN</span>
                      <span className="text-base text-indigo-650 font-black">
                        {(orders[invoiceTableId]?.total || 0).toLocaleString()}đ
                      </span>
                    </div>

                    {/* Thank you note */}
                    <div className="text-center pt-2 space-y-1">
                      <p className="text-[10px] text-slate-400 italic font-medium">Cảm ơn Quý khách! Hẹn gặp lại!</p>
                      <p className="text-[9px] text-slate-300 font-bold">Powered by CafeManager Pro</p>
                    </div>

                    {/* Action button */}
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setInvoiceTableId(null)}
                        className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-all"
                      >
                        Đóng
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          window.print();
                          // Also auto checkout if confirmed
                          if (window.confirm('Bạn có muốn tự động Lưu thanh toán và Giải phóng bàn này luôn không?')) {
                            handleCheckout(invoiceTableId);
                          }
                        }}
                        className="py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 shadow-md cursor-pointer transition-all"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        In & Lưu đơn
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

          </div>
        )}

      </div>
    </div>
  );
}
