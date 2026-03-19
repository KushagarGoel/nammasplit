import { useState } from 'react';
import { X, Check, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getInitials, getAvatarColor } from '../utils/helpers';
import CategoryPicker from './CategoryPicker';

const SPLIT_TYPES = [
    { id: 'equal', label: 'Equal' },
    { id: 'exact', label: 'Exact' },
    { id: 'percentage', label: '%' },
    { id: 'shares', label: 'Shares' },
];

export default function AddExpenseModal({ onClose, preselectedGroupId = null, editingExpense = null, onDelete }) {
    const { currentUser, friends, groups, addExpense, editExpense, getUserById, showToast } = useApp();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const isEditing = !!editingExpense;

    const [description, setDescription] = useState(editingExpense?.description || '');
    const [amount, setAmount] = useState(editingExpense?.amount?.toString() || '');
    const [paidBy, setPaidBy] = useState(editingExpense?.paidBy || currentUser.id);
    const [splitType, setSplitType] = useState(editingExpense?.splitType || 'equal');
    const [category, setCategory] = useState(editingExpense?.category || 'food');
    const [notes, setNotes] = useState(editingExpense?.notes || '');
    const [date, setDate] = useState(
        editingExpense?.date
            ? new Date(editingExpense.date).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]
    );
    const [groupId, setGroupId] = useState(editingExpense?.groupId || preselectedGroupId || '');
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [showMoreOptions, setShowMoreOptions] = useState(isEditing);
    const [submitting, setSubmitting] = useState(false);

    // Determine participants based on group selection
    const selectedGroup = groupId ? groups.find(g => g.id === groupId) : null;
    const participants = selectedGroup
        ? selectedGroup.members.map(id => getUserById(id))
        : [currentUser, ...friends];

    const [selectedParticipants, setSelectedParticipants] = useState(() => {
        if (editingExpense) return editingExpense.splits.map(s => s.userId);
        if (selectedGroup) return selectedGroup.members;
        return [currentUser.id];
    });

    // Track if we're in "edit participants" mode
    const [editParticipantsMode, setEditParticipantsMode] = useState(false);

    // For non-equal splits
    const [exactAmounts, setExactAmounts] = useState(() => {
        if (editingExpense?.splitType === 'exact') {
            return Object.fromEntries(editingExpense.splits.map(s => [s.userId, s.amount.toString()]));
        }
        return {};
    });
    const [percentages, setPercentages] = useState(() => {
        if (editingExpense?.splitType === 'percentage') {
            const total = editingExpense.amount;
            return Object.fromEntries(editingExpense.splits.map(s => [s.userId, ((s.amount / total) * 100).toString()]));
        }
        return {};
    });
    const [shares, setShares] = useState({});

    const handleGroupChange = (newGroupId) => {
        // Handle the "Create new shared group" option
        if (newGroupId === '__NEW_SHARED__') {
            setGroupId(''); // Will trigger group creation on submit
            return;
        }

        setGroupId(newGroupId);
        if (newGroupId) {
            const group = groups.find(g => g.id === newGroupId);
            setSelectedParticipants(group.members);
        } else {
            // For personal expenses, only current user is selected by default
            // When editing, preserve existing participants if not in edit mode
            if (!isEditing || editParticipantsMode) {
                setSelectedParticipants([currentUser.id]);
            }
        }
    };

    // Toggle edit participants mode
    const toggleEditParticipants = () => {
        setEditParticipantsMode(!editParticipantsMode);
    };

    // Generate a suggested group name based on participants
    const getSuggestedGroupName = () => {
        const otherParticipants = selectedParticipants.filter(id => id !== currentUser.id);
        if (otherParticipants.length === 0) return null;
        if (otherParticipants.length === 1) {
            const friend = getUserById(otherParticipants[0]);
            return `${currentUser.name} & ${friend.name}`;
        }
        return `${currentUser.name} & ${otherParticipants.length} others`;
    };

    const toggleParticipant = (userId) => {
        if (userId === currentUser.id) return;
        setSelectedParticipants(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const computeSplits = () => {
        const totalAmount = parseFloat(amount) || 0;
        const activeParticipants = selectedParticipants;

        switch (splitType) {
            case 'equal': {
                const perPerson = totalAmount / activeParticipants.length;
                return activeParticipants.map(userId => ({
                    userId,
                    amount: Math.round(perPerson * 100) / 100,
                }));
            }
            case 'exact': {
                return activeParticipants.map(userId => ({
                    userId,
                    amount: parseFloat(exactAmounts[userId]) || 0,
                }));
            }
            case 'percentage': {
                return activeParticipants.map(userId => ({
                    userId,
                    amount: Math.round((totalAmount * (parseFloat(percentages[userId]) || 0) / 100) * 100) / 100,
                }));
            }
            case 'shares': {
                const totalShares = activeParticipants.reduce(
                    (sum, userId) => sum + (parseFloat(shares[userId]) || 1), 0
                );
                return activeParticipants.map(userId => {
                    const userShares = parseFloat(shares[userId]) || 1;
                    return {
                        userId,
                        amount: Math.round((totalAmount * userShares / totalShares) * 100) / 100,
                    };
                });
            }
            default:
                return [];
        }
    };

    const validateSplits = () => {
        const totalAmount = parseFloat(amount) || 0;
        if (splitType === 'equal' || splitType === 'shares') return true;

        const splits = computeSplits();
        const splitsTotal = splits.reduce((sum, s) => sum + s.amount, 0);
        const tolerance = 0.01; // Allow 1 cent rounding difference

        if (Math.abs(splitsTotal - totalAmount) > tolerance) {
            showToast(`Split amounts must equal total. Current: ₹${splitsTotal.toFixed(2)}, Expected: ₹${totalAmount.toFixed(2)}`);
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!amount || parseFloat(amount) <= 0) return;

        // Check if this is a shared expense (multiple participants) without a group
        const isSharedExpense = selectedParticipants.length >= 2;
        const isPersonalExpense = selectedParticipants.length === 1 && selectedParticipants[0] === currentUser.id;

        // For shared expenses without a group, require group creation (only for new expenses)
        if (isSharedExpense && !groupId && !isEditing) {
            showToast('Please select or create a group for shared expenses');
            return;
        }

        // For editing, if participants changed and expense has groupId, check if new group needed
        if (isEditing && isSharedExpense && !groupId) {
            showToast('Shared expenses must be in a group. Please select a group.');
            return;
        }

        if (!validateSplits()) return;
        setSubmitting(true);

        try {
            const splits = computeSplits();
            const finalDesc = description || `Expense of ₹${parseFloat(amount).toLocaleString('en-IN')}`;

            const expenseData = {
                description: finalDesc,
                amount: parseFloat(amount),
                paidBy,
                splitType,
                splits,
                groupId: groupId || null,
                category,
                notes,
                date: new Date(date).toISOString(),
            };

            // For shared expenses, pass suggested group name for auto-creation
            if (isSharedExpense && !groupId && !isEditing) {
                expenseData.suggestedGroupName = getSuggestedGroupName();
            }

            if (isEditing) {
                await editExpense(editingExpense.id, expenseData);
            } else {
                await addExpense(expenseData);
            }

            onClose();
        } catch (err) {
            console.error('Error saving expense:', err);
        }
        setSubmitting(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">{isEditing ? 'Edit Expense' : 'Add Expense'}</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    {/* No friends warning */}
                    {!isEditing && friends.length === 0 && groups.length === 0 && (
                        <div style={{
                            padding: 'var(--space-md)',
                            background: 'var(--negative-bg)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: 'var(--space-md)',
                            color: 'var(--negative)',
                            fontSize: '0.9rem',
                        }}>
                            You need to add friends or create a group before creating an expense.
                        </div>
                    )}
                    {/* Amount */}
                    <div className="form-group">
                        <label className="form-label">Amount (₹)</label>
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

                    {/* Description — optional */}
                    <div className="form-group">
                        <label className="form-label">Description <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(optional)</span></label>
                        <input
                            type="text"
                            className="form-input"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="e.g., Dinner at Barbeque Nation"
                        />
                    </div>

                    {/* Group selector */}
                    <div className="form-group">
                        <label className="form-label">Group</label>
                        <select
                            className="form-input"
                            value={groupId}
                            onChange={e => handleGroupChange(e.target.value)}
                            disabled={isEditing}
                        >
                            <option value="">Personal Expense</option>
                            <option value="__NEW_SHARED__" disabled={selectedParticipants.length < 2}>
                                {selectedParticipants.length < 2
                                    ? 'Select friends to share with...'
                                    : `+ New: ${getSuggestedGroupName() || 'Shared Expense'}`}
                            </option>
                            {groups.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                        {selectedParticipants.length >= 2 && !groupId && (
                            <p style={{
                                margin: 'var(--space-xs) 0 0 0',
                                fontSize: '0.8rem',
                                color: 'var(--text-tertiary)',
                            }}>
                                Select a group or choose &quot;New: {getSuggestedGroupName()}&quot; to create one
                            </p>
                        )}
                    </div>

                    {/* Paid by */}
                    <div className="form-group">
                        <label className="form-label">Paid by</label>
                        <select
                            className="form-input"
                            value={paidBy}
                            onChange={e => setPaidBy(e.target.value)}
                        >
                            {participants
                                .filter(p => selectedParticipants.includes(p.id))
                                .map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.id === currentUser.id ? 'You' : p.name}
                                    </option>
                                ))}
                        </select>
                    </div>

                    {/* Participants selector - always show for adding, show edit mode when editing */}
                    {(!isEditing || editParticipantsMode) && (
                        <div className="form-group">
                            <label className="form-label">Split with</label>
                            <div className="member-select">
                                {(groupId ? participants : friends).map(person => (
                                    <div
                                        key={person.id}
                                        className={`member-chip ${selectedParticipants.includes(person.id) ? 'selected' : ''}`}
                                        onClick={() => toggleParticipant(person.id)}
                                    >
                                        <div className="avatar-sm" style={{
                                            background: getAvatarColor(person.name),
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white',
                                            width: 24,
                                            height: 24,
                                            fontSize: '0.55rem',
                                            fontWeight: 600,
                                        }}>
                                            {getInitials(person.name)}
                                        </div>
                                        {person.id === currentUser.id ? 'You' : person.name.split(' ')[0]}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Show current participants when editing and not in edit mode */}
                    {isEditing && !editParticipantsMode && (
                        <div className="form-group">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                                <label className="form-label" style={{ margin: 0 }}>Split with</label>
                                <button
                                    className="btn btn-secondary"
                                    onClick={toggleEditParticipants}
                                    style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                                >
                                    Edit Members
                                </button>
                            </div>
                            <div className="member-select" style={{ opacity: 0.7 }}>
                                {[currentUser, ...friends]
                                    .filter(u => selectedParticipants.includes(u.id))
                                    .map(user => (
                                        <div key={user.id} className="member-chip selected">
                                            <div className="avatar-sm" style={{
                                                background: getAvatarColor(user.name),
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                                width: 24,
                                                height: 24,
                                                fontSize: '0.55rem',
                                                fontWeight: 600,
                                            }}>
                                                {getInitials(user.name)}
                                            </div>
                                            {user.id === currentUser.id ? 'You' : user.name.split(' ')[0]}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}

                    {/* Split type */}
                    <div className="form-group">
                        <label className="form-label">Split type</label>
                        <div className="tabs">
                            {SPLIT_TYPES.map(st => (
                                <button
                                    key={st.id}
                                    className={`tab ${splitType === st.id ? 'active' : ''}`}
                                    onClick={() => setSplitType(st.id)}
                                >
                                    {st.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Non-equal split inputs */}
                    {splitType !== 'equal' && selectedParticipants.length >= 2 && (
                        <div className="form-group">
                            <label className="form-label">
                                {splitType === 'exact' ? 'Enter amounts' :
                                    splitType === 'percentage' ? 'Enter percentages' : 'Enter shares'}
                            </label>
                            {selectedParticipants.map(userId => {
                                const user = getUserById(userId);
                                return (
                                    <div key={userId} className="split-member">
                                        <div className="avatar avatar-sm" style={{ background: getAvatarColor(user.name) }}>
                                            {getInitials(user.name)}
                                        </div>
                                        <div className="split-member-info">
                                            <div className="split-member-name">
                                                {userId === currentUser.id ? 'You' : user.name}
                                            </div>
                                        </div>
                                        <input
                                            type="number"
                                            className="form-input split-member-input"
                                            placeholder={splitType === 'shares' ? '1' : '0'}
                                            value={
                                                splitType === 'exact' ? (exactAmounts[userId] || '') :
                                                    splitType === 'percentage' ? (percentages[userId] || '') :
                                                        (shares[userId] || '')
                                            }
                                            onChange={e => {
                                                const val = e.target.value;
                                                if (splitType === 'exact') setExactAmounts(prev => ({ ...prev, [userId]: val }));
                                                else if (splitType === 'percentage') setPercentages(prev => ({ ...prev, [userId]: val }));
                                                else setShares(prev => ({ ...prev, [userId]: val }));
                                            }}
                                            min="0"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* More Options Toggle */}
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowMoreOptions(!showMoreOptions)}
                        style={{ width: '100%', justifyContent: 'center', gap: '6px', fontSize: '0.85rem' }}
                    >
                        {showMoreOptions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        {showMoreOptions ? 'Less options' : 'More options (category, date, notes)'}
                    </button>

                    {/* Collapsible: Category, Date, Notes */}
                    {showMoreOptions && (
                        <div style={{ marginTop: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Category</label>
                                <button
                                    className="form-input"
                                    onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                                    style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                >
                                    <span>{category.charAt(0).toUpperCase() + category.slice(1)}</span>
                                    <ChevronDown size={16} />
                                </button>
                                {showCategoryPicker && (
                                    <div style={{ marginTop: 'var(--space-sm)' }}>
                                        <CategoryPicker
                                            selected={category}
                                            onSelect={(cat) => {
                                                setCategory(cat);
                                                setShowCategoryPicker(false);
                                            }}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Date</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Notes</label>
                                <textarea
                                    className="form-input form-textarea"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Add a note..."
                                    rows={2}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-footer" style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    {isEditing && onDelete && (
                        <button
                            className="btn"
                            onClick={() => setShowDeleteConfirm(true)}
                            style={{
                                background: 'var(--danger)',
                                color: 'white',
                                border: 'none',
                            }}
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                    <button className="btn btn-secondary flex-1" onClick={onClose}>Cancel</button>
                    <button
                        className="btn btn-primary flex-1"
                        onClick={handleSubmit}
                        disabled={submitting || !amount || parseFloat(amount) <= 0 || (selectedParticipants.length < 2 && !isEditing)}
                        style={(submitting || !amount || parseFloat(amount) <= 0 || (selectedParticipants.length < 2 && !isEditing)) ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                    >
                        <Check size={18} />
                        {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Expense'}
                    </button>
                </div>

                {/* Delete Confirmation */}
                {showDeleteConfirm && (
                    <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={() => setShowDeleteConfirm(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '360px' }}>
                            <div className="modal-header">
                                <h2 className="modal-title">Delete Expense</h2>
                                <button className="modal-close" onClick={() => setShowDeleteConfirm(false)}>
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="modal-body">
                                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                                    Are you sure you want to delete "{editingExpense?.description}"? This cannot be undone.
                                </p>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary flex-1" onClick={() => setShowDeleteConfirm(false)}>
                                    Cancel
                                </button>
                                <button
                                    className="btn flex-1"
                                    onClick={() => {
                                        onDelete(editingExpense.id);
                                        onClose();
                                    }}
                                    style={{ background: 'var(--danger)', color: 'white', border: 'none' }}
                                >
                                    <Trash2 size={18} /> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
