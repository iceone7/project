import { useState, useEffect } from 'react';

const AddAdminModal = ({ onClose, onSave, editingItem, editMode }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    role: 'admin',
  });

  useEffect(() => {
    if (editMode && editingItem) {
      setFormData({
        username: editingItem.username || '',
        email: editingItem.email || '',
        role: editingItem.role || 'admin',
      });
    }
  }, [editMode, editingItem]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{editMode ? 'Edit Admin' : 'Add Admin'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Role</label>
            <select name="role" value={formData.role} onChange={handleChange}>
              <option value="admin">Admin</option>
              <option value="superadmin">Superadmin</option>
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit">{editMode ? 'Update' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAdminModal;