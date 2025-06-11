// import axios from 'axios';

// const defaultInstance = axios.create({
//   baseURL: `${import.meta.env.VITE_API_BASE_URL}`,
//   headers: {
//     Accept: "application/json",
//     "Content-Type": "application/json",
//     "X-Requested-With": "XMLHttpRequest",
//   },
//   withCredentials: true,
//   xsrfCookieName: "XSRF-TOKEN",
//   xsrfHeaderName: "X-XSRF-TOKEN",
//   credentials: "include"
// });

// defaultInstance.interceptors.request.use(
//   (config) => {
//     const token = localStorage.getItem('authToken');
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => Promise.reject(error)
// );

// export default defaultInstance;

import axios from 'axios';

const defaultInstance = axios.create({
  //baseURL: `${import.meta.env.REACT_APP_API_BASE_URL}`,
  baseURL: `https://vip-back.gorgia.ge/api`,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
  withCredentials: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  credentials: "include"
});

defaultInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default defaultInstance;

