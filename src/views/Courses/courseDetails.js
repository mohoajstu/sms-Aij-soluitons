// CourseDetailPage.jsx
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import coursesData from "../../Data/coursesData.json";
import "./courseDetails.css";

function CourseDetailPage() {
  const { id } = useParams();
  const courseId = Number(id);

  // find the course in your JSON
  const course = coursesData.find((c) => c.id === courseId);

  // Budget tracker state
  const [budgetEntries, setBudgetEntries] = useState([]);
  const [newExpense, setNewExpense] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [isExpense, setIsExpense] = useState(true);
  const initialBudget = course?.budget || 500; // Default annual budget of $500
  
  // Function to get contrasting text color based on background
  const getTextColor = (bgColor) => {
    // Convert hex to RGB
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate brightness
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    // Return black for light backgrounds, white for dark
    return brightness > 125 ? '#333' : '#fff';
  };
  
  // Create a lighter version of the course color for section headers
  const getLighterColor = (hexColor) => {
    // Default color if none provided
    if (!hexColor) return '#f8f9fa';
    
    // Convert hex to RGB
    const hex = hexColor.replace('#', '');
    let r = parseInt(hex.substr(0, 2), 16);
    let g = parseInt(hex.substr(2, 2), 16);
    let b = parseInt(hex.substr(4, 2), 16);
    
    // Make it lighter (mix with white)
    r = Math.floor(r + (255 - r) * 0.85);
    g = Math.floor(g + (255 - g) * 0.85);
    b = Math.floor(b + (255 - b) * 0.85);
    
    return `rgb(${r}, ${g}, ${b})`;
  };
  
  // Load budget entries from localStorage on component mount
  useEffect(() => {
    const savedEntries = localStorage.getItem(`budget-entries-${courseId}`);
    if (savedEntries) {
      setBudgetEntries(JSON.parse(savedEntries));
    }
  }, [courseId]);
  
  // Save budget entries to localStorage when they change
  useEffect(() => {
    if (budgetEntries.length > 0) {
      localStorage.setItem(`budget-entries-${courseId}`, JSON.stringify(budgetEntries));
    }
  }, [budgetEntries, courseId]);
  
  // Calculate remaining budget
  const calculateRemainingBudget = () => {
    const spent = budgetEntries.reduce((total, entry) => {
      return entry.type === "expense" 
        ? total + parseFloat(entry.amount) 
        : total - parseFloat(entry.amount);
    }, 0);
    
    return initialBudget - spent;
  };
  
  // Handle form submission for new budget entry
  const handleAddEntry = (e) => {
    e.preventDefault();
    
    if (!newExpense || !newAmount || isNaN(parseFloat(newAmount)) || parseFloat(newAmount) <= 0) {
      alert("Please enter a valid description and amount");
      return;
    }
    
    const newEntry = {
      id: Date.now(),
      description: newExpense,
      amount: parseFloat(newAmount),
      type: isExpense ? "expense" : "refund",
      date: new Date().toLocaleDateString()
    };
    
    setBudgetEntries([...budgetEntries, newEntry]);
    setNewExpense("");
    setNewAmount("");
  };
  
  // Handle removing an entry
  const handleRemoveEntry = (entryId) => {
    setBudgetEntries(budgetEntries.filter(entry => entry.id !== entryId));
  };
  
  // Calculate budget percentage used
  const percentageUsed = () => {
    const remaining = calculateRemainingBudget();
    return 100 - ((remaining / initialBudget) * 100);
  };

  if (!course) {
    return <div className="course-not-found">Course not found</div>;
  }

  const getColorFromId = (id) => {
    // Slightly different multiplier
    const hue = (id * 271.019) % 360
    return `hsl(${hue}, 70%, 45%)`
  }
  
  
  // Get course color or use default
  const courseColor = course.color || getColorFromId(courseId);
  const textColor = getTextColor(courseColor);
  const lightColor = getLighterColor(courseColor);
  const accentColor = courseColor;

  return (
    <div className="course-detail-container">
      {/* Course Header with course color */}
      <div 
        className="course-header" 
        style={{ backgroundColor: courseColor, color: textColor }}
      >
        <h1>{course.title}</h1>
        <p>{course.description}</p>
      </div>
      
      {/* Content Area - Lists and Budget side by side */}
      <div className="content-area">
        {/* Left Column - Staff and Students Tables */}
        <div className="lists-column">
          <div className="section">
            <h3 style={{ borderBottom: `2px solid ${courseColor}` }}>Staff</h3>
            <div className="table-container">
              <table className="members-table">
                <thead>
                  <tr>
                    <th style={{ backgroundColor: lightColor }}>ID</th>
                    <th style={{ backgroundColor: lightColor }}>Name</th>
                    <th style={{ backgroundColor: lightColor }}>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {course.staff.map((person, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{person}</td>
                      <td>Instructor</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="section">
            <h3 style={{ borderBottom: `2px solid ${courseColor}` }}>Students</h3>
            <div className="table-container">
              <table className="members-table">
                <thead>
                  <tr>
                    <th style={{ backgroundColor: lightColor }}>ID</th>
                    <th style={{ backgroundColor: lightColor }}>Name</th>
                    <th style={{ backgroundColor: lightColor }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {course.students.map((student, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{student}</td>
                      <td>Enrolled</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        {/* Right Column - Budget Tracker */}
        <div className="budget-column">
          <div className="budget-tracker-card">
            <h3 
              className="budget-tracker-title"
              style={{ borderBottom: `2px solid ${courseColor}` }}
            >
              Classroom Budget Tracker
            </h3>
            
            <div className="budget-summary">
              <div className="budget-row">
                <span>Annual Budget:</span>
                <span className="budget-amount">${initialBudget.toFixed(2)}</span>
              </div>
              <div className="budget-row">
                <span>Remaining:</span>
                <span className={`budget-amount ${calculateRemainingBudget() < 50 ? "budget-low" : "budget-good"}`}>
                  ${calculateRemainingBudget().toFixed(2)}
                </span>
              </div>
              
              {/* Budget progress bar */}
              <div className="budget-progress-container">
                <div 
                  className={`budget-progress-bar ${percentageUsed() > 90 ? "budget-critical" : "budget-normal"}`}
                  style={{ 
                    width: `${Math.min(percentageUsed(), 100)}%`,
                    backgroundColor: percentageUsed() > 90 ? "#dc3545" :"#28a745" 
                  }} 
                />
              </div>
            </div>
            
            {/* Add expense form */}
            <form onSubmit={handleAddEntry} className="budget-form">
              <div className="form-group">
                <label>Description:</label>
                <input 
                  type="text" 
                  value={newExpense}
                  onChange={(e) => setNewExpense(e.target.value)}
                  placeholder="e.g., Art supplies"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Amount ($):</label>
                <input 
                  type="number" 
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>
              
              <div className="radio-group">
                <label>
                  <input 
                    type="radio" 
                    checked={isExpense} 
                    onChange={() => setIsExpense(true)}
                  />
                  Expense
                </label>
                <label>
                  <input 
                    type="radio" 
                    checked={!isExpense} 
                    onChange={() => setIsExpense(false)}
                  />
                  Refund/Credit
                </label>
              </div>
              
              <button 
                type="submit" 
                className="btn-add-entry"
              >
                Add Entry
              </button>
            </form>
            
            {/* Recent entries */}
            <div className="recent-entries">
              <h4 className="recent-entries-title">
                Recent Entries
              </h4>
              
              <div className="entries-list">
                {budgetEntries.length === 0 ? (
                  <p className="no-entries">
                    No entries yet
                  </p>
                ) : (
                  budgetEntries.slice().reverse().map(entry => (
                    <div key={entry.id} className="entry-item">
                      <div className="entry-details">
                        <div className="entry-description">{entry.description}</div>
                        <div className="entry-date">{entry.date}</div>
                      </div>
                      <div className="entry-amount-container">
                        <span className={`entry-amount ${entry.type === "expense" ? "expense" : "refund"}`}>
                          {entry.type === "expense" ? "-" : "+"}${entry.amount.toFixed(2)}
                        </span>
                        <button 
                          onClick={() => handleRemoveEntry(entry.id)}
                          className="btn-remove-entry"
                          title="Remove entry"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CourseDetailPage;