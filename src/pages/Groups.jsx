import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, X, Check, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getInitials, getAvatarColor } from '../utils/helpers';
import { formatINR } from '../utils/currency';

export default function Groups() {
    const { groups, friends, currentUser, addGroup, getGroupBalanceDetails, getUserById, showToast } = useApp();
    const navigate = useNavigate();
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState([]);

    const [friendSearch, setFriendSearch] = useState('');

    const handleOpenCreateGroup = () => {
        if (friends.length === 0) {
            showToast('Add friends first to create a group');
            return;
        }
        setShowCreate(true);
        setFriendSearch('');
    };

    const filteredFriends = friends.filter(f =>
        f.name.toLowerCase().includes(friendSearch.toLowerCase())
    );

    const handleCreateGroup = async () => {
        console.log('Creating group with name:', newName, 'and members:', selectedMembers);
        if (!newName.trim() || selectedMembers.length === 0) return;
        const group = await addGroup(newName.trim(), selectedMembers);
        setShowCreate(false);
        setNewName('');
        setSelectedMembers([]);
        navigate(`/groups/${group.id}`);
    };

    const toggleMember = (friendId) => {
        setSelectedMembers(prev =>
            prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
        );
    };

    return (
        <div>
            <div className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 className="page-title">Groups</h1>
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={handleOpenCreateGroup}
                        disabled={friends.length === 0}
                        style={friends.length === 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                    >
                        <Plus size={16} /> New
                    </button>
                </div>
            </div>

            {groups.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">
                        <Users size={36} />
                    </div>
                    <h3 className="empty-state-title">No groups yet</h3>
                    <p className="empty-state-desc">{friends.length === 0 ? 'Add friends first to create a group.' : 'Create a group to start splitting expenses with friends.'}</p>
                    <button
                        className="btn btn-primary"
                        onClick={handleOpenCreateGroup}
                        disabled={friends.length === 0}
                        style={friends.length === 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                    >
                        <Plus size={18} /> Create Group
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                    {groups.map(group => {
                        const balances = getGroupBalanceDetails(group.id);
                        // Net balance: positive = you're owed, negative = you owe
                        const netBalance = balances.reduce((sum, b) => sum + b.balance, 0);

                        return (
                            <div
                                key={group.id}
                                className="card card-clickable"
                                onClick={() => navigate(`/groups/${group.id}`)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                                    <div style={{
                                        width: 52, height: 52, borderRadius: 'var(--radius-lg)',
                                        background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '1.4rem', flexShrink: 0,
                                    }}>
                                        {group.name.includes('🏖️') ? '🏖️' : group.name.includes('🏠') ? '🏠' : group.name.includes('🍱') ? '🍱' : '👥'}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div className="list-item-title" style={{ fontSize: '1.05rem' }}>{group.name}</div>
                                        <div className="list-item-subtitle" style={{ marginTop: 4 }}>
                                            {group.members.length} members
                                        </div>
                                        <div className="avatar-stack" style={{ marginTop: 6 }}>
                                            {group.members.slice(0, 4).map(id => {
                                                const user = getUserById(id);
                                                return (
                                                    <div key={id} className="avatar avatar-sm" style={{ background: getAvatarColor(user.name) }}>
                                                        {getInitials(user.name)}
                                                    </div>
                                                );
                                            })}
                                            {group.members.length > 4 && (
                                                <div className="avatar avatar-sm" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                                                    +{group.members.length - 4}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        {Math.abs(netBalance) > 0.5 ? (
                                            <div
                                                className={netBalance > 0 ? 'text-positive' : 'text-negative'}
                                                style={{ fontWeight: 700, fontSize: '0.9rem' }}
                                            >
                                                {netBalance > 0 ? '+' : '-'}{formatINR(Math.abs(netBalance))}
                                            </div>
                                        ) : (
                                            <div className="badge badge-positive">settled</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Group Modal */}
            {showCreate && (
                <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Create Group</h2>
                            <button className="modal-close" onClick={() => setShowCreate(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Group name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    placeholder="e.g., Weekend Trip 🎉"
                                    autoFocus
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Add members</label>
                                <div className="search-bar" style={{ marginBottom: 'var(--space-sm)' }}>
                                    <Search size={16} />
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={friendSearch}
                                        onChange={e => setFriendSearch(e.target.value)}
                                        placeholder="Search friends..."
                                        style={{ paddingLeft: 36, fontSize: '0.9rem' }}
                                    />
                                </div>
                                <div className="member-select">
                                    {filteredFriends.map(friend => (
                                        <div
                                            key={friend.id}
                                            className={`member-chip ${selectedMembers.includes(friend.id) ? 'selected' : ''}`}
                                            onClick={() => toggleMember(friend.id)}
                                        >
                                            <div style={{
                                                width: 24, height: 24, borderRadius: '50%',
                                                background: getAvatarColor(friend.name),
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: 'white', fontSize: '0.55rem', fontWeight: 600,
                                            }}>
                                                {getInitials(friend.name)}
                                            </div>
                                            {friend.name.split(' ')[0]}
                                        </div>
                                    ))}
                                </div>
                                {filteredFriends.length === 0 && friendSearch && (
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 'var(--space-sm)' }}>
                                        No friends match &quot;{friendSearch}&quot;
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary flex-1" onClick={() => setShowCreate(false)}>Cancel</button>
                            <button
                                className="btn btn-primary flex-1"
                                style={(newName.trim()==="" || selectedMembers.length < 1)? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                                onClick={handleCreateGroup}
                                disabled={newName.trim()==="" || selectedMembers.length < 1}
                            >
                                <Check size={18} /> Create
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
