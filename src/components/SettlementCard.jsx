import { HandCoins, ArrowRight } from 'lucide-react';
import { formatINR } from '../utils/currency';
import { formatDate, getAvatarColor, getInitials } from '../utils/helpers';
import { useApp } from '../context/AppContext';

export default function SettlementCard({ settlement, onClick }) {
    const { currentUser, getUserById, getGroupById } = useApp();

    const fromUser = getUserById(settlement.fromUserId);
    const toUser = getUserById(settlement.toUserId);
    const group = settlement.groupId ? getGroupById(settlement.groupId) : null;

    const isCurrentUserPayer = settlement.fromUserId === currentUser.id;
    const isCurrentUserReceiver = settlement.toUserId === currentUser.id;

    const methodLabels = {
        upi: 'UPI',
        gpay: 'GPay',
        phonepe: 'PhonePe',
        cash: 'Cash',
        bank: 'Bank Transfer'
    };

    return (
        <div
            className="expense-card settlement-card"
            onClick={onClick}
            style={{
                position: 'relative',
                cursor: onClick ? 'pointer' : 'default',
                background: 'var(--positive-bg)',
                borderLeft: '4px solid var(--positive)'
            }}
        >
            <div className="expense-icon" style={{ background: 'var(--positive)' }}>
                <HandCoins size={20} color="white" />
            </div>
            <div className="expense-info">
                <div className="expense-desc" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 600 }}>{fromUser.name}</span>
                    <ArrowRight size={14} style={{ color: 'var(--text-tertiary)' }} />
                    <span style={{ fontWeight: 600 }}>{toUser.name}</span>
                </div>
                <div className="expense-meta">
                    Payment recorded · {formatDate(settlement.date)}
                    {group && (
                        <span> · in {group.name}</span>
                    )}
                    {settlement.method && (
                        <span> · via {methodLabels[settlement.method] || settlement.method}</span>
                    )}
                </div>
            </div>
            <div className="expense-amount-section">
                <div className="expense-total" style={{ color: 'var(--success, #4CAF50)' }}>
                    {formatINR(settlement.amount)}
                </div>
                {(isCurrentUserPayer || isCurrentUserReceiver) && (
                    <div
                        className="expense-you"
                        style={{
                            color: isCurrentUserPayer ? 'var(--text-tertiary)' : 'var(--success)',
                            fontSize: '0.75rem'
                        }}
                    >
                        {isCurrentUserPayer ? 'you paid' : 'you received'}
                    </div>
                )}
            </div>
        </div>
    );
}
