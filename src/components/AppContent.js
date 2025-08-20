import React, { Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { CContainer, CSpinner } from '@coreui/react'

// routes config
import routes from '../routes'
import { auth, firestore } from '../firebase'
import { doc, getDoc } from 'firebase/firestore'

const AppContent = () => {
  const location = useLocation() // get the current location
  const navigate = useNavigate()
  
  // Global onboarding gate for parents: if onboarding is incomplete, force /onboarding
  useEffect(() => {
    const enforceOnboarding = async () => {
      const user = auth.currentUser
      if (!user) return
      try {
        const userSnap = await getDoc(doc(firestore, 'users', user.uid))
        const userData = userSnap.exists() ? userSnap.data() : {}
        const parentId = userData?.tarbiyahId || userData?.schoolId || user.uid
        const parentSnap = await getDoc(doc(firestore, 'parents', parentId))
        if (parentSnap.exists() && parentSnap.data()?.onboarding === false) {
          if (location.pathname !== '/onboarding') {
            navigate('/onboarding', { replace: true })
          }
        }
      } catch (_) {
        // ignore
      }
    }
    enforceOnboarding()
  }, [location.pathname])
  
  // Routes that should use full width
  const fullWidthRoutes = ['/reportcards']
  const shouldUseFullWidth = fullWidthRoutes.some(route => 
    location.pathname.startsWith(route)
  )
  
  return (
    <CContainer className="px-4" lg={!shouldUseFullWidth} fluid={shouldUseFullWidth}>
      <Suspense fallback={<CSpinner color="primary" />}>
        <Routes>
          {routes.map((route, idx) => {
            return (
              route.element && (
                <Route
                  key={idx}
                  path={route.path}
                  exact={route.exact}
                  name={route.name}
                  element={<route.element key={Date.now()} />}
                />
              )
            )
          })}
          <Route path="/" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </Suspense>
    </CContainer>
  )
}

export default React.memo(AppContent)
