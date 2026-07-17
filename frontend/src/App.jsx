import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Customers from './pages/Customers.jsx';
import MilkEntry from './pages/MilkEntry.jsx';
import Ledger from './pages/Ledger.jsx';
import RateChart from './pages/RateChart.jsx';
import Reports from './pages/Reports.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/milk-entry" element={<MilkEntry />} />
        <Route path="/ledger" element={<ProtectedRoute roles={['admin']}><Ledger /></ProtectedRoute>} />
        <Route path="/rate-chart" element={<ProtectedRoute roles={['admin']}><RateChart /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute roles={['admin']}><Reports /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}
