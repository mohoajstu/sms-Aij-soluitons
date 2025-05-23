import React, { useState, useEffect } from "react";
import "./BudgetTracker.css";
import { doc, updateDoc } from "firebase/firestore";
import { firestore } from "../../Firebase/firebase"; 
import { Timestamp } from "firebase/firestore";	


function BudgetTracker({ budget, accentColor, courseId}) {
  // Budget tracker state
  // const [budgetEntries, setBudgetEntries] = useState([]);
  const [newExpense, setNewExpense] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [isExpense, setIsExpense] = useState(true);
  
  // Load budget entries from localStorage on component mount
  // useEffect(() => {
  //   const savedEntries = localStorage.getItem(`budget-entries-${id}`);
  //   if (savedEntries) {
  //     setBudgetEntries(JSON.parse(savedEntries));
  //   }
  // }, [id]);
  
  // // Save budget entries to localStorage when they change
  // useEffect(() => {
  //   if (budgetEntries.length > 0) {
  //     localStorage.setItem(`budget-entries-${id}`, JSON.stringify(budgetEntries));
  //   }
  // }, [budgetEntries, id]);
  
 
  const calculateRemainingBudget = () => {
    const totalBudget = Number(budget?.totalBudget || 0);
    const spent = budget?.accumulatedCost 
      ?? budget?.itemList?.reduce((total, item) => total + Number(item.itemCost || 0), 0) 
      ?? 0;
  
    // console.log("Total budget:", totalBudget, "Spent:", spent);
    return totalBudget - spent;
  };
  
  
  const formatDate = d =>
    !d
      ? ""
      : d instanceof Timestamp
          ? d.toDate().toLocaleDateString()   // convert TS → JS Date → string
          : typeof d === "string"
              ? d
              : "";

  // Handle form submission for new budget entry
  const handleAddEntry = async (e) => {
    e.preventDefault();
    
    if (!newExpense || !newAmount || isNaN(parseFloat(newAmount)) || parseFloat(newAmount) <= 0) {
      alert("Please enter a valid description and amount");
      return;
    }
    
    const newEntry = {
      itemName: newExpense,
      itemCost: parseFloat(newAmount),
      itemType: isExpense ? "expense" : "refund",
      itemDate : Timestamp.now() 
    };

    try {
      console.log("COURSE ID", courseId);
      const courseRef = doc(firestore, "courses", courseId);
      await updateDoc(courseRef, {
        "budget.itemList": [...(budget.itemList || []), newEntry],
        "budget.accumulatedCost": (budget.accumulatedCost || 0) +
          (newEntry.itemType === "expense" ? newEntry.itemCost : -newEntry.itemCost)
      });
    
    // setBudgetEntries([...budgetEntries, newEntry]);
    setNewExpense("");
    setNewAmount("");
  } catch (err) {
    alert(err.message);
  }
  };
  
  // Handle removing an entry
  // const handleRemoveEntry = (entryId) => {
  //   setBudgetEntries(budgetEntries.filter(entry => entry.id !== entryId));
  // };

  const handleRemoveEntry = async (entryIndex) => {
    if (!courseId) return;

    // 1️⃣ copy current list and remove the chosen item
    const newList   = [...(budget.itemList || [])];
    const [removed] = newList.splice(entryIndex, 1);   // removed is the object we clicked

    if (!removed) return; // safety guard

    // 2️⃣ work out how the total changes
    const delta =
      removed.itemType === "expense"
        ? -removed.itemCost          // undo the spend
        : +removed.itemCost;         // undo the refund

    // 3️⃣ write the update to Firestore
    try {
      const courseRef = doc(firestore, "courses", courseId);
      await updateDoc(courseRef, {
        "budget.itemList"      : newList,
        "budget.accumulatedCost": (budget.accumulatedCost || 0) + delta
      });

      // 4️⃣ pull the fresh doc (or rely on onSnapshot)
      if (typeof refreshCourse === "function") refreshCourse();

    } catch (err) {
      console.error("Failed to remove entry:", err);
      alert("Could not remove entry; please try again.");
    }
  };
  
  // Calculate budget percentage used
  const percentageUsed = () => {
    const remaining = calculateRemainingBudget();
    return 100 - ((remaining / budget.totalBudget) * 100);
  };

  // Get text based on lighter version of the accent color for headers
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

  return (
    <div className="budget-tracker-card">
      <h3 
        className="budget-tracker-title"
        style={{ borderBottom: `2px solid ${accentColor}` }}
      >
        Budget Tracker
      </h3>
      
      <div className="budget-summary">
        <div className="budget-row">
          <span>Annual Budget:</span>
          <span className="budget-amount">${Number(budget.totalBudget || 0).toFixed(2)}</span>
        </div>
        <div className="budget-row">
          <span>Remaining:</span>
          <span className={`budget-amount ${calculateRemainingBudget() < 50 ? "budget-low" : "budget-good"}`}>
            ${Number(calculateRemainingBudget() || 0).toFixed(2)}
          </span>
        </div>
        
        {/* Budget progress bar */}
        <div className="budget-progress-container">
          <div 
            className={`budget-progress-bar ${percentageUsed() > 90 ? "budget-critical" : "budget-normal"}`}
            style={{ 
              width: `${Math.min(percentageUsed(), 100)}%`,
              backgroundColor: percentageUsed() > 90 ? "#dc3545" : "#28a745" 
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
          // style={{ backgroundColor: accentColor }}
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
          {(!budget.itemList || budget.itemList.length === 0) ? (
            <p className="no-entries">No entries yet</p>
          ) : (
            budget.itemList.slice().reverse().map((entry, index) => (
              <div key={index} className="entry-item">
                <div className="entry-details">
                  <div className="entry-description">{entry.itemName}</div>
                  <div className="entry-date">{formatDate(entry.itemDate)}</div> {/* Add a date field later if needed */}
                </div>
                <div className="entry-amount-container">
                  <span className={`entry-amount ${entry.itemType === "expense" ? "expense" : "refund"}`}>
                    {entry.itemType === "expense" ? "-" : "+"}${Number(entry.itemCost || 0).toFixed(2)}
                  </span>
                  {/* No ID in itemList, so index is used — only works if this list isn't modified by index elsewhere */}
                  <button 
                    onClick={() => handleRemoveEntry(index)} 
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
  );
}

export default BudgetTracker;