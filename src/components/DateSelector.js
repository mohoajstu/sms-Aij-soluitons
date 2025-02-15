import React, { useState } from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { TextField } from "@mui/material";
import dayjs from "dayjs";


const DateSelector = () => {
  const [selectedDate, setSelectedDate] = useState(dayjs());

  return (
    <div className="datepicker-container">
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DatePicker
          label="Select a Date"
          value={selectedDate}
          onChange={(newValue) => setSelectedDate(newValue)}
          renderInput={(params) => (
            <TextField {...params} className="datepicker-input" fullWidth />
          )}
        />
      </LocalizationProvider>
    </div>
  );
};

export default DateSelector;
