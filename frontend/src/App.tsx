import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import ChangePassword from './pages/ChangePassword';
import AssetRegistry from './pages/AssetRegistry';
import AssetDetail from './pages/AssetDetail';
import NewAsset from './pages/NewAsset';
import Conversions from './pages/Conversions';

import Documents from './pages/Documents';
import MoC from './pages/MoC';
import Anomalies from './pages/Anomalies';
import WorkOrders from './pages/WorkOrders';

function App() {
  useEffect(() => {
    const updateFavicon = () => {
      const isDark = document.documentElement.classList.contains('dark');
      const favicon = document.getElementById('favicon') as HTMLLinkElement;
      if (favicon) {
        favicon.href = isDark ? '/logo-dark.png?v=3' : '/logo-light.png?v=3';
      }
    };

    updateFavicon();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          updateFavicon();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="assets" element={<AssetRegistry />} />
          <Route path="assets/new" element={<NewAsset />} />
          <Route path="assets/:id" element={<AssetDetail />} />
          <Route path="documents" element={<Documents />} />
          <Route path="moc" element={<MoC />} />
          <Route path="anomalies" element={<Anomalies />} />
          <Route path="work-orders" element={<WorkOrders />} />
          <Route path="conversions" element={<Conversions />} />
          <Route path="users" element={<Users />} />
          <Route path="change-password" element={<ChangePassword />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
