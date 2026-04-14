import { useState, useEffect, useRef } from 'react';
import { Archive, Edit2, Check, Truck, Search } from 'lucide-react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { API_URL } from '../config';
import './Stock.css';

const StockCard = ({ item, reloadStock }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [val, setVal] = useState(item.currentStock);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = async () => {
    setIsEditing(false);
    const diff = Number(item.currentStock) - Number(val);
    if (diff === 0 || isNaN(diff)) {
      setVal(item.currentStock); // reset if invalid
      return;
    }
    
    try {
      await fetch('http://localhost:5000/api/dispatch', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          destination: 'Direct Stock Adjustment',
          items: [{ product: item.productId, productName: item.productName, weight: diff }],
          totalWeight: diff
        })
      });
      reloadStock();
    } catch(err) {
      console.error(err);
      setVal(item.currentStock);
    }
  };

  return (
    <div className="glass-panel stock-card">
      <div className="stock-header">
        <h3>{item.productName}</h3>
        <Archive className="text-muted" size={24} />
      </div>
      
      <div className="stock-balance" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {isEditing ? (
          <>
            <input 
              type="number" 
              className="input-field" 
              style={{ width: '120px', fontSize: '1.5rem', padding: '5px' }}
              value={val} 
              autoFocus
              onChange={e => setVal(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              onWheel={e => e.target.blur()}
            />
            <button className="btn-icon green-glow" onClick={handleSave}><Check size={20} /></button>
          </>
        ) : (
          <>
            <div>
              <span className="balance-value">{Number(item.currentStock).toFixed(2)}</span>
              <span className="balance-unit">kg</span>
            </div>
            <button className="btn-icon text-muted" onClick={() => setIsEditing(true)} title={t('editStock')}>
              <Edit2 size={18} />
            </button>
          </>
        )}
      </div>

      <div className="stock-details">
        <div className="stock-stat inward">
          <span>{t('collected')}: {Number(item.currentStock).toFixed(2)} kg</span>
        </div>
        <div className="stock-stat outward text-muted">
          <span>{t('originalHistoricalTotal')}: {item.inward.toFixed(2)} kg</span>
        </div>
      </div>
    </div>
  );
};

const Stock = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

  const fetchStock = () => {
    fetch(`${API_URL}/api/analytics/stock`, {
      headers: { 'Authorization': `Bearer ${user.token}` }
    })
      .then(res => res.json())
      .then(data => {
        setStock(data);
        setLoading(false);
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchStock();
    
    // Connect to Socket.io for real-time updates
    if (!socketRef.current && user) {
      socketRef.current = io(API_URL);
      socketRef.current.emit('join', user.shopOwnerId || user.id);
      
      socketRef.current.on('data_changed', () => {
        fetchStock();
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user?.id]);

  if (loading) return <div className="loading animate-enter">Loading Inventory...</div>;

  return (
    <div className="stock-container animate-enter">
      <header className="page-header">
        <h1>Live Inventory</h1>
        <p className="text-muted">Directly click the Edit icon to update your current stock balance.</p>
      </header>

      <div className="stock-grid">
        {stock.length === 0 ? (
           <p className="text-muted">No materials found. Add products in the Products tab first!</p>
        ) : (
          stock.map((item) => (
            <StockCard key={item.productId} item={item} reloadStock={fetchStock} />
          ))
        )}
      </div>
    </div>
  );
};

export default Stock;
