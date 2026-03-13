import React from 'react';

const Summary = ({ expenses }) => {
    const total = expenses.reduce((acc, expense) => acc + parseFloat(expense.amount), 0);
    return <h2>ยอดรวม: {total} บาท</h2>;
};

export default Summary;