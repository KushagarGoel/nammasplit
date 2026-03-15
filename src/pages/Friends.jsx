import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Search, X, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatINR } from '../utils/currency';
import { getInitials, getAvatarColor } from '../utils/helpers';

export default function Friends() {
    const { friends, addFriend, getFriendBalance } = useApp();
    const navigate = useNavigate();
    const [showAdd, setShowAdd] = useState(false);
    const [search, setSearch] = useState('');
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');

    const handleAddFriend = async () => {
        if (!newName.trim()) return;
        await addFriend(newName.trim(), newEmail.trim());
        setShowAdd(false);
        setNewName('');
        setNewEmail('');
    };

    const filteredFriends = friends.filter(f =>
        f.name.toLowerCase().includes(search.toLowerCase())
    );

    // Separate into owed and owes
    const friendsWithBalances = filteredFriends.map(f => ({
        ...f,
        balance: getFriendBalance(f.id),
    }));

    const friendsYouOwe = friendsWithBalances.filter(f => f.balance < -0.5);
    const friendsOweYou = friendsWithBalances.filter(f => f.balance > 0.5);
    const friendsSettled = friendsWithBalances.filter(f => Math.abs(f.balance) <= 0.5);

    const renderFriendItem = (friend) => (
        <div
            key={friend.id}
            className="list-item"
            onClick={() => navigate(`/friends/${friend.id}`)}
        >
            <div className="avatar" style={{ background: getAvatarColor(friend.name) }}>
                {getInitials(friend.name)}
            </div>
            <div className="list-item-content">
                <div className="list-item-title">{friend.name}</div>
                <div className="list-item-subtitle">
                    {friend.balance > 0.5
                        ? 'owes you'
                        : friend.balance < -0.5
                            ? 'you owe'
                            : 'settled up ✓'}
                </div>
            </div>
            <div className="list-item-right">
                {Math.abs(friend.balance) > 0.5 ? (
                    <div className={`list-item-amount ${friend.balance > 0 ? 'positive' : 'negative'}`}>
                        {formatINR(Math.abs(friend.balance))}
                    </div>
                ) : (
                    <span className="badge badge-positive">settled</span>
                )}
            </div>
        </div>
    );

    return (
        <div>
            <div className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 className="page-title">Friends</h1>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
                        <UserPlus size={16} /> Add
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="search-bar">
                <Search />
                <input
                    type="text"
                    className="form-input"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search friends..."
                    style={{ paddingLeft: 40 }}
                />
            </div>

            {filteredFriends.length === 0 && !search ? (
                <div className="empty-state">
                    <div className="empty-state-icon">
                        <UserPlus size={36} />
                    </div>
                    <h3 className="empty-state-title">No friends yet</h3>
                    <p className="empty-state-desc">Add friends to start splitting expenses.</p>
                    <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
                        <UserPlus size={18} /> Add Friend
                    </button>
                </div>
            ) : (
                <>
                    {friendsOweYou.length > 0 && (
                        <div className="section">
                            <div className="section-header">
                                <h3 className="section-title">Owes You</h3>
                            </div>
                            <div className="card">
                                {friendsOweYou.map(renderFriendItem)}
                            </div>
                        </div>
                    )}

                    {friendsYouOwe.length > 0 && (
                        <div className="section">
                            <div className="section-header">
                                <h3 className="section-title">You Owe</h3>
                            </div>
                            <div className="card">
                                {friendsYouOwe.map(renderFriendItem)}
                            </div>
                        </div>
                    )}

                    {friendsSettled.length > 0 && (
                        <div className="section">
                            <div className="section-header">
                                <h3 className="section-title">Settled Up</h3>
                            </div>
                            <div className="card">
                                {friendsSettled.map(renderFriendItem)}
                            </div>
                        </div>
                    )}

                    {filteredFriends.length === 0 && search && (
                        <div className="empty-state">
                            <h3 className="empty-state-title">No results</h3>
                            <p className="empty-state-desc">No friends match "{search}"</p>
                        </div>
                    )}
                </>
            )}

            {/* Add Friend Modal */}
            {showAdd && (
                <div className="modal-overlay" onClick={() => setShowAdd(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Add Friend</h2>
                            <button className="modal-close" onClick={() => setShowAdd(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    placeholder="e.g., Riya Kapoor"
                                    autoFocus
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email (optional)</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    value={newEmail}
                                    onChange={e => setNewEmail(e.target.value)}
                                    placeholder="riya@email.com"
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary flex-1" onClick={() => setShowAdd(false)}>Cancel</button>
                            <button className="btn btn-primary flex-1" onClick={handleAddFriend} disabled={!newName.trim()}>
                                <Check size={18} /> Add Friend
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
