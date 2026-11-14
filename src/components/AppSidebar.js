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
import { canUsePortal } from '../config/portalAccess'

const AppSidebar = () => {
  const dispatch = useDispatch()
  const unfoldable = useSelector((state) => state.sidebarUnfoldable)
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const { role, loading } = useAuth()

  if (loading) return null

  if (!canUsePortal(role)) return null

  const filteredNavigation = navigation.filter((item) => {
    if (!Array.isArray(item.hideFor)) return true
    return !item.hideFor.includes(role)
  })

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
