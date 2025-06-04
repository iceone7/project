import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import '../css/UserManagement.css';
import edit_delete from '../css/edit_detele.module.css';
import defaultInstance from '../../api/defaultInstance';
import modalStyles from '../css/AddUser.module.css';
import deleteModalStyles from '../css/DeleteModal.module.css';

const API_URL = import.meta.env.VITE_API_BASE_URL;

const AdminDashboard = () => {
  const role = localStorage.getItem('role');

  // --- Data state ---
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- Modal state ---
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

  // --- Filtering state ---
  const [adminFilter, setAdminFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [adminFocused, setAdminFocused] = useState(false);
  const [userFocused, setUserFocused] = useState(false);
  const [filteredAdmins, setFilteredAdmins] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);

  // --- Deletion state ---
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // --- Fetch data ---
  useEffect(() => {
    if (role === 'super_admin' || role === 'admin') {
      fetchUsers();
    }
    if (role === 'super_admin') {
      fetchDepartments();
    }
    // eslint-disable-next-line
  }, []);

  const fetchUsers = () => {
    setLoading(true);
    defaultInstance.get(`${API_URL}/admin/users`)
      .then(res => {
        setUsers(res.data.data || res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const fetchDepartments = () => {
    defaultInstance.get(`${API_URL}/departments`)
      .then(res => setDepartments(res.data))
      .catch(() => {});
  };

  // --- Filter admins and users whenever users/filter changes ---
  useEffect(() => {
    const admins = (users || []).filter(u => u.role === 'admin');
    const usersOnly = (users || []).filter(u => u.role === 'user');
    setFilteredAdmins(
      adminFilter.trim()
        ? admins.filter(a =>
            (a.username || a.name || '').toLowerCase().includes(adminFilter.toLowerCase()) ||
            (a.email || '').toLowerCase().includes(adminFilter.toLowerCase()) ||
            (a.department?.name || '').toLowerCase().includes(adminFilter.toLowerCase())
          )
        : admins
    );
    setFilteredUsers(
      userFilter.trim()
        ? usersOnly.filter(u =>
            (u.username || u.name || '').toLowerCase().includes(userFilter.toLowerCase()) ||
            (u.email || '').toLowerCase().includes(userFilter.toLowerCase()) ||
            (u.department?.name || '').toLowerCase().includes(userFilter.toLowerCase())
          )
        : usersOnly
    );
    // eslint-disable-next-line
  }, [users, adminFilter, userFilter]);

  // --- Modal logic ---
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

  // --- Submit logic ---
  const handleSubmit = e => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    // Validation
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

    // Prepare payload
    const payload = {
      name: form.username,
      email: form.email,
      password: form.password || undefined,
      role: form.role,
    };
    if (role === 'super_admin' || (editMode && role === 'super_admin')) {
      payload.department_id = form.department_id;
    }

    if (editMode) {
      defaultInstance.put(`${API_URL}/admin/users/${form.id}`, {
        ...payload,
        department_id: (role === 'super_admin') ? form.department_id : undefined,
      })
        // eslint-disable-next-line
        .then(res => {
          fetchUsers();
          closeModal();
          setFormLoading(false);
        })
        .catch(err => {
          setFormError(
            err.response?.data?.message ||
            (err.response?.data?.errors
              ? Object.values(err.response.data.errors).flat().join(', ')
              : 'Failed to update user')
          );
          setFormLoading(false);
        });
    } else {
      defaultInstance.post(`${API_URL}/admin/create-user`, payload)
        // eslint-disable-next-line
        .then(res => {
          fetchUsers();
          closeModal();
          setFormLoading(false);
        })
        .catch(err => {
          setFormError(
            err.response?.data?.message ||
            (err.response?.data?.errors
              ? Object.values(err.response.data.errors).flat().join(', ')
              : 'Failed to add user')
          );
          setFormLoading(false);
        });
    }
  };

  // --- Delete logic with animation and modal ---
  const handleDelete = id => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = id => {
    setDeletingId(id);
    setConfirmDeleteId(null);
    setTimeout(() => {
      defaultInstance.delete(`${API_URL}/admin/users/${id}`)
        .then(() => {
          fetchUsers();
          setDeletingId(null);
        })
        .catch(() => setDeletingId(null));
    }, 400); // match animation duration
  };

  const cancelDelete = () => {
    setConfirmDeleteId(null);
  };

  // --- Render ---
  if (role !== 'super_admin' && role !== 'admin') {
    return <div style={{ padding: 40, color: 'red' }}>Access denied.</div>;
  }

  return (
    <div className="dashboard-main-wrapper">
      <Sidebar activeDashboard="admin" setActiveDashboard={() => {}} />
      <div className="dashboard-wrapper">
        <div className="dashboard-ecommerce">
          <div className="container-fluid dashboard-content">
            <div className="row">
              <div className="col-12">
                <Header activeDashboard="admin" />
                <section className="user-section fade-in">
                  <div className="user-section-header">
                    <h3>User & Admin Management</h3>
                    <button className="add-user-btn" onClick={() => openModal()}>
                      Add {role === 'super_admin' ? 'User/Admin' : 'User'}
                    </button>
                  </div>

                  {/* Admins search bar */}
                  <div style={{ margin: '32px 0 12px 0', display: 'flex', alignItems: 'center' }}>
                    <div
                      style={{
                        position: 'relative',
                        width: '340px',
                        marginRight: 24,
                        transition: 'box-shadow 0.3s',
                        boxShadow: adminFocused ? '0 4px 16px rgba(37,99,235,0.15)' : '0 1px 2px rgba(0,0,0,0.03)',
                        borderRadius: 12,
                        background: '#fff',
                      }}
                    >
                      <input
                        type="text"
                        placeholder=" Search admins..."
                        value={adminFilter}
                        onChange={e => setAdminFilter(e.target.value)}
                        onFocus={() => setAdminFocused(true)}
                        onBlur={() => setAdminFocused(false)}
                        style={{
                          width: '100%',
                          padding: '12px 44px 12px 44px',
                          border: adminFocused ? '2px solid #2563eb' : '2px solid #e5e7eb',
                          borderRadius: 12,
                          fontSize: 17,
                          background: '#f3f6fa',
                          outline: 'none',
                          transition: 'border-color 0.3s, box-shadow 0.3s',
                          boxShadow: adminFocused ? '0 0 0 2px #2563eb33' : 'none',
                        }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          left: 16,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: adminFocused ? '#2563eb' : '#9ca3af',
                          fontSize: 20,
                          pointerEvents: 'none',
                          transition: 'color 0.3s',
                        }}
                      >👑</span>
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
                      >Admin Search</span>
                    </div>
                  </div>

                  {/* Admins table */}
                  <div className="user-table-container" style={{ marginBottom: 40 }}>
                    {loading ? (
                      <div>Loading admins...</div>
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
                          {filteredAdmins.map(admin => (
                            <tr key={admin.id}>
                              <td>{admin.id}</td>
                              <td>{admin.username || admin.name}</td>
                              <td>{admin.email}</td>
                              <td>{admin.role}</td>
                              <td>{admin.department?.name || '-'}</td>
                              <td className={edit_delete.editdelete}>
                                <button
                                  onClick={() => handleDelete(admin.id)}
                                  className={edit_delete.deletebutton}
                                  title="Delete"
                                >
                                  <svg className={edit_delete.deletesvgIcon} viewBox="0 0 448 512">
                                    <path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"></path>
                                  </svg>
                                </button>
                                <button
                                  onClick={() => openModal(admin)}
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

                  {/* Users search bar */}
                  <div style={{ margin: '32px 0 12px 0', display: 'flex', alignItems: 'center' }}>
                    <div
                      style={{
                        position: 'relative',
                        width: '340px',
                        marginRight: 24,
                        transition: 'box-shadow 0.3s',
                        boxShadow: userFocused ? '0 4px 16px rgba(16,185,129,0.15)' : '0 1px 2px rgba(0,0,0,0.03)',
                        borderRadius: 12,
                        background: '#fff',
                      }}
                    >
                      <input
                        type="text"
                        placeholder=" Search users..."
                        value={userFilter}
                        onChange={e => setUserFilter(e.target.value)}
                        onFocus={() => setUserFocused(true)}
                        onBlur={() => setUserFocused(false)}
                        style={{
                          width: '100%',
                          padding: '12px 44px 12px 44px',
                          border: userFocused ? '2px solid #10b981' : '2px solid #e5e7eb',
                          borderRadius: 12,
                          fontSize: 17,
                          background: '#f6fefb',
                          outline: 'none',
                          transition: 'border-color 0.3s, box-shadow 0.3s',
                          boxShadow: userFocused ? '0 0 0 2px #10b98133' : 'none',
                        }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          left: 16,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: userFocused ? '#10b981' : '#9ca3af',
                          fontSize: 20,
                          pointerEvents: 'none',
                          transition: 'color 0.3s',
                        }}
                      >👤</span>
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
                      >User Search</span>
                    </div>
                  </div>

                  {/* Users table */}
                  <div className="user-table-container">
                    {loading ? (
                      <div>Loading users...</div>
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
                          {filteredUsers.map(user => (
                            <tr
                              key={user.id}
                              className={deletingId === user.id ? 'delete-anim' : ''}
                              style={{
                                transition: 'background 0.3s, opacity 0.4s, transform 0.4s',
                                background: deletingId === user.id ? '#fee2e2' : undefined,
                                opacity: deletingId === user.id ? 0 : 1,
                                transform: deletingId === user.id ? 'scale(0.96)' : 'scale(1)',
                              }}
                            >
                              <td>{user.id}</td>
                              <td>{user.username || user.name}</td>
                              <td>{user.email}</td>
                              <td>{user.role}</td>
                              <td>{user.department?.name || '-'}</td>
                              <td className={edit_delete.editdelete}>
                                <button
                                  onClick={() => handleDelete(user.id)}
                                  className={edit_delete.deletebutton + ' delete-btn-anim'}
                                  title="Delete"
                                  disabled={deletingId === user.id}
                                  style={{
                                    transition: 'transform 0.2s, background 0.2s, color 0.2s',
                                    transform: deletingId === user.id ? 'scale(1.15) rotate(-10deg)' : 'none',
                                    background: deletingId === user.id ? '#ef4444' : undefined,
                                    color: deletingId === user.id ? '#fff' : undefined,
                                    boxShadow: deletingId === user.id ? '0 0 12px #ef4444aa' : undefined,
                                  }}
                                >
                                  <svg className={edit_delete.deletesvgIcon} viewBox="0 0 448 512">
                                    <path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"></path>
                                  </svg>
                                </button>
                                <button
                                  onClick={() => openModal(user)}
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

                  {/* Modal */}
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
                          >×</button>
                        </div>
                        <form
                          onSubmit={handleSubmit}
                          className={modalStyles.userForm}
                        >
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
                                  <option key={dep.id} value={dep.id}>{dep.name}</option>
                                ))}
                              </select>
                            </>
                          )}
                          {role === 'admin' && (
                            <input type="hidden" name="role" value="user" />
                          )}
                          <input
                            name="password"
                            placeholder={editMode ? "New Password (optional)" : "Password"}
                            type="password"
                            value={form.password}
                            onChange={handleInput}
                            required={!editMode}
                            className={modalStyles.input}
                          />
                          {formError && (
                            <div className={modalStyles.userError}>
                              {formError}
                            </div>
                          )}
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
                              {formLoading ? 'Saving...' : (editMode ? 'Update' : 'Add')}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* Delete confirmation modal */}
                  {confirmDeleteId && (
                    <div className={deleteModalStyles.deleteModalOverlay}>
                      <div className={deleteModalStyles.deleteModalContent}>
                        <div className={deleteModalStyles.deleteModalHeader}>
                          <span role="img" aria-label="warning" style={{ fontSize: 32, marginRight: 10 }}>⚠️</span>
                          <span style={{ fontWeight: 600, fontSize: 20, color: '#ef4444' }}>Confirm Deletion</span>
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
  );
};

export default AdminDashboard;