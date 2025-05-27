import { useState } from 'react';
import axios from 'axios';
import styles from '../assets/css/AdminLogin.module.css';
import { setAdminToken } from '../adminsecretaccess';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post('http://localhost:8000/api/admin/login', {
        email,
        password,
      });

      if (response.data.status === 'success') {
        setAdminToken(response.data.token);
        window.location.replace('/admin/AdminPanel');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка сервера');
    }
  };

  return (
    <div className={styles.form}>
      <div className={styles.title}>Admin Login</div>
      {error && <div className={styles.error}>{error}</div>}
      <form onSubmit={handleLogin}>
        <div className={styles.inputContainer}>
          <input
            type="email"
            placeholder=" "
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className={`${styles.cut} ${styles.cutShort}`}></div>
          <label className={styles.iLabel}>Email</label>
        </div>

        <div className={styles.inputContainer}>
          <input
            type="password"
            placeholder=" "
            className={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className={styles.cut}></div>
          <label className={styles.iLabel}>Password</label>
        </div>

        <button className={styles.submit} type="submit">Login</button>
      </form>
    </div>
  );
};

export default AdminLogin;
