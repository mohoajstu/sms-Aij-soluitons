import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore'
import { firestore } from '../../firebase'
import { auth } from '../../firebase'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CProgress,
  CButton,
  CForm,
  CFormInput,
  CFormCheck,
} from '@coreui/react'

export default function BudgetPage() {
  const { id } = useParams()
  const [course, setCourse] = useState(null)
  const [budgetEntries, setBudgetEntries] = useState([])
  const [newExpense, setNewExpense] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [isExpense, setIsExpense] = useState(true)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState('')
  const [editingBudget, setEditingBudget] = useState(false)
  const [newBudget, setNewBudget] = useState('')

  useEffect(() => {
    const fetchCourseData = async () => {
      if (!id) return
      setLoading(true)
      try {
        const courseDocRef = doc(firestore, 'courses', id)
        const courseDoc = await getDoc(courseDocRef)

        if (courseDoc.exists()) {
          const courseData = courseDoc.data()
          setCourse({ id: courseDoc.id, ...courseData })

          if (courseData.budget && courseData.budget.itemList) {
            const formattedEntries = courseData.budget.itemList.map((item) => ({
              id: `${item.itemName}-${item.itemDate.seconds}`,
              description: item.itemName,
              amount: item.itemCost,
              type: item.itemType,
              date: item.itemDate.toDate().toLocaleDateString(),
              firestoreDate: item.itemDate,
            }))
            setBudgetEntries(formattedEntries)
          }
        } else {
          console.log('No such course!')
        }
      } catch (error) {
        console.error('Error fetching course details:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCourseData()
  }, [id])

  useEffect(() => {
    // Fetch user role for admin check
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(firestore, 'users', user.uid))
        if (userDoc.exists()) {
          const data = userDoc.data()
          let role = data.personalInfo?.role?.toLowerCase() || data.role?.toLowerCase() || ''
          if (!role && data.personalInfo?.primaryRole) {
            const primaryRole = data.personalInfo.primaryRole.toLowerCase()
            if (primaryRole === 'schooladmin' || primaryRole === 'admin') {
              role = 'admin'
            } else {
              role = primaryRole
            }
          }
          setUserRole(role)
        }
      }
    })
    return () => unsub()
  }, [])

  if (loading) {
    return <div>Loading course information...</div>
  }

  if (!course) {
    return <div>Course not found.</div>
  }

  const initialBudget =
    typeof course.budget?.totalBudget === 'number' ? course.budget.totalBudget : 0

  const calculateRemainingBudget = () => {
    const totalFromEntries = budgetEntries.reduce((total, entry) => {
      return entry.type === 'expense'
        ? total + parseFloat(entry.amount)
        : total - parseFloat(entry.amount)
    }, 0)

    const baseSpent = course?.budget?.accumulatedCost || 0
    const initialItemsCount = course?.budget?.itemList?.length || 0
    if (budgetEntries.length === initialItemsCount) {
      return initialBudget - baseSpent
    }
    return initialBudget - totalFromEntries
  }

  const percentageUsed = () => {
    if (!course || !course.budget || !course.budget.totalBudget) return 0
    const remaining = calculateRemainingBudget()
    const used = course.budget.totalBudget - remaining
    return Math.min(100, Math.max(0, (used / course.budget.totalBudget) * 100))
  }

  const handleAddEntry = async (e) => {
    e.preventDefault()
    if (!newExpense || !newAmount || isNaN(parseFloat(newAmount)) || parseFloat(newAmount) <= 0) {
      alert('Please enter a valid description and amount')
      return
    }

    const newFirestoreEntry = {
      itemName: newExpense,
      itemCost: parseFloat(newAmount),
      itemType: isExpense ? 'expense' : 'refund',
      itemDate: Timestamp.fromDate(new Date()),
    }

    const currentItemList = course.budget.itemList || []
    const newItemList = [...currentItemList, newFirestoreEntry]

    const newAccumulatedCost = newItemList.reduce((total, item) => {
      const cost = item.itemType === 'expense' ? item.itemCost : -item.itemCost
      return total + cost
    }, 0)

    const courseDocRef = doc(firestore, 'courses', id)
    try {
      await updateDoc(courseDocRef, {
        'budget.itemList': newItemList,
        'budget.accumulatedCost': newAccumulatedCost,
      })
      setBudgetEntries((prev) => [
        ...prev,
        {
          id: `${newFirestoreEntry.itemName}-${newFirestoreEntry.itemDate.seconds}`,
          description: newFirestoreEntry.itemName,
          amount: newFirestoreEntry.itemCost,
          type: newFirestoreEntry.itemType,
          date: newFirestoreEntry.itemDate.toDate().toLocaleDateString(),
          firestoreDate: newFirestoreEntry.itemDate,
        },
      ])
      setCourse((prev) => ({
        ...prev,
        budget: { ...prev.budget, accumulatedCost: newAccumulatedCost },
      }))
    } catch (error) {
      console.error('Error adding budget entry:', error)
      alert('Failed to add budget entry.')
    }

    setNewExpense('')
    setNewAmount('')
  }

  const handleRemoveEntry = async (entryToRemove) => {
    const updatedItemList = (course.budget.itemList || []).filter(
      (item) => item.itemDate.seconds !== entryToRemove.firestoreDate.seconds,
    )

    const newAccumulatedCost = updatedItemList.reduce((total, item) => {
      const cost = item.itemType === 'expense' ? item.itemCost : -item.itemCost
      return total + cost
    }, 0)

    const courseDocRef = doc(firestore, 'courses', id)
    try {
      await updateDoc(courseDocRef, {
        'budget.itemList': updatedItemList,
        'budget.accumulatedCost': newAccumulatedCost,
      })
      setBudgetEntries((prev) => prev.filter((entry) => entry.id !== entryToRemove.id))
      setCourse((prev) => ({
        ...prev,
        budget: { ...prev.budget, accumulatedCost: newAccumulatedCost },
      }))
    } catch (error) {
      console.error('Error removing budget entry:', error)
      alert('Failed to remove budget entry.')
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Budget for {course.title}</h2>
      <p className="text-muted">Course ID: {id}</p>

      <CCard className="mb-4">
        <CCardHeader>
          <h3>Budget Overview</h3>
        </CCardHeader>
        <CCardBody>
          <div className="d-flex justify-content-between mb-4">
            <div>
              <h5>Initial Budget</h5>
              {userRole === 'admin' && editingBudget ? (
                <>
                  <input
                    type="number"
                    min="0"
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value)}
                    style={{ width: 100, marginRight: 8 }}
                  />
                  <CButton
                    size="sm"
                    color="success"
                    onClick={async () => {
                      const courseDocRef = doc(firestore, 'courses', id)
                      await updateDoc(courseDocRef, { 'budget.totalBudget': Number(newBudget) })
                      setCourse((prev) => ({
                        ...prev,
                        budget: { ...prev.budget, totalBudget: Number(newBudget) },
                      }))
                      setEditingBudget(false)
                    }}
                  >
                    Save
                  </CButton>
                  <CButton
                    size="sm"
                    color="secondary"
                    onClick={() => setEditingBudget(false)}
                    style={{ marginLeft: 4 }}
                  >
                    Cancel
                  </CButton>
                </>
              ) : (
                <>
                  <h3>${initialBudget.toFixed(2)}</h3>
                  {userRole === 'admin' && (
                    <CButton
                      size="sm"
                      color="primary"
                      onClick={() => {
                        setNewBudget(initialBudget)
                        setEditingBudget(true)
                      }}
                      style={{
                        marginLeft: 8,
                        fontWeight: 'bold',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ marginRight: 4 }}>
                        <i className="bi bi-pencil-square"></i>
                      </span>
                      Edit Initial Budget
                    </CButton>
                  )}
                </>
              )}
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

          <CProgress
            value={percentageUsed()}
            color={percentageUsed() > 80 ? 'danger' : 'success'}
            height={10}
            className="mb-3"
          />
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

            <CButton type="submit" color="primary">
              Add Entry
            </CButton>
          </CForm>
        </CCardBody>
      </CCard>

      <CCard>
        <CCardHeader>
          <h3>Transaction History</h3>
        </CCardHeader>
        <CCardBody>
          {budgetEntries.length === 0 ? (
            <div className="text-center py-5">
              No entries yet. Add your first budget item above.
            </div>
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
                        <span
                          className={`badge bg-${entry.type === 'expense' ? 'danger' : 'success'}`}
                        >
                          {entry.type === 'expense' ? 'Expense' : 'Refund'}
                        </span>
                      </td>
                      <td>
                        <CButton
                          color="danger"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveEntry(entry)}
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
  )
}
