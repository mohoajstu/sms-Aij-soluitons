import React from 'react'
import CIcon from '@coreui/icons-react'
import { cilHome, cilList, cilNotes, cilSpeedometer, cilCalendar, cilClock, cilUserPlus, cilUser, cilPeople, cilStar } from '@coreui/icons'
import BeenhereOutlinedIcon from '@mui/icons-material/BeenhereOutlined'
import { CNavItem } from '@coreui/react'
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined'

const _nav = [
  {
    component: CNavItem,
    name: 'Home',
    to: '/dashboard',
    // For a CoreUI icon:
    icon: <CIcon icon={cilHome} customClassName="nav-icon" />,
  },
  // Parent-specific routes
  {
    component: CNavItem,
    name: 'Attendance',
    to: '/attendance/parent',
    icon: <CIcon icon={cilList} customClassName="nav-icon" />,
    hideFor: ['admin', 'faculty', 'teacher', 'student'],
  },
  {
    component: CNavItem,
    name: 'Report Cards',
    to: '/reportcards/parent',
    icon: <CIcon icon={cilNotes} customClassName="nav-icon" />,
    hideFor: ['admin', 'faculty', 'teacher', 'student'],
  },
  // Non-parent routes
  {
    component: CNavItem,
    name: 'Attendance',
    to: '/attendance',
    icon: <CIcon icon={cilList} customClassName="nav-icon" />,
    hideFor: ['parent'],
  },
  {
    component: CNavItem,
    name: 'Report Cards',
    to: '/reportcards',
    icon: <CIcon icon={cilNotes} customClassName="nav-icon" />,
    hideFor: ['parent'],
  },
  {
    component: CNavItem,
    name: 'Registration',
    to: '/registration',
    // Use the MUI icon directly, instead of <CIcon ...>
    icon: <BeenhereOutlinedIcon className="nav-icon" />,
    hideFor: ['parent', 'student', 'teacher', 'faculty'],
  },
  {
    component: CNavItem,
    name: 'Registration Processing',
    to: '/registration/processing',
    icon: <BeenhereOutlinedIcon className="nav-icon" />,
    hideFor: ['parent', 'student', 'teacher', 'faculty'],
  },
  {
    component: CNavItem,
    name: 'Onboarding',
    to: '/onboarding',
    icon: <CIcon icon={cilUserPlus} customClassName="nav-icon" />,
    hideFor: ['student', 'teacher'],
  },
  {
    component: CNavItem,
    name: 'People Management',
    to: '/people',
    icon: <CIcon icon={cilPeople} customClassName="nav-icon" />,
    hideFor: ['parent', 'student', 'teacher', 'faculty'],
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
    name: 'Schedule',
    to: '/schedule',
    icon: <CIcon icon={cilClock} customClassName="nav-icon" />,
    // visible to all staff
  },
  {
    component: CNavItem,
    name: 'Calendar',
    to: '/calendar',
    icon: <CIcon icon={cilCalendar} customClassName="nav-icon" />,
    hideFor: ['parent'],
  },
]

export default _nav
