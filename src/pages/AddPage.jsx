import React, { useState, useEffect } from 'react'
import axios from 'axios'

import API_URL from '../api'

const incomeCategories = ['เงินเดือน', 'ลงทุน', 'แฟน','เทควันโด','อื่นๆ']
const expenseCategories = ['มื้อ','ของกิน', 'ของกินเล่น','ช้อปปิ้ง', 'ที่พัก', 'เดินทาง', 'ของใช้ประจำวัน', 'บันเทิง', 'ลงทุน', 'แฟน', 'ชาร์จรถ','อื่นๆ']

function AddPage() {
  const [type, setType] = useState('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [alert, setAlert] = useState(null)
  const [allExpenses, setAllExpenses] = useState([])
  const [editId, setEditId] = useState(null) // State สำหรับเก็บ ID ที่กำลังแก้ไข

  // States for filtering
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [filterLimit, setFilterLimit] = useState(10);

  useEffect(() => {
    fetchAllExpenses()
  }, [])

  const fetchAllExpenses = async () => {
    try {
      const res = await axios.get(`${API_URL}/expenses`);
      const sorted = res.data.sort((a, b) => {
        if (b.date !== a.date) return b.date.localeCompare(a.date)
        return (b.id || 0) - (a.id || 0)
      })
      setAllExpenses(sorted)
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!amount || !category || !date) {
      setAlert({ type: 'error', message: 'กรุณากรอกข้อมูลให้ครบ' })
      return
    }

    const expenseData = {
      id: editId || Date.now(), // ถ้าแก้ไขใช้ ID เดิม, ถ้าใหม่ใช้ Date.now()
      type,
      amount: parseFloat(amount),
      category,
      date,
      note
    }

    try {
      if (editId) {
        // กรณีแก้ไข (Update)
        await axios.put(`${API_URL}/expenses/${editId}`, expenseData)
        setAlert({ type: 'success', message: 'อัปเดตข้อมูลสำเร็จ! ✏️' })
      } else {
        // กรณีสร้างใหม่ (Create)
        await axios.post(`${API_URL}/expenses`, expenseData)
        setAlert({ type: 'success', message: 'บันทึกสำเร็จ! ✅' })
      }

      setAmount('')
      setCategory('')
      setNote('')
      setEditId(null) // รีเซ็ตสถานะแก้ไข
      fetchAllExpenses()

      setTimeout(() => setAlert(null), 3000)
    } catch (err) {
      setAlert({ type: 'error', message: 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง' })
    }
  }

const handleDelete = async (id) => {
  // ถามผู้ใช้ก่อนเพื่อความชัวร์
  if (!window.confirm('คุณต้องการลบรายการนี้ใช่หรือไม่?')) return;

  try {
    await axios.delete(`${API_URL}/expenses/${id}`)
    fetchAllExpenses() // ดึงข้อมูลใหม่มาโชว์ (รายการที่ลบไปจะหายไปจากหน้าจอ)
    setAlert({ type: 'success', message: 'ลบสำเร็จ! 🗑️' })
    setTimeout(() => setAlert(null), 3000)
  } catch (err) {
    console.error('Error deleting:', err)
    setAlert({ type: 'error', message: 'ลบไม่สำเร็จ กรุณาลองใหม่' })
  }
}

const handleEdit = (item) => {
  // นำข้อมูลมาใส่ในฟอร์ม
  setType(item.type)
  setAmount(item.amount)
  setCategory(item.category)
  setDate(item.date)
  setNote(item.note || '')
  setEditId(item.id)
  window.scrollTo({ top: 0, behavior: 'smooth' }) // เลื่อนขึ้นไปหาฟอร์ม
}

const handleCancelEdit = () => {
  setAmount('')
  setCategory('')
  setNote('')
  setEditId(null)
}

  const categories = type === 'income' ? incomeCategories : expenseCategories

  const formatNumber = (num) => {
    return parseFloat(num).toLocaleString('th-TH', { minimumFractionDigits: 2 })
  }

  // --- Filtering Logic ---
  const uniqueCategories = [...new Set(allExpenses.map(e => e.category))].sort((a, b) => a.localeCompare(b));

  const displayedExpenses = allExpenses
    .filter(exp => {
      const dateMatch = filterDate ? exp.date === filterDate : true;
      const categoryMatch = filterCategory !== 'all' ? exp.category === filterCategory : true;
      return dateMatch && categoryMatch;
    })
    .slice(0, filterLimit);


  return (
    <div>
      <div className="card">
        <h2>{editId ? '✏️ แก้ไขรายการ' : '📝 บันทึกรายการ'}</h2>

        {alert && (
          <div className={`alert alert-${alert.type}`}>
            {alert.message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* เลือกประเภท */}
          <div className="type-selector">
            <div
              className={`type-btn ${type === 'income' ? 'income-active' : ''}`}
              onClick={() => {
                setType('income')
                if (!editId) setCategory('') // เคลียร์หมวดหมู่เฉพาะตอนไม่ได้แก้ไข
              }}
            >
              💰 รายรับ
            </div>
            <div
              className={`type-btn ${type === 'expense' ? 'expense-active' : ''}`}
              onClick={() => {
                setType('expense')
                if (!editId) setCategory('')
              }}
            >
              💸 รายจ่าย
            </div>
          </div>

          {/* จำนวนเงิน */}
          <div className="form-group">
            <label>จำนวนเงิน (บาท)</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          {/* หมวดหมู่ */}
          <div className="form-group">
            <label>หมวดหมู่</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} required>
              <option value="">-- เลือกหมวดหมู่ --</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* วันที่ */}
          <div className="form-group">
            <label>วันที่</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* หมายเหตุ */}
          <div className="form-group">
            <label>หมายเหตุ (ไม่บังคับ)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="รายละเอียดเพิ่มเติม..."
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="submit-btn" style={{ flex: 1 }}>
              {editId ? '🔄 อัปเดต' : '💾 บันทึก'}
            </button>
            {editId && (
              <button type="button" className="submit-btn" style={{ background: '#ccc', flex: 1 }} onClick={handleCancelEdit}>
                ❌ ยกเลิก
              </button>
            )}
          </div>
        </form>
      </div>

      {/* รายการล่าสุด */}
      <div className="card">
        <h2>📋 รายการล่าสุด</h2>
        
        {/* --- FILTER CONTROLS --- */}
        <div className="filter-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', alignItems: 'flex-end', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
          <div className="form-group" style={{marginBottom: 0}}>
            <label style={{marginBottom: '5px', display: 'block'}}>หมวดหมู่</label>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
              <option value="all">ทุกหมวดหมู่</option>
              {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          
          <div className="form-group" style={{marginBottom: 0}}>
            <label style={{marginBottom: '5px', display: 'block'}}>วันที่</label>
            <div style={{display: 'flex', gap: '5px'}}>
              <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{flex: 1}}/>
              <button type="button" onClick={() => setFilterDate('')} style={{padding: '8px 10px', border:'1px solid #ddd', background:'#f1f1f1', cursor:'pointer'}} title="Clear Date">X</button>
            </div>
          </div>
          
          <div className="form-group" style={{marginBottom: 0}}>
            <label style={{marginBottom: '5px', display: 'block'}}>แสดง</label>
            <select value={filterLimit} onChange={e => setFilterLimit(Number(e.target.value))}>
                <option value={10}>10 รายการ</option>
                <option value={25}>25 รายการ</option>
                <option value={50}>50 รายการ</option>
                <option value={99999}>ทั้งหมด</option>
            </select>
          </div>
        </div>

        {displayedExpenses.length === 0 ? (
          <div className="no-data" style={{textAlign: 'center', padding: '20px 0'}}>ไม่พบรายการตามเงื่อนไข</div>
        ) : (
          displayedExpenses.map((exp) => (
            <div className="transaction-item" key={exp.id}>
              <div className="transaction-info">
                <span>
                  {exp.type === 'income' ? '🟢' : '🔴'}{' '}
                  {exp.note || exp.category}
                </span>
                <span className="transaction-category">{exp.category}</span>
                <span className="transaction-date">{exp.date}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className={exp.type === 'income' ? 'income' : 'expense'}>
                  {exp.type === 'income' ? '+' : '-'}{formatNumber(exp.amount)} ฿
                </span>
                <button className="edit-btn" onClick={() => handleEdit(exp)} style={{ marginRight: '5px', border: 'none', background: 'none', cursor: 'pointer' }}>
                  ✏️
                </button>
                <button className="delete-btn" onClick={() => handleDelete(exp.id)}>
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default AddPage