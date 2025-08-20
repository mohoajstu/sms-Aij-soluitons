import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
  CCloseButton,
  CSidebar,
  CSidebarBrand,
  CSidebarFooter,
  CSidebarHeader,
  CSidebarToggler,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { AppSidebarNav } from './AppSidebarNav'
import logo from 'src/assets/brand/TLA_logo_TPBK.svg'
import smallLogo from 'src/assets/brand/TLA_logo_simple.svg'
import navigation from '../_nav'
import useAuth from '../Firebase/useAuth'

const AppSidebar = () => {
  const dispatch = useDispatch()
  const unfoldable = useSelector((state) => state.sidebarUnfoldable)
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const { role, loading } = useAuth()

  if (loading) return null

  // Debug logging
  console.log('=== AppSidebar Debug ===')
  console.log('Current user role:', role, 'Type:', typeof role)
  console.log('Navigation items before filtering:', navigation.map(item => ({
    name: item.name,
    hideFor: item.hideFor
  })))

  const filteredNavigation = navigation.filter((item) => {
    // If no hideFor property, show the item
    if (!item.hideFor) {
      console.log(`✅ Showing "${item.name}" - no hideFor property`)
      return true
    }

    // If hideFor is not an array, show the item
    if (!Array.isArray(item.hideFor)) {
      console.log(`✅ Showing "${item.name}" - hideFor is not an array:`, item.hideFor)
      return true
    }

    // Check if current role is in the hideFor array
    const shouldHide = item.hideFor.includes(role)
    console.log(`${shouldHide ? '❌' : '✅'} Item "${item.name}":`)
    console.log(`   - hideFor: [${item.hideFor.join(', ')}]`)
    console.log(`   - current role: "${role}"`)
    console.log(`   - shouldHide: ${shouldHide}`)
    
    return !shouldHide
  })

  console.log('Filtered navigation items:', filteredNavigation.map(item => item.name))
  console.log('=== End AppSidebar Debug ===')

  return (
    <CSidebar
      className="border-end"
      colorScheme="dark"
      position="fixed"
      unfoldable={unfoldable}
      visible={sidebarShow}
      onVisibleChange={(visible) => {
        dispatch({ type: 'set', sidebarShow: visible })
      }}
    >
      <CSidebarHeader className="border-bottom">
        <CSidebarBrand to="/">
          <img src={logo} alt="TLA Logo" height="60" className="sidebar-brand-full" />
          <img src={smallLogo} alt="TLA Logo" height="50" className="sidebar-brand-narrow" />
        </CSidebarBrand>
        {/* Temporary debug indicator */}
        <div style={{ 
          position: 'absolute', 
          bottom: '5px', 
          left: '10px', 
          fontSize: '10px', 
          color: '#fff',
          background: 'rgba(0,0,0,0.5)',
          padding: '2px 5px',
          borderRadius: '3px'
        }}>
          Role: {role || 'none'}
        </div>
        <CCloseButton
          className="d-lg-none"
          dark
          onClick={() => dispatch({ type: 'set', sidebarShow: false })}
        />
      </CSidebarHeader>
      <AppSidebarNav items={filteredNavigation} />
      <CSidebarFooter className="border-top d-none d-lg-flex">
        <CSidebarToggler
          onClick={() => dispatch({ type: 'set', sidebarUnfoldable: !unfoldable })}
        />
      </CSidebarFooter>
    </CSidebar>
  )
}

export default React.memo(AppSidebar)
