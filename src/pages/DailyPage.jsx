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
  const [searchTerm, setSearchTerm] = useState(""); // State สำหรับการค้นหา

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

  // --- Logic การค้นหา ---
  const searchedExpenses = filteredExpenses.filter((exp) => {
    const term = searchTerm.toLowerCase();
    const note = (exp.note || "").toLowerCase();
    const category = (exp.category || "").toLowerCase();
    return note.includes(term) || category.includes(term);
  });

  const highlightedDays = new Set(
    searchTerm
      ? searchedExpenses.map((exp) => new Date(exp.date).getDate())
      : [],
  );

  // รายการที่ต้องยกเว้นไม่ให้รวมในสรุป (เช่น ค่าชาร์จรถ)
  const exclusionList = ["ชาร์จรถ"];

  // แยกข้อมูลที่ไม่เอามาคิดไว้ในอาร์เรย์เผื่อใช้งานภายหลัง
  const excludedItems = filteredExpenses.filter((e) =>
    exclusionList.includes(e.category),
  );

  // เราจะใช้ค่า includedExpenses สำหรับการคำนวณทั้งหมด
  const includedExpenses = filteredExpenses.filter(
    (e) =>
      !exclusionList.includes(e.category) &&
      (!e.note ||
        (!e.note.includes("(เงินสด)") && !e.note.includes("(ไม่ต้องคิด)"))),
  );

  // --- สรุปทุกเดือน ---
  const allMonthsSummary = expenses.reduce((acc, exp) => {
    if (
      exclusionList.includes(exp.category) ||
      (exp.note && exp.note.includes("(เงินสด)")) ||
      exp.note.includes("(ไม่ต้องคิด)")
    ) {
      return acc;
    }

    const d = new Date(exp.date);
    const year = d.getFullYear();
    const month = d.getMonth();
    const key = `${year}-${month}`;

    if (!acc[key]) {
      acc[key] = { year, month, income: 0, expense: 0, balance: 0 };
    }

    const amount = parseFloat(exp.amount) || 0;
    if (exp.type === "income") {
      acc[key].income += amount;
      acc[key].balance += amount;
    } else if (exp.type === "expense") {
      acc[key].expense += amount;
      acc[key].balance -= amount;
    }

    return acc;
  }, {});

  const allMonthsListAsc = Object.values(allMonthsSummary).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });

  let runningBalance = 0;
  allMonthsListAsc.forEach((m) => {
    m.prevCumulative = runningBalance;
    runningBalance += m.balance;
  });

  const allMonthsList = [...allMonthsListAsc].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  const totalAllMonthsIncome = allMonthsList.reduce(
    (sum, m) => sum + m.income,
    0,
  );
  const totalAllMonthsExpense = allMonthsList.reduce(
    (sum, m) => sum + m.expense,
    0,
  );
  const totalAllMonthsBalance = allMonthsList.reduce(
    (sum, m) => sum + m.balance,
    0,
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
    if (num >= 10000) return (num / 1000).toFixed(1) + "k";
    return num.toFixed(2).replace(/\.00$/, "");
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
        const dayItems = updated.filter(
          (e) => e.date === selectedDateData.date,
        );
        setSelectedDateData((prev) =>
          prev ? { ...prev, items: dayItems } : null,
        );
      }
    } catch (err) {
      console.error("Error deleting item", err);
    }
  };

  // wrapper ถามยืนยันก่อนลบ
  const confirmDelete = (id) => {
    if (window.confirm("ลบรายการนี้หรือไม่?")) {
      handleDeleteItem(id);
    }
  };

  return (
    <div className="daily-container">
      {/* --- Summary Detail Modal --- */}
      {summaryModal && (
        <div className="modal-overlay" onClick={() => setSummaryModal(null)}>
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
                    <span className="inc-text">
                      +{formatNumber(totalIncome)} ฿
                    </span>
                  </div>
                  <div className="summary-detail-row">
                    <span>💸 รายจ่ายทั้งหมด</span>
                    <span className="exp-text">
                      -{formatNumber(totalExpense)} ฿
                    </span>
                  </div>
                  <div
                    className="summary-detail-row"
                    style={{ borderTop: "2px solid #ddd", paddingTop: "10px" }}
                  >
                    <span style={{ fontWeight: "bold" }}>📊 คงเหลือ</span>
                    <span
                      style={{
                        fontWeight: "bold",
                        color: totalBalance < 0 ? "#e74c3c" : "#2980b9",
                      }}
                    >
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
                        <span
                          className={`cat-total ${cat.type === "income" ? "inc" : "exp"}`}
                        >
                          {formatNumber(cat.total)} ฿
                        </span>
                      </summary>
                      <div className="details-content">
                        {cat.details.map((d, idx) => (
                          <div key={d.id || idx} className="detail-item">
                            <span style={{ fontSize: "0.8rem", color: "#999" }}>
                              {new Date(d.date).getDate()}{" "}
                              {thaiMonths[
                                new Date(d.date).getMonth()
                              ].substring(0, 3)}
                            </span>
                            <span style={{ flex: 1 }}>{d.note || "-"}</span>
                            <span style={{ fontWeight: "bold" }}>
                              {formatNumber(d.amount)} ฿
                            </span>
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
                รายการวันที่ {selectedDateData.day} {thaiMonths[currentMonth]}{" "}
                {currentYear + 543}
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
                      <span className="item-note">{item.note || "-"}</span>
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

        {/* --- Search Bar --- */}
        <div className="search-bar">
          <input
            type="text"
            placeholder="ค้นหา (หัวข้อ, คำอธิบาย)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="month-summary">
          <div
            className="summary-card-item"
            onClick={() => {
              const incomeCategories = categoryList.filter(
                (c) =>
                  c.type === "income" && !exclusionList.includes(c.category),
              );
              setSummaryModal({
                title: "📈 รายละเอียดรายรับ",
                type: "income",
                items: incomeCategories,
              });
            }}
          >
            <span className="lbl">รายรับ</span>
            <span className="val inc">+{formatNumber(totalIncome)}</span>
          </div>
          <div
            className="summary-card-item"
            onClick={() => {
              const expenseCategories = categoryList.filter(
                (c) =>
                  c.type === "expense" && !exclusionList.includes(c.category),
              );
              setSummaryModal({
                title: "📉 รายละเอียดรายจ่าย",
                type: "expense",
                items: expenseCategories,
              });
            }}
          >
            <span className="lbl">รายจ่าย</span>
            <span className="val exp">-{formatNumber(totalExpense)}</span>
          </div>
          <div
            className="summary-card-item"
            onClick={() => {
              setSummaryModal({
                title: "💳 สรุปคงเหลือ",
                type: "balance",
                items: [],
              });
            }}
          >
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

            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(
              2,
              "0",
            )}-${String(day).padStart(2, "0")}`;
            const dayItems = filteredExpenses.filter((e) => e.date === dateStr);
            // ensure numeric totals and preserve decimals
            const dayExp = dayItems
              .filter((e) => e.type === "expense")
              .reduce((s, e) => s + parseFloat(e.amount), 0);
            const dayInc = dayItems
              .filter((e) => e.type === "income")
              .reduce((s, e) => s + parseFloat(e.amount), 0);
            const isHighlighted = highlightedDays.has(day);

            // New logic for star icon
            const specialCategories = ["ของกิน", "ของใช้ประจำวัน", "บันเทิง"];
            const specialExpenses = dayItems
              .filter(
                (item) =>
                  item.type === "expense" &&
                  specialCategories.includes(item.category),
              )
              .reduce((sum, item) => sum + parseFloat(item.amount), 0);
            const hasCarCharge = dayItems.some(
              (item) => item.category === "ชาร์จรถ",
            );

            return (
              <div
                key={day}
                style={dateStr === today ? { border: "3px solid #000" } : {}}
                className={`day-cell ${isWeekend ? "weekend" : ""} ${isHighlighted ? "highlighted" : ""}`}
              >
                {hasCarCharge && (
                  <span
                    className="car-indicator"
                    style={{
                      position: "absolute",
                      top: "1px",
                      left: "1px",
                      fontSize: "0.5rem",
                    }}
                  >
                    🚗
                  </span>
                )}
                {specialExpenses > 100 && (
                  <span className="star-indicator">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill={specialExpenses > 200 ? "red" : "orange"}
                      width="1em"
                      height="1em"
                    >
                      <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 3 10.64 3 14.25 3 19.37 7.7 24 13.5 24s10.5-4.63 10.5-9.75c0-3.8-2.55-7.07-6.22-8.38-.2-.07-.38-.13-.56-.2z" />
                    </svg>
                  </span>
                )}
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
            <Pie
              data={pieData}
              options={{
                plugins: {
                  tooltip: {
                    callbacks: {
                      label: function (context) {
                        const label = context.label || "";
                        const value = context.raw || 0;
                        const total = context.chart.getDatasetMeta(0).total;
                        const percentage =
                          total > 0
                            ? ((value / total) * 100).toFixed(1) + "%"
                            : "0%";
                        return `${label}: ${formatNumber(value)} ฿ (${percentage})`;
                      },
                    },
                  },
                  legend: {
                    position: "bottom", // Move legend to bottom for more space
                  },
                },
              }}
            />
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
                <span
                  className={`cat-total ${cat.type === "income" ? "inc" : "exp"}`}
                >
                  {formatNumber(cat.total)} ฿
                </span>
              </summary>
              <div className="details-content">
                {cat.details.map((d) => (
                  <div
                    key={d.id}
                    className="detail-item"
                    // onClick={()=>confirmDelete(d.id)}
                  >
                    <span>
                      {new Date(d.date).getDate()}{" "}
                      {thaiMonths[currentMonth].substring(0, 3)}
                    </span>
                    <span>{d.note || "-"}</span>
                    <span
                      className={`amount ${d.type === "income" ? "inc-text" : "exp-text"}`}
                    >
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
      <div className="card" style={{ marginTop: "20px" }}>
        <h3>
          📈 แนวโน้มค่าใช้จ่ายรายวัน ({thaiMonths[currentMonth]} {currentYear})
        </h3>
        {filteredExpenses.filter(
          (e) =>
            e.type === "expense" &&
            !exclusionList.includes(e.category) &&
            !(e.note && e.note.includes("(ไม่ต้องคิด)")), // เพิ่มบรรทัดนี้
        ).length > 0 ? (
          <ExpenseChart
            expenses={filteredExpenses.filter(
              (e) =>
                e.type === "expense" &&
                !exclusionList.includes(e.category) &&
                !(e.note && e.note.includes("(ไม่ต้องคิด)")), // และบรรทัดนี้
            )}
          />
        ) : (
          <p style={{ textAlign: "center", padding: "20px" }}>
            ไม่มีข้อมูลค่าใช้จ่ายในเดือนนี้
          </p>
        )}
      </div>

      {/* 5. All Months Summary */}
      <div className="card" style={{ marginTop: "20px" }}>
        <h3>📅 สรุปรายเดือนทั้งหมด</h3>
        <div className="all-months-container">
          {allMonthsList.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table className="all-months-table">
                <thead>
                  <tr>
                    <th>เดือน / ปี</th>
                    <th>รายรับ</th>
                    <th>รายจ่าย</th>
                    <th>คงเหลือ</th>
                    <th>เงินเก็บเดือนก่อน</th>
                  </tr>
                </thead>
                <tbody>
                  {allMonthsList.map((m) => (
                    <tr key={`${m.year}-${m.month}`}>
                      <td>
                        {thaiMonths[m.month]} {m.year + 543}
                      </td>
                      <td className="inc-text">+{formatNumber(m.income)}</td>
                      <td className="exp-text">-{formatNumber(m.expense)}</td>
                      <td
                        style={{
                          fontWeight: "bold",
                          color: m.balance < 0 ? "#e74c3c" : "#2980b9",
                        }}
                      >
                        {formatNumber(m.balance)}
                      </td>
                      <td style={{ fontWeight: "bold", color: "#6e6e6e" }}>
                        {formatNumber(m.prevCumulative)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="grand-total-row">
                    <td>รวมทั้งหมด</td>
                    <td className="inc-text">
                      +{formatNumber(totalAllMonthsIncome)}
                    </td>
                    <td className="exp-text">
                      -{formatNumber(totalAllMonthsExpense)}
                    </td>
                    <td
                      style={{
                        color:
                          totalAllMonthsBalance < 0 ? "#e74c3c" : "#2980b9",
                      }}
                    >
                      {formatNumber(totalAllMonthsBalance)}
                    </td>
                    <td>-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p style={{ textAlign: "center", padding: "20px" }}>ไม่มีข้อมูล</p>
          )}
        </div>
      </div>

      <style jsx>{`
        .daily-container {
          padding: 20px 10px;
          max-width: 1200px;
          margin: 0 auto;
          font-family: 'Prompt', 'Kanit', sans-serif;
        }
        
        /* Typography & Colors */
        h2, h3 {
          color: #2c3e50;
          margin: 0;
        }

        /* --- Month Navigation --- */
        .header-section {
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
          margin-bottom: 25px;
          border: 1px solid #edf2f7;
        }
        .month-nav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 15px;
          margin: 0 auto 20px auto;
          padding: 10px 20px;
          width: fit-content;
          border-radius: 50px;
          background: #ffffff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }
        .month-nav button {
          background: #f1f5f9;
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          font-size: 1rem;
          cursor: pointer;
          color: #3b82f6;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .month-nav button:hover {
          background: #e0e7ff;
          transform: scale(1.05);
          color: #2563eb;
        }
        .month-nav h2 {
          min-width: 160px;
          text-align: center;
          font-size: 1.4rem;
          font-weight: 600;
        }

        /* --- Search Bar --- */
        .search-bar {
          display: flex;
          justify-content: center;
          margin-bottom: 25px;
        }
        .search-bar input {
          width: 100%;
          max-width: 500px;
          padding: 12px 20px;
          border-radius: 25px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          font-size: 1rem;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
          transition: border-color 0.3s, box-shadow 0.3s;
        }
        .search-bar input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        /* --- Month Summary Cards --- */
        .month-summary {
          display: flex;
          justify-content: center;
          gap: 20px;
          flex-wrap: wrap;
        }
        .summary-card-item {
          background: #ffffff;
          padding: 15px 20px;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          min-width: 140px;
          max-width: 250px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          border: 1px solid #f1f5f9;
        }
        .summary-card-item:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.08);
          border-color: #e2e8f0;
        }
        .summary-card-item:active {
          transform: translateY(-2px);
        }
        .summary-card-item .lbl {
          font-size: 0.95rem;
          color: #64748b;
          margin-bottom: 8px;
          font-weight: 500;
        }
        .summary-card-item .val {
          font-size: 1.4rem;
          font-weight: 700;
        }
        .val.inc { color: #10b981; }
        .val.exp { color: #ef4444; }
        .val.bal { color: #3b82f6; }

        /* --- General Cards --- */
        .card {
          background: #ffffff;
          padding: 20px;
          border-radius: 20px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.04);
          margin-bottom: 25px;
          border: 1px solid #f8fafc;
        }
        .card h3 {
          margin-bottom: 20px;
          font-size: 1.2rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* --- Calendar Style --- */
        .calendar-card {
          background: #ffffff;
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.04);
          margin-bottom: 30px;
          width: 100%;
          border: 1px solid #f8fafc;
          overflow-x: auto;
        }
        .calendar-header-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          text-align: center;
          font-weight: 600;
          color: #64748b;
          border-bottom: 2px solid #f1f5f9;
          padding-bottom: 12px;
          margin-bottom: 12px;
        }
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 8px;
        }
        .day-cell {
          min-height: 85px;
          border: 1px solid #f1f5f9;
          border-radius: 12px;
          padding: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          background: #ffffff;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .day-cell:hover:not(.empty) {
          border-color: #cbd5e1;
          transform: translateY(-2px);
          box-shadow: 0 4px 10px rgba(0,0,0,0.05);
        }
        .day-cell.empty {
          background: transparent;
          border: none;
          cursor: default;
        }
        .day-cell.weekend {
          background-color: #dbdbdb;
        }
        .day-cell.highlighted {
          box-shadow: 0 0 0 2px #ef4444;
          transform: scale(1.02);
          z-index: 1;
        }
        .day-num {
          font-size: 1.05rem;
          font-weight: 600;
          color: #334155;
          margin-bottom: 4px;
        }
        .day-amounts {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 0.75rem;
          width: 100%;
          text-align: center;
          font-weight: 600;
        }
        .inc-tiny { color: #059669; background: #d1fae5; border-radius: 6px; padding: 2px 4px; }
        .exp-tiny { color: #dc2626; background: #fee2e2; border-radius: 6px; padding: 2px 4px; }

        .star-indicator {
          position: absolute;
          top: 6px;
          right: 6px;
          font-size: 0.9rem;
        }
        .car-indicator {
          position: absolute;
          top: 6px;
          left: 6px;
          font-size: 0.9rem;
        }

        /* --- Responsive Analysis Grid --- */
        .analysis-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 25px;
        }

        /* --- Details Style --- */
        .cat-details {
          border-bottom: 1px solid #f1f5f9;
          padding: 12px 0;
        }
        .cat-details:last-child {
          border-bottom: none;
        }
        summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          font-weight: 500;
          padding: 6px 0;
        }
        summary::-webkit-details-marker {
          display: none;
        }
        .cat-total {
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.9rem;
        }
        .cat-total.inc {
          background: #d1fae5;
          color: #059669;
        }
        .cat-total.exp {
          background: #fee2e2;
          color: #dc2626;
        }
        .details-content {
          background: #f8fafc;
          padding: 12px;
          border-radius: 12px;
          margin-top: 10px;
          font-size: 0.9rem;
          border: 1px solid #f1f5f9;
        }
        .detail-item {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 12px;
          padding: 10px 8px;
          border-bottom: 1px dashed #e2e8f0;
        }
        .detail-item:last-child {
          border-bottom: none;
        }
        .detail-item span:first-child {
          color: #64748b;
          font-size: 0.85rem;
          white-space: nowrap;
        }
        .detail-item .amount { font-weight: 600; text-align: right; }
        .detail-item .inc-text { color: #10b981; }
        .detail-item .exp-text { color: #ef4444; }

        /* --- Modal Styles --- */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          animation: fadeIn 0.2s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .modal-content {
          background: #ffffff;
          border-radius: 24px;
          width: 100%;
          max-width: 450px;
          max-height: 85vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          border-bottom: 1px solid #f1f5f9;
          position: sticky;
          top: 0;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(8px);
          z-index: 10;
        }
        .modal-header h3 {
          font-size: 1.15rem;
          font-weight: 600;
          margin: 0;
          color: #1e293b;
        }
        .close-btn {
          background: #f1f5f9;
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          cursor: pointer;
          color: #64748b;
          transition: background 0.2s, color 0.2s;
        }
        .close-btn:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
        .modal-body {
          padding: 16px 24px;
        }
        .modal-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 0;
          border-bottom: 1px dashed #f1f5f9;
        }
        .modal-item:last-child {
          border-bottom: none;
        }
        .item-main {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .item-details {
          display: flex;
          flex-direction: column;
        }
        .item-cat {
          font-size: 0.8rem;
          color: #64748b;
          background: #f1f5f9;
          padding: 2px 8px;
          border-radius: 10px;
          width: fit-content;
          margin-top: 4px;
        }
        .dot-inc { color: #10b981; font-size: 1.2rem; }
        .dot-exp { color: #ef4444; font-size: 1.2rem; }
        .inc-text { color: #10b981; font-weight: 700; }
        .exp-text { color: #ef4444; font-weight: 700; }
        .item-note {
          font-size: 0.95rem;
          color: #1e293b;
          font-weight: 500;
        }

        /* --- Summary Detail Styles --- */
        .summary-detail {
          padding: 10px 0;
        }
        .summary-detail-row {
          display: flex;
          justify-content: space-between;
          padding: 14px 0;
          border-bottom: 1px dashed #e2e8f0;
          font-size: 1.05rem;
        }
        .summary-detail-row:last-child {
          border-bottom: none;
        }
        .cat-details-summary {
          border-bottom: 1px solid #f1f5f9;
          padding: 12px 0;
        }
        .cat-details-summary summary {
          display: flex;
          justify-content: space-between;
          cursor: pointer;
          font-weight: 600;
          padding: 6px 0;
          color: #334155;
        }
        .cat-details-summary summary:hover {
          color: #3b82f6;
        }

        /* --- All Months Summary Table Styles --- */
        .all-months-container {
          overflow-x: auto;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }
        .all-months-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.95rem;
          white-space: nowrap;
        }
        .all-months-table th,
        .all-months-table td {
          padding: 14px 16px;
          text-align: right;
          border-bottom: 1px solid #e2e8f0;
        }
        .all-months-table th:first-child,
        .all-months-table td:first-child {
          text-align: left;
        }
        .all-months-table th {
          background-color: #f8fafc;
          font-weight: 600;
          color: #475569;
          text-transform: uppercase;
          font-size: 0.85rem;
          letter-spacing: 0.05em;
        }
        .all-months-table tr:hover:not(.grand-total-row) {
          background-color: #f1f5f9;
        }
        .grand-total-row td {
          border-top: 2px solid #cbd5e1;
          color: #1e293b;
          font-weight: 700;
          font-size: 1.05rem;
          background-color: #f8fafc;
        }

        /* --- Responsive Adjustments --- */
        @media (max-width: 768px) {
          .daily-container {
            padding: 10px 5px;
          }
          .header-section {
            padding: 15px;
            border-radius: 16px;
          }
          .month-nav {
            padding: 8px 16px;
            gap: 10px;
          }
          .month-nav h2 {
            font-size: 1.15rem;
            min-width: 130px;
          }
          .month-nav button {
            width: 32px;
            height: 32px;
          }
          .month-summary {
            gap: 10px;
          }
          .summary-card-item {
            min-width: 110px;
            padding: 12px 10px;
            border-radius: 12px;
          }
          .summary-card-item .val {
            font-size: 1.15rem;
          }
          .search-bar input {
            width: 95%;
            padding: 10px 16px;
          }
          
          /* Calendar Mobile */
          .calendar-card {
            padding: 12px 8px;
            border-radius: 16px;
          }
          .calendar-header-grid {
            font-size: 0.85rem;
            padding-bottom: 8px;
            margin-bottom: 8px;
          }
          .calendar-grid {
            gap: 4px;
          }
          .day-cell {
            min-height: 60px;
            padding: 4px 2px;
            border-radius: 8px;
          }
          .day-cell:hover:not(.empty) {
            transform: none;
            box-shadow: none;
          }
          .day-num {
            font-size: 0.85rem;
            margin-bottom: 2px;
          }
          .day-amounts {
            font-size: 0.6rem;
            gap: 2px;
          }
          .inc-tiny, .exp-tiny {
            padding: 1px 0;
            border-radius: 4px;
            width: 90%;
            margin: 0 auto;
          }
          .star-indicator {
            font-size: 0.6rem;
            top: 2px;
            right: 2px;
          }
          .car-indicator {
            font-size: 0.6rem;
            top: 2px;
            left: 2px;
          }

          .card {
            padding: 15px;
            border-radius: 16px;
            margin-bottom: 15px;
          }
          
          /* Modals Mobile */
          .modal-overlay {
            padding: 0;
            align-items: flex-end; /* Bottom sheet style on mobile */
          }
          .modal-content {
            max-height: 85vh;
            border-radius: 24px 24px 0 0;
            margin-bottom: 0;
            border-bottom-left-radius: 0;
            border-bottom-right-radius: 0;
            animation: slideUpMobile 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          }
          @keyframes slideUpMobile {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
          .modal-header {
            border-radius: 24px 24px 0 0;
          }
          
          /* Tables Mobile */
          .all-months-table {
            font-size: 0.85rem;
          }
          .all-months-table th,
          .all-months-table td {
            padding: 10px 8px;
          }
        }
      `}</style>
    </div>
  );
}

export default DailyPage;
