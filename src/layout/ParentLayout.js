import React, { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation, NavLink } from 'react-router-dom'
import {
  CContainer,
  CHeader,
  CHeaderNav,
  CHeaderToggler,
  CNavLink,
  CNavItem,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
  CFormSelect,
  CCard,
  CCardBody,
  CCardHeader,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilHome,
  cilPeople,
  cilCalendar,
  cilDescription,
  cilBullhorn,
  cilUser,
  cilMenu,
} from '@coreui/icons'
import useAuth from '../Firebase/useAuth'
import { doc, getDoc } from 'firebase/firestore'
import { firestore } from '../Firebase/firebase'

// Parent-specific navigation items
const PARENT_NAV_ITEMS = [
  {
    to: '/parent',
    label: 'Dashboard',
    icon: cilHome,
  },
  {
    to: '/parent/children',
    label: 'My Children',
    icon: cilPeople,
  },
  {
    to: '/parent/attendance',
    label: 'Attendance',
    icon: cilCalendar,
  },
  {
    to: '/parent/reportcards',
    label: 'Report Cards',
    icon: cilDescription,
  },
  {
    to: '/parent/registration',
    label: 'Registration',
    icon: cilUser,
  },
  {
    to: '/parent/announcements',
    label: 'Announcements',
    icon: cilBullhorn,
  },
]

const ParentLayout = () => {
  const { user, children, claims, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [selectedChild, setSelectedChild] = useState(null)
  const [childProfiles, setChildProfiles] = useState([])
  const [loading, setLoading] = useState(true)

  // Load child profiles when children list changes
  useEffect(() => {
    const loadChildProfiles = async () => {
      if (!children || children.length === 0) {
        setChildProfiles([])
        setSelectedChild(null)
        setLoading(false)
        return
      }

      try {
        const profiles = await Promise.all(
          children.map(async (childId) => {
            const docRef = doc(firestore, 'students', childId)
            const docSnap = await getDoc(docRef)
            
            if (docSnap.exists()) {
              const data = docSnap.data()
              return {
                id: childId,
                name: data.personalInfo 
                  ? `${data.personalInfo.firstName} ${data.personalInfo.lastName}`.trim()
                  : data.name || 'Unknown Student',
                grade: data.gradeLevel || data.grade || 'Unknown Grade',
                ...data,
              }
            } else {
              return {
                id: childId,
                name: 'Student Not Found',
                grade: 'Unknown Grade',
              }
            }
          })
        )

        setChildProfiles(profiles)
        
        setLoading(false)
      } catch (error) {
        console.error('Error loading child profiles:', error)
        setLoading(false)
      }
    }

    loadChildProfiles()
  }, [children])

  // Set default selected child when profiles load
  useEffect(() => {
    if (!selectedChild && childProfiles.length > 0) {
      setSelectedChild(childProfiles[0])
    }
  }, [childProfiles, selectedChild])

  const handleChildChange = (childId) => {
    const child = childProfiles.find(c => c.id === childId)
    setSelectedChild(child)
  }

  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <CSpinner color="primary" size="lg" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <CHeader position="sticky" className="mb-4 p-0">
        <CContainer className="border-bottom px-4" fluid>
          <CHeaderToggler
            style={{ marginInlineStart: '-14px' }}
          >
            <CIcon icon={cilMenu} size="lg" />
          </CHeaderToggler>
          
          {/* Navigation */}
          <CHeaderNav className="d-none d-md-flex">
            {PARENT_NAV_ITEMS.map((item) => (
              <CNavItem key={item.to}>
                <CNavLink 
                  to={item.to}
                  as={NavLink}
                  active={location.pathname === item.to}
                  style={{ 
                    color: location.pathname === item.to ? '#321fdb' : '#6c757d',
                    fontWeight: location.pathname === item.to ? '600' : '400'
                  }}
                >
                  <CIcon icon={item.icon} className="me-2" />
                  {item.label}
                </CNavLink>
              </CNavItem>
            ))}
          </CHeaderNav>

          {/* Child Selector */}
          {childProfiles.length > 0 && (
            <CHeaderNav className="ms-auto me-3">
              <CNavItem>
                <div style={{ minWidth: '200px' }}>
                  <CFormSelect
                    value={selectedChild?.id || ''}
                    onChange={(e) => handleChildChange(e.target.value)}
                    size="sm"
                  >
                    {childProfiles.map((child) => (
                      <option key={child.id} value={child.id}>
                        {child.name} - {child.grade}
                      </option>
                    ))}
                  </CFormSelect>
                </div>
              </CNavItem>
            </CHeaderNav>
          )}

          {/* User Menu */}
          <CHeaderNav>
            <CDropdown variant="nav-item">
              <CDropdownToggle placement="bottom-end" className="py-0 pe-0" caret={false}>
                <div className="d-flex align-items-center">
                  <div className="avatar-sm bg-primary rounded-circle d-flex align-items-center justify-content-center me-2">
                    <CIcon icon={cilUser} size="sm" color="white" />
                  </div>
                  <span className="text-dark">{user?.email}</span>
                </div>
              </CDropdownToggle>
              <CDropdownMenu className="pt-0" placement="bottom-end">
                <CDropdownItem onClick={handleLogout}>
                  <CIcon icon={cilUser} className="me-2" />
                  Sign Out
                </CDropdownItem>
              </CDropdownMenu>
            </CDropdown>
          </CHeaderNav>
        </CContainer>
      </CHeader>

      {/* Main Content */}
      <div className="wrapper d-flex flex-column min-vh-100">
        <div className="body flex-grow-1">
          <CContainer fluid>
            {/* Child Context Banner */}
            {selectedChild && (
              <CCard className="mb-4">
                <CCardBody className="py-2">
                  <div className="d-flex align-items-center">
                    <CIcon icon={cilPeople} className="me-2" />
                    <span className="fw-semibold">Viewing: {selectedChild.name} ({selectedChild.grade})</span>
                  </div>
                </CCardBody>
              </CCard>
            )}

            {/* Page Content */}
            <Outlet context={{ selectedChild, childProfiles }} />
          </CContainer>
        </div>
      </div>
    </div>
  )
}

export default ParentLayout 