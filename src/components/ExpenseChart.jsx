import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const ExpenseChart = ({ expenses }) => {
  // 1. Process data: Group and sum expenses by date
  const dailyTotals = expenses.reduce((acc, expense) => {
    // 1. แปลง String เป็น Date Object ก่อน
    const dateObj = new Date(expense.date);
    
    // 2. ดึงเฉพาะเลขวันที่ (1-31)
    // หรือถ้าอยากได้ "9 มี.ค." ให้ใช้ dateObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
    const day = dateObj.getDate(); 

    if (!acc[day]) {
      acc[day] = 0;
    }
    acc[day] += Number(expense.amount);
    return acc;
  }, {});

  // 2. Sort dates to ensure chronological order
  const sortedDates = Object.keys(dailyTotals).sort(
    (a, b) => new Date(a) - new Date(b)
  );

  const chartData = {
    labels: sortedDates,
    datasets: [
      {
        label: 'รายจ่ายรายวัน',
        data: sortedDates.map(date => dailyTotals[date]),
        fill: false,
        borderColor: 'rgb(168, 0, 0)',
        tension: 0.1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  return <Line options={options} data={chartData} />;
};

export default ExpenseChart;
