import { ReceiptText, HandCoins, Users, UserPlus, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatINR } from '../utils/currency';
import { formatDate } from '../utils/helpers';

const ACTIVITY_ICONS = {
    expense_added: { icon: ReceiptText, color: 'var(--primary)' },
    expense_deleted: { icon: Trash2, color: 'var(--negative)' },
    settlement: { icon: HandCoins, color: 'var(--accent)' },
    group_created: { icon: Users, color: '#9C27B0' },
    friend_added: { icon: UserPlus, color: '#1E88E5' },
};

export default function Activity() {
    const { activities } = useApp();

    const sortedActivities = [...activities].sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    // Group by date
    const grouped = {};
    sortedActivities.forEach(a => {
        const dateKey = new Date(a.timestamp).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(a);
    });

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
                    <div key={date} className="section">
                        <div className="section-header">
                            <h3 className="section-title" style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                                {date}
                            </h3>
                        </div>
                        <div className="card">
                            {items.map(activity => {
                                const config = ACTIVITY_ICONS[activity.type] || ACTIVITY_ICONS.expense_added;
                                const IconComponent = config.icon;
                                return (
                                    <div key={activity.id} className="activity-item">
                                        <div className="activity-dot" style={{ background: config.color }} />
                                        <div className="activity-content">
                                            <div className="activity-text">{activity.description}</div>
                                            <div className="activity-time">{formatDate(activity.timestamp)}</div>
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
