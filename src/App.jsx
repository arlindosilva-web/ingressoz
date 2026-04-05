import React, { Suspense, lazy } from 'react';

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Account from './pages/Account';

import Login from './pages/Login';
import Register from './pages/Register';
import Recovery from './pages/Recovery';
import Orders from './pages/Orders';
import Checkout from './pages/Checkout'; 






function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Todas essas rotas terão o mesmo Header e Footer automaticamente! */}
          <Route index element={<Home />} />
          

          
          

        </Route>
        
        {/* Se você quiser o Login e Registro SEM o header verde, coloque fora do Route do Layout */}
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="recuperar" element={<Recovery />} />
        <Route path="perfil" element={<Account />} />
        <Route path="meus-pedidos" element={<Orders />} />
        
        {/* 2. ADICIONE ESSA LINHA AQUI DENTRO DO LAYOUT */}
          <Route path="checkout" element={<Checkout />} />
          

      </Routes>
    </Router>
  );
}

export default App;

