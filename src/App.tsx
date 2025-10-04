import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import RequireAuth from './auth/RequireAuth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import QuickBooksRedirect from './pages/QuickBooksRedirect';
import EndUserLicense from './pages/EndUserLicense';
import PrivacyPolicy from './pages/PrivacyPolicy';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/bucket/:bucketSlug" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route
            path="/quickbooks/connected"
            element={
              <RequireAuth>
                <QuickBooksRedirect />
              </RequireAuth>
            }
          />
          <Route path="/legal/eula" element={<EndUserLicense />} />
          <Route path="/legal/privacy" element={<PrivacyPolicy />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
