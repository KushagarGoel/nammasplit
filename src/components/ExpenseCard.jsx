import { useState } from 'react';
import * as Icons from 'lucide-react';
import { Trash2, Pencil } from 'lucide-react';
import { getCategoryById } from '../utils/helpers';
import { formatINR } from '../utils/currency';
import { formatDate } from '../utils/helpers';
import { useApp } from '../context/AppContext';

export default function ExpenseCard({ expense, onClick, onEdit }) {
    const { currentUser, getUserById, deleteExpense } = useApp();
    const [showConfirm, setShowConfirm] = useState(false);
    const category = getCategoryById(expense.category);
    const payer = getUserById(expense.paidBy);
    const IconComponent = Icons[category.icon] || Icons.MoreHorizontal;

    // Calculate what currentUser owes/lent for this expense
    const currentUserSplit = expense.splits.find(s => s.userId === currentUser.id);
    const currentUserSplitAmount = currentUserSplit ? currentUserSplit.amount : 0;

    let youLabel = '';
    let youClass = '';

    if (expense.paidBy === currentUser.id) {
        const lentAmount = expense.amount - currentUserSplitAmount;
        if (lentAmount > 0) {
            youLabel = `you lent ${formatINR(lentAmount)}`;
            youClass = 'lent';
        }
    } else {
        if (currentUserSplitAmount > 0) {
            youLabel = `you owe ${formatINR(currentUserSplitAmount)}`;
            youClass = 'borrowed';
        }
    }

    const handleDelete = (e) => {
        e.stopPropagation();
        setShowConfirm(true);
    };

    const confirmDelete = async (e) => {
        e.stopPropagation();
        await deleteExpense(expense.id);
        setShowConfirm(false);
    };

    const cancelDelete = (e) => {
        e.stopPropagation();
        setShowConfirm(false);
    };

    const handleEdit = (e) => {
        e.stopPropagation();
        if (onEdit) onEdit(expense);
    };

    return (
        <div className="expense-card" onClick={onClick} style={{ position: 'relative' }}>
            {showConfirm ? (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: 'var(--space-xs) 0',
                }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Delete this expense?
                    </span>
                    <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                        <button
                            className="btn btn-secondary"
                            onClick={cancelDelete}
                            style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                        >
                            No
                        </button>
                        <button
                            className="btn"
                            onClick={confirmDelete}
                            style={{
                                padding: '4px 12px',
                                fontSize: '0.8rem',
                                background: 'var(--danger)',
                                color: 'white',
                                border: 'none',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                            }}
                        >
                            Delete
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="expense-icon" style={{ background: category.color }}>
                        <IconComponent size={20} />
                    </div>
                    <div className="expense-info">
                        <div className="expense-desc">{expense.description}</div>
                        <div className="expense-meta">
                            {payer.name} paid · {formatDate(expense.date)}
                        </div>
                    </div>
                    <div className="expense-amount-section">
                        <div className="expense-total">{formatINR(expense.amount)}</div>
                        {youLabel && (
                            <div className={`expense-you ${youClass}`}>{youLabel}</div>
                        )}
                    </div>
                    <div className="expense-actions" style={{
                        position: 'absolute',
                        top: '6px',
                        right: '4px',
                        display: 'flex',
                        gap: '2px',
                    }}>
                        {onEdit && (
                            <button
                                onClick={handleEdit}
                                title="Edit expense"
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--text-tertiary)',
                                    padding: '4px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: 0.4,
                                    transition: 'opacity 0.2s, color 0.2s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.color = 'var(--primary)'; }}
                                onMouseLeave={e => { e.currentTarget.style.opacity = 0.4; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
                            >
                                <Pencil size={13} />
                            </button>
                        )}
                        <button
                            onClick={handleDelete}
                            title="Delete expense"
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-tertiary)',
                                padding: '4px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: 0.4,
                                transition: 'opacity 0.2s, color 0.2s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.color = 'var(--danger)'; }}
                            onMouseLeave={e => { e.currentTarget.style.opacity = 0.4; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
                        >
                            <Trash2 size={13} />
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
