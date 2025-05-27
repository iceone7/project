import { useState, useEffect } from 'react';
import styles from '../assets/css/AdminPanel.module.css';
import { getAdminToken, removeAdminToken } from '../adminsecretaccess';
import { useNavigate } from 'react-router-dom';

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      navigate('/admin/AdminSecretAccess', { replace: true });
    }
    // Optionally, verify token with backend here
  }, [navigate]);

  const handleLogout = () => {
    removeAdminToken();
    navigate('/admin/AdminSecretAccess', { replace: true });
  };

  const fetchUsers = async () => {
    const res = await fetch('http://127.0.0.1:8000/api/admin/users');
    const data = await res.json();
    setUsers(data);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const res = await fetch('http://127.0.0.1:8000/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();
    alert(data.message);
    setName('');
    setEmail('');
    setPassword('');
    fetchUsers();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    await fetch(`http://127.0.0.1:8000/api/admin/users/${id}`, { method: 'DELETE' });
    fetchUsers();
  };

  return (
    <div className={styles.body}>
      <div className={styles.container}>
        <button onClick={handleLogout} className={styles.button} style={{ float: 'right', marginBottom: '10px' }}>
          Logout
        </button>
        <h2 className={styles.title}>Create New User</h2>
        <form onSubmit={handleCreateUser} className={styles.form}>
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={styles.input}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
            required
          />
          <button type="submit" className={styles.button}>Create User</button>
        </form>

        <h2 className={styles.title}>All Users</h2>
        <ul className={styles.userList}>
          {users.map(user => (
            <li key={user.id} className={styles.userItem}>
              <span>{user.name} ({user.email})</span>
              <button onClick={() => handleDelete(user.id)} className={styles.deleteButton}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
