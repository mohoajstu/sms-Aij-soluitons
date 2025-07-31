import React, { Suspense } from 'react'
import { HashRouter, Route, Routes, Navigate } from 'react-router-dom'
import { CSpinner } from '@coreui/react'
import useAuth from './Firebase/useAuth'
import { Toaster } from 'react-hot-toast'
import './scss/style.scss'
import './scss/examples.scss'

const DefaultLayout = React.lazy(() => import('./layout/DefaultLayout'))
const Login = React.lazy(() => import('./views/pages/login/Login'))
const Register = React.lazy(() => import('./views/pages/register/Register'))
const Page404 = React.lazy(() => import('./views/pages/page404/Page404'))
const Page500 = React.lazy(() => import('./views/pages/page500/Page500'))
const Home = React.lazy(() => import('./views/pages/home/home'))
const PrivacyPolicy = React.lazy(() => import('./views/pages/privacyPolicy/PrivacyPolicy'))
const TermsOfService = React.lazy(() => import('./views/pages/termsOfService/TermsOfService'))
const ParentLogin = React.lazy(() => import('./views/pages/login/ParentLogin'))
const StaffLogin = React.lazy(() => import('./views/pages/login/StaffLogin'))

const App = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="pt-3 text-center">
        <CSpinner color="primary" variant="grow" />
      </div>
    )
  }

  return (
    <HashRouter>
      {/* Add Toaster for notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            style: {
              background: 'green',
            },
          },
          error: {
            style: {
              background: 'red',
            },
          },
        }}
      />

      <Suspense
        fallback={
          <div className="pt-3 text-center">
            <CSpinner color="primary" variant="grow" />
          </div>
        }
      >
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/login/parent" element={user ? <Navigate to="/" replace /> : <ParentLogin />} />
          <Route path="/login/staff" element={user ? <Navigate to="/" replace /> : <StaffLogin />} />
          <Route path="/register" element={<Register />} />
          <Route path="/home" element={<Home />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/404" element={<Page404 />} />
          <Route path="/500" element={<Page500 />} />

          {/* Protected Routes */}
          <Route path="/*" element={user ? <DefaultLayout /> : <Navigate to="/home" replace />} />

          {/* Report Card Routes (disabled) */}
          {/* <Route path="/reportcards" element={user ? <ReportCardPage /> : <Navigate to="/login" replace />} /> */}

          {/* Redirect unmatched routes */}
          <Route path="*" element={<Navigate to={user ? '/' : '/home'} replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  )
}

export default App
