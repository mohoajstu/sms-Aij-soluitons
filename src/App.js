import React, { Suspense } from 'react'
import { HashRouter, Route, Routes, Navigate } from 'react-router-dom'
import { CSpinner } from '@coreui/react'
import useAuth from './Firebase/useAuth'
import { Toaster } from 'react-hot-toast'
import './scss/style.scss'
import './scss/examples.scss'

// Layouts
const DefaultLayout = React.lazy(() => import('./layout/DefaultLayout')) // Staff/Admin portal
const ParentLayout = React.lazy(() => import('./layout/ParentLayout'))   // Parent portal

// Auth / Public pages
const Login = React.lazy(() => import('./views/pages/login/Login'))
const ParentLogin = React.lazy(() => import('./views/pages/login/ParentLogin'))
const StaffLogin = React.lazy(() => import('./views/pages/login/StaffLogin'))
const Register = React.lazy(() => import('./views/pages/register/Register'))
const Home = React.lazy(() => import('./views/pages/home/home'))
const PrivacyPolicy = React.lazy(() => import('./views/pages/privacyPolicy/PrivacyPolicy'))
const TermsOfService = React.lazy(() => import('./views/pages/termsOfService/TermsOfService'))

// Errors / misc
const Page404 = React.lazy(() => import('./views/pages/page404/Page404'))
const Page500 = React.lazy(() => import('./views/pages/page500/Page500'))
const Forbidden = React.lazy(() => import('./views/pages/forbidden/Forbidden'))

// Parent portal pages (organized by feature)
const ParentDashboard = React.lazy(() => import('./views/dashboard/ParentDashboard'))
const ParentAttendance = React.lazy(() => import('./views/attendance/ParentAttendance'))
const ParentReportCards = React.lazy(() => import('./views/ReportCard/ParentReportCards'))
const ParentRegistration = React.lazy(() => import('./views/registration/ParentRegistration'))
const ParentAnnouncements = React.lazy(() => import('./views/announcements/ParentAnnouncements'))
const ParentChildren = React.lazy(() => import('./views/children/ParentChildren'))

const App = () => {
  const { user, loading, claims } = useAuth()
  const role = claims?.role

  // While auth state is resolving (or claims still loading for a logged-in user)
  if (loading || (user && claims === undefined)) {
    return (
      <div className="pt-3 text-center">
        <CSpinner color="primary" variant="grow" />
      </div>
    )
  }

  // Where to send a logged-in user if they hit a login page
  const afterLoginPath = role === 'parent' ? '/parent' : '/'

  return (
    <HashRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { background: '#363636', color: '#fff' },
          success: { style: { background: 'green' } },
          error: { style: { background: 'red' } },
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
          <Route path="/home" element={<Home />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/404" element={<Page404 />} />
          <Route path="/500" element={<Page500 />} />
          <Route path="/register" element={<Register />} />

          {/* Login pages - redirect if already logged in */}
          <Route path="/login" element={user ? <Navigate to={afterLoginPath} replace /> : <Login />} />
          <Route path="/login/parent" element={user ? <Navigate to={afterLoginPath} replace /> : <ParentLogin />} />
          <Route path="/login/staff" element={user ? <Navigate to={afterLoginPath} replace /> : <StaffLogin />} />

          {/* Parent portal: only parents */}
          <Route
            path="/parent/*"
            element={
              user
                ? (role === 'parent' ? <ParentLayout /> : <Navigate to="/" replace />)
                : <Navigate to="/home" replace />
            }
          >
            <Route index element={<ParentDashboard />} />
            <Route path="children" element={<ParentChildren />} />
            <Route path="attendance" element={<ParentAttendance />} />
            <Route path="reportcards" element={<ParentReportCards />} />
            <Route path="registration" element={<ParentRegistration />} />
            <Route path="announcements" element={<ParentAnnouncements />} />
          </Route>

          {/* Staff/Admin portal (existing DefaultLayout) */}
          <Route
            path="/*"
            element={
              user
                ? (role === 'parent' ? <Navigate to="/parent" replace /> : <DefaultLayout />)
                : <Navigate to="/home" replace />
            }
          />

          {/* Forbidden route */}
          <Route path="/forbidden" element={<Forbidden />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to={user ? (role === 'parent' ? '/parent' : '/') : '/home'} replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  )
}

export default App
