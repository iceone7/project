import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import '../css/UserManagement.css';
import edit_delete from '../css/edit_detele.module.css';
import defaultInstance from '../../api/defaultInstance';


const API_URL = 'http://localhost:8000/api';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [userForm, setUserForm] = useState({ id: null, username: '', email: '', role: 'user', password: '' });
  const [userEditMode, setUserEditMode] = useState(false);
  const [userError, setUserError] = useState('');
  const [userLoading, setUserLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const role = localStorage.getItem('role');
  if (role !== 'admin') {
    return <div style={{ padding: 40, color: 'red' }}>Access denied. Admins only.</div>;
  }

  // eslint-disable-next-line
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = () => {
    setUserLoading(true);
    defaultInstance.get(`${API_URL}/admin/users`)
      .then(res => {
        setUsers(res.data.data || res.data);
        setUserLoading(false);
      })
      .catch(err => {
        console.error('Fetch users error:', err.response?.status, err.response?.data);
        setUserError('Failed to load users');
        setUserLoading(false);
      });
  };

  const handleUserInput = e => {
    const { name, value } = e.target;
    setUserForm(prev => ({ ...prev, [name]: value }));
  };

  const handleUserEdit = user => {
    setUserForm({
      id: user.id,
      username: user.username || user.name,
      email: user.email,
      role: user.role,
      password: ''
    });
    setUserEditMode(true);
    setUserError('');
    setShowModal(true);
  };

  const handleUserDelete = id => {
    if (!window.confirm('Delete this user?')) return;
    defaultInstance.delete(`${API_URL}/admin/users/${id}`)
      .then(() => setUsers(users.filter(u => u.id !== id)))
      .catch(err => {
        console.error('Delete error:', err.response?.status, err.response?.data);
        setUserError(
          err.response?.data?.message ||
          (err.response?.data?.errors
            ? Object.values(err.response.data.errors).flat().join(', ')
            : 'Failed to delete user')
        );
      });
  };

  const handleUserSubmit = e => {
    e.preventDefault();
    setUserError('');

    if (!userForm.username || !userForm.email || !userForm.role) {
      setUserError('All fields except password are required');
      return;
    }

    if (userEditMode) {
      defaultInstance.put(`${API_URL}/admin/users/${userForm.id}`, {
        name: userForm.username,
        email: userForm.email,
        role: userForm.role,
        password: userForm.password || undefined 
      })
        .then(res => {
          setUsers(users.map(u => (u.id === userForm.id ? res.data.user || res.data : u)));
          resetForm();
        })
        .catch(err => {
          console.error('Update error:', err.response?.status, err.response?.data);
          setUserError(
            err.response?.data?.message ||
            (err.response?.data?.errors
              ? Object.values(err.response.data.errors).flat().join(', ')
              : 'Failed to update user')
          );
        });
    } else {
      defaultInstance.post(`${API_URL}/admin/create-user`, {
        name: userForm.username,
        email: userForm.email,
        password: userForm.password,
        role: userForm.role,
      })
        .then(res => {
          setUsers([...users, res.data.user || res.data]);
          resetForm();
        })
        .catch(err => {
          console.error('Create error:', err.response?.status, err.response?.data);
          setUserError(
            err.response?.data?.message ||
            (err.response?.data?.errors
              ? Object.values(err.response.data.errors).flat().join(', ')
              : 'Failed to add user')
          );
        });
    }
  };

  const resetForm = () => {
    setUserForm({ id: null, username: '', email: '', role: 'user', password: '' });
    setUserEditMode(false);
    setUserError('');
    setShowModal(false);
  };

  const openModal = () => {
    setShowModal(true);
    setUserEditMode(false);
    setUserForm({ id: null, username: '', email: '', role: 'user', password: '' });
    setUserError('');
  };

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
                    <h3>User Management</h3>
                    <button className="add-user-btn" onClick={openModal}>
                      Add User
                    </button>
                  </div>

                  {showModal && (
                    <div className="modal-overlay">
                      <div className="modal-content">
                        <div className="modal-header">
                          <h4>{userEditMode ? 'Edit User' : 'Add User'}</h4>
                          <button className="modal-close" onClick={resetForm}>×</button>
                        </div>
                        <form onSubmit={handleUserSubmit} className="user-form">
                          <input
                            name="username"
                            placeholder="Username"
                            value={userForm.username}
                            onChange={handleUserInput}
                            required
                          />
                          <input
                            name="email"
                            placeholder="Email"
                            type="email"
                            value={userForm.email}
                            onChange={handleUserInput}
                            required
                          />
                          <select name="role" value={userForm.role} onChange={handleUserInput} required>
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                          <input
                            name="password"
                            placeholder={userEditMode ? "New Password (optional)" : "Password"}
                            type="password"
                            value={userForm.password}
                            onChange={handleUserInput}
                            required={!userEditMode}
                          />
                          {userError && <div className="user-error">{userError}</div>}
                          <div className="modal-footer">
                            <button type="button" onClick={resetForm}>Cancel</button>
                            <button type="submit" disabled={userLoading}>
                              {userEditMode ? 'Update User' : 'Add User'}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  <div className="user-table-container">
                    {userLoading ? (
                      <div>Loading users...</div>
                    ) : (
                      <table className="user-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map(user => (
                            <tr key={user.id}>
                              <td>{user.id}</td>
                              <td>{user.username || user.name}</td>
                              <td>{user.email}</td>
                              <td>{user.role}</td>
                              <td className={edit_delete.editdelete}>
                                <button
                                  onClick={() => handleUserDelete(user.id)}
                                  className={edit_delete.deletebutton}
                                >
                                  <svg className={edit_delete.deletesvgIcon} viewBox="0 0 448 512">
                                    <path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"></path>
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleUserEdit(user)}
                                  className={edit_delete.editbutton}
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