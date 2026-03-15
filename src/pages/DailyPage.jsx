import React, { useState, useEffect } from "react";
import axios from "axios";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Pie } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

import API_URL from "../api/index.js";
const thaiMonths = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

import ExpenseChart from "../components/ExpenseChart";

function DailyPage() {
  const [expenses, setExpenses] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDateData, setSelectedDateData] = useState(null); // เก็บข้อมูลวันที่ถูกคลิก
  const [summaryModal, setSummaryModal] = useState(null); // State สำหรับ Summary Modal

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
// ต้องระบุชื่อ path ต่อท้าย เช่น /expenses
    const response = await axios.get(`${API_URL}/expenses`);
      setExpenses(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  // --- Logic การคำนวณ ---
  const filteredExpenses = expenses.filter((exp) => {
    const d = new Date(exp.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  // รายการที่ต้องยกเว้นไม่ให้รวมในสรุป (เช่น ค่าชาร์จรถ)
  const exclusionList = ["ชาร์จรถ"];

  // แยกข้อมูลที่ไม่เอามาคิดไว้ในอาร์เรย์เผื่อใช้งานภายหลัง
  const excludedItems = filteredExpenses.filter((e) =>
    exclusionList.includes(e.category)
  );

  // เราจะใช้ค่า includedExpenses สำหรับการคำนวณทั้งหมด
  const includedExpenses = filteredExpenses.filter((e) =>
    !exclusionList.includes(e.category)
  );

  // คำนวณยอดรวมของเดือนปัจจุบัน (เอาเฉพาะรายการที่ไม่ถูกยกเว้น)
  const totalIncome = includedExpenses
    .filter((e) => e.type === "income")
    .reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const totalExpense = includedExpenses
    .filter((e) => e.type === "expense")
    .reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const totalBalance = totalIncome - totalExpense;

  // สร้างข้อมูลสำหรับปฏิทิน
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const calendarCells = [];
  for (let i = 0; i < firstDayOfMonth; i++) calendarCells.push(null); // ช่องว่างต้นเดือน
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);

  // 1. จัดกลุ่มข้อมูล (Group By Category)
  // ใช้ข้อมูลของทั้งเดือน (filteredExpenses) เพื่อให้กราฟและ breakdown แสดงผลทุกรายการ
  const categorySummary = filteredExpenses.reduce((acc, exp) => {
    const key = `${exp.type}-${exp.category}`;
    if (!acc[key]) acc[key] = { ...exp, total: 0, details: [] };
    acc[key].total += parseFloat(exp.amount);
    acc[key].details.push(exp);
    return acc;
  }, {});

  // 2. แปลงเป็น Array และเรียงลำดับหมวดหมู่ตามยอดเงิน (มากไปน้อย)
  const categoryList = Object.values(categorySummary).sort(
    (a, b) => b.total - a.total,
  );

  // 3. เรียงรายการย่อยในแต่ละหมวดหมู่ตามวันที่ (เก่า→ใหม่)
  categoryList.forEach((cat) => {
    cat.details.sort((a, b) => new Date(a.date) - new Date(b.date));
  });

  // แยกเฉพาะรายจ่ายไปทำกราฟ
  const expenseCategories = categoryList.filter((c) => c.type === "expense");

  // ข้อมูลกราฟ (เฉพาะรายจ่าย)
  // generate a palette large enough to avoid duplicate colors
  const generateColors = (count) => {
    const base = [
      "#FF6384",
      "#36A2EB",
      "#FFCE56",
      "#4BC0C0",
      "#9966FF",
      "#FF9F40",
      "#C9CBCF",
    ];
    const colors = [];
    for (let i = 0; i < count; i++) {
      if (i < base.length) {
        colors.push(base[i]);
      } else {
        // evenly spaced hues for additional categories
        const hue = Math.round((i * 360) / count);
        colors.push(`hsl(${hue}, 70%, 50%)`);
      }
    }
    return colors;
  };

  const pieData = {
    labels: expenseCategories.map((c) => c.category),
    datasets: [
      {
        data: expenseCategories.map((c) => c.total),
        backgroundColor: generateColors(expenseCategories.length),
      },
    ],
  };

  const formatNumber = (num) => {
    const value = parseFloat(num);
    if (Number.isInteger(value)) {
      // no decimal for whole numbers
      return value.toLocaleString("th-TH");
    }
    // show two decimals for fractional amounts
    return value.toLocaleString("th-TH", { minimumFractionDigits: 2 });
  };

  const formatTiny = (num) => {
    if (num >= 10000) return (num / 1000).toFixed(1) + 'k';
    return num.toFixed(2).replace(/\.00$/, '');
  };

  const handleDayClick = (day) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayItems = filteredExpenses.filter((e) => e.date === dateStr);

    if (dayItems.length > 0) {
      setSelectedDateData({
        date: dateStr,
        day: day,
        items: dayItems,
      });
    }
  };

  // ลบรายการโดย id
  const handleDeleteItem = async (id) => {
    try {
      await axios.delete(`${API_URL}/expenses/${id}`);
      // รีเฟรชข้อมูล
      fetchExpenses();
      // หาก modal แสดงรายการวันนั้นอยู่ อัปเดตด้วย
      if (selectedDateData) {
        const updated = filteredExpenses.filter((e) => e.id !== id);
        const dayItems = updated.filter((e) => e.date === selectedDateData.date);
        setSelectedDateData((prev) => prev ? { ...prev, items: dayItems } : null);
      }
    } catch (err) {
      console.error('Error deleting item', err);
    }
  };

  // wrapper ถามยืนยันก่อนลบ
  const confirmDelete = (id) => {
    if (window.confirm('ลบรายการนี้หรือไม่?')) {
      handleDeleteItem(id);
    }
  };

  return (
    <div className="daily-container">
      {/* --- Summary Detail Modal --- */}
      {summaryModal && (
        <div
          className="modal-overlay"
          onClick={() => setSummaryModal(null)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{summaryModal.title}</h3>
              <button
                className="close-btn"
                onClick={() => setSummaryModal(null)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {summaryModal.type === "balance" ? (
                // แสดง Summary ทั้งหมด
                <div className="summary-detail">
                  <div className="summary-detail-row">
                    <span>💰 รายรับทั้งหมด</span>
                    <span className="inc-text">+{formatNumber(totalIncome)} ฿</span>
                  </div>
                  <div className="summary-detail-row">
                    <span>💸 รายจ่ายทั้งหมด</span>
                    <span className="exp-text">-{formatNumber(totalExpense)} ฿</span>
                  </div>
                  <div className="summary-detail-row" style={{borderTop: "2px solid #ddd", paddingTop: "10px"}}>
                    <span style={{fontWeight: "bold"}}>📊 คงเหลือ</span>
                    <span style={{fontWeight: "bold", color: totalBalance < 0 ? "#e74c3c" : "#2980b9"}}>
                      {formatNumber(totalBalance)} ฿
                    </span>
                  </div>
                </div>
              ) : (
                // แสดง Breakdown ตามหมวดหมู่
                <div className="summary-detail">
                  {summaryModal.items.map((cat, i) => (
                    <details key={i} className="cat-details-summary">
                      <summary>
                        <span>{cat.category}</span>
                        <span className={`cat-total ${cat.type === "income" ? "inc" : "exp"}`}>{formatNumber(cat.total)} ฿</span>
                      </summary>
                      <div className="details-content">
                        {cat.details.map((d, idx) => (
                          <div key={d.id || idx} className="detail-item">
                            <span style={{fontSize: "0.8rem", color: "#999"}}>
                              {new Date(d.date).getDate()}{" "}
                              {thaiMonths[new Date(d.date).getMonth()].substring(0, 3)}
                            </span>
                            <span style={{flex: 1}}>{d.note || "-"}</span>
                            <span style={{fontWeight: "bold"}}>{formatNumber(d.amount)} ฿</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- Modal Window (Date) --- */}
      {selectedDateData && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedDateData(null)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                รายการวันที่ {selectedDateData.day} {thaiMonths[currentMonth]} {currentYear + 543}
              </h3>
              <button
                className="close-btn"
                onClick={() => setSelectedDateData(null)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {selectedDateData.items.map((item) => (
                <div key={item.id} className="modal-item">
                  <div className="item-main">
                    <span
                      className={item.type === "income" ? "dot-inc" : "dot-exp"}
                    >
                      ●
                    </span>
                    <div className="item-details">
                      <span className="item-note">
                        {item.note || "-"}
                      </span>
                      <span className="item-cat">{item.category}</span>
                    </div>
                  </div>
                  <span
                    className={item.type === "income" ? "inc-text" : "exp-text"}
                  >
                    {item.type === "income" ? "+" : "-"}
                    {item.amount.toLocaleString()} ฿
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 1. Month Selector & Overall Summary */}
      <div className="header-section">
        <div className="month-nav">
          <button
            onClick={() =>
              setCurrentMonth((prev) => (prev === 0 ? 11 : prev - 1))
            }
          >
            ◀
          </button>
          <h2 style={{ width: "150px", textAlign: "center" }}>
            {thaiMonths[currentMonth]} {currentYear + 543}
          </h2>
          <button
            onClick={() =>
              setCurrentMonth((prev) => (prev === 11 ? 0 : prev + 1))
            }
          >
            ▶
          </button>
        </div>

        <div className="month-summary">
          <div className="summary-card-item" onClick={() => {
            const incomeCategories = categoryList.filter((c) => c.type === "income" && !exclusionList.includes(c.category));
            setSummaryModal({
              title: "📈 รายละเอียดรายรับ",
              type: "income",
              items: incomeCategories,
            });
          }}>
            <span className="lbl">รายรับ</span>
            <span className="val inc">+{formatNumber(totalIncome)}</span>
          </div>
          <div className="summary-card-item" onClick={() => {
            const expenseCategories = categoryList.filter((c) => c.type === "expense" && !exclusionList.includes(c.category));
            setSummaryModal({
              title: "📉 รายละเอียดรายจ่าย",
              type: "expense",
              items: expenseCategories,
            });
          }}>
            <span className="lbl">รายจ่าย</span>
            <span className="val exp">-{formatNumber(totalExpense)}</span>
          </div>
          <div className="summary-card-item" onClick={() => {
            setSummaryModal({
              title: "💳 สรุปคงเหลือ",
              type: "balance",
              items: [],
            });
          }}>
            <span className="lbl">คงเหลือ</span>
            <span className={`val ${totalBalance < 0 ? "exp" : "bal"}`}>
              {formatNumber(totalBalance)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Calendar Grid (Responsive) */}
      <div className="calendar-card">
        <div className="calendar-header-grid">
          {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((d) => (
            <div key={d} className="day-name">
              {d}
            </div>
          ))}
        </div>
        <div className="calendar-grid">
          {calendarCells.map((day, idx) => {
            if (!day)
              return (
                <div key={`empty-${idx}`} className="day-cell empty"></div>
              );

            const dayDate = new Date(currentYear, currentMonth, day);
            const dayOfWeek = dayDate.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            const dateStr = `${currentYear}-${String(
              currentMonth + 1,
            ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayItems = filteredExpenses.filter((e) => e.date === dateStr);
            // ensure numeric totals and preserve decimals
            const dayExp = dayItems
              .filter((e) => e.type === "expense")
              .reduce((s, e) => s + parseFloat(e.amount), 0);
            const dayInc = dayItems
              .filter((e) => e.type === "income")
              .reduce((s, e) => s + parseFloat(e.amount), 0);

            return (
              <div
                key={day}
                style={dateStr === today ? { border: "3px solid #000" } : {}}
                className={`day-cell ${isWeekend ? "weekend" : ""}`}
              >
                <span className="day-num">{day}</span>
                <div
                  className="day-amounts"
                  onClick={() => handleDayClick(day)}
                >
                  {dayInc > 0 && (
                    <span className="inc-tiny">{formatTiny(dayInc)}</span>
                  )}
                  {dayExp > 0 && (
                    <span className="exp-tiny">{formatTiny(dayExp)}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Graph & Category Breakdown */}
      <div className="analysis-grid">
        <div className="card chart-box">
          <h3>📊 สัดส่วนรายจ่าย</h3>
          {expenseCategories.length > 0 ? (
            <Pie data={pieData} options={{
              plugins: {
                tooltip: {
                  callbacks: {
                    label: function(context) {
                      const label = context.label || '';
                      const value = context.raw || 0;
                      const total = context.chart.getDatasetMeta(0).total;
                      const percentage = total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0%';
                      return `${label}: ${formatNumber(value)} ฿ (${percentage})`;
                    }
                  }
                },
                legend: {
                  position: 'bottom', // Move legend to bottom for more space
                },
              }
            }} />
          ) : (
            <p>ไม่มีข้อมูลการจ่าย</p>
          )}
        </div>

        <div className="card detail-box">
          <h3>📂 รายละเอียดหมวดหมู่</h3>
          {categoryList.map((cat, i) => (
            <details key={i} className="cat-details">
              <summary>
                <span>
                  {cat.type === "income" ? "🟢" : "🔴"} {cat.category}
                </span>
                <span className={`cat-total ${cat.type === "income" ? "inc" : "exp"}`}>{formatNumber(cat.total)} ฿</span>
              </summary>
              <div className="details-content">
                {cat.details.map((d) => (
                  <div key={d.id} 
                    className="detail-item" 
                    // onClick={()=>confirmDelete(d.id)}
                  >
                    <span>
                      {new Date(d.date).getDate()}{" "}
                      {thaiMonths[currentMonth].substring(0, 3)}
                    </span>
                    <span>{d.note || "-"}</span>
                    <span className={`amount ${d.type === "income" ? "inc-text" : "exp-text"}`}>
                      {formatNumber(d.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>

      {/* 4. Daily Trend Chart */}
      <div className="card" style={{ marginTop: '20px' }}>
        <h3>📈 แนวโน้มค่าใช้จ่ายรายวัน ({thaiMonths[currentMonth]} {currentYear})</h3>
        {filteredExpenses.filter(e => e.type === 'expense').length > 0 ? (
            <ExpenseChart expenses={filteredExpenses.filter(e => e.type === 'expense')} />
        ) : (
            <p style={{textAlign: 'center', padding: '20px'}}>ไม่มีข้อมูลค่าใช้จ่ายในเดือนนี้</p>
        )}
      </div>

      <style jsx>{`
        .daily-container {
          padding: 10px;
          max-width: 1000px;
          margin: auto;
        }
        .month-nav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          margin-bottom: 20px;
          font-size: 1.2rem;
          color: #;
          text-shadow: 0 0 10px rgba(255,255,255,0.2);
          padding: 10px 20px;
          width: fit-content;
          margin: 10px auto;
          border-radius: 30px;
          background-color: #f3f4f6;
          background-image: 
          radial-gradient(at 100% 100%, #e0e7ff 0, transparent 50%), 
          radial-gradient(at 0% 0%, #fef3c7 0, transparent 50%);
        }

        .month-summary {
          display: flex;
          justify-content: center;
          gap: 15px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .summary-card-item {
          background: white;
          padding: 10px 25px;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 120px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .summary-card-item:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 15px rgba(0,0,0,0.15);
          background: #f8f9fa;
        }
        .summary-card-item:active {
          transform: translateY(-2px);
        }
        .summary-card-item .lbl {
          font-size: 0.9rem;
          color: #666;
        }
        .summary-card-item .val { font-size: 1.2rem; font-weight: bold; }
        .val.inc { color: #27ae60; }
        .val.exp { color: #e74c3c; }
        .val.bal { color: #2980b9; }

        /* Calendar Style */
        .calendar-card {
          background: white;
          border-radius: 12px;
          padding: 10px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          margin-bottom: 20px;
          /* allow the calendar to shrink on narrow screens */
          width: 100%;
          overflow-x: auto;
        }
        .calendar-header-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          text-align: center;
          font-weight: bold;
          border-bottom: 1px solid #eee;
          padding-bottom: 5px;
          /* font-size will adjust in media queries */
        }
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 5px;
          margin-top: 10px;
        }
        .day-cell {
          min-height: 60px;
          border: 2px solid #f0f0f0;
          border-radius: 6px;
          padding: 4px;
          display: flex;
          flex-direction: column;
          align-items: center;
          /* ensure contents don't overflow the rounded corners */
          overflow: hidden;
        }
        .day-cell.weekend {
          background-color: #d6d6d6;
        }
        .day-num {
          font-size: 0.9rem;
          font-weight: bold;
          color: #555;
          max-width: 100%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .day-amounts {
          display: flex;
          flex-direction: column;
          font-size: 0.65rem;
          width: 100%;
          text-align: center;
        }
        .inc-tiny {
          color: #27ae60;
        }
        .exp-tiny {
          color: #e74c3c;
        }

        /* Responsive Analysis Grid */
        .analysis-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        @media (max-width: 768px) {
          .analysis-grid {
            grid-template-columns: 1fr;
          }
          .day-cell {
            min-height: 50px;
          }
          /* responsive calendar adjustments */
          .calendar-card {
            padding: 5px;
          }
          .calendar-header-grid {
            font-size: 0.8rem;
          }
          .calendar-grid {
            gap: 3px;
          }
          .day-cell {
            min-height: 45px;
          }
          .day-num {
            font-size: 0.75rem;
          }
          .day-amounts {
            font-size: 0.55rem;
          }
        }

        /* Details Style */
        .cat-details {
          border-bottom: 1px solid #eee;
          padding: 10px 0;
        }
        summary {
          display: flex;
          justify-content: space-between;
          cursor: pointer;
          font-weight: 500;
        }
        .cat-total {
          font-weight: bold;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.9rem;
        }
        .cat-total.inc {
          background: #e6f9e6;
          color: #27ae60;
        }
        .cat-total.exp {
          background: #fde6e6;
          color: #e74c3c;
        }
        .details-content {
          background: #f9f9f9;
          padding: 12px 16px;
          border-radius: 10px;
          margin-top: 8px;
          font-size: 0.9rem;
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.05);
        }
        .detail-item {
          display: grid;
          /* add extra column for delete button */
          grid-template-columns: auto 1fr auto auto;
          align-items: center;
          gap: 10px;
          padding: 8px 4px;
          border-bottom: 1px solid #e0e0e0;
          border-radius: 6px;
        }
        .detail-item:last-child {
          border-bottom: none;
        }
        .detail-item:nth-child(odd) {
          background: #ffffff;
        }
        .detail-item:nth-child(even) {
          background: #f7f7f7;
        }
        .detail-item span:first-child {
          color: #555;
          font-weight: 500;
        }
        /* override amount colors in category breakdown so they stand out */
        .detail-item .inc-text {
          color: #27ae60;
          font-weight: 600;
        }
        .detail-item .exp-text {
          color: #e74c3c;
          font-weight: 600;
        }
        .detail-item span:last-child {
          text-align: right;
        }

        .card {
          background: white;
          padding: 15px;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .modal-content {
          background: white;
          border-radius: 15px;
          width: 100%;
          max-width: 400px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 20px;
          border-bottom: 1px solid #eee;
          position: sticky;
          top: 0;
          background: white;
        }
        .modal-body {
          padding: 10px 20px;
        }
        .modal-item {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid #f9f9f9;
        }
        .item-main {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .item-details {
          display: flex;
          flex-direction: column;
        }
        .item-cat {
          font-size: 0.8rem;
          color: #666;
          margin-top: 2px;
          align-self: flex-start;
        }
        .dot-inc {
          color: #27ae60;
        }
        .dot-exp {
          color: #e74c3c;
        }
        .inc-text {
          color: #27ae60;
          font-weight: bold;
        }
        .exp-text {
          color: #e74c3c;
          font-weight: bold;
        }
        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #888;
        }
        .item-note {
          font-size: 0.95rem;
          color: #333;
          align-self: flex-start;
        }

        /* Summary Detail Styles */
        .summary-detail {
          padding: 10px 0;
        }
        .summary-detail-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px dashed #eee;
          font-size: 1rem;
        }
        .cat-details-summary {
          border-bottom: 1px solid #eee;
          padding: 10px 0;
        }
        .cat-details-summary summary {
          display: flex;
          justify-content: space-between;
          cursor: pointer;
          font-weight: 500;
          padding: 5px 0;
        }
        .cat-details-summary summary:hover {
          color: #2980b9;
        }
      `}</style>
    </div>
  );
}

export default DailyPage;
