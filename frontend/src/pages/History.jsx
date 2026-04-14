import { useState, useEffect, useRef } from 'react';
import { Trash2, Clock, User, IndianRupee, MessageCircle } from 'lucide-react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { API_URL } from '../config';
import './History.css';

const History = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [transactions, setTransactions] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const socketRef = useRef(null);

  const fetchTransactions = () => {
    fetch(`${API_URL}/api/transactions?date=${selectedDate}`, {
      headers: { 'Authorization': `Bearer ${user.token}` }
    })
      .then(res => res.json())
      .then(data => setTransactions(data));
  };

  useEffect(() => {
    fetchTransactions();
    
    // Connect to Socket.io for real-time updates
    if (!socketRef.current && user) {
      socketRef.current = io(API_URL);
      socketRef.current.emit('join', user.shopOwnerId || user.id);
      
      socketRef.current.on('data_changed', () => {
        fetchTransactions();
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [selectedDate, user?.id]);

  const handleDelete = async (id) => {
    if(window.confirm('Are you sure you want to delete this transaction record?')) {
      await fetch(`${API_URL}/api/transactions/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      fetchTransactions();
    }
  };

  const handleWhatsAppShare = (tx) => {
    const shopName = user.parentName || user.username;
    
    let message = `*${shopName} Bill Receipt*\n\n`;
    message += `*Customer:* ${tx.customerName || 'Guest'}\n`;
    message += `*Date:* ${new Date(tx.date).toLocaleString()}\n\n`;
    message += `*Items:*\n`;
    
    tx.items.forEach(item => {
      message += `- ${item.productName}: ${item.weight}kg @ ₹${item.rate} = ₹${item.amount}\n`;
    });
    
    message += `\n*Total Weight:* ${tx.totalWeight}kg\n`;
    message += `*Grand Total: ₹${tx.totalAmount}*\n\n`;
    message += `Thank you for your business!`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  return (
    <div className="history-container animate-enter">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>{t('transaction_history')}</h1>
          <p className="text-muted">{t('review_past_entries')} {selectedDate}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('filter_by_date')}</label>
          <input 
            type="date" 
            className="input-field" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ padding: '10px 14px', width: 'auto' }}
          />
        </div>
      </header>

      <div className="tx-list">
        {transactions.length === 0 && (
          <p className="text-muted">{t('no_transactions_found')}</p>
        )}
        {transactions.map(tx => (
          <div key={tx._id} className="glass-panel tx-card">
            <div className="tx-header">
              <div className="tx-info">
                <div className="info-item">
                  <User size={16} className="text-muted" />
                  <strong>{tx.customerName || t('guest')}</strong>
                </div>
                <div className="info-item">
                  <Clock size={16} className="text-muted" />
                  <span>{new Date(tx.date).toLocaleString()}</span>
                </div>
              </div>
              <div className="action-buttons" style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-icon" onClick={() => handleWhatsAppShare(tx)} title="Share to WhatsApp">
                  <MessageCircle size={18} style={{ color: '#25D366' }} />
                </button>
                <button className="btn-icon danger" onClick={() => handleDelete(tx._id)}>
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            
            <div className="tx-body">
              <div className="tx-items">
                {tx.items.map((item, i) => (
                  <div key={i} className="tx-item-row">
                    <span>{item.productName} ({item.weight}kg @ ₹{item.rate})</span>
                    <span>₹{item.amount}</span>
                  </div>
                ))}
              </div>
              
              <div className="tx-footer">
                <div className="total-weight text-muted">
                  {t('total_weight')}: {tx.totalWeight} kg
                </div>
                <div className="total-amount text-gradient">
                  <IndianRupee size={20} />
                  <span>{tx.totalAmount}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default History;
