import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ChevronLeft, Share2, Users, ShoppingCart, Plus, Minus,
    Leaf, Utensils, Copy, Check, Trash2, Clock, ChefHat, UserPlus, X, Search
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { formatINR } from '../utils/currency';
import { getAvatarColor, getInitials } from '../utils/helpers';
import {
    getOrderingSession, joinOrderingSession, subscribeToSession,
    subscribeToCartItems, subscribeToRestaurant, getRestaurant,
    saveCartItem, updateCartItem, removeCartItem, getUsersByIds,
    updateOrderingSession
} from '../data/firestore';
import { createCartItem } from '../data/models';
import ShareOptions from '../components/ShareOptions';

export default function RestaurantSession() {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const { user, userProfile } = useAuth();
    const { friends } = useApp();

    // State
    const [session, setSession] = useState(null);
    const [restaurant, setRestaurant] = useState(null);
    const [cartItems, setCartItems] = useState([]);
    const [participantProfiles, setParticipantProfiles] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('menu'); // 'menu' | 'mycart' | 'groupcart'
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [shareCopied, setShareCopied] = useState(false);
    const [showShareOptions, setShowShareOptions] = useState(false);

    // Add friends modal
    const [showAddFriendsModal, setShowAddFriendsModal] = useState(false);
    const [selectedFriendsToAdd, setSelectedFriendsToAdd] = useState([]);
    const [addFriendSearch, setAddFriendSearch] = useState('');
    const [addingFriends, setAddingFriends] = useState(false);

    // Participant details modal
    const [showParticipantModal, setShowParticipantModal] = useState(false);

    const currentUser = {
        id: userProfile?.id || user?.uid,
        name: userProfile?.name || user?.displayName || 'You',
    };

    // Load session and join if needed
    useEffect(() => {
        let isMounted = true;

        async function init() {
            try {
                // First try to join the session (needed for friends accessing via shared link)
                // This will succeed if the session exists, even if user is not yet a participant
                try {
                    await joinOrderingSession(sessionId, currentUser.id);
                } catch (joinErr) {
                    // If join fails because session doesn't exist, we'll catch it below
                    // when trying to get the session
                }

                // Now get session data (user should now be a participant)
                const sessionData = await getOrderingSession(sessionId);
                if (!sessionData) {
                    if (isMounted) setError('Session not found');
                    return;
                }

                if (isMounted) setSession(sessionData);

                // Load participant profiles for avatar display
                if (sessionData.participants?.length > 0) {
                    try {
                        const profiles = await getUsersByIds(sessionData.participants);
                        const profileMap = profiles.reduce((acc, profile) => {
                            acc[profile.id] = profile;
                            return acc;
                        }, {});
                        if (isMounted) setParticipantProfiles(profileMap);
                    } catch (profileErr) {
                        console.error('Error loading participant profiles:', profileErr);
                    }
                }

                // Load restaurant
                const restaurantData = await getRestaurant(sessionData.restaurantId);
                if (isMounted) {
                    setRestaurant(restaurantData);
                    setLoading(false);
                }
            } catch (err) {
                console.error('Error loading session:', err);
                if (isMounted) {
                    setError('Failed to load session');
                    setLoading(false);
                }
            }
        }

        init();

        return () => {
            isMounted = false;
        };
    }, [sessionId, currentUser.id]);

    // Subscribe to real-time updates
    useEffect(() => {
        if (!sessionId || !session) return;

        const unsubSession = subscribeToSession(sessionId, (updatedSession) => {
            setSession(updatedSession);
        });

        const unsubCart = subscribeToCartItems(sessionId, (items) => {
            setCartItems(items);
        });

        const unsubRestaurant = subscribeToRestaurant(session.restaurantId, (updated) => {
            setRestaurant(updated);
        });

        return () => {
            unsubSession();
            unsubCart();
            unsubRestaurant();
        };
    }, [sessionId, session?.restaurantId]);

    // Derived state
    const myCart = useMemo(() =>
        cartItems.filter(item => item.userId === currentUser.id),
        [cartItems, currentUser.id]
    );

    const groupCart = useMemo(() => {
        const grouped = {};
        cartItems.forEach(item => {
            const key = item.menuItemId;
            if (!grouped[key]) {
                grouped[key] = {
                    menuItemId: item.menuItemId,
                    menuItemName: item.menuItemName,
                    price: item.price,
                    totalQuantity: 0,
                    userBreakdown: [],
                };
            }
            grouped[key].totalQuantity += item.quantity;
            grouped[key].userBreakdown.push({
                userId: item.userId,
                userName: item.userName,
                quantity: item.quantity,
                specialInstructions: item.specialInstructions,
            });
        });
        return Object.values(grouped);
    }, [cartItems]);

    const categories = useMemo(() => {
        if (!restaurant?.menuItems) return ['All'];
        const cats = [...new Set(restaurant.menuItems.map(item => item.category || 'Other'))];
        return ['All', ...cats.sort()];
    }, [restaurant]);

    const filteredMenuItems = useMemo(() => {
        if (!restaurant?.menuItems) return [];
        if (selectedCategory === 'All') return restaurant.menuItems;
        return restaurant.menuItems.filter(item => (item.category || 'Other') === selectedCategory);
    }, [restaurant, selectedCategory]);

    const myCartTotal = useMemo(() =>
        myCart.reduce((sum, item) => sum + item.price * item.quantity, 0),
        [myCart]
    );

    const groupCartTotal = useMemo(() =>
        cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
        [cartItems]
    );

    // Actions
    const addToCart = async (menuItem) => {
        try {
            const existingItem = myCart.find(item => item.menuItemId === menuItem.id);
            if (existingItem) {
                await updateCartItem(existingItem.id, {
                    quantity: existingItem.quantity + 1,
                });
            } else {
                const cartItem = createCartItem({
                    sessionId,
                    userId: currentUser.id,
                    userName: currentUser.name,
                    menuItemId: menuItem.id,
                    menuItemName: menuItem.name,
                    price: menuItem.price,
                    quantity: 1,
                });
                await saveCartItem(cartItem);
            }
        } catch (err) {
            console.error('Error adding to cart:', err);
        }
    };

    const updateQuantity = async (cartItemId, delta) => {
        try {
            const item = cartItems.find(c => c.id === cartItemId);
            if (!item) return;

            const newQuantity = item.quantity + delta;
            if (newQuantity <= 0) {
                await removeCartItem(cartItemId);
            } else {
                await updateCartItem(cartItemId, { quantity: newQuantity });
            }
        } catch (err) {
            console.error('Error updating quantity:', err);
        }
    };

    const getItemQuantityInMyCart = (menuItemId) => {
        const item = myCart.find(c => c.menuItemId === menuItemId);
        return item ? item.quantity : 0;
    };

    const shareSession = () => {
        setShowShareOptions(true);
    };

    const copySessionLink = async () => {
        const shareUrl = `${window.location.origin}/order/${sessionId}`;
        try {
            await navigator.clipboard.writeText(shareUrl);
            setShareCopied(true);
            setTimeout(() => setShareCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    // Check if current user is the host
    const isHost = session?.createdBy === currentUser.id;

    // Get friends not already in the session
    const availableFriends = useMemo(() => {
        if (!friends || !session) return [];
        const participantIds = new Set(session.participants || []);
        return friends.filter(f => !participantIds.has(f.id));
    }, [friends, session]);

    const filteredAvailableFriends = useMemo(() => {
        if (!addFriendSearch.trim()) return availableFriends;
        return availableFriends.filter(f =>
            f.name.toLowerCase().includes(addFriendSearch.toLowerCase())
        );
    }, [availableFriends, addFriendSearch]);

    const toggleFriendToAdd = (friendId) => {
        setSelectedFriendsToAdd(prev => {
            const isSelected = prev.includes(friendId);
            return isSelected
                ? prev.filter(id => id !== friendId)
                : [...prev, friendId];
        });
    };

    const handleAddFriendsToSession = async () => {
        if (selectedFriendsToAdd.length === 0) return;

        setAddingFriends(true);
        try {
            const updatedParticipants = [...(session.participants || []), ...selectedFriendsToAdd];
            await updateOrderingSession(sessionId, { participants: updatedParticipants });
            setShowAddFriendsModal(false);
            setSelectedFriendsToAdd([]);
            setAddFriendSearch('');
        } catch (err) {
            console.error('Error adding friends:', err);
        } finally {
            setAddingFriends(false);
        }
    };

    // Loading state
    if (loading) {
        return (
            <div className="page-content restaurant-session">
                <div className="session-loading">
                    <div className="spinner"></div>
                    <p>Loading session...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="page-content restaurant-session">
                <div className="session-error">
                    <p>{error}</p>
                    <button className="btn btn-primary" onClick={() => navigate(-1)}>
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="page-content restaurant-session">
            {/* Header */}
            <div className="session-header">
                <button className="back-btn" onClick={() => navigate(-1)}>
                    <ChevronLeft size={24} />
                </button>
                <div className="session-header-info">
                    <h1 className="session-restaurant-name">
                        {restaurant?.name || 'Restaurant'}
                    </h1>
                    <div className="session-meta">
                        <span className="session-cuisine">{restaurant?.cuisine}</span>
                        <span className="session-dot">•</span>
                        <span className="session-status active">Active</span>
                    </div>
                </div>
                <button className="btn btn-icon share-btn" onClick={shareSession}>
                    <Share2 size={20} />
                </button>
            </div>

            {/* Participants */}
            <div className="session-participants-bar">
                <Users size={18} />
                <div className="participant-avatars">
                    {session?.participants?.slice(0, 5).map((participantId, idx) => {
                        // Look up profile from loaded profiles, friends list, or fallback
                        const profile = participantProfiles[participantId];
                        const friendProfile = friends.find(f => f.id === participantId);
                        const userName = profile?.name || friendProfile?.name;

                        const displayName = participantId === currentUser.id
                            ? 'You'
                            : (userName || participantId.slice(0, 2).toUpperCase());
                        return (
                            <div
                                key={participantId}
                                className="participant-avatar"
                                onClick={() => setShowParticipantModal(participantId)}
                                style={{
                                    backgroundColor: getAvatarColor(participantId),
                                    zIndex: 5 - idx,
                                    cursor: 'pointer',
                                }}
                                title={`${userName || (participantId === currentUser.id ? 'You' : participantId)} - Click to see their items`}
                            >
                                {displayName.length > 3 ? getInitials(displayName) : displayName}
                            </div>
                        );
                    })}
                    {session?.participants?.length > 5 && (
                        <div
                            className="participant-avatar more"
                            onClick={() => setShowParticipantModal('all')}
                            style={{ cursor: 'pointer' }}
                            title="Click to see all participants"
                        >
                            +{session.participants.length - 5}
                        </div>
                    )}
                    {/* Add Friend Button - Only for host */}
                    {isHost && availableFriends.length > 0 && (
                        <button
                            className="participant-avatar add-friend-btn"
                            onClick={() => setShowAddFriendsModal(true)}
                            title="Add friends to session"
                            style={{
                                backgroundColor: 'var(--primary-bg)',
                                border: '2px dashed var(--primary)',
                                color: 'var(--primary)',
                                cursor: 'pointer',
                                zIndex: 0,
                            }}
                        >
                            <UserPlus size={14} />
                        </button>
                    )}
                </div>
                <span className="participant-count">
                    {session?.participants?.length || 1} ordering
                </span>
            </div>

            {/* Tab Navigation */}
            <div className="session-tabs">
                <button
                    className={`session-tab ${activeTab === 'menu' ? 'active' : ''}`}
                    onClick={() => setActiveTab('menu')}
                >
                    <Utensils size={18} />
                    Menu
                </button>
                <button
                    className={`session-tab ${activeTab === 'mycart' ? 'active' : ''}`}
                    onClick={() => setActiveTab('mycart')}
                >
                    <ShoppingCart size={18} />
                    My Cart
                    {myCart.length > 0 && (
                        <span className="tab-badge">{myCart.length}</span>
                    )}
                </button>
                <button
                    className={`session-tab ${activeTab === 'groupcart' ? 'active' : ''}`}
                    onClick={() => setActiveTab('groupcart')}
                >
                    <Users size={18} />
                    Group Cart
                    {groupCart.length > 0 && (
                        <span className="tab-badge">{groupCart.length}</span>
                    )}
                </button>
            </div>

            {/* Content */}
            <div className="session-content">
                {activeTab === 'menu' && (
                    <div className="menu-tab">
                        {/* Category Filter */}
                        <div className="category-filter">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    className={`category-chip ${selectedCategory === cat ? 'active' : ''}`}
                                    onClick={() => setSelectedCategory(cat)}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Menu Items */}
                        <div className="menu-items">
                            {filteredMenuItems.map(item => {
                                const quantityInCart = getItemQuantityInMyCart(item.id);
                                return (
                                    <div key={item.id} className="menu-item-card">
                                        <div className="menu-item-info">
                                            <div className="menu-item-header">
                                                {item.category && (
                                                    <span className={`veg-indicator ${item.category.toLowerCase()}`}>
                                                        <Leaf size={12} fill={item.category === 'VEG' ? '#2E7D32' : item.category === 'NON_VEG' ? '#C62828' : '#757575'} />
                                                    </span>
                                                )}
                                                <h3 className="menu-item-name">{item.name}</h3>
                                            </div>
                                            {item.description && (
                                                <p className="menu-item-desc">{item.description}</p>
                                            )}
                                            <span className="menu-item-category">{item.category || 'Other'}</span>
                                        </div>
                                        <div className="menu-item-actions">
                                            <span className="menu-item-price">{formatINR(item.price)}</span>
                                            {quantityInCart > 0 ? (
                                                <div className="quantity-control">
                                                    <button
                                                        className="qty-btn"
                                                        onClick={() => {
                                                            const cartItem = myCart.find(c => c.menuItemId === item.id);
                                                            if (cartItem) updateQuantity(cartItem.id, -1);
                                                        }}
                                                    >
                                                        <Minus size={16} />
                                                    </button>
                                                    <span className="qty-value">{quantityInCart}</span>
                                                    <button className="qty-btn" onClick={() => addToCart(item)}>
                                                        <Plus size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button className="btn-add-item" onClick={() => addToCart(item)}>
                                                    <Plus size={16} /> Add
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* My Cart Floating Summary */}
                        {myCart.length > 0 && activeTab === 'menu' && (
                            <div className="cart-floating-summary" onClick={() => setActiveTab('mycart')}>
                                <div className="cart-summary-left">
                                    <ShoppingCart size={20} />
                                    <span>{myCart.reduce((s, i) => s + i.quantity, 0)} items</span>
                                </div>
                                <div className="cart-summary-right">
                                    <span className="cart-total">{formatINR(myCartTotal)}</span>
                                    <span className="cart-view">View Cart →</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'mycart' && (
                    <div className="mycart-tab">
                        {myCart.length === 0 ? (
                            <div className="empty-cart">
                                <ShoppingCart size={48} className="empty-icon" />
                                <h3>Your cart is empty</h3>
                                <p>Add items from the menu to get started</p>
                                <button className="btn btn-primary" onClick={() => setActiveTab('menu')}>
                                    Browse Menu
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="cart-items-list">
                                    {myCart.map(item => (
                                        <div key={item.id} className="cart-item-card">
                                            <div className="cart-item-info">
                                                <h4 className="cart-item-name">{item.menuItemName}</h4>
                                                <span className="cart-item-price">{formatINR(item.price)} each</span>
                                            </div>
                                            <div className="cart-item-actions">
                                                <div className="quantity-control">
                                                    <button className="qty-btn" onClick={() => updateQuantity(item.id, -1)}>
                                                        <Minus size={16} />
                                                    </button>
                                                    <span className="qty-value">{item.quantity}</span>
                                                    <button className="qty-btn" onClick={() => updateQuantity(item.id, 1)}>
                                                        <Plus size={16} />
                                                    </button>
                                                </div>
                                                <span className="cart-item-total">
                                                    {formatINR(item.price * item.quantity)}
                                                </span>
                                                <button
                                                    className="btn-remove"
                                                    onClick={() => removeCartItem(item.id)}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="cart-summary-card">
                                    <div className="summary-row">
                                        <span>Subtotal</span>
                                        <span>{formatINR(myCartTotal)}</span>
                                    </div>
                                    <div className="summary-row total">
                                        <span>Your Total</span>
                                        <span>{formatINR(myCartTotal)}</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'groupcart' && (
                    <div className="groupcart-tab">
                        {groupCart.length === 0 ? (
                            <div className="empty-cart">
                                <Users size={48} className="empty-icon" />
                                <h3>Group cart is empty</h3>
                                <p>Waiting for participants to add items</p>
                            </div>
                        ) : (
                            <>
                                <div className="groupcart-stats">
                                    <div className="stat-item">
                                        <span className="stat-value">{groupCart.length}</span>
                                        <span className="stat-label">Items</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-value">{session?.participants?.length || 1}</span>
                                        <span className="stat-label">Participants</span>
                                    </div>
                                    <div className="stat-item highlight">
                                        <span className="stat-value">{formatINR(groupCartTotal)}</span>
                                        <span className="stat-label">Total</span>
                                    </div>
                                </div>

                                <div className="groupcart-items-list">
                                    {groupCart.map(item => (
                                        <div key={item.menuItemId} className="groupcart-item-card">
                                            <div className="groupcart-item-header">
                                                <div>
                                                    <h4 className="groupcart-item-name">{item.menuItemName}</h4>
                                                    <span className="groupcart-item-price">{formatINR(item.price)} each</span>
                                                </div>
                                                <div className="groupcart-item-total">
                                                    <span className="total-qty">× {item.totalQuantity}</span>
                                                    <span className="total-price">{formatINR(item.price * item.totalQuantity)}</span>
                                                </div>
                                            </div>
                                            <div className="groupcart-breakdown">
                                                {item.userBreakdown.map((breakdown, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`breakdown-row ${breakdown.userId === currentUser.id ? 'current-user' : ''}`}
                                                    >
                                                        <div className="breakdown-user">
                                                            <div
                                                                className="breakdown-avatar"
                                                                style={{ backgroundColor: getAvatarColor(breakdown.userId) }}
                                                            >
                                                                {breakdown.userId === currentUser.id
                                                                    ? 'You'
                                                                    : (breakdown.userName
                                                                        ? getInitials(breakdown.userName)
                                                                        : breakdown.userId.slice(0, 2).toUpperCase())}
                                                            </div>
                                                            <span className="breakdown-username">
                                                                {breakdown.userId === currentUser.id ? 'You' : (breakdown.userName || breakdown.userId.slice(0, 8))}
                                                            </span>
                                                        </div>
                                                        <span className="breakdown-qty">{breakdown.quantity}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="groupcart-summary">
                                    <div className="summary-row total">
                                        <span>Group Grand Total</span>
                                        <span>{formatINR(groupCartTotal)}</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Share Modal (inline) */}
            {shareCopied && (
                <div className="share-toast">
                    <Check size={18} />
                    Link copied to clipboard!
                </div>
            )}

            {/* Share Options Modal */}
            {showShareOptions && (
                <ShareOptions
                    link={`${window.location.origin}/order/${sessionId}`}
                    title="Join my group order on Sangam"
                    message={`Join my group order at ${restaurant?.name || 'the restaurant'} on Sangam! Let's order together and split the bill easily.`}
                    onClose={() => setShowShareOptions(false)}
                />
            )}

            {/* Add Friends Modal */}
            {showAddFriendsModal && (
                <div className="modal-overlay" onClick={() => setShowAddFriendsModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <Users size={24} className="modal-icon primary" />
                            <h3 className="modal-title">Add Friends</h3>
                            <button className="modal-close" onClick={() => setShowAddFriendsModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="modal-body">
                            <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
                                Select friends to add to this ordering session.
                            </p>

                            {/* Search */}
                            <div className="search-bar" style={{ marginBottom: 16 }}>
                                <Search size={18} className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search friends..."
                                    value={addFriendSearch}
                                    onChange={(e) => setAddFriendSearch(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px 12px 44px',
                                        border: '1.5px solid var(--border)',
                                        borderRadius: 'var(--radius-md)',
                                        background: 'var(--bg-secondary)',
                                        color: 'var(--text-primary)',
                                        fontSize: '0.95rem',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            {/* Selected count */}
                            {selectedFriendsToAdd.length > 0 && (
                                <div style={{ marginBottom: 12 }}>
                                    <span className="badge badge-positive">
                                        {selectedFriendsToAdd.length} selected
                                    </span>
                                </div>
                            )}

                            {/* Friends list */}
                            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                                {filteredAvailableFriends.length === 0 ? (
                                    <div className="empty-state" style={{ padding: '32px 0' }}>
                                        <p style={{ color: 'var(--text-secondary)' }}>
                                            {addFriendSearch ? 'No friends match your search' : 'All friends are already in this session'}
                                        </p>
                                    </div>
                                ) : (
                                    filteredAvailableFriends.map(friend => {
                                        const isSelected = selectedFriendsToAdd.includes(friend.id);
                                        return (
                                            <div
                                                key={friend.id}
                                                onClick={() => toggleFriendToAdd(friend.id)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 12,
                                                    padding: 12,
                                                    borderRadius: 12,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    background: isSelected ? 'var(--primary-bg)' : 'transparent',
                                                    border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                                                    marginBottom: 8,
                                                }}
                                            >
                                                <div
                                                    className="avatar"
                                                    style={{
                                                        backgroundColor: getAvatarColor(friend.id),
                                                        width: 40,
                                                        height: 40,
                                                        borderRadius: '50%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: 'white',
                                                        fontWeight: 600,
                                                        fontSize: '0.85rem',
                                                    }}
                                                >
                                                    {getInitials(friend.name)}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{friend.name}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{friend.email}</div>
                                                </div>
                                                <div
                                                    style={{
                                                        width: 24,
                                                        height: 24,
                                                        borderRadius: '50%',
                                                        border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                                                        background: isSelected ? 'var(--primary)' : 'transparent',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    }}
                                                >
                                                    {isSelected && <Check size={16} color="white" />}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowAddFriendsModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleAddFriendsToSession}
                                disabled={selectedFriendsToAdd.length === 0 || addingFriends}
                            >
                                {addingFriends ? 'Adding...' : (
                                    <><UserPlus size={16} /> Add {selectedFriendsToAdd.length > 0 && `(${selectedFriendsToAdd.length})`}</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Participant Items Modal */}
            {showParticipantModal && (
                <div className="modal-overlay" onClick={() => setShowParticipantModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                {showParticipantModal === 'all'
                                    ? 'All Participants'
                                    : `${(() => {
                                        const profile = participantProfiles[showParticipantModal];
                                        const friendProfile = friends.find(f => f.id === showParticipantModal);
                                        return profile?.name || friendProfile?.name || (showParticipantModal === currentUser.id ? 'You' : showParticipantModal.slice(0, 8));
                                    })()}'s Order`}
                            </h3>
                            <button className="modal-close" onClick={() => setShowParticipantModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="modal-body">
                            {showParticipantModal === 'all' ? (
                                // Show all participants and their items
                                <div className="participant-list">
                                    {session?.participants?.map(participantId => {
                                        const profile = participantProfiles[participantId];
                                        const friendProfile = friends.find(f => f.id === participantId);
                                        const userName = profile?.name || friendProfile?.name;
                                        const displayName = participantId === currentUser.id ? 'You' : (userName || participantId.slice(0, 8));
                                        const userItems = cartItems.filter(item => item.userId === participantId);

                                        if (userItems.length === 0) return null;

                                        return (
                                            <div key={participantId} className="participant-order-section" style={{ marginBottom: 24 }}>
                                                <div className="participant-header" style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 12,
                                                    marginBottom: 12,
                                                    paddingBottom: 8,
                                                    borderBottom: '1px solid var(--border)'
                                                }}>
                                                    <div
                                                        className="avatar"
                                                        style={{
                                                            backgroundColor: getAvatarColor(participantId),
                                                            width: 36,
                                                            height: 36,
                                                            borderRadius: '50%',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: 'white',
                                                            fontWeight: 600,
                                                            fontSize: '0.85rem',
                                                        }}
                                                    >
                                                        {displayName.length > 3 ? getInitials(displayName) : displayName}
                                                    </div>
                                                    <span style={{ fontWeight: 600 }}>{displayName}</span>
                                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                                        ({userItems.reduce((sum, item) => sum + item.quantity, 0)} items)
                                                    </span>
                                                </div>
                                                <div className="participant-items">
                                                    {userItems.map(item => (
                                                        <div key={item.id} className="participant-item" style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            padding: '8px 0',
                                                            borderBottom: '1px solid var(--divider)'
                                                        }}>
                                                            <div>
                                                                <div style={{ fontWeight: 500 }}>{item.menuItemName}</div>
                                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                                    {formatINR(item.price)} × {item.quantity}
                                                                </div>
                                                            </div>
                                                            <div style={{ fontWeight: 600 }}>
                                                                {formatINR(item.price * item.quantity)}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                // Show specific participant's items
                                (() => {
                                    const participantId = showParticipantModal;
                                    const profile = participantProfiles[participantId];
                                    const friendProfile = friends.find(f => f.id === participantId);
                                    const userName = profile?.name || friendProfile?.name;
                                    const displayName = participantId === currentUser.id ? 'You' : (userName || participantId.slice(0, 8));
                                    const userItems = cartItems.filter(item => item.userId === participantId);

                                    if (userItems.length === 0) {
                                        return (
                                            <div className="empty-state" style={{ padding: '32px 0' }}>
                                                <ShoppingCart size={48} style={{ color: 'var(--text-tertiary)', marginBottom: 16 }} />
                                                <p style={{ color: 'var(--text-secondary)' }}>
                                                    {displayName} hasn't added any items yet
                                                </p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="participant-items">
                                            {userItems.map(item => (
                                                <div key={item.id} className="participant-item" style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    padding: '12px 0',
                                                    borderBottom: '1px solid var(--divider)'
                                                }}>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{item.menuItemName}</div>
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                            {formatINR(item.price)} each
                                                        </div>
                                                        {item.specialInstructions && (
                                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: 4, fontStyle: 'italic' }}>
                                                                Note: {item.specialInstructions}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontWeight: 700, color: 'var(--primary)' }}>
                                                            {formatINR(item.price * item.quantity)}
                                                        </div>
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                            × {item.quantity}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                padding: '16px 0',
                                                marginTop: 8,
                                                borderTop: '2px solid var(--border)',
                                                fontWeight: 700,
                                                fontSize: '1.1rem'
                                            }}>
                                                <span>Total</span>
                                                <span>{formatINR(userItems.reduce((sum, item) => sum + item.price * item.quantity, 0))}</span>
                                            </div>
                                        </div>
                                    );
                                })()
                            )}
                        </div>

                        <div className="modal-footer">
                            <button
                                className="btn btn-primary btn-full"
                                onClick={() => setShowParticipantModal(false)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
