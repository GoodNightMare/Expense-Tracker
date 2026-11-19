import React, { useMemo, useState, useCallback } from "react";
import axios from "axios";

import API_URL from "../api/index.js";
import useRefreshOnFocus from "../hooks/useRefreshOnFocus.js";

const incomeCategories = ["เงินเดือน", "ลงทุน", "แฟน", "เทควันโด", "อื่นๆ"];
const expenseCategories = [
  "มื้อ",
  "ของกิน",
  "ของกินเล่น",
  "ไข่กุ้ง",
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
  const [fundingSource, setFundingSource] = useState("salary");
  const [alert, setAlert] = useState(null);
  const [allExpenses, setAllExpenses] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [editId, setEditId] = useState(null); // State สำหรับเก็บ ID ที่กำลังแก้ไข
  const [deleteId, setDeleteId] = useState(null); // State to store the ID of the item to be deleted

  const [showDeleteModal, setShowDeleteModal] = useState(false); // State สำหรับควบคุมการแสดง Modal
  const [deleteConfirmation, setDeleteConfirmation] = useState(""); // State สำหรับเก็บข้อความยืนยันการลบ
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // States for filtering
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [filterLimit, setFilterLimit] = useState(10);

  const fetchAllExpenses = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/expenses`);
      const sorted = res.data.sort((a, b) => {
        if (b.date !== a.date) return b.date.localeCompare(a.date);
        return (b.id || 0) - (a.id || 0);
      });
      setAllExpenses(sorted);
      setLoadError("");
    } catch (err) {
      console.error("Error:", err);
      setLoadError("โหลดข้อมูลล่าสุดไม่สำเร็จ กรุณาลองใหม่");
    }
  }, []);

  useRefreshOnFocus(fetchAllExpenses);

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
      fundingSource,
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
      setFundingSource("salary");
      setEditId(null); // รีเซ็ตสถานะแก้ไข
      fetchAllExpenses();

      setTimeout(() => setAlert(null), 3000);
    } catch {
      setAlert({ type: "error", message: "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง" });
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setDeleteConfirmation("");
    setDeleteError("");
    setShowDeleteModal(true);
  };

  const handleCloseDelete = () => {
    if (isDeleting) return;
    setShowDeleteModal(false);
    setDeleteId(null);
    setDeleteConfirmation("");
    setDeleteError("");
  };

  const handleConfirmDelete = async () => {
    if (!deleteId || !deleteConfirmation || isDeleting) return;
    setIsDeleting(true);
    setDeleteError("");

    try {
      const response = await axios.delete(`${API_URL}/expenses/${deleteId}`, {
        data: { id: deleteId, password: deleteConfirmation },
      });
      await fetchAllExpenses();
      setAllExpenses((items) => items.filter((item) => item.id !== deleteId));
      setAlert({
        type: "success",
        message: response.data.alreadyDeleted
          ? "รายการนี้ถูกลบไปแล้ว"
          : "ลบสำเร็จ! 🗑️",
      });
      setTimeout(() => setAlert(null), 3000);
      setShowDeleteModal(false);
      setDeleteId(null);
      setDeleteConfirmation("");
    } catch (err) {
      if (err.response?.status === 404) {
        await fetchAllExpenses();
        setAllExpenses((items) => items.filter((item) => item.id !== deleteId));
        setAlert({ type: "success", message: "รายการนี้ถูกลบไปแล้ว" });
        setShowDeleteModal(false);
        setDeleteId(null);
        setDeleteConfirmation("");
      } else {
        setDeleteError(err.response?.data?.error || "ลบไม่สำเร็จ กรุณาลองใหม่");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (item) => {
    // นำข้อมูลมาใส่ในฟอร์ม
    // รองรับรายการเพิ่มเงินเก็บรูปแบบเดิม โดยเปิดแก้ไขเป็นรายรับเข้าเงินเก็บ
    setType(item.type === "savings" ? "income" : item.type);
    setAmount(item.amount);
    setCategory(item.category);
    setDate(item.date);
    setNote(item.note || "");
    setFundingSource(item.type === "savings" ? "savings" : (item.fundingSource || "salary"));
    setEditId(item.id);
    window.scrollTo({ top: 0, behavior: "smooth" }); // เลื่อนขึ้นไปหาฟอร์ม
  };

  const handleCancelEdit = () => {
    setAmount("");
    setCategory("");
    setNote("");
    setFundingSource("salary");
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
      {loadError && (
        <div className="alert alert-error" role="alert">
          {loadError}{" "}
          <button type="button" className="mini-btn" onClick={fetchAllExpenses}>ลองใหม่</button>
        </div>
      )}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={handleCloseDelete}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">⚠️ ยืนยันการลบ</h3>
            <p className="modal-desc" id="delete-confirmation-help">กรอกรหัสยืนยันการลบที่ตั้งไว้</p>

            <input
              type="password"
              className="modal-input"
              placeholder="รหัสยืนยันการลบ"
              aria-label="รหัสยืนยันการลบ"
              aria-describedby={deleteError ? "delete-confirmation-help delete-confirmation-error" : "delete-confirmation-help"}
              aria-invalid={Boolean(deleteError)}
              autoComplete="off"
              value={deleteConfirmation}
              disabled={isDeleting}
              onChange={(e) => {
                setDeleteConfirmation(e.target.value);
                setDeleteError("");
              }}
            />

            {deleteError && (
              <div id="delete-confirmation-error" className="alert alert-error" role="alert">{deleteError}</div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                onClick={handleCloseDelete}
                className="modal-btn cancel-btn"
                disabled={isDeleting}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="modal-btn confirm-btn"
                disabled={isDeleting || !deleteConfirmation}
              >
                {isDeleting ? "กำลังลบ..." : "ยืนยันการลบ"}
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
                setCategory("");
                setFundingSource("salary");
              }}
            >
              💰 รายรับ
            </div>
            <div
              className={`type-btn ${type === "expense" ? "expense-active" : ""}`}
              onClick={() => {
                setType("expense");
                setCategory("");
                setFundingSource("salary");
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

          {type === "expense" && (
            <div className="form-group">
              <label>หักเงินจาก</label>
              <div className="funding-toggle" role="group" aria-label="เลือกแหล่งเงิน">
                <button
                  type="button"
                  className={fundingSource === "salary" ? "active salary" : ""}
                  aria-pressed={fundingSource === "salary"}
                  onClick={() => setFundingSource("salary")}
                >
                  💵 เงินเดือน
                </button>
                <button
                  type="button"
                  className={fundingSource === "savings" ? "active savings" : ""}
                  aria-pressed={fundingSource === "savings"}
                  onClick={() => setFundingSource("savings")}
                >
                  🏦 เงินเก็บ
                </button>
              </div>
              <small className="field-hint">
                เงินเก็บจะหักจากยอดสะสมทั้งหมด และไม่หักยอดคงเหลือของเดือนนี้
              </small>
            </div>
          )}

          {type === "income" && (
            <div className="form-group">
              <label>นำรายรับเข้า</label>
              <div className="funding-toggle" role="group" aria-label="เลือกปลายทางรายรับ">
                <button
                  type="button"
                  className={fundingSource === "salary" ? "active salary" : ""}
                  aria-pressed={fundingSource === "salary"}
                  onClick={() => setFundingSource("salary")}
                >
                  💵 เงินเดือน
                </button>
                <button
                  type="button"
                  className={fundingSource === "savings" ? "active savings" : ""}
                  aria-pressed={fundingSource === "savings"}
                  onClick={() => setFundingSource("savings")}
                >
                  🏦 เงินเก็บ
                </button>
              </div>
              <small className="field-hint">
                รายรับที่เข้าเงินเก็บจะเพิ่มยอดเงินเก็บโดยตรง และไม่รวมในสรุปรายเดือน
              </small>
            </div>
          )}

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
                  {exp.type === "income" ? "🟢" : exp.type === "savings" ? "🏦" : "🔴"}{" "}
                  {exp.note || exp.category}
                </span>
                <div className="transaction-meta">
                  <span className="transaction-category">{exp.category}</span>
                  {exp.type === "expense" && (
                    <span className={`funding-badge ${exp.fundingSource === "savings" ? "savings" : "salary"}`}>
                      {exp.fundingSource === "savings" ? "เงินเก็บ" : "เงินเดือน"}
                    </span>
                  )}
                  {(exp.type === "income" || exp.type === "savings") && (
                    <span className={`funding-badge ${exp.type === "savings" || exp.fundingSource === "savings" ? "savings" : "salary"}`}>
                      {exp.type === "savings" || exp.fundingSource === "savings" ? "เข้าเงินเก็บ" : "เข้าเงินเดือน"}
                    </span>
                  )}
                </div>
                <span className="transaction-date">{exp.date}</span>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <span className={exp.type === "income" || exp.type === "savings" ? "income" : "expense"}>
                  {exp.type === "income" || exp.type === "savings" ? "+" : "-"}
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
        .funding-toggle {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
          margin-top: 6px;
          padding: 4px;
          border: 1px solid var(--border);
          border-radius: 14px;
          background: color-mix(in oklab, var(--card) 80%, var(--bg));
        }
        .funding-toggle button {
          padding: 10px 12px;
          border: 1px solid transparent;
          border-radius: 10px;
          background: transparent;
          color: var(--muted);
          font: inherit;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
        }
        .funding-toggle button.active.salary {
          background: #dbeafe;
          border-color: #93c5fd;
          color: #1d4ed8;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.12);
        }
        .funding-toggle button.active.savings {
          background: #fef3c7;
          border-color: #fcd34d;
          color: #92400e;
          box-shadow: 0 2px 8px rgba(180, 83, 9, 0.12);
        }
        .field-hint {
          display: block;
          margin-top: 6px;
          color: var(--muted);
          font-size: 0.82rem;
        }
        .funding-badge {
          width: fit-content;
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 700;
        }
        .funding-badge.salary { background: #dbeafe; color: #2563eb; }
        .funding-badge.savings { background: #fef3c7; color: #b45309; }
        .transaction-meta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 4px;
        }
        .transaction-meta .transaction-category { margin-top: 0; }

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
