import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Login from './components/Login.tsx';
import Register from './components/Register.tsx';
import Groups from './components/Groups.tsx';
import Companies from './components/Companies.tsx';
import Join from './components/Join.tsx';
import StripeProvider from './components/StripeProvider.tsx';
import CardSecurityProvider from './components/CardSecurityProvider.tsx';

interface User {
  id: number;
  email: string;
  name: string;
  phone: string;
  address: string;
  user_type: string;
}

export const AuthContext = React.createContext<{
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
});

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  const fetchUser = useCallback(async () => {
    try {
      const response = await axios.get('/users/me');
      setUser(response.data);
    } catch (error) {
      logout();
    }
  }, []);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    }
  }, [token, fetchUser]);

  const login = (newToken: string, userData: User) => {
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('token', newToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      <StripeProvider>
        <CardSecurityProvider>
          <Router>
            <div className="App">
              
              <div className="container">
                <Routes>
                  <Route path="/login" element={!user ? <Login /> : <Navigate to={user.user_type === 'renter' ? "/groups" : "/companies"} />} />
                  <Route path="/register" element={!user ? <Register /> : <Navigate to={user.user_type === 'renter' ? "/groups" : "/companies"} />} />
                  <Route path="/groups" element={user ? (user.user_type === 'renter' ? <Groups /> : <Navigate to="/companies" />) : <Navigate to="/login" />} />
                  <Route path="/companies" element={user ? (user.user_type === 'company' ? <Companies /> : <Navigate to="/groups" />) : <Navigate to="/login" />} />
                  <Route path="/join/:token" element={<Join />} />
                  <Route path="/" element={<Navigate to={user ? (user.user_type === 'renter' ? "/groups" : "/companies") : "/login"} />} />
                </Routes>
              </div>
            </div>
          </Router>
        </CardSecurityProvider>
      </StripeProvider>
    </AuthContext.Provider>
  );
}

export default App;