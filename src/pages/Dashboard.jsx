import { useNavigate } from 'react-router-dom';
import { Search, Bell, Send, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatINR } from '../utils/currency';
import { getInitials, getAvatarColor } from '../utils/helpers';
import { useState } from 'react';

export default function Dashboard() {
    const { totalBalances, groups, currentUser, getGroupBalanceDetails, friendBalances, friends, userProfile } = useApp();
    const navigate = useNavigate();
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const firstName = currentUser.name ? currentUser.name.split(' ')[0] : 'User';
    const isOwed = totalBalances.totalBalance > 0;
    const hasBalance = Math.abs(totalBalances.totalBalance) > 0.5;

    // Count people who owe money or are owed
    const peopleWhoOwe = friendBalances.filter(f => f.balance > 0.5).length;
    const peopleOwedTo = friendBalances.filter(f => f.balance < -0.5).length;

    // Search results
    const filteredGroups = groups.filter(g =>
        g.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const filteredFriends = friends.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const hasSearchResults = searchQuery && (filteredGroups.length > 0 || filteredFriends.length > 0);

    const getGroupEmoji = (group) => {
        // Use the group's selected avatar if available
        if (group.avatar) return group.avatar;
        // Fallback to name-based guessing
        const name = group.name;
        if (name.toLowerCase().includes('trip') || name.includes('🏖️')) return '🏖️';
        if (name.toLowerCase().includes('flat') || name.toLowerCase().includes('home') || name.toLowerCase().includes('rent') || name.includes('🏠')) return '🏠';
        if (name.toLowerCase().includes('lunch') || name.toLowerCase().includes('food') || name.toLowerCase().includes('dinner') || name.includes('🍱')) return '🍱';
        if (name.toLowerCase().includes('office') || name.toLowerCase().includes('work')) return '💼';
        return '👥';
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    return (
        <div className="dashboard">
            {/* Header */}
            <header className="dashboard-header">
                <div className="dashboard-header-left">
                    <div
                        className="dashboard-avatar"
                        style={{
                            background: userProfile?.avatar ? 'transparent' : getAvatarColor(currentUser.name),
                            overflow: userProfile?.avatar ? 'hidden' : 'visible'
                        }}
                        onClick={() => navigate('/account')}
                    >
                        {userProfile?.avatar ? (
                            <img
                                src={userProfile.avatar}
                                alt={currentUser.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            getInitials(currentUser.name)
                        )}
                    </div>
                    <div className="dashboard-greeting">
                        <div className="dashboard-greeting-text">{getGreeting()}</div>
                        <div className="dashboard-greeting-name">{firstName}</div>
                    </div>
                </div>
                <div className="dashboard-header-actions">
                    <button
                        className="dashboard-header-btn"
                        onClick={() => setShowSearch(true)}
                        aria-label="Search"
                    >
                        <Search size={20} />
                    </button>
                    <button
                        className="dashboard-header-btn"
                        onClick={() => navigate('/activity')}
                        aria-label="Notifications"
                    >
                        <Bell size={20} />
                        <span className="notification-badge"></span>
                    </button>
                </div>
            </header>

            {/* Total Balance Card */}
            <div className={`balance-card ${isOwed ? 'positive' : hasBalance ? 'negative' : 'neutral'}`}>
                <div className="balance-card-content">
                    <div className="balance-card-label">
                        {hasBalance ? (isOwed ? "YOU'RE OWED" : "YOU OWE") : "ALL SETTLED UP"}
                    </div>
                    <div className="balance-card-amount">
                        {hasBalance ? `${isOwed ? '+' : ''}${formatINR(Math.abs(totalBalances.totalBalance))}` : '₹0'}
                    </div>
                    <div className="balance-card-subtitle">
                        {hasBalance
                            ? (isOwed
                                ? `${peopleWhoOwe} ${peopleWhoOwe === 1 ? 'person owes' : 'people owe'} you money`
                                : `You owe money to ${peopleOwedTo} ${peopleOwedTo === 1 ? 'person' : 'people'}`)
                            : 'No pending balances'}
                    </div>
                </div>
                {hasBalance && (
                    <button
                        className="balance-card-action"
                        onClick={() => navigate('/friends')}
                    >
                        Settle Up
                    </button>
                )}
            </div>

            {/* Group Order Section */}
            <div
                className="group-order-card"
                onClick={() => navigate('/restaurants')}
            >
                <div className="group-order-icon">
                    <Send size={24} />
                </div>
                <div className="group-order-content">
                    <div className="group-order-title">Group Order</div>
                    <div className="group-order-subtitle">Order food together & split the bill</div>
                </div>
                <ChevronRight size={20} className="group-order-arrow" />
            </div>

            {/* Your Groups */}
            <div className="dashboard-section">
                <div className="dashboard-section-header">
                    <h3 className="dashboard-section-title">Your Groups</h3>
                    <span
                        className="dashboard-section-action"
                        onClick={() => navigate('/groups')}
                    >
                        See All
                    </span>
                </div>
                <div className="groups-grid">
                    {groups.slice(0, 3).map(group => {
                        const balances = getGroupBalanceDetails(group.id);
                        const netBalance = balances.reduce((sum, b) => sum + b.balance, 0);
                        const groupOwed = netBalance > 0;
                        const groupHasBalance = Math.abs(netBalance) > 0.5;

                        return (
                            <div
                                key={group.id}
                                className="group-card"
                                onClick={() => navigate(`/groups/${group.id}`)}
                            >
                                <div className="group-card-emoji">{getGroupEmoji(group)}</div>
                                <div className="group-card-name">{group.name}</div>
                                <div className="group-card-members">{group.members.length} members</div>
                                <div className={`group-card-balance ${groupHasBalance ? (groupOwed ? 'positive' : 'negative') : ''}`}>
                                    {groupHasBalance ? (
                                        groupOwed
                                            ? `+${formatINR(netBalance)} owed to you`
                                            : `-${formatINR(Math.abs(netBalance))} owed`
                                    ) : (
                                        'All settled'
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {/* New Group Card */}
                    <div
                        className="group-card group-card-new"
                        onClick={() => navigate('/groups')}
                    >
                        <div className="group-card-new-icon">+</div>
                        <div className="group-card-new-text">New Group</div>
                    </div>
                </div>
            </div>

            {/* Search Modal */}
            {showSearch && (
                <div className="modal-overlay search-modal-overlay" onClick={() => { setShowSearch(false); setSearchQuery(''); }}>
                    <div className="search-modal" onClick={e => e.stopPropagation()}>
                        <div className="search-modal-header">
                            <Search size={20} />
                            <input
                                type="text"
                                placeholder="Search groups, friends..."
                                autoFocus
                                className="search-modal-input"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                            <button
                                className="search-modal-close"
                                onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                            >
                                Cancel
                            </button>
                        </div>
                        {/* Search Results */}
                        {hasSearchResults && (
                            <div style={{ marginTop: 'var(--space-md)', maxHeight: '60vh', overflowY: 'auto' }}>
                                {filteredFriends.length > 0 && (
                                    <div style={{ marginBottom: 'var(--space-md)' }}>
                                        <h4 style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-sm)', textTransform: 'uppercase' }}>Friends</h4>
                                        {filteredFriends.map(friend => (
                                            <div
                                                key={friend.id}
                                                className="list-item"
                                                onClick={() => { navigate(`/friends/${friend.id}`); setShowSearch(false); setSearchQuery(''); }}
                                                style={{ cursor: 'pointer', padding: 'var(--space-sm) 0' }}
                                            >
                                                <div className="avatar" style={{ background: getAvatarColor(friend.name), width: 36, height: 36, fontSize: '0.7rem' }}>
                                                    {getInitials(friend.name)}
                                                </div>
                                                <div className="list-item-content">
                                                    <div className="list-item-title">{friend.name}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {filteredGroups.length > 0 && (
                                    <div>
                                        <h4 style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-sm)', textTransform: 'uppercase' }}>Groups</h4>
                                        {filteredGroups.map(group => (
                                            <div
                                                key={group.id}
                                                className="list-item"
                                                onClick={() => { navigate(`/groups/${group.id}`); setShowSearch(false); setSearchQuery(''); }}
                                                style={{ cursor: 'pointer', padding: 'var(--space-sm) 0' }}
                                            >
                                                <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                                                    {group.avatar || '👥'}
                                                </div>
                                                <div className="list-item-content">
                                                    <div className="list-item-title">{group.name}</div>
                                                    <div className="list-item-subtitle">{group.members.length} members</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        {searchQuery && !hasSearchResults && (
                            <div style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                No results found for &quot;{searchQuery}&quot;
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
