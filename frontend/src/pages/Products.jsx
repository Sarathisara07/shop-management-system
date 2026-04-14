import { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus, Save, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { API_URL } from '../config';
import './Products.css';

const Products = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', defaultRate: '', wholesaleRate: '' });
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchProducts = () => {
    fetch(`${API_URL}/api/products`, {
      headers: { 'Authorization': `Bearer ${user.token}` }
    })
      .then(res => res.json())
      .then(data => setProducts(data));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleEdit = (p) => {
    setEditingId(p._id);
    setEditForm({ name: p.name, defaultRate: p.defaultRate, wholesaleRate: p.wholesaleRate || '' });
  };

  const handleUpdate = async (id) => {
    const payload = {
      name: editForm.name,
      defaultRate: Number(editForm.defaultRate),
      wholesaleRate: Number(editForm.wholesaleRate || 0)
    };

    try {
      const res = await fetch(`${API_URL}/api/products/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        alert(`Failed to update material: ${errData.message || 'Unknown error'}`);
        return;
      }

      setEditingId(null);
      fetchProducts();
    } catch (err) {
      alert("Network error. Please check if backend is running.");
    }
  };

  const handleDelete = async (id) => {
    if(window.confirm('Are you sure you want to delete this material?')) {
      await fetch(`${API_URL}/api/products/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      fetchProducts();
    }
  };

  const handleAdd = async () => {
    if(!editForm.name || !editForm.defaultRate) return;
    
    const payload = {
      name: editForm.name,
      defaultRate: Number(editForm.defaultRate),
      wholesaleRate: Number(editForm.wholesaleRate || 0)
    };

    try {
      const res = await fetch(`${API_URL}/api/products`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errData = await res.json();
        alert(`Failed to add material: ${errData.message || 'Unknown error'}`);
        return;
      }

      setShowAddForm(false);
      setEditForm({ name: '', defaultRate: '', wholesaleRate: '' });
      fetchProducts();
    } catch (err) {
      alert("Network error. Please check if backend is running.");
    }
  };

  return (
    <div className="products-container animate-enter">
      <header className="page-header flex-between">
        <div>
          <h1>Materials Settings</h1>
          <p className="text-muted">Manage default rates per kg</p>
        </div>
        <button className="btn-primary" onClick={() => {
          setShowAddForm(true);
          setEditingId(null);
          setEditForm({ name: '', defaultRate: '', wholesaleRate: '' });
        }}>
          <Plus size={20} /> Add Material
        </button>
      </header>

      {showAddForm && (
        <div className="glass-panel form-card">
          <h3>Add New Material</h3>
          <div className="form-grid">
            <input 
              type="text" 
              placeholder="Material Name (e.g. Copper)" 
              className="input-field"
              value={editForm.name}
              onChange={e => setEditForm({...editForm, name: e.target.value})}
            />
            <input 
              type="number" 
              placeholder="Buying Rate (₹/kg)" 
              className="input-field"
              value={editForm.defaultRate}
              onChange={e => setEditForm({...editForm, defaultRate: e.target.value})}
            />
            <input 
              type="number" 
              placeholder="Wholesale Rate (₹/kg)" 
              className="input-field"
              value={editForm.wholesaleRate}
              onChange={e => setEditForm({...editForm, wholesaleRate: e.target.value})}
            />
            <div className="actions">
              <button className="btn-primary" onClick={handleAdd}><Save size={18}/> Save</button>
              <button className="btn-secondary" onClick={() => setShowAddForm(false)}><X size={18}/> Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="materials-list">
        {products.length === 0 && !showAddForm && (
          <p className="text-muted">No materials found. Add one to start.</p>
        )}
        {products.map(p => (
          <div key={p._id} className="glass-panel material-row">
            {editingId === p._id ? (
              <div className="edit-mode-grid">
                 <input 
                  type="text" 
                  className="input-field"
                  value={editForm.name}
                  onChange={e => setEditForm({...editForm, name: e.target.value})}
                />
                <div className="rate-input-wrapper">
                  <span className="rate-label">{t('buyingRate')}:</span>
                  <input 
                    type="number" 
                    className="input-field"
                    value={editForm.defaultRate}
                    onChange={e => setEditForm({...editForm, defaultRate: e.target.value})}
                  />
                </div>
                <div className="rate-input-wrapper">
                  <span className="rate-label">{t('wholesaleRate')}:</span>
                  <input 
                    type="number" 
                    className="input-field"
                    value={editForm.wholesaleRate}
                    onChange={e => setEditForm({...editForm, wholesaleRate: e.target.value})}
                  />
                </div>
                <div className="actions">
                  <button className="btn-icon success" onClick={() => handleUpdate(p._id)}><Save size={18}/></button>
                  <button className="btn-icon danger" onClick={() => setEditingId(null)}><X size={18}/></button>
                </div>
              </div>
            ) : (
              <>
                <div className="material-info">
                  <h3>{p.name}</h3>
                  <div className="rates-container">
                    <div className="rate-badge buy">{t('buyingRate')}: ₹{p.defaultRate}</div>
                    <div className="rate-badge sell">{t('sellingRate')}: ₹{p.wholesaleRate !== undefined ? p.wholesaleRate : p.defaultRate}</div>
                  </div>
                </div>
                <div className="material-actions">
                  <button className="btn-icon" onClick={() => handleEdit(p)}><Pencil size={18}/></button>
                  <button className="btn-icon danger" onClick={() => handleDelete(p._id)}><Trash2 size={18}/></button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Products;
