import React from "react";
import classNames from "classnames";
import { useNavigate } from "react-router-dom"; // Import navigation hook

import {
  CAvatar,
  CButton,
  CButtonGroup,
  CCard,
  CCardBody,
  CCardFooter,
  CCardHeader,
  CCol,
  CRow,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilSettings, cilArrowRight, cilUser, cilCheckCircle, cilBook, cilFile } from "@coreui/icons";

const Dashboard = () => {
  const navigate = useNavigate(); // Enable navigation

  return (
    <div className="p-4">
      <h1 className="text-4xl font-bold mb-2">TARBIYAH LEARNING ACADEMY</h1>
      <p className="italic text-lg mb-6">Staff Portal</p>

      <CCard className="mb-4">
        <CCardBody>
          <h2 className="text-2xl font-bold mb-2">WELCOME!</h2>
          <p className="font-semibold">
            PLEASE NOTE THAT YOU ARE REQUIRED TO FILL IN THE DAILY ATTENDANCE EVERY DAY.
          </p>
          <img src="/path-to-your-image/image.png" alt="Bismillah" className="mt-4" />
        </CCardBody>
      </CCard>

      <CRow>
        <CCol xs={12} md={4}>
          <CCard className="mt-4">
            <CCardBody className="d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center">
                <CIcon icon={cilUser} size="xxl" className="text-primary me-3" />
                <div>
                  <h3 className="text-primary fw-bold">500</h3>
                  <p className="mb-0 fw-semibold">STUDENTS</p>
                </div>
              </div>
            </CCardBody>
            <CCardFooter className="d-flex justify-content-between align-items-center">
              <span className="text-decoration-underline text-primary">View more</span>
              <CIcon icon={cilArrowRight} className="text-primary" />
            </CCardFooter>
          </CCard>
        </CCol>

        <CCol xs={12} md={4}>
          <CCard className="mt-4">
            <CCardBody className="d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center">
                <CIcon icon={cilCheckCircle} size="xxl" className="text-success me-3" />
                <div>
                  <h3 className="text-success fw-bold">95%</h3>
                  <p className="mb-0 fw-semibold">ATTENDANCE</p>
                </div>
              </div>
            </CCardBody>
            <CCardFooter className="d-flex justify-content-between align-items-center">
              <span className="text-decoration-underline text-primary">View more</span>
              <CIcon icon={cilArrowRight} className="text-primary" />
            </CCardFooter>
          </CCard>
        </CCol>

        <CCol xs={12} md={4}>
          <CCard className="mt-4">
            <CCardBody className="d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center">
                <CIcon icon={cilBook} size="xxl" className="text-warning me-3" />
                <div>
                  <h3 className="text-warning fw-bold">20</h3>
                  <p className="mb-0 fw-semibold">COURSES</p>
                </div>
              </div>
            </CCardBody>
            <CCardFooter className="d-flex justify-content-between align-items-center">
              <span className="text-decoration-underline text-primary">View more</span>
              <CIcon icon={cilArrowRight} className="text-primary" />
            </CCardFooter>
          </CCard>
        </CCol>

        {/* 📌 New Report Card Section */}
        <CCol xs={12} md={4}>
          <CCard className="mt-4">
            <CCardBody
              className="d-flex justify-content-between align-items-center"
              style={{ cursor: "pointer" }}
              onClick={() => navigate("/report-card")}
            >
              <div className="d-flex align-items-center">
                <CIcon icon={cilFile} size="xxl" className="text-info me-3" />
                <div>
                  <h3 className="text-info fw-bold">REPORT CARDS</h3>
                  <p className="mb-0 fw-semibold">Generate & Edit Reports</p>
                </div>
              </div>
            </CCardBody>
            <CCardFooter className="d-flex justify-content-between align-items-center">
              <span className="text-decoration-underline text-primary">Go to Report Cards</span>
              <CIcon icon={cilArrowRight} className="text-primary" />
            </CCardFooter>
          </CCard>
        </CCol>
      </CRow>
    </div>
  );
};

export default Dashboard;
