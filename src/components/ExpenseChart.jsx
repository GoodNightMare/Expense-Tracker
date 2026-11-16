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

const ExpenseChart = ({ expenses, comparisonExpenses = [], monthLabel = 'รายจ่ายรายวัน', comparisonLabel, daysInMonth = 31, comparisonDaysInMonth = 31 }) => {
  const labels = Array.from({ length: Math.max(daysInMonth, comparisonLabel ? comparisonDaysInMonth : 0) }, (_, i) => i + 1);
  const dataset = (items, label, days, color, dashed = false) => {
    const totals = items.reduce((acc, item) => {
      const day = new Date(item.date).getDate();
      acc[day] = (acc[day] || 0) + (Number(item.amount) || 0);
      return acc;
    }, {});
    return { label, data: labels.map(day => day <= days ? totals[day] || 0 : null),
      fill: false, borderColor: color, backgroundColor: color, borderDash: dashed ? [6, 4] : [], tension: 0.1 };
  };
  const chartData = { labels, datasets: [
    dataset(expenses, monthLabel, daysInMonth, 'rgb(168, 0, 0)'),
    ...(comparisonLabel ? [dataset(comparisonExpenses, comparisonLabel, comparisonDaysInMonth, 'rgb(59, 130, 246)', true)] : []),
  ] };

  const options = {
    responsive: true,
    interaction: { mode: 'index', intersect: false },
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
