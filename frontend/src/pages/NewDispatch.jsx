import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, ArrowUpRight } from 'lucide-react';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import './NewTransaction.css';

const NewDispatch = () => {
  const { user } = useAuth();
  const [destination, setDestination] = useState('');
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]);
  
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
      id: Date.now(),
      product: defaultProduct._id,
      productName: defaultProduct.name,
      weight: ''
    }]);
  };

  const removeItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id, field, value) => {
    const newItems = items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'product') {
          const prod = products.find(p => p._id === value);
          if(prod) {
            updated.productName = prod.name;
          }
        }
        return updated;
      }
      return item;
    });
    setItems(newItems);
  };

  const totalWeight = items.reduce((sum, item) => sum + parseFloat(item.weight || 0), 0);

  const handleSave = async () => {
    if (items.some(i => !i.weight || parseFloat(i.weight) <= 0)) {
      alert("Please enter valid weights for all items");
      return;
    }

    const payload = {
      destination: destination || 'Unknown Wholesaler',
      items: items.map(i => ({
        product: i.product,
        productName: i.productName,
        weight: parseFloat(i.weight)
      })),
      totalWeight
    };

    try {
      const res = await fetch(`${API_URL}/api/dispatch`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert("Dispatch Saved! Stock reduced successfully.");
        setDestination('');
        setItems([]);
        addItem();
      }
    } catch (e) {
      alert("Failed to save dispatch");
    }
  };

  return (
    <div className="new-tx-container animate-enter">
      <header className="page-header">
        <h1>Dispatch Materials</h1>
        <p className="text-muted">Reduce stock by recording an outward dispatch</p>
      </header>

      <div className="form-section glass-panel">
        <div className="customer-input">
          <label>Destination / Wholesaler Name (Optional)</label>
          <input 
            type="text" 
            className="input-field" 
            placeholder="e.g. ABC Recyclers"
            value={destination}
            onChange={e => setDestination(e.target.value)}
          />
        </div>

        <div className="items-list">
          {items.map((item, index) => (
            <div key={item.id} className="item-row">
              <div className="row-header">
                <h3>Material {index + 1}</h3>
                {items.length > 1 && (
                  <button onClick={() => removeItem(item.id)} className="btn-icon danger"><Trash2 size={18}/></button>
                )}
              </div>
              
              <div className="item-inputs" style={{ gridTemplateColumns: '2fr 1fr' }}>
                <div className="input-group">
                  <label>Select Material</label>
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
                  <label>Weight Given Out (kg)</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    placeholder="0.0"
                    value={item.weight}
                    onChange={(e) => updateItem(item.id, 'weight', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button className="btn-add-row" onClick={() => addItem()}>
          <Plus size={20} /> Add Another Material
        </button>

        <div className="tx-summary">
          <div className="summary-row grand-total text-gradient">
            <span>Total Weight Dispatched:</span>
            <strong>{totalWeight.toFixed(2)} kg</strong>
          </div>
        </div>

        <div className="action-buttons" style={{ gridTemplateColumns: '1fr' }}>
          <button className="btn-primary" onClick={handleSave}>
            <ArrowUpRight size={20} /> Record Dispatch (Reduce Stock)
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewDispatch;
