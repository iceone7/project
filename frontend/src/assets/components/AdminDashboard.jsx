// AdminDashboard.jsx
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import '../css/UserManagement.css';
import edit_delete from '../css/edit_detele.module.css';
import defaultInstance from '../../api/defaultInstance';
import modalStyles from '../css/AddUser.module.css';
import deleteModalStyles from '../css/DeleteModal.module.css';
import { LanguageProvider } from '../i18n/LanguageContext';

const API_URL = import.meta.env.VITE_API_BASE_URL;

const AdminDashboard = () => {
  const role = localStorage.getItem('role');

  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('admins');
  const [searchFilter, setSearchFilter] = useState('');
  const [filteredAdmins, setFilteredAdmins] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    id: null,
    username: '',
    email: '',
    password: '',
    role: 'user',
    department_id: '',
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    // Add keyboard shortcut for search focus - this is an alternative to filter toggling
    // that makes more sense in an admin context
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault();
        // Focus on the search input when Ctrl+F is pressed
        const searchInput = document.querySelector('input[type="text"][placeholder*="search" i]');
        if (searchInput) {
          searchInput.focus();
          console.log('Search focused in AdminDashboard via Ctrl+F');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (role === 'super_admin' || role === 'admin') {
      fetchUsers();
    }
    if (role === 'super_admin') {
      fetchDepartments();
    }
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await defaultInstance.get(`${API_URL}/admin/users`);
      setUsers(res.data.data || res.data);
    } catch {
      // Handle error silently or show a toast notification
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await defaultInstance.get(`${API_URL}/departments`);
      setDepartments(res.data);
    } catch {
      // Handle error silently
    }
  };

  useEffect(() => {
    const admins = users.filter(u => u.role === 'admin');
    const usersOnly = users.filter(u => u.role === 'user');
    const filterData = (data, filter) =>
      filter.trim()
        ? data.filter(
            u =>
              (u.username || u.name || '').toLowerCase().includes(filter.toLowerCase()) ||
              (u.email || '').toLowerCase().includes(filter.toLowerCase()) ||
              (u.department?.name || '').toLowerCase().includes(filter.toLowerCase())
          )
        : data;
    setFilteredAdmins(filterData(admins, searchFilter));
    setFilteredUsers(filterData(usersOnly, searchFilter));
  }, [users, searchFilter]);

  const openModal = (user = null) => {
    setFormError('');
    if (user) {
      setEditMode(true);
      setForm({
        id: user.id,
        username: user.username || user.name,
        email: user.email,
        password: '',
        role: user.role,
        department_id: user.department_id || (user.department ? user.department.id : ''),
      });
    } else {
      setEditMode(false);
      setForm({
        id: null,
        username: '',
        email: '',
        password: '',
        role: 'user',
        department_id: '',
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormError('');
    setEditMode(false);
    setForm({
      id: null,
      username: '',
      email: '',
      password: '',
      role: 'user',
      department_id: '',
    });
  };

  const handleInput = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    if (!form.username || !form.email || (role === 'super_admin' && !form.department_id) || !form.role) {
      setFormError('All fields except password are required');
      setFormLoading(false);
      return;
    }
    if (!editMode && !form.password) {
      setFormError('Password is required');
      setFormLoading(false);
      return;
    }

    const payload = {
      name: form.username,
      email: form.email,
      password: form.password || undefined,
      role: form.role,
      ...(role === 'super_admin' && { department_id: form.department_id }),
    };

    try {
      if (editMode) {
        await defaultInstance.put(`${API_URL}/admin/users/${form.id}`, payload);
      } else {
        await defaultInstance.post(`${API_URL}/admin/create-user`, payload);
      }
      await fetchUsers();
      closeModal();
    } catch (err) {
      setFormError(
        err.response?.data?.message ||
          (err.response?.data?.errors
            ? Object.values(err.response.data.errors).flat().join(', ')
            : editMode
            ? 'Failed to update user'
            : 'Failed to add user')
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = id => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = id => {
    setDeletingId(id);
    setConfirmDeleteId(null);
    setTimeout(() => {
      defaultInstance
        .delete(`${API_URL}/admin/users/${id}`)
        .then(() => {
          fetchUsers();
          setDeletingId(null);
        })
        .catch(() => setDeletingId(null));
    }, 400);
  };

  const cancelDelete = () => {
    setConfirmDeleteId(null);
  };

  if (role !== 'super_admin' && role !== 'admin') {
    return <div style={{ padding: 40, color: 'red' }}>Access denied.</div>;
  }

  return (
    <LanguageProvider>
      <div className="dashboard-main-wrapper">
        <Sidebar activeDashboard="admin" setActiveDashboard={() => {}} />
        <div className="dashboard-wrapper">
          <div className="dashboard-ecommerce">
            <div className="container-fluid dashboard-content">
              <div className="row">
                <div className="col-12">
                  <Header activeDashboard="admin" />
                  <section className="user-section fade-in">
                    <div className="user-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3>User & Admin Management</h3>
                      <button className="add-user-btn" onClick={() => openModal()}>
                        Add {role === 'super_admin' ? 'User/Admin' : 'User'}
                      </button>
                    </div>
                    <div style={{ margin: '20px 0', display: 'flex', gap: '10px' }}>
                      <button
                        className={`tab-btn${activeTab === 'admins' ? ' tab-btn-active-admin' : ''}`}
                        onClick={() => {
                          setActiveTab('admins');
                          setSearchFilter('');
                        }}
                      >
                        Admins
                      </button>
                      <button
                        className={`tab-btn${activeTab === 'users' ? ' tab-btn-active-user' : ''}`}
                        onClick={() => {
                          setActiveTab('users');
                          setSearchFilter('');
                        }}
                      >
                        Users
                      </button>
                    </div>
                    <div style={{ margin: '20px 0', display: 'flex', alignItems: 'center' }}>
                      <div
                        style={{
                          position: 'relative',
                          width: '340px',
                          transition: 'box-shadow 0.3s',
                          boxShadow: searchFocused ? `0 4px 16px rgba(${activeTab === 'admins' ? '37,99,235' : '16,185,129'},0.15)` : '0 1px 2px rgba(0,0,0,0.03)',
                          borderRadius: 12,
                          background: '#fff',
                        }}
                      >
                        <input
                          type="text"
                          placeholder={`Search ${activeTab === 'admins' ? 'admins' : 'users'}...`}
                          value={searchFilter}
                          onChange={e => setSearchFilter(e.target.value)}
                          onFocus={() => setSearchFocused(true)}
                          onBlur={() => setSearchFocused(false)}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: searchFocused ? `2px solid ${activeTab === 'admins' ? '#2563eb' : '#10b981'}` : '2px solid #e5e7eb',
                            borderRadius: 12,
                            fontSize: 17,
                            background: activeTab === 'admins' ? '#f3f6fa' : '#f6fefb',
                            outline: 'none',
                            transition: 'border-color 0.3s, box-shadow 0.3s',
                            boxShadow: searchFocused ? `0 0 0 2px ${activeTab === 'admins' ? '#2563eb33' : '#10b98133'}` : 'none',
                          }}
                        />
                        <span
                          style={{
                            position: 'absolute',
                            right: 16,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#9ca3af',
                            fontSize: 15,
                            pointerEvents: 'none',
                          }}
                        >
                          {activeTab === 'admins' ? 'Admin Search' : 'User Search'}
                        </span>
                      </div>
                    </div>
                    <div className="user-table-container">
                      {loading ? (
                        <div>Loading {activeTab}...</div>
                      ) : (
                        <table className="user-table">
                          <thead>
                            <tr>
                              <th>ID</th>
                              <th>Username</th>
                              <th>Email</th>
                              <th>Role</th>
                              <th>Department</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(activeTab === 'admins' ? filteredAdmins : filteredUsers).map(item => (
                              <tr
                                key={item.id}
                                className={deletingId === item.id ? 'delete-anim' : ''}
                                style={{
                                  transition: 'background 0.3s, opacity 0.4s, transform 0.4s',
                                  background: deletingId === item.id ? '#fee2e2' : undefined,
                                  opacity: deletingId === item.id ? 0 : 1,
                                  transform: deletingId === item.id ? 'scale(0.96)' : 'scale(1)',
                                }}
                              >
                                <td>{item.id}</td>
                                <td>{item.username || item.name}</td>
                                <td>{item.email}</td>
                                <td>{item.role}</td>
                                <td>{item.department?.name || '-'}</td>
                                <td className={edit_delete.editdelete}>
                                  <button
                                    onClick={() => handleDelete(item.id)}
                                    className={`${edit_delete.deletebutton} delete-btn-anim`}
                                    title="Delete"
                                    disabled={deletingId === item.id}
                                    style={{
                                      transition: 'transform 0.2s, background 0.2s, color 0.2s',
                                      transform: deletingId === item.id ? 'scale(1.15) rotate(-10deg)' : 'none',
                                      background: deletingId === item.id ? '#ef4444' : undefined,
                                      color: deletingId === item.id ? '#fff' : undefined,
                                      boxShadow: deletingId === item.id ? '0 0 12px #ef4444aa' : undefined,
                                    }}
                                  >
                                    <svg className={edit_delete.deletesvgIcon} viewBox="0 0 448 512">
                                      <path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"></path>
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => openModal(item)}
                                    className={edit_delete.editbutton}
                                    title="Edit"
                                  >
                                    <svg className={edit_delete.editsvgIcon} viewBox="0 0 512 512">
                                      <path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z"></path>
                                    </svg>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                    {showModal && (
                      <div className={modalStyles.modalOverlay}>
                        <div className={modalStyles.modalContent}>
                          <div className={modalStyles.modalHeader}>
                            <h4 className={modalStyles.modalTitle}>
                              {editMode ? 'Edit' : 'Add'}{' '}
                              <span className={modalStyles.modalTitleAccent}>
                                {role === 'super_admin' ? 'User/Admin' : 'User'}
                              </span>
                            </h4>
                            <button
                              className={modalStyles.modalClose}
                              onClick={closeModal}
                              aria-label="Close"
                            >
                              ×
                            </button>
                          </div>
                          <form onSubmit={handleSubmit} className={modalStyles.userForm}>
                            <input
                              name="username"
                              placeholder="Username"
                              value={form.username}
                              onChange={handleInput}
                              required
                              className={modalStyles.input}
                            />
                            <input
                              name="email"
                              placeholder="Email"
                              type="email"
                              value={form.email}
                              onChange={handleInput}
                              required
                              className={modalStyles.input}
                            />
                            {role === 'super_admin' && (
                              <>
                                <select
                                  name="role"
                                  value={form.role}
                                  onChange={handleInput}
                                  required
                                  className={modalStyles.select}
                                >
                                  <option value="user">User</option>
                                  <option value="admin">Admin</option>
                                </select>
                                <select
                                  name="department_id"
                                  value={form.department_id}
                                  onChange={handleInput}
                                  required
                                  className={modalStyles.select}
                                >
                                  <option value="">Select Department</option>
                                  {departments.map(dep => (
                                    <option key={dep.id} value={dep.id}>
                                      {dep.name}
                                    </option>
                                  ))}
                                </select>
                              </>
                            )}
                            {role === 'admin' && <input type="hidden" name="role" value="user" />}
                            <input
                              name="password"
                              placeholder={editMode ? 'New Password (optional)' : 'Password'}
                              type="password"
                              value={form.password}
                              onChange={handleInput}
                              required={!editMode}
                              className={modalStyles.input}
                            />
                            {formError && <div className={modalStyles.userError}>{formError}</div>}
                            <div className={modalStyles.modalFooter}>
                              <button
                                type="button"
                                onClick={closeModal}
                                className={modalStyles.cancelBtn}
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={formLoading}
                                className={modalStyles.submitBtn}
                              >
                                {formLoading ? 'Saving...' : editMode ? 'Update' : 'Add'}
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}
                    {confirmDeleteId && (
                      <div className={deleteModalStyles.deleteModalOverlay}>
                        <div className={deleteModalStyles.deleteModalContent}>
                          <div className={deleteModalStyles.deleteModalHeader}>
                            <span role="img" aria-label="warning" style={{ fontSize: 32, marginRight: 10 }}>
                              ⚠️
                            </span>
                            <span style={{ fontWeight: 600, fontSize: 20, color: '#ef4444' }}>
                              Confirm Deletion
                            </span>
                          </div>
                          <div className={deleteModalStyles.deleteModalText}>
                            Are you sure you want to delete this user? This action cannot be undone.
                          </div>
                          <div className={deleteModalStyles.deleteModalFooter}>
                            <button
                              onClick={cancelDelete}
                              className={deleteModalStyles.cancelBtn}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => confirmDelete(confirmDeleteId)}
                              className={deleteModalStyles.deleteBtn}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LanguageProvider>
  );
};

export default AdminDashboard;