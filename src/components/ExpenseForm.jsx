import React, { useState } from 'react';
import axios from 'axios';

const ExpenseForm = ({ onAddExpense }) => {
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [date, setDate] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        const expense = { amount, category, date };
        axios.post('http://localhost:5000/api/expenses', expense)
            .then(() => {
                onAddExpense(expense);
                setAmount('');
                setCategory('');
                setDate('');
            });
    };

    return (
        <form onSubmit={handleSubmit}>
            <input type="text" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="รายจ่าย" required />
            <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="หมวดหมู่" required />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            <button type="submit">เพิ่ม</button>
        </form>
    );
};

export default ExpenseForm;