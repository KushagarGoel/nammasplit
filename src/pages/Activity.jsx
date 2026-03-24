import { ReceiptText, HandCoins, Users, UserPlus, Trash2, Edit2, ArrowRightLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatINR } from '../utils/currency';
import { useNavigate } from 'react-router-dom';

const ACTIVITY_ICONS = {
    expense_added: { icon: ReceiptText, color: 'var(--primary)', bgColor: 'var(--primary-bg)' },
    expense_updated: { icon: Edit2, color: 'var(--primary)', bgColor: 'var(--primary-bg)' },
    expense_deleted: { icon: Trash2, color: 'var(--negative)', bgColor: 'var(--negative-bg)' },
    settlement: { icon: HandCoins, color: 'var(--accent)', bgColor: 'var(--accent-bg)' },
    group_created: { icon: Users, color: 'var(--secondary)', bgColor: 'rgba(245, 158, 11, 0.15)' },
    group_member_added: { icon: UserPlus, color: 'var(--secondary)', bgColor: 'rgba(245, 158, 11, 0.15)' },
    group_updated: { icon: Edit2, color: 'var(--primary)', bgColor: 'var(--primary-bg)' },
    friend_added: { icon: UserPlus, color: 'var(--accent)', bgColor: 'var(--accent-bg)' },
};

export default function Activity() {
    const { activities } = useApp();
    const navigate = useNavigate();

    const sortedActivities = [...activities].sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    // Group by date
    const grouped = {};
    sortedActivities.forEach(a => {
        const date = new Date(a.timestamp);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        let dateKey;
        if (date.toDateString() === today.toDateString()) {
            dateKey = 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            dateKey = 'Yesterday';
        } else {
            dateKey = date.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        }

        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(a);
    });

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString('en-IN', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const highlightText = (description) => {
        // Highlight quoted text and names
        const parts = description.split(/("[^"]+")/g);
        return parts.map((part, index) => {
            if (part.startsWith('"') && part.endsWith('"')) {
                return <span key={index} className="highlight">{part}</span>;
            }
            return part;
        });
    };

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Activity</h1>
                <p className="page-subtitle">Recent transactions and updates</p>
            </div>

            {sortedActivities.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">
                        <ReceiptText size={36} />
                    </div>
                    <h3 className="empty-state-title">No activity yet</h3>
                    <p className="empty-state-desc">Your expense and settlement history will appear here.</p>
                </div>
            ) : (
                Object.entries(grouped).map(([date, items]) => (
                    <div key={date} className="activity-section">
                        <div className="activity-section-date">{date}</div>
                        <div className="activity-card">
                            {items.map((activity, index) => {
                                const config = ACTIVITY_ICONS[activity.type] || ACTIVITY_ICONS.expense_added;
                                const IconComponent = config.icon;
                                return (
                                    <div
                                        key={activity.id}
                                        className="activity-item"
                                        style={{
                                            borderBottom: index < items.length - 1 ? '1px solid var(--divider)' : 'none',
                                            cursor: activity.groupId ? 'pointer' : 'default'
                                        }}
                                        onClick={() => {
                                            if (activity.groupId) {
                                                navigate(`/groups/${activity.groupId}`);
                                            }
                                        }}
                                    >
                                        <div
                                            className="activity-icon"
                                            style={{
                                                background: config.bgColor,
                                                color: config.color
                                            }}
                                        >
                                            <IconComponent size={22} />
                                        </div>
                                        <div className="activity-content">
                                            <div className="activity-text">
                                                {highlightText(activity.description)}
                                            </div>
                                            <div className="activity-time">{formatTime(activity.timestamp)}</div>
                                        </div>
                                        {activity.amount && (
                                            <div className="activity-amount" style={{ color: config.color }}>
                                                {formatINR(activity.amount)}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
