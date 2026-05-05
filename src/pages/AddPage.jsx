import React, { useMemo, useState, useEffect } from "react";
import axios from "axios";

import API_URL from "../api/index.js";

const incomeCategories = ["เงินเดือน", "ลงทุน", "แฟน", "เทควันโด", "อื่นๆ"];
const expenseCategories = [
  "มื้อ",
  "ของกิน",
  "ของกินเล่น",
  "ที่พัก",
  "เดินทาง",
  "ของใช้ประจำวัน",
  "บันเทิง",
  "ลงทุน",
  "แฟน",
  "ชาร์จรถ",
  "อื่นๆ",
];

function AddPage() {
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [alert, setAlert] = useState(null);
  const [allExpenses, setAllExpenses] = useState([]);
  const [editId, setEditId] = useState(null); // State สำหรับเก็บ ID ที่กำลังแก้ไข
  const [deleteId, setDeleteId] = useState(null); // State to store the ID of the item to be deleted

  const [showDeleteModal, setShowDeleteModal] = useState(false); // State สำหรับควบคุมการแสดง Modal
  const [deleteConfirmation, setDeleteConfirmation] = useState(""); // State สำหรับเก็บข้อความยืนยันการลบ

  // States for filtering
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [filterLimit, setFilterLimit] = useState(10);

  useEffect(() => {
    fetchAllExpenses();
  }, []);

  const fetchAllExpenses = async () => {
    try {
      const res = await axios.get(`${API_URL}/expenses`);
      const sorted = res.data.sort((a, b) => {
        if (b.date !== a.date) return b.date.localeCompare(a.date);
        return (b.id || 0) - (a.id || 0);
      });
      setAllExpenses(sorted);
    } catch (err) {
      console.error("Error:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!amount || !category || !date) {
      setAlert({ type: "error", message: "กรุณากรอกข้อมูลให้ครบ" });
      return;
    }

    const expenseData = {
      id: editId || Date.now(), // ถ้าแก้ไขใช้ ID เดิม, ถ้าใหม่ใช้ Date.now()
      type,
      amount: parseFloat(amount),
      category,
      date,
      note,
    };

    try {
      if (editId) {
        // กรณีแก้ไข (Update)
        await axios.put(`${API_URL}/expenses/${editId}`, expenseData);
        setAlert({ type: "success", message: "อัปเดตข้อมูลสำเร็จ! ✏️" });
      } else {
        // กรณีสร้างใหม่ (Create)
        await axios.post(`${API_URL}/expenses`, expenseData);
        setAlert({ type: "success", message: "บันทึกสำเร็จ! ✅" });
      }

      setAmount("");
      setCategory("");
      setNote("");
      setEditId(null); // รีเซ็ตสถานะแก้ไข
      fetchAllExpenses();

      setTimeout(() => setAlert(null), 3000);
    } catch (err) {
      setAlert({ type: "error", message: "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง" });
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;

    try {
      await axios.delete(`${API_URL}/expenses/${deleteId}`, {
        data: { id: deleteId, password: deleteConfirmation },
      });
      fetchAllExpenses();
      setAlert({ type: "success", message: "ลบสำเร็จ! 🗑️" });
      setTimeout(() => setAlert(null), 3000);
    } catch (err) {
      setAlert({ type: "error", message: "ลบไม่สำเร็จ กรุณาลองใหม่" });
    } finally {
      setShowDeleteModal(false);
      setDeleteId(null);
    }
  };

  const handleEdit = (item) => {
    // นำข้อมูลมาใส่ในฟอร์ม
    setType(item.type);
    setAmount(item.amount);
    setCategory(item.category);
    setDate(item.date);
    setNote(item.note || "");
    setEditId(item.id);
    window.scrollTo({ top: 0, behavior: "smooth" }); // เลื่อนขึ้นไปหาฟอร์ม
  };

  const handleCancelEdit = () => {
    setAmount("");
    setCategory("");
    setNote("");
    setEditId(null);
  };

  const categories = useMemo(
    () => (type === "income" ? incomeCategories : expenseCategories),
    [type],
  );

  const formatNumber = (num) => {
    return parseFloat(num).toLocaleString("th-TH", {
      minimumFractionDigits: 2,
    });
  };

  // --- Filtering Logic ---
  const uniqueCategories = [
    ...new Set(allExpenses.map((e) => e.category)),
  ].sort((a, b) => a.localeCompare(b));

  const displayedExpenses = allExpenses
    .filter((exp) => {
      const dateMatch = filterDate ? exp.date === filterDate : true;
      const categoryMatch =
        filterCategory !== "all" ? exp.category === filterCategory : true;
      return dateMatch && categoryMatch;
    })
    .slice(0, filterLimit);

  return (
    <div className="add-page">
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">⚠️ ยืนยันการลบ</h3>
            <p className="modal-desc">พิมพ์ "รหัส" เพื่อทำรายการลบ</p>

            <input
              type="text"
              className="modal-input"
              placeholder="พิมพ์ 'รหัส' เพื่อลบ..."
              onChange={(e) => setDeleteConfirmation(e.target.value)}
            />

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="modal-btn cancel-btn"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="modal-btn confirm-btn"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2>{editId ? "✏️ แก้ไขรายการ" : "📝 บันทึกรายการ"}</h2>
          {editId && (
            <button
              type="button"
              className="ghost-btn"
              onClick={handleCancelEdit}
            >
              ยกเลิกการแก้ไข
            </button>
          )}
        </div>

        {alert && (
          <div className={`alert alert-${alert.type}`}>{alert.message}</div>
        )}

        <form onSubmit={handleSubmit}>
          {/* เลือกประเภท */}
          <div className="type-selector">
            <div
              className={`type-btn ${type === "income" ? "income-active" : ""}`}
              onClick={() => {
                setType("income");
                if (!editId) setCategory(""); // เคลียร์หมวดหมู่เฉพาะตอนไม่ได้แก้ไข
              }}
            >
              💰 รายรับ
            </div>
            <div
              className={`type-btn ${type === "expense" ? "expense-active" : ""}`}
              onClick={() => {
                setType("expense");
                if (!editId) setCategory("");
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
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              <option value="">-- เลือกหมวดหมู่ --</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
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

          <div style={{ display: "flex", gap: "10px" }}>
            <button type="submit" className="submit-btn" style={{ flex: 1 }}>
              {editId ? "🔄 อัปเดต" : "💾 บันทึก"}
            </button>
          </div>
        </form>
      </div>

      {/* รายการล่าสุด */}
      <div className="card">
        <h2>📋 รายการล่าสุด</h2>

        {/* --- FILTER CONTROLS --- */}
        <div className="filter-container">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ marginBottom: "5px", display: "block" }}>
              หมวดหมู่
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="all">ทุกหมวดหมู่</option>
              {uniqueCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ marginBottom: "5px", display: "block" }}>
              วันที่
            </label>
            <div style={{ display: "flex", gap: "5px" }}>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={() => setFilterDate("")}
                className="mini-btn"
                title="Clear Date"
              >
                X
              </button>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ marginBottom: "5px", display: "block" }}>
              แสดง
            </label>
            <select
              value={filterLimit}
              onChange={(e) => setFilterLimit(Number(e.target.value))}
            >
              <option value={10}>10 รายการ</option>
              <option value={25}>25 รายการ</option>
              <option value={50}>50 รายการ</option>
              <option value={99999}>ทั้งหมด</option>
            </select>
          </div>
        </div>

        {displayedExpenses.length === 0 ? (
          <div
            className="no-data"
            style={{ textAlign: "center", padding: "20px 0" }}
          >
            ไม่พบรายการตามเงื่อนไข
          </div>
        ) : (
          displayedExpenses.map((exp) => (
            <div className="transaction-item" key={exp.id}>
              <div className="transaction-info">
                <span>
                  {exp.type === "income" ? "🟢" : "🔴"}{" "}
                  {exp.note || exp.category}
                </span>
                <span className="transaction-category">{exp.category}</span>
                <span className="transaction-date">{exp.date}</span>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <span className={exp.type === "income" ? "income" : "expense"}>
                  {exp.type === "income" ? "+" : "-"}
                  {formatNumber(exp.amount)} ฿
                </span>
                <button
                  className="edit-btn"
                  onClick={() => handleEdit(exp)}
                  style={{
                    marginRight: "5px",
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                  }}
                >
                  ✏️
                </button>
                <button
                  className="delete-btn"
                  onClick={() => handleDeleteClick(exp.id)}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .add-page {
          max-width: 1000px;
          margin: 0 auto;
        }

        .card {
          background: var(--card);
          border: 1px solid var(--border-soft);
          border-radius: 18px;
          padding: 18px;
          box-shadow: var(--shadow-soft);
          margin-bottom: 18px;
        }
        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }
        .card h2 {
          margin: 0;
          color: var(--heading);
          font-size: 1.25rem;
        }
        label {
          color: var(--muted);
          font-weight: 600;
        }
        input, select {
          width: 100%;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: color-mix(in oklab, var(--card) 92%, var(--bg));
          color: var(--text);
          outline: none;
        }

        .type-selector {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 14px;
        }
        .type-btn {
          padding: 12px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: color-mix(in oklab, var(--card) 86%, var(--bg));
          cursor: pointer;
          font-weight: 700;
          text-align: center;
          user-select: none;
          transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
          color: var(--text);
        }
        .type-btn:hover { transform: translateY(-1px); }
        .income-active {
          border-color: color-mix(in oklab, #10b981 55%, var(--border));
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12);
        }
        .expense-active {
          border-color: color-mix(in oklab, #ef4444 55%, var(--border));
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
        }

        .form-group { margin-bottom: 12px; }

        .submit-btn {
          width: 100%;
          padding: 12px 14px;
          border-radius: 14px;
          border: none;
          font-weight: 800;
          cursor: pointer;
          transition: transform 0.15s ease;
        }
        .submit-btn:hover { transform: translateY(-1px); }
        .submit-btn:active { transform: translateY(0px); }

        .ghost-btn {
          border: 1px solid var(--border);
          background: transparent;
          color: var(--muted);
          padding: 8px 12px;
          border-radius: 999px;
          cursor: pointer;
          font-weight: 700;
        }
        .ghost-btn:hover {
          background: color-mix(in oklab, var(--card) 86%, var(--bg));
          color: var(--text);
        }

        .filter-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 10px;
          align-items: end;
          margin-bottom: 16px;
          border-bottom: 1px solid var(--soft);
          padding-bottom: 16px;
        }
        .mini-btn {
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: color-mix(in oklab, var(--card) 86%, var(--bg));
          color: var(--text);
          cursor: pointer;
          font-weight: 800;
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: var(--overlay);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 18px;
        }
        .modal-content {
          width: 100%;
          max-width: 420px;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 18px;
          padding: 18px;
          box-shadow: var(--shadow);
        }
        .modal-title {
          margin: 0 0 6px 0;
          color: #ef4444;
        }
        .modal-desc {
          margin: 0 0 12px 0;
          color: var(--muted);
        }
        .modal-input {
          width: 100%;
        }
        .modal-actions {
          display: flex;
          gap: 10px;
          margin-top: 14px;
        }
        .modal-btn {
          flex: 1;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid var(--border);
          cursor: pointer;
          font-weight: 800;
        }
        .cancel-btn {
          background: color-mix(in oklab, var(--card) 84%, var(--bg));
          color: var(--text);
        }
        .confirm-btn {
          background: #ef4444;
          border-color: rgba(239, 68, 68, 0.5);
          color: white;
        }
        .confirm-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .card { padding: 14px; border-radius: 16px; }
          .type-selector { grid-template-columns: 1fr; }
          .card-header { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
    </div>
  );
}

export default AddPage;
