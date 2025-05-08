import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import coursesData from '../../Data/coursesData.json';
import { CCard, CCardBody, CCardHeader, CProgress, CButton, CForm, CFormInput, CFormCheck } from '@coreui/react';

export default function BudgetPage() {
  const { id } = useParams();
  const courseId = Number(id);
  const [course, setCourse] = useState(null);
  const [budgetEntries, setBudgetEntries] = useState([]);
  const [newExpense, setNewExpense] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [isExpense, setIsExpense] = useState(true);

  useEffect(() => {
    // Find the course data
    const foundCourse = coursesData.find(c => c.id === courseId);
    if (foundCourse) {
      setCourse(foundCourse);
      
      // Load budget entries from localStorage
      const savedEntries = localStorage.getItem(`budget-entries-${courseId}`);
      if (savedEntries) {
        setBudgetEntries(JSON.parse(savedEntries));
      }
    }
  }, [courseId]);

  // Save budget entries to localStorage when they change
  useEffect(() => {
    if (budgetEntries.length > 0) {
      localStorage.setItem(`budget-entries-${courseId}`, JSON.stringify(budgetEntries));
    }
  }, [budgetEntries, courseId]);

  if (!course) {
    return <div>Loading course information...</div>;
  }

  // Calculate budget
  const initialBudget = course.budget || 500; // Default annual budget of $500
  
  const calculateRemainingBudget = () => {
    const spent = budgetEntries.reduce((total, entry) => {
      return entry.type === "expense" 
        ? total + parseFloat(entry.amount) 
        : total - parseFloat(entry.amount);
    }, 0);
    
    return initialBudget - spent;
  };
  
  // Calculate budget percentage used
  const percentageUsed = () => {
    const remaining = calculateRemainingBudget();
    return 100 - ((remaining / initialBudget) * 100);
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

  return (
    <div style={{ padding: 20 }}>
      <h2>Budget for {course.title}</h2>
      <p className="text-muted">Course ID: {courseId}</p>
      
      <CCard className="mb-4">
        <CCardHeader>
          <h3>Budget Overview</h3>
        </CCardHeader>
        <CCardBody>
          <div className="d-flex justify-content-between mb-4">
            <div>
              <h5>Initial Budget</h5>
              <h3>${initialBudget.toFixed(2)}</h3>
            </div>
            <div>
              <h5>Remaining</h5>
              <h3>${calculateRemainingBudget().toFixed(2)}</h3>
            </div>
            <div>
              <h5>Used</h5>
              <h3>{percentageUsed().toFixed(1)}%</h3>
            </div>
          </div>
          
          <CProgress value={percentageUsed()} color={percentageUsed() > 80 ? "danger" : "success"} height={10} className="mb-3" />
        </CCardBody>
      </CCard>
      
      <CCard className="mb-4">
        <CCardHeader>
          <h3>Add New Entry</h3>
        </CCardHeader>
        <CCardBody>
          <CForm onSubmit={handleAddEntry}>
            <div className="row mb-3">
              <div className="col-md-5">
                <label htmlFor="expense-description">Description</label>
                <CFormInput 
                  id="expense-description"
                  value={newExpense}
                  onChange={(e) => setNewExpense(e.target.value)}
                  placeholder="e.g., Textbooks, Field Trip"
                />
              </div>
              
              <div className="col-md-3">
                <label htmlFor="expense-amount">Amount ($)</label>
                <CFormInput 
                  type="number" 
                  id="expense-amount"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
              
              <div className="col-md-4">
                <label>Type</label>
                <div>
                  <CFormCheck 
                    inline
                    type="radio"
                    id="expense-type-expense"
                    label="Expense"
                    checked={isExpense} 
                    onChange={() => setIsExpense(true)}
                  />
                  <CFormCheck 
                    inline
                    type="radio"
                    id="expense-type-refund"
                    label="Refund"
                    checked={!isExpense} 
                    onChange={() => setIsExpense(false)}
                  />
                </div>
              </div>
            </div>
            
            <CButton type="submit" color="primary">Add Entry</CButton>
          </CForm>
        </CCardBody>
      </CCard>
      
      <CCard>
        <CCardHeader>
          <h3>Transaction History</h3>
        </CCardHeader>
        <CCardBody>
          {budgetEntries.length === 0 ? (
            <div className="text-center py-5">No entries yet. Add your first budget item above.</div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Type</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {budgetEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.date}</td>
                      <td>{entry.description}</td>
                      <td>${entry.amount.toFixed(2)}</td>
                      <td>
                        <span className={`badge bg-${entry.type === "expense" ? "danger" : "success"}`}>
                          {entry.type === "expense" ? "Expense" : "Refund"}
                        </span>
                      </td>
                      <td>
                        <CButton 
                          color="danger"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveEntry(entry.id)}
                        >
                          Delete
                        </CButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CCardBody>
      </CCard>
    </div>
  );
} 