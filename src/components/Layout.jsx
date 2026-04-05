import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      {/* O Outlet é onde as páginas (Home, Perfil, etc) vão aparecer */}
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}