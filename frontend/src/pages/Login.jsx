import { useState } from 'react';
import styles from '../assets/css/Login.module.css';
import logo from '../assets/images/logo.png';
import defaultInstance from '../api/defaultInstance';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      console.log('Attempting login with:', { email });
      const response = await defaultInstance.post('/login', { email, password });
      console.log('Login response:', response.data);

      if (!response.data.token) {
        throw new Error('No token received from server');
      }

      // console.log(response);

      // Save token, login flag, and email
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userEmail', response.data.user?.email); // Сохраняем email
      localStorage.setItem('role', response.data.user?.role); 
      console.log('Token saved:', localStorage.getItem('authToken'));

      // Redirect to dashboard
      window.location.replace('/dashboard');
    } catch (err) {
      console.error('Login error:', err.response?.data || err.message);
      const errorMessage = err.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(errorMessage);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.mainContainer}>
        <div className={styles.leftContainer}>
          <img src={logo} alt="Logo" />
        </div>
        <div className={styles.rightContainer}>
          <form onSubmit={handleLogin}>
            <b>მეილი</b>
            <input
              type="email"
              name="email"
              placeholder="შეიყვანე მეილი"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <b>პაროლი</b>
            <input
              type="password"
              name="password"
              placeholder="შეიყვანე პაროლი"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <div className={styles.error}>{error}</div>}
            <button type="submit">შესვლა</button>
          </form>
        </div>
      </div>
    </div>
  );
}