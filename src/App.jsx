import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Groups from './pages/Groups';
import GroupDetail from './pages/GroupDetail';
import Friends from './pages/Friends';
import FriendDetail from './pages/FriendDetail';
import Activity from './pages/Activity';
import Account from './pages/Account';
import Login from './pages/Login';
import InviteAccept from './pages/InviteAccept';
import RestaurantSession from './pages/RestaurantSession';
import Restaurants from './pages/Restaurants';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="auth-loading"><div className="auth-spinner"></div></div>;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="auth-loading"><div className="auth-spinner"></div></div>;
  return isAuthenticated ? <Navigate to="/" replace /> : children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={
        <PublicRoute><Login /></PublicRoute>
      } />
      <Route path="/invite/:token" element={<InviteAccept />} />
      <Route path="/order/:sessionId" element={
        <ProtectedRoute>
          <AppProvider>
            <RestaurantSession />
          </AppProvider>
        </ProtectedRoute>
      } />
      <Route element={
        <ProtectedRoute>
          <AppProvider>
            <Layout />
          </AppProvider>
        </ProtectedRoute>
      }>
        <Route path="/" element={<Dashboard />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/groups/:id" element={<GroupDetail />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/friends/:id" element={<FriendDetail />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/account" element={<Account />} />
        <Route path="/restaurants" element={<Restaurants />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
