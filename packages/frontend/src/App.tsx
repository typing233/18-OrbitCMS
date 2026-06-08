import { Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import AdminLayout from './layouts/AdminLayout';
import ContentTypeList from './pages/ContentTypeList';
import ContentTypeBuilder from './pages/ContentTypeBuilder';
import ContentEntryList from './pages/ContentEntries/ContentEntryList';
import ContentEntryForm from './pages/ContentEntries/ContentEntryForm';
import LoginPage from './pages/Auth/LoginPage';
import UserManagement from './pages/Users/UserManagement';
import RoleManagement from './pages/Roles/RoleManagement';
import MediaLibrary from './pages/Media/MediaLibrary';
import AuditLogPage from './pages/Audit/AuditLogPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div style={{ padding: 48, textAlign: 'center' }}>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/content-types" replace />} />
        <Route path="content-types" element={<ContentTypeList />} />
        <Route path="content-types/new" element={<ContentTypeBuilder />} />
        <Route path="content-types/:id/edit" element={<ContentTypeBuilder />} />
        <Route path="content/:slug" element={<ContentEntryList />} />
        <Route path="content/:slug/new" element={<ContentEntryForm />} />
        <Route path="content/:slug/:id/edit" element={<ContentEntryForm />} />
        <Route path="media" element={<MediaLibrary />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="roles" element={<RoleManagement />} />
        <Route path="audit" element={<AuditLogPage />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#4f46e5',
          borderRadius: 6,
        },
      }}
    >
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;
