import React, { useState } from 'react';
import { TextField, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button } from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Autocomplete } from '@mui/material';
// import { saveAs } from 'file-saver';
// import * as XLSX from 'xlsx';
// import jsPDF from 'jspdf';
// import 'jspdf-autotable';

const AttendanceTable = ({ attendanceData, reportParams }) => {

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Data");
    XLSX.writeFile(workbook, "attendance_data.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.autoTable({
      head: [['DATE', 'CLASS', 'STUDENT', 'STATUS', 'NOTE']],
      body: filteredData.map(row => [row.date, row.class, row.student, row.status, row.note])
    });
    doc.save("attendance_data.pdf");
  };

  const getRowStyle = (status) => {
    switch (status) {
      case 'Late':
        return { backgroundColor: '#FFFACD' };
      case 'Absent':
        return { backgroundColor: '#FFCCCC' };
      default:
        return {};
    }
  };
  

  return (
    <Box mt={4}>
      <Box display="flex" justifyContent="space-between" mb={2}>
        <Button variant="contained" color="dark" onClick={exportToExcel}>Export Excel</Button>
        <Button variant="contained" color="dark" onClick={exportToPDF}>Export PDF</Button>
      </Box>
      <TableContainer component={Paper}>
        <Table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <TableHead>
            <TableRow style={{ backgroundColor: '#222', color: '#fff' }}>
              <TableCell style={{ color: '#fff', border: '1px solid black' }}>DATE</TableCell>
              <TableCell style={{ color: '#fff', border: '1px solid black' }}>CLASS</TableCell>
              <TableCell style={{ color: '#fff', border: '1px solid black' }}>STUDENT</TableCell>
              <TableCell style={{ color: '#fff', border: '1px solid black' }}>STATUS</TableCell>
              <TableCell style={{ color: '#fff', border: '1px solid black' }}>NOTE</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {attendanceData.map((row, index) => (
              <TableRow key={index} style={getRowStyle(row.status)}>
                <TableCell style={{ border: '1px solid black' }}>{row.date}</TableCell>
                <TableCell style={{ border: '1px solid black' }}>{row.class}</TableCell>
                <TableCell style={{ border: '1px solid black' }}>{row.student}</TableCell>
                <TableCell style={{ border: '1px solid black' }}>{row.status}</TableCell>
                <TableCell style={{ border: '1px solid black' }}>{row.note}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default AttendanceTable;