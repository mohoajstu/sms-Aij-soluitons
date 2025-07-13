import React from 'react'
import CIcon from '@coreui/icons-react'
import { cilHome, cilList, cilNotes, cilSpeedometer, cilCalendar } from '@coreui/icons'
import BeenhereOutlinedIcon from '@mui/icons-material/BeenhereOutlined'
import { CNavItem, CNavGroup } from '@coreui/react'
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined'

const _nav = [
  {
    component: CNavItem,
    name: 'Home',
    to: '/dashboard',
    // For a CoreUI icon:
    icon: <CIcon icon={cilHome} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Attendance',
    to: '/attendance',
    icon: <CIcon icon={cilList} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Report Cards',
    to: '/reportcards',
    icon: <CIcon icon={cilNotes} customClassName="nav-icon" />,
  },
  {
    component: CNavGroup,
    name: 'Registration',
    to: '/registration',
    // Use the MUI icon directly, instead of <CIcon ...>
    icon: <BeenhereOutlinedIcon className="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'New Registration',
        to: '/registration',
      },
      {
        component: CNavItem,
        name: 'Process Applications',
        to: '/registration/processing',
      },
    ],
  },
  {
    component: CNavItem,
    name: 'Courses',
    to: '/courses',
    icon: <AutoStoriesOutlinedIcon className="nav-icon" />,
    hideFor: ['parent'],
  },
  {
    component: CNavItem,
    name: 'Calendar',
    to: '/calendar',
    icon: <CIcon icon={cilCalendar} customClassName="nav-icon" />,
  },
]

export default _nav
