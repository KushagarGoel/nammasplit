import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, HandCoins, Plus, ReceiptText, Copy } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatINR } from '../utils/currency';
import { getInitials, getAvatarColor } from '../utils/helpers';
import ExpenseCard from '../components/ExpenseCard';
import SettlementCard from '../components/SettlementCard';
import AddExpenseModal from '../components/AddExpenseModal';
import SettleUpModal from '../components/SettleUpModal';

export default function FriendDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getUserById, getExpensesBetweenFriends, getFriendBalance, getSettlementsWithFriend, expenses, currentUser, deleteExpense, showToast } = useApp();

    const [showAddExpense, setShowAddExpense] = useState(false);
    const [showSettle, setShowSettle] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    const [upiCopied, setUpiCopied] = useState(false);

    const friend = getUserById(id);
    const balance = getFriendBalance(id);
    const directExpenses = getExpensesBetweenFriends(id);
    const settlements = getSettlementsWithFriend(id);

    const handleCopyUpi = async (upiId) => {
        try {
            await navigator.clipboard.writeText(upiId);
            setUpiCopied(true);
            showToast('UPI ID copied!');
            setTimeout(() => setUpiCopied(false), 2000);
        } catch (err) {
            // Fallback
            const textArea = document.createElement('textarea');
            textArea.value = upiId;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setUpiCopied(true);
            showToast('UPI ID copied!');
            setTimeout(() => setUpiCopied(false), 2000);
        }
    };

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

    // Combine expenses and settlements
    const allTransactions = [
        ...directExpenses.map(e => ({ ...e, type: 'expense' })),
        ...groupExpenses.map(e => ({ ...e, type: 'expense' })),
        ...settlements.map(s => ({ ...s, type: 'settlement' }))
    ].sort((a, b) => new Date(b.date || b.sortDate) - new Date(a.date || a.sortDate));

    return (
        <div>
            {/* Header with back button */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-lg)'
            }}>
                <button className="back-btn" onClick={() => navigate('/friends')}>
                    <ArrowLeft size={20} />
                </button>
            </div>

            {/* Friend Header */}
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
                <div
                    className="avatar avatar-xl"
                    style={{
                        background: friend.avatar ? 'transparent' : getAvatarColor(friend.name),
                        margin: '0 auto var(--space-md)',
                        overflow: friend.avatar ? 'hidden' : 'visible'
                    }}
                >
                    {friend.avatar ? (
                        <img
                            src={friend.avatar}
                            alt={friend.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    ) : (
                        getInitials(friend.name)
                    )}
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
                {friend.upiId && (
                    <p style={{
                        color: 'var(--primary)',
                        fontSize: '0.85rem',
                        marginTop: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                    }}>
                        {friend.upiId}
                        <button
                            onClick={() => handleCopyUpi(friend.upiId)}
                            style={{
                                background: 'none',
                                border: 'none',
                                padding: '2px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                color: 'var(--text-secondary)',
                                marginLeft: '2px'
                            }}
                            title="Copy UPI ID"
                        >
                            {upiCopied ? <span style={{ fontSize: '0.75rem' }}>✓</span> : <Copy size={12} />}
                        </button>
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
                {/* Only show Settle Up when user owes friend (balance < 0), not when friend owes user */}
                {balance < -0.5 && (
                    <button className="btn btn-accent flex-1" onClick={() => setShowSettle(true)}>
                        <HandCoins size={18} /> Settle Up
                    </button>
                )}
            </div>

            {/* Expenses & Settlements */}
            <div className="section">
                <div className="section-header">
                    <h3 className="section-title">History</h3>
                </div>
                <div className="card">
                    {allTransactions.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">
                                <ReceiptText size={36} />
                            </div>
                            <h3 className="empty-state-title">No activity yet</h3>
                            <p className="empty-state-desc">Add an expense or settlement with {friend.name.split(' ')[0]}.</p>
                        </div>
                    ) : (
                        allTransactions.map(transaction => (
                            transaction.type === 'expense' ? (
                                <ExpenseCard
                                    key={transaction.id}
                                    expense={transaction}
                                    onClick={() => {
                                        setEditingExpense(transaction);
                                        setShowAddExpense(true);
                                    }}
                                />
                            ) : (
                                <SettlementCard
                                    key={transaction.id}
                                    settlement={transaction}
                                />
                            )
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
                    preselectedFriendId={id}
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
