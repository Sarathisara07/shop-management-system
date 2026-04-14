import { useState, useEffect, useRef } from 'react';
import { IndianRupee, TrendingUp, Package, PlusCircle, CreditCard, Wallet, X, LineChart, User, ChevronRight, BarChart3, PieChart, Users, Scale, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  AreaChart, Area, BarChart, Bar, PieChart as RechartPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { API_URL } from '../config';
import './Dashboard.css';

// Modern color palette for charts
const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];
const GRADIENT_COLORS = {
  revenue: { start: '#6366f1', end: '#818cf8' },
  profit: { start: '#10b981', end: '#34d399' }
};

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-custom-tooltip">
        <p className="tooltip-label">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="tooltip-value" style={{ color: entry.color }}>
            {entry.name}: ₹{entry.value?.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const Dashboard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [data, setData] = useState({ summary: {}, products: [] });
  const [chartData, setChartData] = useState(null);
  const [chartLoading, setChartLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState(new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  const socketRef = useRef(null);
  const getLocalDateStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState(getLocalDateStr());
  const [showAddCash, setShowAddCash] = useState(false);
  const [cashAmount, setCashAmount] = useState('');

  const fetchDashboardData = () => {
    if (!user) return;
    setData({ summary: {}, products: [] }); // Clear old data
    setLoading(true);
    fetch(`${API_URL}/api/analytics?date=${selectedDate}`, {
      headers: { 'Authorization': `Bearer ${user.token}` }
    })
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
        setLastSync(new Date());
        setIsSyncing(false);
      })
      .catch(err => {
        console.error('Failed to fetch analytics', err);
        setLoading(false);
        setIsSyncing(false);
      });
  };

  const fetchChartData = () => {
    if (!user) return;
    setChartData(null); // Clear old chart data
    setChartLoading(true);
    fetch(`${API_URL}/api/analytics/charts`, {
      headers: { 'Authorization': `Bearer ${user.token}` }
    })
      .then(res => res.json())
      .then(data => {
        setChartData(data);
        setChartLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch chart data', err);
        setChartLoading(false);
      });
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Connect to Socket.io for real-time updates
    if (!socketRef.current && user) {
      socketRef.current = io(API_URL);
      socketRef.current.emit('join', user.shopOwnerId || user.id);
      
      socketRef.current.on('data_changed', () => {
        setIsSyncing(true);
        fetchDashboardData();
        fetchChartData();
      });
    }

    // Listen for AI actions to refresh data
    const handleUpdate = () => fetchDashboardData();
    window.addEventListener('data_updated', handleUpdate);
    
    return () => {
      window.removeEventListener('data_updated', handleUpdate);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [selectedDate, user?.id]);

  useEffect(() => {
    fetchChartData();
  }, [user?.id]);

  const handleAddCash = async () => {
    if (!cashAmount || isNaN(cashAmount) || Number(cashAmount) <= 0) return;
    
    await fetch(`${API_URL}/api/cash`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`
      },
      body: JSON.stringify({ amount: Number(cashAmount) })
    });
    
    setCashAmount('');
    setShowAddCash(false);
    fetchDashboardData();
    fetchChartData();
  };

  if (loading && !data.summary) return <div className="loading animate-enter">Loading Dashboard...</div>;

  const ws = chartData?.weeklySummary;

  return (
    <div className="dashboard-container animate-enter">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="stat-card glass-panel">
          <div className="logo-glow" style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {user?.shopLogo ? (
              <img src={user.shopLogo} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <User size={24} />
            )}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1>{t('welcomeBack')}, {user?.username}</h1>
              <div className={`sync-badge ${isSyncing ? 'syncing' : ''}`}>
                <div className="sync-dot"></div>
                <span>{isSyncing ? 'Syncing...' : `Live • ${lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}</span>
              </div>
            </div>
            <p className="text-muted">{t('scrapShopManagement')}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('selectDate')}</label>
            <input 
              type="date" 
              className="input-field" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ padding: '10px 14px', width: 'auto' }}
            />
          </div>
          <button className="btn-primary" onClick={() => setShowAddCash(true)}>
            <PlusCircle size={20} /> {t('addCash')}
          </button>
        </div>
      </header>

      {showAddCash && (
        <div className="glass-panel form-card mt-mb">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3>{t('addCashToRegister')}</h3>
            <button className="btn-icon" onClick={() => setShowAddCash(false)}><X size={20} /></button>
          </div>
          <div className="cash-form-flex">
            <input 
              type="number" 
              className="input-field" 
              placeholder={t('enterAmount')}
              value={cashAmount}
              onChange={(e) => setCashAmount(e.target.value)}
            />
            <button className="btn-primary" onClick={handleAddCash}>{t('saveCash')}</button>
          </div>
        </div>
      )}

      {/* ===== TODAY'S ANALYTICS SECTION ===== */}
      <div className="section-header">
        <h2 className="section-title">
          <BarChart3 size={22} className="section-icon" />
          {t('todayAnalytics')}
        </h2>
      </div>

      <div className="stats-grid">
        <div className="stat-card glass-panel">
          <div className="icon-wrapper blue-glow">
            <Wallet size={24} />
          </div>
          <div className="stat-info">
            <p className="stat-label">{t('totalCashAdded')}</p>
            <h3 className="stat-value">₹ {data.summary?.totalCashAdded || 0}</h3>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="icon-wrapper danger-glow">
            <CreditCard size={24} />
          </div>
          <div className="stat-info">
            <p className="stat-label">{t('totalMoneySpent')}</p>
            <h3 className="stat-value">₹ {data.summary?.totalMoneySpent || 0}</h3>
          </div>
        </div>

        <div className={`stat-card glass-panel ${data.summary?.remainingBalance < 0 ? 'border-danger' : 'border-success'}`}>
          <div className={`icon-wrapper ${data.summary?.remainingBalance < 0 ? 'danger-glow' : 'green-glow'}`}>
            <IndianRupee size={24} />
          </div>
          <div className="stat-info">
            <p className="stat-label">{t('remainingBalance')}</p>
            <h3 className="stat-value">₹ {data.summary?.remainingBalance || 0}</h3>
          </div>
        </div>

        {user?.role !== 'cashier' && (
          <div className="stat-card glass-panel border-success">
            <div className="icon-wrapper green-glow">
              <LineChart size={24} />
            </div>
            <div className="stat-info">
              <p className="stat-label">{t('totalProfitToday')}</p>
              <h3 className="stat-value text-success">₹ {data.summary?.totalProfit || 0}</h3>
            </div>
          </div>
        )}
        
        <div className="stat-card glass-panel">
          <div className="icon-wrapper primary-glow">
            <TrendingUp size={24} />
          </div>
          <div className="stat-info">
            <p className="stat-label">{t('totalTransactions')}</p>
            <h3 className="stat-value">{data.summary?.totalTransactions || 0}</h3>
          </div>
        </div>
      </div>

      {/* ===== WEEKLY CHARTS SECTION ===== */}
      <div className="section-header">
        <h2 className="section-title">
          <TrendingUp size={22} className="section-icon" />
          {t('weeklyOverview')}
        </h2>
        <span className="section-subtitle">{t('last7Days')}</span>
      </div>

      {chartLoading ? (
        <div className="chart-loading glass-panel">
          <div className="chart-loading-spinner"></div>
          <p>{t('chartLoading')}</p>
        </div>
      ) : !chartData || chartData.revenueTrend?.every(d => d.revenue === 0) ? (
        <div className="chart-empty glass-panel">
          <BarChart3 size={48} className="text-muted" />
          <p className="text-muted">{t('noChartData')}</p>
        </div>
      ) : (
        <>
          {/* Weekly Summary Cards */}
          {ws && (
            <div className="weekly-summary-grid">
              <div className="summary-mini-card glass-panel">
                <div className="mini-card-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}>
                  <IndianRupee size={20} />
                </div>
                <div>
                  <p className="mini-label">{t('weeklyRevenue')}</p>
                  <h4 className="mini-value">₹ {ws.totalRevenue?.toLocaleString()}</h4>
                </div>
              </div>
              {user?.role !== 'cashier' && (
                <div className="summary-mini-card glass-panel">
                  <div className="mini-card-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <p className="mini-label">{t('weeklyProfit')}</p>
                    <h4 className="mini-value text-success">₹ {ws.totalProfit?.toLocaleString()}</h4>
                  </div>
                </div>
              )}
              <div className="summary-mini-card glass-panel">
                <div className="mini-card-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                  <Scale size={20} />
                </div>
                <div>
                  <p className="mini-label">{t('weeklyWeight')}</p>
                  <h4 className="mini-value">{ws.totalWeight?.toFixed(1)} kg</h4>
                </div>
              </div>
              <div className="summary-mini-card glass-panel">
                <div className="mini-card-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
                  <BarChart3 size={20} />
                </div>
                <div>
                  <p className="mini-label">{t('avgDaily')}</p>
                  <h4 className="mini-value">₹ {ws.avgDailyRevenue?.toLocaleString()}</h4>
                </div>
              </div>
            </div>
          )}

          {/* Charts Grid */}
          <div className="charts-grid">
            {/* Revenue Trend Area Chart */}
            <div className="chart-card glass-panel chart-wide">
              <div className="chart-header">
                <h3>{t('revenueVsProfit')}</h3>
                <span className="chart-badge">{t('last7Days')}</span>
              </div>
              <div className="chart-body">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData.revenueTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={GRADIENT_COLORS.revenue.start} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={GRADIENT_COLORS.revenue.end} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={GRADIENT_COLORS.profit.start} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={GRADIENT_COLORS.profit.end} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis 
                      dataKey="day" 
                      tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                      axisLine={{ stroke: 'var(--border-color)' }}
                    />
                    <YAxis 
                      tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                      axisLine={{ stroke: 'var(--border-color)' }}
                      tickFormatter={(v) => `₹${v}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      wrapperStyle={{ paddingTop: '10px' }}
                      iconType="circle"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      name={t('revenue')}
                      stroke={GRADIENT_COLORS.revenue.start} 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#gradRevenue)" 
                    />
                    {user?.role !== 'cashier' ? (
                      <Area 
                        type="monotone" 
                        dataKey="profit" 
                        name={t('profit')}
                        stroke={GRADIENT_COLORS.profit.start} 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#gradProfit)" 
                      />
                    ) : null}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Transactions Bar Chart */}
            <div className="chart-card glass-panel">
              <div className="chart-header">
                <h3>{t('transactions')}</h3>
                <span className="chart-badge">{t('last7Days')}</span>
              </div>
              <div className="chart-body">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.revenueTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis 
                      dataKey="day" 
                      tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                      axisLine={{ stroke: 'var(--border-color)' }}
                    />
                    <YAxis 
                      tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                      axisLine={{ stroke: 'var(--border-color)' }}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      contentStyle={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: 'var(--text-main)'
                      }}
                    />
                    <Bar 
                      dataKey="transactions" 
                      name={t('transactions')}
                      fill="#6366f1" 
                      radius={[6, 6, 0, 0]}
                      maxBarSize={50}
                    >
                      {chartData.revenueTrend?.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                          opacity={0.85}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Material Distribution Pie Chart */}
            <div className="chart-card glass-panel">
              <div className="chart-header">
                <h3>{t('materialDistribution')}</h3>
                <span className="chart-badge">{t('byAmount')}</span>
              </div>
              <div className="chart-body">
                {chartData.materialDistribution?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartPie>
                      <Pie
                        data={chartData.materialDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={110}
                        paddingAngle={3}
                        dataKey="totalAmount"
                        nameKey="_id"
                        label={({ _id, percent }) => `${_id} ${(percent * 100).toFixed(0)}%`}
                        labelLine={{ stroke: 'var(--text-muted)', strokeWidth: 1 }}
                      >
                        {chartData.materialDistribution?.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                            stroke="transparent"
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [`₹${value.toLocaleString()}`, t('amount')]}
                        contentStyle={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          color: 'var(--text-main)'
                        }}
                      />
                    </RechartPie>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-empty-small">
                    <PieChart size={32} className="text-muted" />
                    <p className="text-muted">{t('noChartData')}</p>
                  </div>
                )}
              </div>
              {/* Material Legend */}
              {chartData.materialDistribution?.length > 0 && (
                <div className="pie-legend">
                  {chartData.materialDistribution?.map((item, i) => (
                    <div key={i} className="legend-item">
                      <span className="legend-dot" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}></span>
                      <span className="legend-name">{item._id}</span>
                      <span className="legend-value">₹{item.totalAmount?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top Customers */}
          {chartData.topCustomers?.length > 0 && (
            <div className="top-customers-section">
              <div className="chart-card glass-panel">
                <div className="chart-header">
                  <h3><Users size={18} style={{ marginRight: '8px' }} />{t('topCustomers')}</h3>
                  <span className="chart-badge">{t('last7Days')}</span>
                </div>
                <div className="customers-list">
                  {chartData.topCustomers?.map((customer, i) => (
                    <div key={i} className="customer-row">
                      <div className="customer-rank" style={{ background: CHART_COLORS[i] }}>
                        {i + 1}
                      </div>
                      <div className="customer-info-row">
                        <span className="customer-name">{customer._id}</span>
                        <span className="customer-visits">{customer.visits} {t('visits')}</span>
                      </div>
                      <div className="customer-amount">
                        ₹{customer.totalAmount?.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ===== MATERIALS COLLECTED SECTION ===== */}
      <div className="materials-section mt-8">
        <h2 className="mb-4">{t('materialsCollected')}</h2>
        <div className="materials-grid">
          {!data.products || data.products.length === 0 ? (
            <p className="text-muted">{t('noMaterialsCollected')}</p>
          ) : (
            data.products.map(p => (
              <div key={p._id} className="material-card glass-panel">
                <div className="material-header">
                  <Package className="text-muted" size={20} />
                  <h4>{p._id}</h4>
                </div>
                <div className="material-stats">
                  <div className="m-stat">
                    <span>{t('weight')}</span>
                    <strong>{p.totalWeight} kg</strong>
                  </div>
                  <div className="m-stat">
                    <span>Value</span>
                    <strong>₹ {p.totalSpent}</strong>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
