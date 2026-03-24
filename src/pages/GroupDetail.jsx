import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, HandCoins, ReceiptText, UserPlus, Trash2, X, Edit2, Check, Settings, Copy, Camera } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatINR } from '../utils/currency';
import { getInitials, getAvatarColor } from '../utils/helpers';
import ExpenseCard from '../components/ExpenseCard';
import SettlementCard from '../components/SettlementCard';
import AddExpenseModal from '../components/AddExpenseModal';
import SettleUpModal from '../components/SettleUpModal';

const GROUP_AVATARS = [
    '👥', '🏖️', '🏠', '🍱', '✈️', '🚗', '🎉', '🎮', '📸', '☕',
    '💼', '🏢', '🏟️', '🎬', '🎵', '🏋️', '🚴', '🏕️', '🏊', '⛷️',
    '🎨', '📚', '💡', '🛒', '🎁', '🌮', '🍕', '🍔', '🥗', '🍜',
    '⚽', '🏏', '🎾', '🏸', '🎳', '🎯', '🎲', '🃏', '🎰', '🎸'
];

export default function GroupDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const {
        getGroupById, getExpensesByGroup, getGroupBalanceDetails,
        getGroupSimplifiedDebts, getUserById, currentUser, friends,
        addMemberToGroup, deleteGroup, deleteExpense, settlements,
        editGroupName, editGroupAvatar, showToast
    } = useApp();

    const [showAddExpense, setShowAddExpense] = useState(false);
    const [showSettle, setShowSettle] = useState(false);
    const [showSettledUp, setShowSettledUp] = useState(false);
    const [showAddMember, setShowAddMember] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showMembersModal, setShowMembersModal] = useState(false);
    const [showIconPicker, setShowIconPicker] = useState(false);
    const [activeTab, setActiveTab] = useState('expenses');
    const [editingExpense, setEditingExpense] = useState(null);
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState('');

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

    // Get settlements for this group
    const groupSettlements = settlements
        .filter(s => s.groupId === id)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Combine expenses and settlements for display
    const allTransactions = [
        ...expenses.map(e => ({ ...e, type: 'expense', sortDate: e.date })),
        ...groupSettlements.map(s => ({ ...s, type: 'settlement', sortDate: s.date }))
    ].sort((a, b) => new Date(b.sortDate) - new Date(a.sortDate));

    // Total group spend
    const totalSpend = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Calculate net balance for current user
    const netBalance = memberBalances.reduce((sum, b) => sum + b.balance, 0);

    // Friends not in this group
    const nonMembers = friends.filter(f => !group.members.includes(f.id));

    const handleExpenseClick = (expense) => {
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

    const handleCopyUpi = async (upiId) => {
        if (!upiId) return;
        try {
            await navigator.clipboard.writeText(upiId);
            showToast('UPI ID copied to clipboard');
        } catch (err) {
            showToast('Failed to copy UPI ID');
        }
    };

    // Get member UPI IDs
    const getMemberUpiId = (userId) => {
        const friend = friends.find(f => f.id === userId);
        return friend?.upiId || null;
    };

    return (
        <div>
            {/* Header with back button and settings */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-lg)'
            }}>
                <button className="back-btn" onClick={() => navigate('/groups')}>
                    <ArrowLeft size={20} />
                </button>
                {group.createdBy === currentUser.id && (
                    <button
                        className="btn btn-icon"
                        onClick={() => setShowDeleteConfirm(true)}
                        style={{ color: 'var(--text-tertiary)' }}
                    >
                        <Settings size={20} />
                    </button>
                )}
            </div>

            {/* Group Title */}
            {isEditingName ? (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-sm)',
                    marginBottom: 'var(--space-lg)'
                }}>
                    <input
                        type="text"
                        className="form-input"
                        value={editedName}
                        onChange={e => setEditedName(e.target.value)}
                        autoFocus
                        style={{
                            fontSize: '1.5rem',
                            fontWeight: 700,
                            fontFamily: 'var(--font-display)',
                            flex: 1
                        }}
                    />
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={async () => {
                            if (editedName.trim() && editedName.trim() !== group.name) {
                                await editGroupName(group.id, editedName.trim());
                            }
                            setIsEditingName(false);
                        }}
                    >
                        <Check size={18} />
                    </button>
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                            setIsEditingName(false);
                            setEditedName(group.name);
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>
            ) : (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-sm)',
                    marginBottom: 'var(--space-xs)'
                }}>
                    <h1 style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 700,
                        fontSize: '1.8rem',
                        color: 'var(--text-primary)'
                    }}>
                        {group.name}
                    </h1>
                    {group.createdBy === currentUser.id && (
                        <button
                            className="btn btn-icon"
                            onClick={() => {
                                setEditedName(group.name);
                                setIsEditingName(true);
                            }}
                            style={{
                                padding: '4px',
                                background: 'transparent',
                                color: 'var(--text-tertiary)'
                            }}
                        >
                            <Edit2 size={18} />
                        </button>
                    )}
                </div>
            )}

            {/* Group Icon and Member Avatars */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-md)',
                marginBottom: 'var(--space-xl)'
            }}>
                {/* Group Icon with Edit Button */}
                <div
                    style={{
                        width: 56,
                        height: 56,
                        borderRadius: 'var(--radius-lg)',
                        background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.8rem',
                        cursor: group.createdBy === currentUser.id ? 'pointer' : 'default',
                        position: 'relative',
                        flexShrink: 0
                    }}
                    onClick={() => group.createdBy === currentUser.id && setShowIconPicker(true)}
                >
                    {group.avatar || '👥'}
                    {group.createdBy === currentUser.id && (
                        <div style={{
                            position: 'absolute',
                            bottom: -4,
                            right: -4,
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: 'var(--bg-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '2px solid var(--border)'
                        }}>
                            <Camera size={10} style={{ color: 'var(--text-secondary)' }} />
                        </div>
                    )}
                </div>

                {/* Member Avatars - Clickable */}
                <div
                    className="avatar-stack"
                    onClick={() => setShowMembersModal(true)}
                    style={{ cursor: 'pointer' }}
                >
                    {group.members.slice(0, 4).map((memberId, index) => {
                        const member = getUserById(memberId);
                        return (
                            <div
                                key={memberId}
                                className="avatar"
                                style={{
                                    background: getAvatarColor(member.name),
                                    width: 36,
                                    height: 36,
                                    fontSize: '0.7rem',
                                    zIndex: group.members.length - index
                                }}
                            >
                                {getInitials(member.name)}
                            </div>
                        );
                    })}
                    {group.members.length > 4 && (
                        <div
                            className="avatar"
                            style={{
                                background: 'var(--bg-tertiary)',
                                color: 'var(--text-secondary)',
                                width: 36,
                                height: 36,
                                fontSize: '0.7rem'
                            }}
                        >
                            +{group.members.length - 4}
                        </div>
                    )}
                </div>
                <span
                    style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', cursor: 'pointer' }}
                    onClick={() => setShowMembersModal(true)}
                >
                    {group.members.length} members
                </span>
            </div>

            {/* Total Balance Section */}
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
                <div style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    color: 'var(--text-tertiary)',
                    marginBottom: 'var(--space-sm)'
                }}>
                    TOTAL GROUP BALANCE
                </div>
                <div style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: '3rem',
                    color: netBalance >= 0 ? 'var(--positive)' : 'var(--negative)',
                    letterSpacing: '-0.02em'
                }}>
                    {netBalance >= 0 ? '+' : ''}{formatINR(netBalance)}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons" style={{ marginBottom: 'var(--space-xl)' }}>
                <button
                    className="btn btn-primary"
                    onClick={() => { setEditingExpense(null); setShowAddExpense(true); }}
                >
                    <Plus size={18} /> Add Expense
                </button>
                <button
                    className="btn btn-secondary"
                    onClick={() => {
                        if (netBalance >= 0) {
                            setShowSettledUp(true);
                        } else {
                            setShowSettle(true);
                        }
                    }}
                >
                    <HandCoins size={18} /> Settle Up
                </button>
            </div>

            {/* Add Member Button */}
            {nonMembers.length > 0 && (
                <button
                    className="btn btn-secondary btn-full"
                    onClick={() => setShowAddMember(true)}
                    style={{ marginBottom: 'var(--space-lg)' }}
                >
                    <UserPlus size={18} /> Add Members
                </button>
            )}

            {/* Add Member Modal */}
            {showAddMember && (
                <div className="modal-overlay" onClick={() => setShowAddMember(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxHeight: '60vh' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">Add Members</h2>
                            <button className="modal-close" onClick={() => setShowAddMember(false)}>
                                <X size={20} />
                            </button>
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
                                        <Plus size={20} style={{ color: 'var(--primary)' }} />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="tabs mb-md">
                <button
                    className={`tab ${activeTab === 'expenses' ? 'active' : ''}`}
                    onClick={() => setActiveTab('expenses')}
                >
                    Expenses
                </button>
                <button
                    className={`tab ${activeTab === 'balances' ? 'active' : ''}`}
                    onClick={() => setActiveTab('balances')}
                >
                    Balances
                </button>
                <button
                    className={`tab ${activeTab === 'settle' ? 'active' : ''}`}
                    onClick={() => setActiveTab('settle')}
                >
                    Simplify
                </button>
            </div>

            {/* Expenses Tab */}
            {activeTab === 'expenses' && (
                <div className="card">
                    {allTransactions.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">
                                <ReceiptText size={36} />
                            </div>
                            <h3 className="empty-state-title">No activity yet</h3>
                            <p className="empty-state-desc">Add your first expense or settlement in this group.</p>
                        </div>
                    ) : (
                        allTransactions.map(transaction => (
                            transaction.type === 'expense' ? (
                                <ExpenseCard
                                    key={transaction.id}
                                    expense={transaction}
                                    onClick={() => handleExpenseClick(transaction)}
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
                            <p style={{
                                fontSize: '0.85rem',
                                color: 'var(--text-secondary)',
                                marginBottom: 'var(--space-md)'
                            }}>
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
                    onDelete={deleteExpense}
                />
            )}

            {showSettle && (
                <SettleUpModal
                    onClose={() => setShowSettle(false)}
                    preselectedGroupId={id}
                />
            )}

            {/* Settled Up Modal */}
            {showSettledUp && (
                <div className="modal-overlay" onClick={() => setShowSettledUp(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '360px' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">All Settled Up! 🎉</h2>
                            <button className="modal-close" onClick={() => setShowSettledUp(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="empty-state" style={{ padding: 'var(--space-lg) 0' }}>
                                <div className="empty-state-icon">
                                    <HandCoins size={48} />
                                </div>
                                <p className="empty-state-desc">
                                    You don't owe anything in this group. Everything is settled!
                                </p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-primary flex-1" onClick={() => setShowSettledUp(false)}>
                                Great!
                            </button>
                        </div>
                    </div>
                </div>
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
                                Are you sure you want to delete "{group.name}"? All expenses and settlements in this group will be permanently deleted.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary flex-1" onClick={() => setShowDeleteConfirm(false)}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-danger flex-1"
                                onClick={handleDeleteGroup}
                            >
                                <Trash2 size={18} /> Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Members Modal */}
            {showMembersModal && (
                <div className="modal-overlay" onClick={() => setShowMembersModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Group Members</h2>
                            <button className="modal-close" onClick={() => setShowMembersModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            {group.members.map(memberId => {
                                const member = getUserById(memberId);
                                const upiId = getMemberUpiId(memberId);
                                return (
                                    <div key={memberId} className="list-item" style={{ cursor: 'default' }}>
                                        <div className="avatar" style={{ background: getAvatarColor(member.name) }}>
                                            {getInitials(member.name)}
                                        </div>
                                        <div className="list-item-content">
                                            <div className="list-item-title">{member.name}</div>
                                            <div className="list-item-subtitle">
                                                {memberId === currentUser.id ? 'You' : (upiId || member.email)}
                                            </div>
                                        </div>
                                        {upiId && (
                                            <button
                                                className="btn btn-sm btn-secondary"
                                                onClick={() => handleCopyUpi(upiId)}
                                            >
                                                <Copy size={14} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Icon Picker Modal */}
            {showIconPicker && (
                <div className="modal-overlay" onClick={() => setShowIconPicker(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Choose Group Icon</h2>
                            <button className="modal-close" onClick={() => setShowIconPicker(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(8, 1fr)',
                                gap: '8px',
                                padding: '8px'
                            }}>
                                {GROUP_AVATARS.map(avatar => (
                                    <button
                                        key={avatar}
                                        type="button"
                                        onClick={async () => {
                                            await editGroupAvatar(group.id, avatar);
                                            setShowIconPicker(false);
                                        }}
                                        style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: 'var(--radius-md)',
                                            border: group.avatar === avatar ? '2px solid var(--primary)' : '2px solid var(--border)',
                                            background: group.avatar === avatar ? 'var(--primary-bg)' : 'var(--bg-tertiary)',
                                            fontSize: '1.4rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        {avatar}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
