import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatINR } from '../utils/currency';
import { getInitials, getAvatarColor } from '../utils/helpers';

const PAYMENT_METHODS = [
    { id: 'upi', label: 'UPI', emoji: '📱' },
    { id: 'gpay', label: 'GPay', emoji: '💳' },
    { id: 'phonepe', label: 'PhonePe', emoji: '📲' },
    { id: 'cash', label: 'Cash', emoji: '💵' },
    { id: 'bank', label: 'Bank', emoji: '🏦' },
    { id: 'paytm', label: 'Paytm', emoji: '🔷' },
];

export default function SettleUpModal({ onClose, preselectedFriendId = null, preselectedGroupId = null }) {
    const { currentUser, friends, settleUp, getFriendBalance, getUserById } = useApp();

    const [step, setStep] = useState(preselectedFriendId ? 2 : 1); // 1: select friend, 2: enter amount
    const [selectedFriendId, setSelectedFriendId] = useState(preselectedFriendId);
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('upi');

    // Friends who owe currentUser or currentUser owes
    const friendsWithBalances = friends
        .map(f => ({ ...f, balance: getFriendBalance(f.id) }))
        .filter(f => Math.abs(f.balance) > 0.5)
        .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

    const handleSelectFriend = (friendId) => {
        setSelectedFriendId(friendId);
        const friend = friends.find(f => f.id === friendId);
        const bal = getFriendBalance(friendId);
        setAmount(Math.abs(bal).toFixed(0));
        setStep(2);
    };

    const handleSettle = () => {
        if (!selectedFriendId || !amount || parseFloat(amount) <= 0) return;

        const bal = getFriendBalance(selectedFriendId);
        const fromId = bal > 0 ? selectedFriendId : currentUser.id;
        const toId = bal > 0 ? currentUser.id : selectedFriendId;

        settleUp({
            fromUserId: fromId,
            toUserId: toId,
            amount: parseFloat(amount),
            method,
            groupId: preselectedGroupId,
        });

        onClose();
    };

    const selectedFriend = selectedFriendId ? getUserById(selectedFriendId) : null;
    const selectedBalance = selectedFriendId ? getFriendBalance(selectedFriendId) : 0;

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
                            </div>

                            <div className="form-group">
                                <label className="form-label">Amount</label>
                                <input
                                    type="number"
                                    className="form-input form-input-lg"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    placeholder="0"
                                    min="0"
                                    autoFocus
                                />
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
                            className="btn btn-accent flex-1"
                            onClick={handleSettle}
                            disabled={!amount || parseFloat(amount) <= 0}
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
