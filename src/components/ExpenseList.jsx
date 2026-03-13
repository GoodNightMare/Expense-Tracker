import React from 'react';

const ExpenseList = ({ expenses }) => {
    return (
        <ul>
            {expenses.map((item, index) => (
                <li key={index}>
                    {item.date}: {item.amount} บาท หมวด {item.category}
                </li>
            ))}
        </ul>
    );
};

export default ExpenseList;