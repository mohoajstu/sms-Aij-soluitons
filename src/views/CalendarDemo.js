import React from 'react';
import { 
  CCard, 
  CCardHeader, 
  CCardBody, 
  CRow, 
  CCol,
  CContainer,
  CCardFooter
} from '@coreui/react';
import EnhancedCalendar from '../components/EnhancedCalendar';

const CalendarDemo = () => {
  return (
    <CContainer fluid>
      <CRow>
        <CCol>
          <CCard className="mb-4">
            <CCardHeader>
              <h3>Google Calendar Integration</h3>
            </CCardHeader>
            <CCardBody>
              <EnhancedCalendar />
            </CCardBody>
            <CCardFooter className="text-muted small">
              <p className="mb-0">
                The calendar automatically syncs changes with your Google Calendar. 
                All events you create, modify, or delete here will be reflected in your Google Calendar account.
              </p>
            </CCardFooter>
          </CCard>
        </CCol>
      </CRow>
    </CContainer>
  );
};

export default CalendarDemo; 