import { useState, useMemo, useEffect } from 'react';
import { X, Check, ExternalLink, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatINR } from '../utils/currency';
import { getInitials, getAvatarColor } from '../utils/helpers';

const PAYMENT_METHODS = [
    { id: 'upi', label: 'UPI', emoji: '📱' },
    { id: 'cash', label: 'Cash', emoji: '💵' },
    { id: 'bank', label: 'Bank', emoji: '🏦' },
];

export default function SettleUpModal({ onClose, preselectedFriendId = null, preselectedGroupId = null }) {
    const { currentUser, friends, groups, settleUp, getFriendBalance, getFriendBalanceBreakdown, getGroupBalanceDetails, getUserById } = useApp();

    const [step, setStep] = useState(preselectedFriendId ? 2 : 1);
    const [selectedFriendId, setSelectedFriendId] = useState(preselectedFriendId);
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('upi');
    const [showGroupBreakdown, setShowGroupBreakdown] = useState(false);
    const [upiCopied, setUpiCopied] = useState(false);

    const handleCopyUpi = async (upiId) => {
        try {
            await navigator.clipboard.writeText(upiId);
            setUpiCopied(true);
            setTimeout(() => setUpiCopied(false), 2000);
        } catch (err) {
            const textArea = document.createElement('textarea');
            textArea.value = upiId;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setUpiCopied(true);
            setTimeout(() => setUpiCopied(false), 2000);
        }
    };

    // Get balance breakdown for the selected friend
    const balanceBreakdown = selectedFriendId ? getFriendBalanceBreakdown(selectedFriendId) : [];

    // If preselectedGroupId, filter breakdown to that group only
    const relevantBreakdown = preselectedGroupId
        ? balanceBreakdown.filter(b => b.groupId === preselectedGroupId)
        : balanceBreakdown;

    // Calculate total balance from relevant groups
    const totalBalance = relevantBreakdown.reduce((sum, b) => sum + b.balance, 0);

    // For group-specific settlement, show that group's balance
    const selectedBalance = preselectedGroupId
        ? (relevantBreakdown.find(b => b.groupId === preselectedGroupId)?.balance || 0)
        : totalBalance;

    // Compute friends list with balances for step 1
    const friendsWithBalances = useMemo(() => {
        // When preselectedGroupId is set, show group members with their group-specific balances
        if (preselectedGroupId) {
            const group = groups.find(g => g.id === preselectedGroupId);
            if (!group) return [];

            return group.members
                .filter(memberId => memberId !== currentUser.id)
                .map(memberId => {
                    const member = getUserById(memberId);
                    // Get the group-specific balance for this member
                    const memberBreakdown = getFriendBalanceBreakdown(memberId);
                    const groupBalance = memberBreakdown.find(b => b.groupId === preselectedGroupId)?.balance || 0;
                    return { ...member, balance: groupBalance };
                })
                .filter(f => Math.abs(f.balance) > 0.5)
                .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
        }

        // Default: show all friends with total balances
        return friends
            .map(f => ({ ...f, balance: getFriendBalance(f.id) }))
            .filter(f => Math.abs(f.balance) > 0.5)
            .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
    }, [friends, getFriendBalance, preselectedGroupId, groups, currentUser.id, getUserById, getFriendBalanceBreakdown]);

    // Get selected friend - prefer friends array to ensure upiId is available
    const selectedFriend = useMemo(() => {
        if (!selectedFriendId) return null;
        // First check friends array (has full friend data including upiId)
        const fromFriends = friends.find(f => f.id === selectedFriendId);
        if (fromFriends) return fromFriends;
        // Fallback to getUserById
        return getUserById(selectedFriendId);
    }, [selectedFriendId, friends, getUserById]);

    // Pre-fill amount when friend is selected
    useEffect(() => {
        if (selectedFriendId && step === 2) {
            const bal = Math.abs(selectedBalance);
            setAmount(bal > 0 ? bal.toFixed(2) : '');
        }
    }, [selectedFriendId, step, selectedBalance]);

    const upiUrl = useMemo(() => {
        if (!selectedFriend) return null;
        const payAmount = parseFloat(amount) || 0;
        const note = preselectedGroupId
            ? `Payment for ${groups.find(g => g.id === preselectedGroupId)?.name || 'group'}`
            : 'Payment via Nammasplit';

        // If recipient has UPI ID, include it; otherwise open UPI app without payee
        if (selectedFriend.upiId) {
            return `upi://pay?pa=${encodeURIComponent(selectedFriend.upiId)}&pn=${encodeURIComponent(selectedFriend.name)}&am=${payAmount}&cu=INR&tn=${encodeURIComponent(note)}`;
        } else {
            // Open UPI app with just amount and note, user selects payee manually
            return `upi://pay?am=${payAmount}&cu=INR&tn=${encodeURIComponent(note)}`;
        }
    }, [selectedFriend, amount, preselectedGroupId, groups]);

    const handleSelectFriend = (friendId) => {
        setSelectedFriendId(friendId);
        setStep(2);
    };

    const openUpiApp = async () => {
        if (upiUrl) {
            window.location.href = upiUrl;
        }
    };

    const handleSettle = () => {
        if (!selectedFriendId || !amount || parseFloat(amount) <= 0) return;

        // Determine who pays whom based on the balance
        // If selectedBalance > 0, friend owes currentUser (friend pays currentUser)
        // If selectedBalance < 0, currentUser owes friend (currentUser pays friend)
        const bal = preselectedGroupId
            ? (relevantBreakdown.find(b => b.groupId === preselectedGroupId)?.balance || 0)
            : getFriendBalance(selectedFriendId);

        const fromId = bal > 0 ? selectedFriendId : currentUser.id;
        const toId = bal > 0 ? currentUser.id : selectedFriendId;

        settleUp({
            fromUserId: fromId,
            toUserId: toId,
            amount: parseFloat(amount),
            method,
            groupId: preselectedGroupId || null,
        });

        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">
                        {step === 1 ? 'Settle Up' : `Pay ${selectedFriend?.name}`}
                    </h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    {step === 1 && (
                        <>
                            {friendsWithBalances.length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-state-icon">
                                        <Check size={36} />
                                    </div>
                                    <h3 className="empty-state-title">All settled up! 🎉</h3>
                                    <p className="empty-state-desc">You don't owe anyone and no one owes you.</p>
                                </div>
                            ) : (
                                friendsWithBalances.map(friend => (
                                    <div
                                        key={friend.id}
                                        className="settle-friend"
                                        onClick={() => handleSelectFriend(friend.id)}
                                    >
                                        <div className="settle-friend-info">
                                            <div className="avatar" style={{ background: getAvatarColor(friend.name) }}>
                                                {getInitials(friend.name)}
                                            </div>
                                            <div>
                                                <div className="list-item-title">{friend.name}</div>
                                                <div className="list-item-subtitle">
                                                    {friend.balance > 0 ? 'owes you' : 'you owe'}
                                                </div>
                                            </div>
                                        </div>
                                        <span className={`list-item-amount ${friend.balance > 0 ? 'positive' : 'negative'}`}>
                                            {formatINR(Math.abs(friend.balance))}
                                        </span>
                                    </div>
                                ))
                            )}
                        </>
                    )}

                    {step === 2 && selectedFriend && (
                        <>
                            <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
                                <div className="avatar avatar-lg" style={{ background: getAvatarColor(selectedFriend.name), margin: '0 auto var(--space-md)' }}>
                                    {getInitials(selectedFriend.name)}
                                </div>
                                <p className="text-secondary-text" style={{ fontSize: '0.85rem' }}>
                                    {selectedBalance > 0
                                        ? `${selectedFriend.name} owes you ${formatINR(Math.abs(selectedBalance))}`
                                        : `You owe ${selectedFriend.name} ${formatINR(Math.abs(selectedBalance))}`
                                    }
                                </p>
                                {selectedFriend.upiId && (
                                    <p style={{
                                        color: 'var(--primary)',
                                        fontSize: '0.8rem',
                                        marginTop: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px'
                                    }}>
                                        {selectedFriend.upiId}
                                        <button
                                            onClick={() => handleCopyUpi(selectedFriend.upiId)}
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
                            </div>

                            {/* Group Breakdown Toggle */}
                            {!preselectedGroupId && balanceBreakdown.length > 1 && (
                                <div style={{ marginBottom: 'var(--space-md)' }}>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => setShowGroupBreakdown(!showGroupBreakdown)}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        <span>Balance by Group</span>
                                        {showGroupBreakdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                    {showGroupBreakdown && (
                                        <div style={{
                                            marginTop: 'var(--space-sm)',
                                            padding: 'var(--space-md)',
                                            background: 'var(--bg-secondary)',
                                            borderRadius: 'var(--radius-md)',
                                        }}>
                                            {balanceBreakdown.map(item => (
                                                <div
                                                    key={item.groupId || 'direct'}
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        padding: 'var(--space-xs) 0',
                                                        borderBottom: '1px solid var(--divider)',
                                                    }}
                                                >
                                                    <span style={{ fontSize: '0.85rem' }}>{item.groupName}</span>
                                                    <span style={{
                                                        fontSize: '0.85rem',
                                                        fontWeight: 600,
                                                        color: item.balance > 0 ? 'var(--positive)' : 'var(--negative)'
                                                    }}>
                                                        {item.balance > 0 ? '+' : ''}{formatINR(item.balance)}
                                                    </span>
                                                </div>
                                            ))}
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                paddingTop: 'var(--space-sm)',
                                                marginTop: 'var(--space-xs)',
                                                borderTop: '2px solid var(--divider)',
                                            }}>
                                                <span style={{ fontWeight: 600 }}>Total</span>
                                                <span style={{
                                                    fontWeight: 700,
                                                    color: totalBalance > 0 ? 'var(--positive)' : 'var(--negative)'
                                                }}>
                                                    {totalBalance > 0 ? '+' : ''}{formatINR(totalBalance)}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label">
                                    Amount {preselectedGroupId && '(for this group only)'}
                                </label>
                                <input
                                    type="number"
                                    className="form-input form-input-lg"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    placeholder="0"
                                    min="0"
                                    max={Math.abs(selectedBalance)}
                                    autoFocus
                                />
                                {parseFloat(amount) > Math.abs(selectedBalance) && (
                                    <p style={{ color: 'var(--negative)', fontSize: '0.8rem', marginTop: '4px' }}>
                                        Amount exceeds balance of {formatINR(Math.abs(selectedBalance))}
                                    </p>
                                )}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Payment Method</label>
                                <div className="payment-methods">
                                    {PAYMENT_METHODS.map(pm => (
                                        <div
                                            key={pm.id}
                                            className={`payment-method ${method === pm.id ? 'selected' : ''}`}
                                            onClick={() => setMethod(pm.id)}
                                        >
                                            <span className="payment-method-icon">{pm.emoji}</span>
                                            <span className="payment-method-label">{pm.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* UPI Payment Button */}
                            {method === 'upi' && (
                                <button
                                    className="btn btn-primary"
                                    onClick={openUpiApp}
                                    disabled={!amount || parseFloat(amount) <= 0}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        marginTop: 'var(--space-md)'
                                    }}
                                >
                                    <ExternalLink size={18} />
                                    Pay with UPI
                                </button>
                            )}
                        </>
                    )}
                </div>

                {step === 2 && (
                    <div className="modal-footer">
                        <button className="btn btn-secondary flex-1" onClick={() => {
                            if (preselectedFriendId) {
                                onClose();
                            } else {
                                setStep(1);
                            }
                        }}>
                            Back
                        </button>
                        <button
                            className="btn btn-primary flex-1"
                            onClick={handleSettle}
                            disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > Math.abs(selectedBalance)}
                            style={(!amount || parseFloat(amount) <= 0 || parseFloat(amount) > Math.abs(selectedBalance))? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                        >
                            <Check size={18} />
                            Record Payment
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
