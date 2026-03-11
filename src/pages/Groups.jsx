import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, X, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getInitials, getAvatarColor } from '../utils/helpers';
import { formatINR } from '../utils/currency';

export default function Groups() {
    const { groups, friends, currentUser, addGroup, getGroupBalanceDetails, getUserById } = useApp();
    const navigate = useNavigate();
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState([]);

    const handleCreateGroup = () => {
        if (!newName.trim() || selectedMembers.length === 0) return;
        const group = addGroup(newName.trim(), selectedMembers);
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
                    <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
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
                    <p className="empty-state-desc">Create a group to start splitting expenses with friends.</p>
                    <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                        <Plus size={18} /> Create Group
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                    {groups.map(group => {
                        const balances = getGroupBalanceDetails(group.id);
                        const totalOwed = balances.reduce((sum, b) => sum + (b.balance > 0 ? b.balance : 0), 0);
                        const totalOwe = balances.reduce((sum, b) => sum + (b.balance < 0 ? Math.abs(b.balance) : 0), 0);

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
                                        {totalOwed > 0 && (
                                            <div className="text-positive" style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                                                +{formatINR(totalOwed)}
                                            </div>
                                        )}
                                        {totalOwe > 0 && (
                                            <div className="text-negative" style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                                                -{formatINR(totalOwe)}
                                            </div>
                                        )}
                                        {totalOwed === 0 && totalOwe === 0 && (
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
                                <div className="member-select">
                                    {friends.map(friend => (
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
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary flex-1" onClick={() => setShowCreate(false)}>Cancel</button>
                            <button
                                className="btn btn-primary flex-1"
                                onClick={handleCreateGroup}
                                disabled={!newName.trim() || selectedMembers.length === 0}
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
