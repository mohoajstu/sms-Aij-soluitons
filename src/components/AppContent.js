import React, { Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { CContainer, CSpinner } from '@coreui/react'

// routes config
import routes from '../routes'

const AppContent = () => {
  const location = useLocation() // get the current location
  
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
