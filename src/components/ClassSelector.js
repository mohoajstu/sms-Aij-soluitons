import React, { useState } from "react";
import { Autocomplete, TextField } from "@mui/material";

const ClassSelector = () => {
  const [selectedClass, setSelectedClass] = useState(null);

  const classes = [
    { label: "Math 101" },
    { label: "Physics 202" },
    { label: "History 305" },
  ]; // Replace with actual class data

  return (
    <div className="autocomplete-container">
      <Autocomplete
        options={classes}
        getOptionLabel={(option) => option.label}
        value={selectedClass}
        onChange={(event, newValue) => setSelectedClass(newValue)}
        className="autocomplete-input"
        renderInput={(params) => <TextField {...params} variant="outlined" fullWidth label="Select a class" />}
        sx={{ width: 300, backgroundColor: "#FFFFFF"}}
      />
    </div>
  );
};

export default ClassSelector;