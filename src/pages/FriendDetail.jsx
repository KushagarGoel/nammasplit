import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, HandCoins, Plus, ReceiptText } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatINR } from '../utils/currency';
import { getInitials, getAvatarColor } from '../utils/helpers';
import ExpenseCard from '../components/ExpenseCard';
import AddExpenseModal from '../components/AddExpenseModal';
import SettleUpModal from '../components/SettleUpModal';

export default function FriendDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getUserById, getExpensesBetweenFriends, getFriendBalance, expenses, currentUser, deleteExpense } = useApp();

    const [showAddExpense, setShowAddExpense] = useState(false);
    const [showSettle, setShowSettle] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);

    const friend = getUserById(id);
    const balance = getFriendBalance(id);
    const directExpenses = getExpensesBetweenFriends(id);

    // Also get group expenses between the two users (from named groups)
    const groupExpenses = expenses
        .filter(e => {
            // Include named groups (not personal expenses with no group)
            if (!e.groupId) return false;
            const involvesCurrent = e.paidBy === currentUser.id || e.splits.some(s => s.userId === currentUser.id);
            const involvesFriend = e.paidBy === id || e.splits.some(s => s.userId === id);
            return involvesCurrent && involvesFriend;
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Combine and deduplicate by expense ID
    const expenseMap = new Map();
    [...directExpenses, ...groupExpenses].forEach(e => expenseMap.set(e.id, e));
    const allExpenses = Array.from(expenseMap.values()).sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
        <div>
            <button className="back-btn" onClick={() => navigate('/friends')}>
                <ArrowLeft size={18} /> Friends
            </button>

            {/* Friend Header */}
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
                <div className="avatar avatar-xl" style={{
                    background: getAvatarColor(friend.name),
                    margin: '0 auto var(--space-md)',
                }}>
                    {getInitials(friend.name)}
                </div>
                <h1 style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: '1.5rem',
                }}>
                    {friend.name}
                </h1>
                {friend.email && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 4 }}>
                        {friend.email}
                    </p>
                )}

                {/* Balance */}
                <div style={{
                    marginTop: 'var(--space-md)',
                    padding: 'var(--space-md)',
                    background: Math.abs(balance) > 0.5
                        ? (balance > 0 ? 'var(--positive-bg)' : 'var(--negative-bg)')
                        : 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    display: 'inline-block',
                }}>
                    {Math.abs(balance) > 0.5 ? (
                        <span style={{
                            fontWeight: 700,
                            fontSize: '1.1rem',
                            color: balance > 0 ? 'var(--positive)' : 'var(--negative)',
                        }}>
                            {balance > 0
                                ? `${friend.name.split(' ')[0]} owes you ${formatINR(balance)}`
                                : `You owe ${friend.name.split(' ')[0]} ${formatINR(Math.abs(balance))}`
                            }
                        </span>
                    ) : (
                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                            All settled up ✓
                        </span>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
                <button className="btn btn-primary flex-1" onClick={() => setShowAddExpense(true)}>
                    <Plus size={18} /> Add Expense
                </button>
                {Math.abs(balance) > 0.5 && (
                    <button className="btn btn-accent flex-1" onClick={() => setShowSettle(true)}>
                        <HandCoins size={18} /> Settle Up
                    </button>
                )}
            </div>

            {/* Expenses */}
            <div className="section">
                <div className="section-header">
                    <h3 className="section-title">Expense History</h3>
                </div>
                <div className="card">
                    {allExpenses.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">
                                <ReceiptText size={36} />
                            </div>
                            <h3 className="empty-state-title">No expenses yet</h3>
                            <p className="empty-state-desc">Add an expense with {friend.name.split(' ')[0]}.</p>
                        </div>
                    ) : (
                        allExpenses.map(expense => (
                            <ExpenseCard
                                key={expense.id}
                                expense={expense}
                                onClick={() => {
                                    setEditingExpense(expense);
                                    setShowAddExpense(true);
                                }}
                            />
                        ))
                    )}
                </div>
            </div>

            {showAddExpense && (
                <AddExpenseModal
                    onClose={() => {
                        setShowAddExpense(false);
                        setEditingExpense(null);
                    }}
                    editingExpense={editingExpense}
                    onDelete={deleteExpense}
                />
            )}

            {showSettle && (
                <SettleUpModal
                    onClose={() => setShowSettle(false)}
                    preselectedFriendId={id}
                />
            )}
        </div>
    );
}
