import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus, ChefHat, Utensils, ArrowRight, Users, Search,
    Trash2, Copy, X, AlertCircle, CheckCircle, ShoppingBag,
    Calendar, Receipt, MoreVertical, Leaf, Edit3
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { formatINR } from '../utils/currency';
import {
    getUserRestaurants, getActiveSessionsForUser, getCartItemsForSession, getUsersByIds,
    saveOrderingSession, removeRestaurant, updateRestaurant, updateOrderingSession
} from '../data/firestore';
import { createOrderingSession, createExpense } from '../data/models';
import MenuUploader from '../components/MenuUploader';

export default function Restaurants() {
    const navigate = useNavigate();
    const { currentUser, friends, groups, addExpense } = useApp();
    const { userProfile } = useAuth();

    const [restaurants, setRestaurants] = useState([]);
    const [activeSessions, setActiveSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showUploader, setShowUploader] = useState(false);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [vegFilter, setVegFilter] = useState('all'); // 'all' | 'veg' | 'nonveg'

    // Modals
    const [deleteModal, setDeleteModal] = useState({ show: false, restaurant: null });
    const [createSessionModal, setCreateSessionModal] = useState({ show: false, restaurant: null });
    const [stopSessionModal, setStopSessionModal] = useState({ show: false, session: null });
    const [expenseModal, setExpenseModal] = useState({ show: false, session: null, cartItems: [], participants: [], selectedGroup: null });
    const [hostLimitModal, setHostLimitModal] = useState({ show: false, existingSession: null });
    const [editModal, setEditModal] = useState({ show: false, restaurant: null, editedItems: [] });
    const [editModalSearch, setEditModalSearch] = useState('');

    const userName = userProfile?.name || currentUser?.name || 'You';

    // Sort sessions: hosted by user first, then participating
    const myHostedSessions = useMemo(() =>
        activeSessions.filter(s => s.createdBy === currentUser?.id),
        [activeSessions, currentUser?.id]
    );

    const participatingSessions = useMemo(() =>
        activeSessions.filter(s => s.createdBy !== currentUser?.id),
        [activeSessions, currentUser?.id]
    );

    // Check if restaurant is pure veg (all items are VEG or UNKNOWN)
    const isPureVeg = (restaurant) => {
        if (!restaurant.menuItems || restaurant.menuItems.length === 0) return false;
        return restaurant.menuItems.every(item =>
            item.category === 'VEG' || item.category === 'UNKNOWN'
        );
    };

    const loadData = useCallback(async () => {
        if (!currentUser?.id) return;
        try {
            const [rests, sessions] = await Promise.all([
                getUserRestaurants(currentUser.id),
                getActiveSessionsForUser(currentUser.id),
            ]);
            setRestaurants(rests);
            setActiveSessions(sessions);
        } catch (err) {
            console.error('Error loading restaurants:', err);
        } finally {
            setLoading(false);
        }
    }, [currentUser?.id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Filter restaurants
    const filteredRestaurants = useMemo(() => {
        return restaurants.filter(restaurant => {
            const matchesSearch = restaurant.name.toLowerCase().includes(searchQuery.toLowerCase());

            let matchesVegFilter = true;
            if (vegFilter === 'veg') {
                matchesVegFilter = isPureVeg(restaurant);
            } else if (vegFilter === 'nonveg') {
                matchesVegFilter = restaurant.menuItems?.some(item => item.category === 'NON_VEG');
            }

            return matchesSearch && matchesVegFilter;
        });
    }, [restaurants, searchQuery, vegFilter]);

    const handleRestaurantCreated = (restaurant) => {
        setShowUploader(false);
        loadData();
    };

    const handleCreateSessionClick = (restaurant) => {
        // Check if user already has an active hosted session
        const existingHosted = myHostedSessions[0];
        if (existingHosted) {
            setHostLimitModal({ show: true, existingSession: existingHosted });
            return;
        }
        createSession(restaurant);
    };

    const createSession = async (restaurant) => {
        try {
            const session = createOrderingSession({
                restaurantId: restaurant.id,
                restaurantName: restaurant.name,
                createdBy: currentUser.id,
                hostName: userName,
            });

            await saveOrderingSession(session);
            setCreateSessionModal({ show: false, restaurant: null });
            navigate(`/order/${session.id}`);
        } catch (err) {
            console.error('Error creating session:', err);
        }
    };

    const handleDeleteRestaurant = async () => {
        const { restaurant } = deleteModal;
        if (!restaurant) return;

        try {
            await removeRestaurant(restaurant.id);
            setDeleteModal({ show: false, restaurant: null });
            loadData();
        } catch (err) {
            console.error('Error deleting restaurant:', err);
        }
    };

    const handleStopSessionClick = (session) => {
        setStopSessionModal({ show: true, session });
    };

    const handleEndSession = async (addExpense = false) => {
        const { session } = stopSessionModal;
        setStopSessionModal({ show: false, session: null });

        if (!session) return;

        if (addExpense) {
            try {
                // Get all cart items for this session
                const cartItems = await getCartItemsForSession(session.id);

                // Get participant details
                const participantIds = [...new Set(cartItems.map(item => item.userId))];
                const participantDetails = await getUsersByIds(participantIds);

                // Calculate totals
                const totalAmount = cartItems.reduce((sum, item) =>
                    sum + (item.price * item.quantity), 0
                );

                setExpenseModal({
                    show: true,
                    session,
                    cartItems,
                    participants: participantDetails,
                    totalAmount,
                    selectedGroup: groups[0] || null
                });
            } catch (err) {
                console.error('Error loading session data:', err);
            }
        }

        // Mark session as completed
        try {
            await updateOrderingSession(session.id, { status: 'completed' });
            loadData();
        } catch (err) {
            console.error('Error ending session:', err);
        }
    };

    const saveSessionAsExpense = async () => {
        const { session, totalAmount, selectedGroup, participants } = expenseModal;

        try {
            // Get unique participant IDs and ensure current user (payer) is included
            const participantIds = participants.map(p => p.id);
            const involvedUserIds = [...new Set([currentUser.id, ...participantIds])];

            const expense = createExpense({
                description: `${session.restaurantName} - Group Order`,
                amount: totalAmount,
                paidBy: currentUser.id,
                splitType: 'equal',
                splits: involvedUserIds.map(uid => ({
                    userId: uid,
                    amount: totalAmount / involvedUserIds.length
                })),
                groupId: selectedGroup?.id || null,
                category: 'food',
                notes: `Order from ${session.restaurantName}`,
                involvedUsers: involvedUserIds,
            });

            await addExpense(expense);
            setExpenseModal({ show: false, session: null, cartItems: [], participants: [], selectedGroup: null, totalAmount: 0 });
        } catch (err) {
            console.error('Error saving expense:', err);
        }
    };

    const handleJoinSession = (sessionId) => {
        navigate(`/order/${sessionId}`);
    };

    const handleEditRestaurant = (restaurant) => {
        setEditModal({
            show: true,
            restaurant,
            editedItems: restaurant.menuItems ? [...restaurant.menuItems] : []
        });
        setEditModalSearch('');
    };

    const handleSaveRestaurantEdit = async () => {
        const { restaurant, editedItems } = editModal;
        if (!restaurant) return;

        try {
            // Filter out empty items and add IDs to new items
            const validItems = editedItems
                .filter(item => item.name?.trim())
                .map(item => ({
                    ...item,
                    id: item.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    price: parseFloat(item.price) || 0,
                }));

            await updateRestaurant(restaurant.id, {
                name: restaurant.name,
                menuItems: validItems,
                updatedAt: new Date().toISOString()
            });

            setEditModal({ show: false, restaurant: null, editedItems: [] });
            loadData();
        } catch (err) {
            console.error('Error saving restaurant:', err);
        }
    };

    const updateMenuItemInEdit = (index, field, value) => {
        setEditModal(prev => ({
            ...prev,
            editedItems: prev.editedItems.map((item, i) =>
                i === index ? { ...item, [field]: value } : item
            )
        }));
    };

    const addMenuItemInEdit = () => {
        setEditModal(prev => ({
            ...prev,
            editedItems: [...prev.editedItems, {
                id: null,
                name: '',
                description: null,
                category: 'UNKNOWN',
                price: ''
            }]
        }));
    };

    const removeMenuItemInEdit = (index) => {
        setEditModal(prev => ({
            ...prev,
            editedItems: prev.editedItems.filter((_, i) => i !== index)
        }));
    };

    const duplicateRestaurant = async (restaurant, e) => {
        e.stopPropagation();
        // Feature coming soon
    };

    if (loading) {
        return (
            <div className="page-content restaurants-page">
                <div className="page-header">
                    <h1 className="page-title">Restaurants</h1>
                </div>
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page-content restaurants-page">
            {/* Active Sessions Section */}
            {activeSessions.length > 0 && (
                <div className="section">
                    <div className="section-header">
                        <h2 className="section-title">Active Sessions</h2>
                    </div>

                    {/* My Hosted Sessions */}
                    {myHostedSessions.length > 0 && (
                        <div className="session-subsection">
                            <h3 className="session-subsection-title">Hosted by You</h3>
                            <div className="active-sessions-list">
                                {myHostedSessions.map(session => (
                                    <div
                                        key={session.id}
                                        className="active-session-card hosted"
                                        onClick={() => handleJoinSession(session.id)}
                                    >
                                        <div className="active-session-header">
                                            <div>
                                                <h3 className="active-session-name">{session.restaurantName}</h3>
                                                <div className="active-session-meta">
                                                    <span className="active-session-participants">
                                                        <Users size={14} />
                                                        {session.participants?.length || 1} participants
                                                    </span>
                                                    <span>•</span>
                                                    <span>Hosted by {session.hostName}</span>
                                                </div>
                                            </div>
                                            <span className="active-session-status">Active</span>
                                        </div>
                                        <div className="active-session-actions-bar">
                                            <button
                                                className="session-action-btn primary"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/order/${session.id}`);
                                                }}
                                            >
                                                <ShoppingBag size={16} />
                                                Start Order
                                            </button>
                                            <button
                                                className="session-action-btn danger"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleStopSessionClick(session);
                                                }}
                                            >
                                                <Trash2 size={16} />
                                                End Session
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Participating Sessions */}
                    {participatingSessions.length > 0 && (
                        <div className="session-subsection">
                            <h3 className="session-subsection-title">Join Orders</h3>
                            <div className="active-sessions-list">
                                {participatingSessions.map(session => (
                                    <div
                                        key={session.id}
                                        className="active-session-card"
                                        onClick={() => handleJoinSession(session.id)}
                                    >
                                        <div className="active-session-header">
                                            <div>
                                                <h3 className="active-session-name">{session.restaurantName}</h3>
                                                <div className="active-session-meta">
                                                    <span className="active-session-participants">
                                                        <Users size={14} />
                                                        {session.participants?.length || 1} participants
                                                    </span>
                                                    <span>•</span>
                                                    <span>Hosted by {session.hostName}</span>
                                                </div>
                                            </div>
                                            <span className="active-session-status">Active</span>
                                        </div>
                                        <div className="active-session-footer">
                                            <span className="session-link-hint">
                                                Click to join ordering session
                                            </span>
                                            <ArrowRight size={18} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Restaurants List */}
            <div className="section">
                <div className="section-header">
                    <h2 className="section-title">Your Restaurants</h2>
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setShowUploader(true)}
                    >
                        <Plus size={18} /> Add
                    </button>
                </div>

                {/* Filters */}
                <div className="restaurant-filters">
                    <div className="search-bar">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search restaurants..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input"
                        />
                    </div>
                    <div className="veg-filter">
                        <label className="radio-label">
                            <input
                                type="radio"
                                name="vegFilter"
                                value="all"
                                checked={vegFilter === 'all'}
                                onChange={(e) => setVegFilter(e.target.value)}
                                className="radio-input"
                            />
                            <span className="radio-text">All</span>
                        </label>
                        <label className="radio-label veg">
                            <input
                                type="radio"
                                name="vegFilter"
                                value="veg"
                                checked={vegFilter === 'veg'}
                                onChange={(e) => setVegFilter(e.target.value)}
                                className="radio-input"
                            />
                            <span className="radio-dot veg"></span>
                            <span className="radio-text">Veg</span>
                        </label>
                        <label className="radio-label nonveg">
                            <input
                                type="radio"
                                name="vegFilter"
                                value="nonveg"
                                checked={vegFilter === 'nonveg'}
                                onChange={(e) => setVegFilter(e.target.value)}
                                className="radio-input"
                            />
                            <span className="radio-dot nonveg"></span>
                            <span className="radio-text">Non-Veg</span>
                        </label>
                    </div>
                </div>

                {filteredRestaurants.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <ChefHat size={36} />
                        </div>
                        <h3 className="empty-state-title">
                            {restaurants.length === 0 ? 'No restaurants yet' : 'No matching restaurants'}
                        </h3>
                        <p className="empty-state-desc">
                            {restaurants.length === 0
                                ? 'Create a restaurant by uploading a menu photo. We\'ll use OCR to extract the items.'
                                : 'Try adjusting your search or filters.'}
                        </p>
                        {restaurants.length === 0 && (
                            <button
                                className="btn btn-primary"
                                onClick={() => setShowUploader(true)}
                            >
                                <Plus size={18} /> Create Restaurant
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="restaurants-grid">
                        {filteredRestaurants.map(restaurant => (
                            <div
                                key={restaurant.id}
                                className="restaurant-card-v2"
                            >
                                <div
                                    className="restaurant-card-header"
                                    onClick={() => handleEditRestaurant(restaurant)}
                                >
                                    <div className="restaurant-image">
                                        {restaurant.imageUrl ? (
                                            <img src={restaurant.imageUrl} alt={restaurant.name} />
                                        ) : (
                                            <div className="restaurant-image-placeholder">
                                                <Utensils size={32} />
                                            </div>
                                        )}
                                        {isPureVeg(restaurant) && (
                                            <div className="pure-eg-badge" title="Pure Veg">
                                                <Leaf size={14} fill="#2E7D32" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="restaurant-info-v2">
                                        <h3 className="restaurant-name-v2">{restaurant.name}</h3>
                                        <p className="restaurant-item-count">
                                            {restaurant.menuItems?.length || 0} menu items
                                        </p>
                                    </div>
                                    <button
                                        className="restaurant-edit-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditRestaurant(restaurant);
                                        }}
                                        title="Edit menu"
                                    >
                                        <Edit3 size={18} />
                                    </button>
                                </div>
                                <div className="restaurant-card-actions">
                                    <button
                                        className="restaurant-action-btn-v2 primary"
                                        onClick={() => handleCreateSessionClick(restaurant)}
                                    >
                                        <ShoppingBag size={16} />
                                        Create Session
                                    </button>
                                    <button
                                        className="restaurant-action-btn-v2 danger"
                                        onClick={() => setDeleteModal({ show: true, restaurant })}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Menu Uploader Modal */}
            {showUploader && (
                <div className="modal-overlay" onClick={() => setShowUploader(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <MenuUploader
                            currentUser={currentUser}
                            onRestaurantCreated={handleRestaurantCreated}
                            onCancel={() => setShowUploader(false)}
                        />
                    </div>
                </div>
            )}

            {/* Delete Restaurant Modal */}
            {deleteModal.show && (
                <div className="modal-overlay" onClick={() => setDeleteModal({ show: false, restaurant: null })}>
                    <div className="modal-content modal-sm" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <AlertCircle size={24} className="modal-icon danger" />
                            <h3>Delete Restaurant</h3>
                        </div>
                        <p className="modal-body">
                            Are you sure you want to delete <strong>{deleteModal.restaurant?.name}</strong>?
                            This will also delete all associated sessions and cannot be undone.
                        </p>
                        <div className="modal-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setDeleteModal({ show: false, restaurant: null })}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={handleDeleteRestaurant}
                            >
                                <Trash2 size={16} /> Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Host Limit Modal */}
            {hostLimitModal.show && (
                <div className="modal-overlay" onClick={() => setHostLimitModal({ show: false, existingSession: null })}>
                    <div className="modal-content modal-sm" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <AlertCircle size={24} className="modal-icon warning" />
                            <h3>Active Session Exists</h3>
                        </div>
                        <p className="modal-body">
                            You are already hosting an active session for <strong>{hostLimitModal.existingSession?.restaurantName}</strong>.
                            You can only host one active session at a time.
                        </p>
                        <div className="modal-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setHostLimitModal({ show: false, existingSession: null })}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={() => handleJoinSession(hostLimitModal.existingSession?.id)}
                            >
                                Go to Active Session
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Stop Session Modal */}
            {stopSessionModal.show && (
                <div className="modal-overlay" onClick={() => setStopSessionModal({ show: false, session: null })}>
                    <div className="modal-content modal-sm modal-padded" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <CheckCircle size={24} className="modal-icon success" />
                            <h3>End Session</h3>
                        </div>
                        <div className="modal-body-content">
                            <p className="modal-body">
                                Are you sure you want to end the session for <strong>{stopSessionModal.session?.restaurantName}</strong>?
                                Participants will no longer be able to add items.
                            </p>
                        </div>
                        <div className="modal-actions">
                            <button
                                className="btn btn-outline"
                                onClick={() => handleEndSession(false)}
                            >
                                End
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={() => handleEndSession(true)}
                            >
                                <Receipt size={16} /> End & Add Expense
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Expense Modal */}
            {expenseModal.show && (
                <div className="modal-overlay" onClick={() => setExpenseModal({ show: false, session: null, cartItems: [], participants: [], selectedGroup: null })}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <Receipt size={24} className="modal-icon primary" />
                            <h3>Add as Expense</h3>
                        </div>

                        <div className="modal-body">
                            <div className="expense-summary">
                                <h4>{expenseModal.session?.restaurantName}</h4>
                                <p className="expense-total">
                                    Total: <strong>{formatINR(expenseModal.totalAmount)}</strong>
                                </p>
                            </div>

                            {/* Group Selection */}
                            <div className="form-group">
                                <label>Add to Group (optional)</label>
                                <select
                                    className="form-select"
                                    value={expenseModal.selectedGroup?.id || ''}
                                    onChange={(e) => {
                                        const group = groups.find(g => g.id === e.target.value);
                                        setExpenseModal(prev => ({ ...prev, selectedGroup: group || null }));
                                    }}
                                >
                                    <option value="">No Group</option>
                                    {groups.map(group => (
                                        <option key={group.id} value={group.id}>{group.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Cart Summary */}
                            <div className="cart-summary">
                                <h5>Order Summary</h5>
                                <div className="cart-items-summary">
                                    {(() => {
                                        // Aggregate items
                                        const itemMap = new Map();
                                        expenseModal.cartItems.forEach(item => {
                                            if (itemMap.has(item.menuItemName)) {
                                                const existing = itemMap.get(item.menuItemName);
                                                existing.quantity += item.quantity;
                                                existing.total += item.price * item.quantity;
                                            } else {
                                                itemMap.set(item.menuItemName, {
                                                    name: item.menuItemName,
                                                    price: item.price,
                                                    quantity: item.quantity,
                                                    total: item.price * item.quantity
                                                });
                                            }
                                        });
                                        return Array.from(itemMap.values()).map((item, idx) => (
                                            <div key={idx} className="cart-summary-item">
                                                <span className="item-name">{item.name}</span>
                                                <span className="item-qty">x{item.quantity}</span>
                                                <span className="item-total">{formatINR(item.total)}</span>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>

                            {/* Participants */}
                            <div className="participants-list">
                                <h5>Split Between ({expenseModal.participants.length} people)</h5>
                                <div className="participant-chips">
                                    {expenseModal.participants.map(p => (
                                        <span key={p.id} className="participant-chip">
                                            {p.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setExpenseModal({ show: false, session: null, cartItems: [], participants: [], selectedGroup: null })}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={saveSessionAsExpense}
                                disabled={expenseModal.participants.length === 0}
                            >
                                <Receipt size={16} /> Save Expense
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Restaurant Modal */}
            {editModal.show && (
                <div className="modal-overlay" onClick={() => setEditModal({ show: false, restaurant: null, editedItems: [] })}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <Edit3 size={24} className="modal-icon primary" />
                            <h3>Edit Restaurant</h3>
                        </div>

                        <div className="edit-menu-body">
                            <div className="form-group">
                                <label>Restaurant Name</label>
                                <input
                                    type="text"
                                    value={editModal.restaurant?.name || ''}
                                    onChange={(e) => setEditModal(prev => ({
                                        ...prev,
                                        restaurant: { ...prev.restaurant, name: e.target.value }
                                    }))}
                                    placeholder="Restaurant name"
                                    className="form-input"
                                />
                            </div>
                            <div className="edit-modal-search">
                                <Search size={18} className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Filter items by name..."
                                    value={editModalSearch}
                                    onChange={(e) => setEditModalSearch(e.target.value)}
                                    className="search-input"
                                />
                            </div>
                            <div className="menu-items-edit-list">
                                {editModal.editedItems
                                    .map((item, originalIndex) => ({ item, originalIndex }))
                                    .filter(({ item }) =>
                                        item.name?.toLowerCase().includes(editModalSearch.toLowerCase())
                                    )
                                    .map(({ item, originalIndex }, displayIndex) => (
                                    <div key={originalIndex} className="menu-item-edit-row">
                                        <div className="item-number">{displayIndex + 1}</div>
                                        <div className="item-fields">
                                            <input
                                                type="text"
                                                value={item.name}
                                                onChange={(e) => updateMenuItemInEdit(originalIndex, 'name', e.target.value)}
                                                placeholder="Dish name"
                                                className="item-name-input"
                                            />
                                            <div className="item-row-bottom">
                                                <select
                                                    value={item.category || 'UNKNOWN'}
                                                    onChange={(e) => updateMenuItemInEdit(originalIndex, 'category', e.target.value)}
                                                    className="item-category-select"
                                                >
                                                    <option value="VEG">VEG</option>
                                                    <option value="NON_VEG">NON_VEG</option>
                                                    <option value="UNKNOWN">UNKNOWN</option>
                                                </select>
                                                <input
                                                    type="number"
                                                    value={item.price || ''}
                                                    onChange={(e) => updateMenuItemInEdit(originalIndex, 'price', e.target.value)}
                                                    placeholder="Price (₹)"
                                                    className="item-price-input"
                                                    min="0"
                                                    step="0.01"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            className="btn btn-icon btn-remove-item"
                                            onClick={() => removeMenuItemInEdit(originalIndex)}
                                            title="Remove item"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button className="btn btn-add-item" onClick={addMenuItemInEdit}>
                                <Plus size={18} /> Add Menu Item
                            </button>
                        </div>

                        <div className="modal-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setEditModal({ show: false, restaurant: null, editedItems: [] })}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSaveRestaurantEdit}
                            >
                                <CheckCircle size={16} /> Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
