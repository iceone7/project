import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const navigate = useNavigate();

  const handleRegister = (e) => {
    e.preventDefault();
    console.log('Регистрация:', { firstname, lastname, email, password });
    // Здесь логика отправки на сервер
  };

  const goToLogin = () => {
    navigate('/login'); 
  };

  return (
    <div className="form">
      <div className="title">Welcome</div>
      <div className="subtitle">Let's create your account!</div>

      <form onSubmit={handleRegister}>
        <div className="input-container ic1">
          <input
            placeholder=""
            type="text"
            className="input"
            id="firstname"
            value={firstname}
            onChange={e => setFirstname(e.target.value)}
            required
          />
          <div className="cut"></div>
          <label className="iLabel" htmlFor="firstname">First name</label>
        </div>

        <div className="input-container ic2">
          <input
            placeholder=""
            type="text"
            className="input"
            id="lastname"
            value={lastname}
            onChange={e => setLastname(e.target.value)}
            required
          />
          <div className="cut"></div>
          <label className="iLabel" htmlFor="lastname">Last name</label>
        </div>

        <div className="input-container ic2">
          <input
            placeholder=""
            type="email"
            className="input"
            id="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <div className="cut cut-short"></div>
          <label className="iLabel" htmlFor="email">Email</label>
        </div>

        <div className="input-container ic2">
          <input
            placeholder=""
            type="password"
            className="input"
            id="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <div className="cut"></div>
          <label className="iLabel" htmlFor="password">Password</label>
        </div>

        <button className="submit" type="submit">Submit</button>
      </form>

      <div style={{ marginTop: '20px', fontSize: '14px', textAlign: 'center' }}>
        Already have an account?{' '}
        <span
          style={{ color: '#fff', cursor: 'pointer',  }}
          onClick={goToLogin}
        >
          Log In
        </span>
      </div>
    </div>
  );
};

export default Register;
