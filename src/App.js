import React, { Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { CSpinner, useColorModes } from '@coreui/react';
import { auth } from './firebase'; // Update path to your firebase config
import { onAuthStateChanged } from 'firebase/auth';
import './scss/style.scss';

// Lazy-loaded components
const DefaultLayout = React.lazy(() => import('./layout/DefaultLayout'));
const Login = React.lazy(() => import('./views/pages/login/Login'));
const Register = React.lazy(() => import('./views/pages/register/Register'));
const Page404 = React.lazy(() => import('./views/pages/page404/Page404'));
const Page500 = React.lazy(() => import('./views/pages/page500/Page500'));

// Error boundary fallback component
const ErrorFallback = ({ error }) => {
  return (
    <div className="p-5 alert alert-danger">
      <h2>Something went wrong</h2>
      <pre>{error.message}</pre>
    </div>
  );
};

const App = () => {
  const { isColorModeSet, setColorMode } = useColorModes('coreui-free-react-admin-template-theme');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [theme] = useState(localStorage.getItem('theme') || 'light');

  // Firebase auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
    });
    return () => unsubscribe();
  }, []);

  // Theme initialization
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlTheme = urlParams.get('theme');
      
      if (urlTheme?.match(/^[A-Za-z0-9\s]+/)) {
        setColorMode(urlTheme);
        localStorage.setItem('theme', urlTheme);
        return;
      }

      if (!isColorModeSet()) {
        setColorMode(theme);
      }
    } catch (error) {
      console.error('Theme initialization error:', error);
      setColorMode('light');
    }
  }, [setColorMode, isColorModeSet, theme]);

  return (
    <BrowserRouter>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Suspense
          fallback={
            <div className="pt-3 text-center" style={{ minHeight: '100vh' }}>
              <CSpinner color="primary" variant="grow" />
            </div>
          }
        >
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/404" element={<Page404 />} />
            <Route path="/500" element={<Page500 />} />

            {/* Protected routes */}
            <Route
              path="/*"
              element={isAuthenticated ? <DefaultLayout /> : <Navigate to="/login" replace />}
            />

            {/* Fallback redirect */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default App;