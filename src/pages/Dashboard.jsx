import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowDownLeft, TrendingUp, Utensils, Users, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatINR } from '../utils/currency';
import { getInitials, getAvatarColor } from '../utils/helpers';

export default function Dashboard() {
    const { totalBalances, friendBalances, groups, currentUser } = useApp();
    const navigate = useNavigate();

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">Hey {currentUser.name.split(' ')[0]}, here's your summary</p>
            </div>

            {/* Summary Card */}
            <div className="summary-cards">
                <div className="summary-card highlight" style={{ gridColumn: '1 / -1' }}>
                    <div className="summary-card-label">Total Balance</div>
                    <div className="summary-card-value">
                        {totalBalances.totalBalance >= 0 ? '+' : ''}{formatINR(totalBalances.totalBalance)}
                    </div>
                </div>
            </div>

            {/* Group Order Section */}
            <div className="section">
                <div
                    className="card card-clickable group-order-card"
                    onClick={() => navigate('/restaurants')}
                    style={{
                        background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                        border: 'none',
                        color: 'white'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                        <div style={{
                            width: 48,
                            height: 48,
                            borderRadius: 'var(--radius-md)',
                            background: 'rgba(255,255,255,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Utensils size={24} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: 2 }}>
                                Group Order
                            </div>
                            <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                                Order food together with friends
                            </div>
                        </div>
                        <ArrowRight size={20} style={{ opacity: 0.8 }} />
                    </div>
                </div>
            </div>

            {/* Friend Balances */}
            {friendBalances.length > 0 && (
                <div className="section">
                    <div className="section-header">
                        <h3 className="section-title">Outstanding Balances</h3>
                        {friendBalances.length > 3 && (
                            <span className="section-action" onClick={() => navigate('/friends')}>View all</span>
                        )}
                    </div>
                    <div className="card">
                        {friendBalances.slice(0, 3).map(fb => (
                            <div
                                key={fb.userId}
                                className="list-item"
                                onClick={() => navigate(`/friends/${fb.userId}`)}
                            >
                                <div className="avatar" style={{ background: getAvatarColor(fb.name) }}>
                                    {getInitials(fb.name)}
                                </div>
                                <div className="list-item-content">
                                    <div className="list-item-title">{fb.name}</div>
                                    <div className="list-item-subtitle">
                                        {fb.balance > 0 ? 'owes you' : 'you owe'}
                                    </div>
                                </div>
                                <div className="list-item-right">
                                    <div className={`list-item-amount ${fb.balance > 0 ? 'positive' : 'negative'}`}>
                                        {formatINR(Math.abs(fb.balance))}
                                    </div>
                                    <div className="list-item-amount-label">
                                        {fb.balance > 0 ? (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 2, color: 'var(--positive)' }}>
                                                <ArrowDownLeft size={12} /> get back
                                            </span>
                                        ) : (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 2, color: 'var(--negative)' }}>
                                                <ArrowUpRight size={12} /> to pay
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Groups */}
            <div className="section">
                <div className="section-header">
                    <h3 className="section-title">Your Groups</h3>
                    <span className="section-action" onClick={() => navigate('/groups')}>View all</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                    {groups.slice(0, 3).map(group => (
                        <div
                            key={group.id}
                            className="card card-clickable"
                            onClick={() => navigate(`/groups/${group.id}`)}
                            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}
                        >
                            <div style={{
                                width: 44, height: 44, borderRadius: 'var(--radius-md)',
                                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.2rem'
                            }}>
                                {group.name.includes('🏖️') ? '🏖️' : group.name.includes('🏠') ? '🏠' : group.name.includes('🍱') ? '🍱' : '👥'}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div className="list-item-title">{group.name}</div>
                                <div className="list-item-subtitle">{group.members.length} members</div>
                            </div>
                            <TrendingUp size={16} style={{ color: 'var(--text-tertiary)' }} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Empty state */}
            {friendBalances.length === 0 && (
                <div className="empty-state">
                    <div className="empty-state-icon">
                        <TrendingUp size={36} />
                    </div>
                    <h3 className="empty-state-title">All settled up! 🎉</h3>
                    <p className="empty-state-desc">You don't have any outstanding balances. Add an expense to get started.</p>
                </div>
            )}
        </div>
    );
}
