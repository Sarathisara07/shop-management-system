import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Printer, User, MessageCircle, FileText, Phone, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { API_URL } from '../config';
import './NewTransaction.css';

const NewTransaction = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  
  useEffect(() => {
    fetch(`${API_URL}/api/products`, {
      headers: { 'Authorization': `Bearer ${user.token}` }
    })
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        if (data.length > 0) {
          addItem(data);
        }
      });
  }, []);

  const addItem = (prods = products) => {
    if (prods.length === 0) return;
    const defaultProduct = prods[0];
    setItems(prev => [...prev, {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      product: defaultProduct._id,
      productName: defaultProduct.name,
      weight: '',
      rate: defaultProduct.defaultRate,
      amount: 0
    }]);
  };

  const removeItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id, field, value) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'product') {
          const prod = products.find(p => p._id === value);
          if(prod) {
            updated.productName = prod.name;
            updated.rate = prod.defaultRate;
          }
        }
        updated.amount = (parseFloat(updated.weight || 0) * parseFloat(updated.rate || 0)).toFixed(2);
        return updated;
      }
      return item;
    }));
  };

  const totalWeight = items.reduce((sum, item) => sum + parseFloat(item.weight || 0), 0);
  const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

  const handleSave = async () => {
    const validItems = items.filter(i => i.weight && !isNaN(parseFloat(i.weight)) && parseFloat(i.weight) > 0);

    if (validItems.length === 0) {
      setErrorMessage(t('alertValidWeight'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setErrorMessage(null), 5000);
      return;
    }

    const payloadTotalWeight = validItems.reduce((sum, item) => sum + parseFloat(item.weight), 0);
    const payloadTotalAmount = validItems.reduce((sum, item) => sum + parseFloat(item.amount), 0);

    const payload = {
      customerName: customerName || t('guest'),
      items: validItems.map(i => ({
        product: i.product,
        productName: i.productName,
        weight: parseFloat(i.weight),
        rate: parseFloat(i.rate),
        amount: parseFloat(i.amount)
      })),
      totalWeight: payloadTotalWeight,
      totalAmount: payloadTotalAmount,
      customerPhone: customerPhone
    };

    try {
      const res = await fetch(`${API_URL}/api/transactions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setSuccessMessage(`${t('transactionSaved')} ₹${payloadTotalAmount.toFixed(2)}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // Store for sharing before clearing form
        setLastSaved({
          customerName: customerName || t('guest'),
          customerPhone: customerPhone,
          items: [...items],
          totalAmount: payloadTotalAmount,
          date: new Date().toLocaleDateString()
        });
        
        // Reset items but keep name/phone for a bit for convenience
        setItems([]);
        addItem(products);
        
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (e) {
      setErrorMessage(t('alertFailedSave'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  const handleDownloadPDF = () => {
    const hasValidItems = items.some(i => i.weight && parseFloat(i.weight) > 0);
    const dataToUse = hasValidItems ? {
      customerName,
      customerPhone,
      items: items.filter(i => i.weight && parseFloat(i.weight) > 0),
      totalAmount,
      date: new Date().toLocaleDateString()
    } : lastSaved;

    if (!dataToUse) {
      setErrorMessage(t('alertNoData'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setErrorMessage(null), 5000);
      return;
    }

    if (dataToUse.items.length === 0) {
      setErrorMessage(t('alertValidWeight'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setErrorMessage(null), 5000);
      return;
    }

    const doc = new jsPDF();
    const shopName = user?.parentName || user?.username || 'Shop Owner';
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(40);
    doc.text(shopName, 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(t('shopReceipt'), 105, 30, { align: 'center' });
    
    // Info
    doc.setFontSize(10);
    doc.text(`${t('date')}: ${dataToUse.date}`, 20, 45);
    doc.text(`${t('customerName')}: ${dataToUse.customerName || t('guest')}`, 20, 52);
    if (dataToUse.customerPhone) doc.text(`${t('customerPhone')}: ${dataToUse.customerPhone}`, 20, 59);

    // Table
    const tableData = dataToUse.items.map((item, index) => [
      index + 1,
      item.productName,
      `${item.weight} kg`,
      `Rs. ${item.rate}`,
      `Rs. ${item.amount}`
    ]);

    doc.autoTable({
      startY: 65,
      head: [[ '#', t('material'), t('weight'), t('rate'), t('amount') ]],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [63, 81, 181] }
    });

    // Summary
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${t('totalPayable')}: Rs. ${dataToUse.totalAmount.toFixed(2)}`, 140, finalY);

    // Footer wish
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100);
    // Removing emojis for PDF as it doesn't support them by default
    const thanksText = t('thanksBusiness').replace(/[^\x00-\x7F\u0B80-\u0BFF\s!]/g, '');
    const visitText = t('visitAgain').replace(/[^\x00-\x7F\u0B80-\u0BFF\s!]/g, '');
    doc.text(thanksText, 105, finalY + 20, { align: 'center' });
    doc.text(visitText, 105, finalY + 28, { align: 'center' });

    doc.save(`Receipt_${Date.now()}.pdf`);
  };

  const handleWhatsAppShare = () => {
    const hasValidItems = items.some(i => i.weight && parseFloat(i.weight) > 0);
    const dataToUse = hasValidItems ? {
      customerName,
      customerPhone,
      items: items.filter(i => i.weight && parseFloat(i.weight) > 0),
      totalAmount,
      date: new Date().toLocaleDateString()
    } : lastSaved;

    if (!dataToUse) {
      setErrorMessage(t('alertNoData'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setErrorMessage(null), 5000);
      return;
    }

    if (dataToUse.items.length === 0) {
      setErrorMessage(t('alertValidWeight'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setErrorMessage(null), 5000);
      return;
    }

    if (!dataToUse.customerPhone) {
      setErrorMessage(t('alertEnterPhone'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setErrorMessage(null), 5000);
      return;
    }

    const shopName = user?.parentName || user?.username || 'Shop Owner';
    const cleanPhone = dataToUse.customerPhone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    let message = `*${shopName} - ${t('shopReceipt')}*\n\n`;
    message += `*${t('date')}:* ${dataToUse.date}\n`;
    message += `*${t('customerName')}:* ${dataToUse.customerName || t('guest')}\n\n`;
    
    dataToUse.items.forEach((item, index) => {
      if (item.weight > 0) {
        message += `${index + 1}. ${item.productName}: ${item.weight}kg x Rs.${item.rate} = *Rs.${item.amount}*\n`;
      }
    });

    const star = String.fromCodePoint(0x1F31F);
    const pray = String.fromCodePoint(0x1F64F);
    const smile = String.fromCodePoint(0x1F60A);

    message += `\n*${t('totalPayable')}: Rs.${dataToUse.totalAmount.toFixed(2)}*\n`;
    message += `\n--------------------------\n`;
    message += `${star} *${t('thanksBusiness')} ${pray}* ${star}\n`;
    message += `*${t('visitAgain')} ${smile}*`;

    const encodedMsg = encodeURIComponent(message);
    window.open(`https://wa.me/${phoneWithCountry}?text=${encodedMsg}`, '_blank');
  };

  return (
    <div className="new-tx-container animate-enter">
      <header className="page-header print-hide">
        <h1>{t('newEntry')}</h1>
        <p className="text-muted">{t('recordMaterials')}</p>
      </header>

      {successMessage && (
        <div className="status-banner success animate-slide-down">
          <div className="banner-content">
            <Save size={20} />
            <span>{successMessage}</span>
          </div>
          <button className="banner-close" onClick={() => setSuccessMessage(null)}>&times;</button>
        </div>
      )}

      {errorMessage && (
        <div className="status-banner error animate-slide-down">
          <div className="banner-content">
            <AlertCircle size={20} />
            <span>{errorMessage}</span>
          </div>
          <button className="banner-close" onClick={() => setErrorMessage(null)}>&times;</button>
        </div>
      )}

      <div className="form-section glass-panel print-hide">
        <div className="customer-info-grid">
          <div className="customer-input">
            <label>{t('customerName')} ({t('optional')})</label>
            <div className="input-with-icon">
              <User size={18} className="input-icon" />
              <input 
                type="text" 
                className="input-field" 
                placeholder={t('placeholderCustomer')}
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
              />
            </div>
          </div>

          <div className="customer-input">
            <label>{t('customerPhone')} ({t('optional')})</label>
            <div className="input-with-icon">
              <Phone size={18} className="input-icon" />
              <input 
                type="tel" 
                className="input-field" 
                placeholder="e.g. 9876543210"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="items-list">
          {items.map((item, index) => (
            <div key={item.id} className="item-row">
              <div className="row-header">
                <h3>{t('item')} {index + 1}</h3>
                {items.length > 1 && (
                  <button onClick={() => removeItem(item.id)} className="btn-icon danger"><Trash2 size={18}/></button>
                )}
              </div>
              
              <div className="item-inputs">
                <div className="input-group">
                  <label>{t('material')}</label>
                  <select 
                    className="input-field"
                    value={item.product}
                    onChange={(e) => updateItem(item.id, 'product', e.target.value)}
                  >
                    {products.map(p => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="input-group">
                  <label>{t('weight')} (kg)</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    placeholder="0.0"
                    value={item.weight}
                    onChange={(e) => updateItem(item.id, 'weight', e.target.value)}
                    onWheel={(e) => e.target.blur()}
                  />
                </div>

                <div className="input-group">
                  <label>{t('rate')} (₹)</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    value={item.rate}
                    onChange={(e) => updateItem(item.id, 'rate', e.target.value)}
                    onWheel={(e) => e.target.blur()}
                  />
                </div>
              </div>
              
              <div className="item-total">
                <span>{t('value')}: </span>
                <strong>₹ {item.amount}</strong>
              </div>
            </div>
          ))}
        </div>

        <button className="btn-add-row" onClick={() => addItem()}>
          <Plus size={20} /> {t('addMaterial')}
        </button>

        <div className="tx-summary">
          <div className="summary-row">
            <span>{t('totalWeight')}:</span>
            <strong>{totalWeight.toFixed(2)} kg</strong>
          </div>
          <div className="summary-row grand-total">
            <span>{t('totalPayable')}:</span>
            <strong className="text-gradient">₹ {totalAmount.toFixed(2)}</strong>
          </div>
        </div>

        <div className="action-buttons">
          <button className="btn-primary" onClick={handleSave}>
            <Save size={20} /> {t('saveTransaction')}
          </button>
          <div className="secondary-actions">
            <button className="btn-secondary" onClick={handleDownloadPDF}>
              <FileText size={20} /> {t('downloadPDF')}
            </button>
            <button className="btn-whatsapp" onClick={handleWhatsAppShare}>
              <MessageCircle size={20} /> {t('shareWA')}
            </button>
            <button className="btn-secondary" onClick={() => window.print()}>
              <Printer size={20} /> {t('printReceipt')}
            </button>
          </div>
        </div>
      </div>

      <div className="print-only" style={{ background: '#fff', color: '#000', padding: '20px' }}>
        <h2 style={{ textAlign: 'center', margin: '0 0 5px 0' }}>{t('shopReceipt')}</h2>
        <p style={{ textAlign: 'center', margin: '0 0 20px 0', fontSize: '14px', color: '#555' }}>
          {t('date')}: {new Date().toLocaleDateString()}
        </p>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', color: '#000' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #000' }}>
              <th style={{ textAlign: 'left', padding: '8px 0' }}>Material</th>
              <th style={{ textAlign: 'right', padding: '8px 0' }}>Weight</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => item.weight && (
              <tr key={i} style={{ borderBottom: '1px solid #ccc' }}>
                <td style={{ padding: '8px 0' }}>{item.productName}</td>
                <td style={{ textAlign: 'right', padding: '8px 0' }}>{item.weight} kg</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px dashed #000', paddingTop: '10px', fontSize: '1.2rem', fontWeight: 'bold' }}>
          <span>Total Pay:</span>
          <span>₹ {totalAmount.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default NewTransaction;
