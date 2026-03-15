import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, HandCoins, ReceiptText, UserPlus, Trash2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatINR } from '../utils/currency';
import { getInitials, getAvatarColor } from '../utils/helpers';
import ExpenseCard from '../components/ExpenseCard';
import AddExpenseModal from '../components/AddExpenseModal';
import SettleUpModal from '../components/SettleUpModal';

export default function GroupDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getGroupById, getExpensesByGroup, getGroupBalanceDetails, getGroupSimplifiedDebts, getUserById, currentUser, friends, addMemberToGroup, deleteGroup } = useApp();

    const [showAddExpense, setShowAddExpense] = useState(false);
    const [showSettle, setShowSettle] = useState(false);
    const [showAddMember, setShowAddMember] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [activeTab, setActiveTab] = useState('expenses');
    const [editingExpense, setEditingExpense] = useState(null);

    const group = getGroupById(id);
    if (!group) {
        return (
            <div>
                <button className="back-btn" onClick={() => navigate('/groups')}>
                    <ArrowLeft size={18} /> Back to Groups
                </button>
                <div className="empty-state">
                    <h3 className="empty-state-title">Group not found</h3>
                </div>
            </div>
        );
    }

    const expenses = getExpensesByGroup(id);
    const memberBalances = getGroupBalanceDetails(id);
    const simplifiedDebts = getGroupSimplifiedDebts(id);

    // Total group spend
    const totalSpend = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Friends not in this group
    const nonMembers = friends.filter(f => !group.members.includes(f.id));

    const handleEditExpense = (expense) => {
        setEditingExpense(expense);
        setShowAddExpense(true);
    };

    const closeExpenseModal = () => {
        setShowAddExpense(false);
        setEditingExpense(null);
    };

    const handleDeleteGroup = async () => {
        await deleteGroup(id);
        navigate('/groups');
    };

    return (
        <div>
            <button className="back-btn" onClick={() => navigate('/groups')}>
                <ArrowLeft size={18} /> Groups
            </button>

            {/* Group Header */}
            <div className="group-header">
                <div className="group-header-icon">
                    {group.name.includes('🏖️') ? '🏖️' : group.name.includes('🏠') ? '🏠' : group.name.includes('🍱') ? '🍱' : '👥'}
                </div>
                <div className="group-header-info">
                    <h1 className="group-header-name">{group.name}</h1>
                    <div className="group-header-members">
                        {group.members.map(id => getUserById(id).name.split(' ')[0]).join(', ')}
                    </div>
                </div>
            </div>

            {/* Summary */}
            <div className="summary-cards" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {(() => {
                    const netBalance = memberBalances.reduce((sum, b) => sum + b.balance, 0);
                    return (
                        <>
                            <div className="summary-card">
                                <div className="summary-card-label">{netBalance >= 0 ? "You're Owed" : "You Owe"}</div>
                                <div className={`summary-card-value ${netBalance >= 0 ? 'positive' : 'negative'}`}>
                                    {formatINR(Math.abs(netBalance))}
                                </div>
                            </div>
                            <div className="summary-card">
                                <div className="summary-card-label">Expenses</div>
                                <div className="summary-card-value neutral">{expenses.length}</div>
                            </div>
                        </>
                    );
                })()}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
                <button className="btn btn-primary flex-1" onClick={() => { setEditingExpense(null); setShowAddExpense(true); }}>
                    <Plus size={18} /> Add Expense
                </button>
                <button className="btn btn-accent flex-1" onClick={() => setShowSettle(true)}>
                    <HandCoins size={18} /> Settle Up
                </button>
                {nonMembers.length > 0 && (
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowAddMember(true)}
                        style={{ width: '100%' }}
                    >
                        <UserPlus size={16} /> Add Members
                    </button>
                )}
                {group.createdBy === currentUser.id && (
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowDeleteConfirm(true)}
                        style={{ width: '100%' }}
                    >
                        <Trash2 size={16} /> Delete Group
                    </button>
                )}
            </div>

            {/* Add Member Modal */}
            {showAddMember && (
                <div className="modal-overlay" onClick={() => setShowAddMember(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxHeight: '60vh' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">Add Members</h2>
                            <button className="modal-close" onClick={() => setShowAddMember(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            {nonMembers.length === 0 ? (
                                <div className="empty-state">
                                    <p className="empty-state-desc">All your friends are already in this group.</p>
                                </div>
                            ) : (
                                nonMembers.map(friend => (
                                    <div
                                        key={friend.id}
                                        className="list-item"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => addMemberToGroup(id, friend.id)}
                                    >
                                        <div className="avatar" style={{ background: getAvatarColor(friend.name) }}>
                                            {getInitials(friend.name)}
                                        </div>
                                        <div className="list-item-content">
                                            <div className="list-item-title">{friend.name}</div>
                                            <div className="list-item-subtitle">{friend.email}</div>
                                        </div>
                                        <Plus size={18} style={{ color: 'var(--primary)' }} />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="tabs mb-md">
                <button className={`tab ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => setActiveTab('expenses')}>
                    Expenses
                </button>
                <button className={`tab ${activeTab === 'balances' ? 'active' : ''}`} onClick={() => setActiveTab('balances')}>
                    Balances
                </button>
                <button className={`tab ${activeTab === 'settle' ? 'active' : ''}`} onClick={() => setActiveTab('settle')}>
                    Simplify
                </button>
            </div>

            {/* Expenses Tab */}
            {activeTab === 'expenses' && (
                <div className="card">
                    {expenses.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">
                                <ReceiptText size={36} />
                            </div>
                            <h3 className="empty-state-title">No expenses yet</h3>
                            <p className="empty-state-desc">Add your first expense in this group.</p>
                        </div>
                    ) : (
                        expenses.map(expense => (
                            <ExpenseCard
                                key={expense.id}
                                expense={expense}
                                onEdit={handleEditExpense}
                            />
                        ))
                    )}
                </div>
            )}

            {/* Balances Tab */}
            {activeTab === 'balances' && (
                <div className="card">
                    {memberBalances.length === 0 ? (
                        <div className="empty-state">
                            <h3 className="empty-state-title">All settled up! 🎉</h3>
                        </div>
                    ) : (
                        memberBalances.map(mb => {
                            const user = getUserById(mb.userId);
                            return (
                                <div key={mb.userId} className="list-item">
                                    <div className="avatar" style={{ background: getAvatarColor(user.name) }}>
                                        {getInitials(user.name)}
                                    </div>
                                    <div className="list-item-content">
                                        <div className="list-item-title">{user.name}</div>
                                        <div className="list-item-subtitle">
                                            {mb.balance > 0 ? 'owes you' : 'you owe'}
                                        </div>
                                    </div>
                                    <div className={`list-item-amount ${mb.balance > 0 ? 'positive' : 'negative'}`}>
                                        {formatINR(Math.abs(mb.balance))}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Simplified Debts Tab */}
            {activeTab === 'settle' && (
                <div className="card">
                    {simplifiedDebts.length === 0 ? (
                        <div className="empty-state">
                            <h3 className="empty-state-title">All settled up! 🎉</h3>
                            <p className="empty-state-desc">No payments needed.</p>
                        </div>
                    ) : (
                        <>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                                Simplified to {simplifiedDebts.length} payment{simplifiedDebts.length > 1 ? 's' : ''}
                            </p>
                            {simplifiedDebts.map((debt, i) => {
                                const from = getUserById(debt.from);
                                const to = getUserById(debt.to);
                                return (
                                    <div key={i} className="list-item" style={{ cursor: 'default' }}>
                                        <div className="avatar avatar-sm" style={{ background: getAvatarColor(from.name) }}>
                                            {getInitials(from.name)}
                                        </div>
                                        <div className="list-item-content">
                                            <div className="list-item-title" style={{ fontSize: '0.85rem' }}>
                                                {from.id === currentUser.id ? 'You' : from.name}
                                                <span style={{ color: 'var(--text-tertiary)', margin: '0 6px' }}>→</span>
                                                {to.id === currentUser.id ? 'You' : to.name}
                                            </div>
                                        </div>
                                        <div className="list-item-amount" style={{ color: 'var(--primary)' }}>
                                            {formatINR(debt.amount)}
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>
            )}

            {showAddExpense && (
                <AddExpenseModal
                    onClose={closeExpenseModal}
                    preselectedGroupId={id}
                    editingExpense={editingExpense}
                />
            )}

            {showSettle && (
                <SettleUpModal
                    onClose={() => setShowSettle(false)}
                    preselectedGroupId={id}
                />
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '360px' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">Delete Group</h2>
                            <button className="modal-close" onClick={() => setShowDeleteConfirm(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                                Are you sure you want to delete "{group.name}"? The expenses in this group will not be deleted.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary flex-1" onClick={() => setShowDeleteConfirm(false)}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary flex-1"
                                onClick={handleDeleteGroup}
                                style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}
                            >
                                <Trash2 size={18} /> Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
