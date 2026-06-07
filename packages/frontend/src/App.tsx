import { Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import AdminLayout from './layouts/AdminLayout';
import ContentTypeList from './pages/ContentTypeList';
import ContentTypeBuilder from './pages/ContentTypeBuilder';
import ContentEntryList from './pages/ContentEntries/ContentEntryList';
import ContentEntryForm from './pages/ContentEntries/ContentEntryForm';

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
      <Routes>
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<Navigate to="/content-types" replace />} />
          <Route path="content-types" element={<ContentTypeList />} />
          <Route path="content-types/new" element={<ContentTypeBuilder />} />
          <Route path="content-types/:id/edit" element={<ContentTypeBuilder />} />
          <Route path="content/:slug" element={<ContentEntryList />} />
          <Route path="content/:slug/new" element={<ContentEntryForm />} />
          <Route path="content/:slug/:id/edit" element={<ContentEntryForm />} />
        </Route>
      </Routes>
    </ConfigProvider>
  );
}

export default App;
