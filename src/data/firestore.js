import {
    collection, doc, getDocs, setDoc, updateDoc, deleteDoc,
    query, where, onSnapshot, writeBatch, getDoc
} from 'firebase/firestore';
import { db } from './firebase';

// Collection references
const usersCol = () => collection(db, 'users');
const groupsCol = () => collection(db, 'groups');
const expensesCol = () => collection(db, 'expenses');
const settlementsCol = () => collection(db, 'settlements');
const activitiesCol = () => collection(db, 'activities');
const invitationsCol = () => collection(db, 'invitations');
const inviteTokensCol = () => collection(db, 'inviteTokens');

// ===== USER =====
export async function createUserProfile(uid, data, retryCount = 0) {
    try {
        await setDoc(doc(db, 'users', uid), {
            ...data,
            uid,
            createdAt: new Date().toISOString(),
        });
    } catch (err) {
        // Retry up to 3 times with delay to allow auth token to propagate
        if (retryCount < 3 && err.code === 'permission-denied') {
            console.log(`Profile creation failed, retrying... (${retryCount + 1}/3)`);
            await new Promise(resolve => setTimeout(resolve, 500 * (retryCount + 1)));
            return createUserProfile(uid, data, retryCount + 1);
        }
        throw err;
    }
}

export async function getUserProfile(uid) {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateUserProfile(uid, data) {
    await updateDoc(doc(db, 'users', uid), data);
}

export async function getUsersByIds(uids) {
    if (!uids || uids.length === 0) return [];
    const users = [];
    // Firestore 'in' query supports up to 30 values
    for (let i = 0; i < uids.length; i += 30) {
        const batch = uids.slice(i, i + 30);
        const q = query(usersCol(), where('__name__', 'in', batch));
        const snap = await getDocs(q);
        users.push(...snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }
    return users;
}

export async function getUserByEmail(email) {
    const q = query(usersCol(), where('email', '==', email));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() };
}

// ===== FRIENDS =====
// Friends are stored as a subcollection: users/{uid}/friends/{friendId}
export async function addFriendLink(uid, friendId) {
    // Create friend link in the user's friends subcollection
    const path = `users/${uid}/friends/${friendId}`;
    console.log(`Writing to path: ${path}`);
    try {
        await setDoc(doc(db, 'users', uid, 'friends', friendId), { addedAt: new Date().toISOString() });
        console.log(`Success: ${path}`);
    } catch (err) {
        console.error(`Failed writing to ${path}:`, err.code, err.message);
        throw err;
    }
}

export async function getFriendIds(uid) {
    const snap = await getDocs(collection(db, 'users', uid, 'friends'));
    return snap.docs.map(d => d.id);
}

// ===== GROUPS =====
export async function saveGroup(group) {
    await setDoc(doc(db, 'groups', group.id), group);
}

export async function getGroup(groupId) {
    const snap = await getDoc(doc(db, 'groups', groupId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateGroup(groupId, data) {
    await updateDoc(doc(db, 'groups', groupId), data);
}

export async function removeGroup(groupId) {
    await deleteDoc(doc(db, 'groups', groupId));
}

// ===== EXPENSES =====
export async function saveExpense(expense) {
    await setDoc(doc(db, 'expenses', expense.id), expense);
}

export async function updateExpense(expenseId, data) {
    await updateDoc(doc(db, 'expenses', expenseId), data);
}

export async function removeExpense(expenseId) {
    await deleteDoc(doc(db, 'expenses', expenseId));
}

export async function removeExpensesByGroup(groupId) {
    const q = query(expensesCol(), where('groupId', '==', groupId));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
}

// ===== SETTLEMENTS =====
export async function saveSettlement(settlement) {
    await setDoc(doc(db, 'settlements', settlement.id), settlement);
}

export async function removeSettlementsByGroup(groupId) {
    const q = query(settlementsCol(), where('groupId', '==', groupId));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
}

// ===== ACTIVITIES =====
export async function saveActivity(activity) {
    await setDoc(doc(db, 'activities', activity.id), activity);
}

// ===== REAL-TIME LISTENERS =====
/**
 * Subscribe to all data relevant to a user.
 * Returns an unsubscribe function.
 */
export function subscribeToUserData(uid, onData) {
    const unsubs = [];

    let currentData = {
        friends: [],
        groups: [],
        expenses: [],
        settlements: [],
        activities: [],
    };

    function emit() {
        onData({ ...currentData });
    }

    // Listen to friends subcollection for real-time updates
    const friendsSubCol = collection(db, 'users', uid, 'friends');
    unsubs.push(onSnapshot(friendsSubCol, async (friendsSnap) => {
        const friendIds = friendsSnap.docs.map(d => d.id);

        // Fetch friend profiles
        if (friendIds.length > 0) {
            const batches = [];
            for (let i = 0; i < friendIds.length; i += 30) {
                batches.push(friendIds.slice(i, i + 30));
            }
            const friendProfiles = [];
            for (const batch of batches) {
                const q = query(usersCol(), where('__name__', 'in', batch));
                const snap = await getDocs(q);
                friendProfiles.push(...snap.docs.map(d => ({ id: d.id, ...d.data() })));
            }
            currentData.friends = friendProfiles;
        } else {
            currentData.friends = [];
        }
        emit();
    }));

    // Listen to groups where user is a member
    const groupQ = query(groupsCol(), where('members', 'array-contains', uid));
    unsubs.push(onSnapshot(groupQ, snap => {
        currentData.groups = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        emit();
    }));

    // Listen to expenses where user is involved (as payer or in splits)
    // We track expenses by groups the user is in, plus non-group expenses
    const expQ = query(expensesCol(), where('involvedUsers', 'array-contains', uid));
    unsubs.push(onSnapshot(expQ, snap => {
        currentData.expenses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        emit();
    }));

    // Listen to settlements involving user
    const settleQ1 = query(settlementsCol(), where('fromUserId', '==', uid));
    const settleQ2 = query(settlementsCol(), where('toUserId', '==', uid));
    unsubs.push(onSnapshot(settleQ1, snap => {
        const fromSettles = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        currentData.settlements = [
            ...currentData.settlements.filter(s => s.fromUserId !== uid),
            ...fromSettles,
        ];
        emit();
    }));
    unsubs.push(onSnapshot(settleQ2, snap => {
        const toSettles = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        currentData.settlements = [
            ...currentData.settlements.filter(s => s.toUserId !== uid),
            ...toSettles,
        ];
        emit();
    }));

    // Listen to activities
    const actQ = query(activitiesCol(), where('involvedUsers', 'array-contains', uid));
    unsubs.push(onSnapshot(actQ, snap => {
        currentData.activities = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        emit();
    }));

    return () => unsubs.forEach(fn => fn());
}

// ===== SEED DATA =====
export async function seedDataForUser(uid, userName, userEmail) {
    const batch = writeBatch(db);

    // Create demo friends as actual user docs
    const demoFriends = [
        { id: `demo-priya-${uid.slice(0, 6)}`, name: 'Priya Patel', email: 'priya@demo.com' },
        { id: `demo-rahul-${uid.slice(0, 6)}`, name: 'Rahul Verma', email: 'rahul@demo.com' },
        { id: `demo-neha-${uid.slice(0, 6)}`, name: 'Neha Gupta', email: 'neha@demo.com' },
        { id: `demo-vikram-${uid.slice(0, 6)}`, name: 'Vikram Singh', email: 'vikram@demo.com' },
        { id: `demo-ananya-${uid.slice(0, 6)}`, name: 'Ananya Reddy', email: 'ananya@demo.com' },
        { id: `demo-karan-${uid.slice(0, 6)}`, name: 'Karan Mehta', email: 'karan@demo.com' },
    ];

    // Save demo friend profiles
    for (const f of demoFriends) {
        batch.set(doc(db, 'users', f.id), {
            uid: f.id,
            name: f.name,
            email: f.email,
            isDemo: true,
            createdAt: new Date().toISOString(),
        });
        // Friend links
        batch.set(doc(db, 'users', uid, 'friends', f.id), { addedAt: new Date().toISOString() });
    }

    const fIds = demoFriends.map(f => f.id);
    const now = Date.now();

    // Groups
    const groups = [
        {
            id: `group-goa-${uid.slice(0, 6)}`,
            name: 'Goa Trip 🏖️',
            members: [uid, fIds[0], fIds[1], fIds[2]],
            createdBy: uid,
            createdAt: new Date(now - 7 * 86400000).toISOString(),
        },
        {
            id: `group-flat-${uid.slice(0, 6)}`,
            name: 'Flat Expenses 🏠',
            members: [uid, fIds[1], fIds[3]],
            createdBy: uid,
            createdAt: new Date(now - 30 * 86400000).toISOString(),
        },
        {
            id: `group-office-${uid.slice(0, 6)}`,
            name: 'Office Lunch 🍱',
            members: [uid, fIds[0], fIds[4], fIds[5]],
            createdBy: fIds[4],
            createdAt: new Date(now - 14 * 86400000).toISOString(),
        },
    ];

    for (const g of groups) {
        batch.set(doc(db, 'groups', g.id), g);
    }

    // Expenses
    const expenses = [
        {
            id: `exp-1-${uid.slice(0, 6)}`,
            description: 'Hotel booking at Calangute',
            amount: 12000,
            paidBy: uid,
            splitType: 'equal',
            splits: [
                { userId: uid, amount: 3000 },
                { userId: fIds[0], amount: 3000 },
                { userId: fIds[1], amount: 3000 },
                { userId: fIds[2], amount: 3000 },
            ],
            groupId: groups[0].id,
            category: 'travel',
            notes: 'Beach-view room for 2 nights',
            date: new Date(now - 5 * 86400000).toISOString(),
            createdAt: new Date(now - 5 * 86400000).toISOString(),
            involvedUsers: [uid, fIds[0], fIds[1], fIds[2]],
        },
        {
            id: `exp-2-${uid.slice(0, 6)}`,
            description: "Dinner at Fisherman's Wharf",
            amount: 4800,
            paidBy: fIds[0],
            splitType: 'equal',
            splits: [
                { userId: uid, amount: 1200 },
                { userId: fIds[0], amount: 1200 },
                { userId: fIds[1], amount: 1200 },
                { userId: fIds[2], amount: 1200 },
            ],
            groupId: groups[0].id,
            category: 'food',
            notes: '',
            date: new Date(now - 4 * 86400000).toISOString(),
            createdAt: new Date(now - 4 * 86400000).toISOString(),
            involvedUsers: [uid, fIds[0], fIds[1], fIds[2]],
        },
        {
            id: `exp-3-${uid.slice(0, 6)}`,
            description: 'Scooter rental',
            amount: 1500,
            paidBy: fIds[1],
            splitType: 'equal',
            splits: [
                { userId: uid, amount: 375 },
                { userId: fIds[0], amount: 375 },
                { userId: fIds[1], amount: 375 },
                { userId: fIds[2], amount: 375 },
            ],
            groupId: groups[0].id,
            category: 'transport',
            notes: '2 scooters for 3 days',
            date: new Date(now - 5 * 86400000).toISOString(),
            createdAt: new Date(now - 5 * 86400000).toISOString(),
            involvedUsers: [uid, fIds[0], fIds[1], fIds[2]],
        },
        {
            id: `exp-4-${uid.slice(0, 6)}`,
            description: 'Water sports at Baga',
            amount: 3200,
            paidBy: uid,
            splitType: 'equal',
            splits: [
                { userId: uid, amount: 800 },
                { userId: fIds[0], amount: 800 },
                { userId: fIds[1], amount: 800 },
                { userId: fIds[2], amount: 800 },
            ],
            groupId: groups[0].id,
            category: 'entertainment',
            notes: 'Parasailing + Jet ski',
            date: new Date(now - 3 * 86400000).toISOString(),
            createdAt: new Date(now - 3 * 86400000).toISOString(),
            involvedUsers: [uid, fIds[0], fIds[1], fIds[2]],
        },
        {
            id: `exp-5-${uid.slice(0, 6)}`,
            description: 'Electricity bill - March',
            amount: 2400,
            paidBy: uid,
            splitType: 'equal',
            splits: [
                { userId: uid, amount: 800 },
                { userId: fIds[1], amount: 800 },
                { userId: fIds[3], amount: 800 },
            ],
            groupId: groups[1].id,
            category: 'bills',
            notes: '',
            date: new Date(now - 2 * 86400000).toISOString(),
            createdAt: new Date(now - 2 * 86400000).toISOString(),
            involvedUsers: [uid, fIds[1], fIds[3]],
        },
        {
            id: `exp-6-${uid.slice(0, 6)}`,
            description: 'Chai & samosa',
            amount: 320,
            paidBy: uid,
            splitType: 'equal',
            splits: [
                { userId: uid, amount: 80 },
                { userId: fIds[0], amount: 80 },
                { userId: fIds[4], amount: 80 },
                { userId: fIds[5], amount: 80 },
            ],
            groupId: groups[2].id,
            category: 'drinks',
            notes: '',
            date: new Date(now - 6 * 3600000).toISOString(),
            createdAt: new Date(now - 6 * 3600000).toISOString(),
            involvedUsers: [uid, fIds[0], fIds[4], fIds[5]],
        },
    ];

    for (const e of expenses) {
        batch.set(doc(db, 'expenses', e.id), e);
    }

    // Activities
    const activities = [
        {
            id: `act-1-${uid.slice(0, 6)}`,
            type: 'expense_added',
            description: `${userName} added "Chai & samosa" in Office Lunch`,
            userId: uid,
            groupId: groups[2].id,
            expenseId: expenses[5].id,
            amount: 320,
            timestamp: new Date(now - 6 * 3600000).toISOString(),
            involvedUsers: [uid, fIds[0], fIds[4], fIds[5]],
        },
        {
            id: `act-2-${uid.slice(0, 6)}`,
            type: 'group_created',
            description: `${userName} created "Goa Trip 🏖️"`,
            userId: uid,
            groupId: groups[0].id,
            expenseId: null,
            amount: null,
            timestamp: new Date(now - 7 * 86400000).toISOString(),
            involvedUsers: [uid, fIds[0], fIds[1], fIds[2]],
        },
    ];

    for (const a of activities) {
        batch.set(doc(db, 'activities', a.id), a);
    }

    await batch.commit();
}

// ===== INVITATIONS =====
// Store pending friend invitations by email
export async function createInvitation(fromUserId, toEmail, friendName) {
    const normalizedEmail = toEmail.toLowerCase().trim();
    await setDoc(doc(db, 'invitations', `${fromUserId}_${normalizedEmail}`), {
        fromUserId,
        toEmail: normalizedEmail,
        friendName,
        createdAt: new Date().toISOString(),
    });
}

// Get pending invitations for an email address
export async function getInvitationsForEmail(email) {
    const normalizedEmail = email.toLowerCase().trim();
    const q = query(invitationsCol(), where('toEmail', '==', normalizedEmail));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Delete an invitation after processing
export async function deleteInvitation(invitationId) {
    await deleteDoc(doc(db, 'invitations', invitationId));
}

// ===== INVITE TOKENS =====
// Create an invite token for a user
export async function createInviteToken(userId) {
    const token = `${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const tokenData = {
        userId,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        usedBy: null,
        usedAt: null,
    };
    await setDoc(doc(db, 'inviteTokens', token), tokenData);
    return token;
}

// Get invite token data
export async function getInviteToken(token) {
    const snap = await getDoc(doc(db, 'inviteTokens', token));
    return snap.exists() ? { token, ...snap.data() } : null;
}

// Mark invite token as used
export async function useInviteToken(token, usedByUserId) {
    await updateDoc(doc(db, 'inviteTokens', token), {
        usedBy: usedByUserId,
        usedAt: new Date().toISOString(),
    });
}

// ===== RESTAURANT & GROUP ORDERING =====

const restaurantsCol = () => collection(db, 'restaurants');
const orderingSessionsCol = () => collection(db, 'orderingSessions');
const cartItemsCol = () => collection(db, 'cartItems');

// === RESTAURANTS ===

export async function saveRestaurant(restaurant) {
    await setDoc(doc(db, 'restaurants', restaurant.id), restaurant);
}

export async function getRestaurant(restaurantId) {
    const snap = await getDoc(doc(db, 'restaurants', restaurantId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getUserRestaurants(userId) {
    const q = query(restaurantsCol(), where('createdBy', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateRestaurant(restaurantId, data) {
    await updateDoc(doc(db, 'restaurants', restaurantId), data);
}

export async function removeRestaurant(restaurantId) {
    // Delete all menu items and ordering sessions first
    const sessionsQuery = query(orderingSessionsCol(), where('restaurantId', '==', restaurantId));
    const sessionsSnap = await getDocs(sessionsQuery);

    const batch = writeBatch(db);
    for (const sessionDoc of sessionsSnap.docs) {
        const cartQuery = query(cartItemsCol(), where('sessionId', '==', sessionDoc.id));
        const cartSnap = await getDocs(cartQuery);
        cartSnap.docs.forEach(d => batch.delete(d.ref));
        batch.delete(sessionDoc.ref);
    }
    batch.delete(doc(db, 'restaurants', restaurantId));
    await batch.commit();
}

// === ORDERING SESSIONS ===

export async function saveOrderingSession(session) {
    await setDoc(doc(db, 'orderingSessions', session.id), session);
}

export async function getOrderingSession(sessionId) {
    try {
        const snap = await getDoc(doc(db, 'orderingSessions', sessionId));
        return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    } catch (err) {
        // If permission denied, return null to allow join flow to proceed
        if (err.code === 'permission-denied') {
            return null;
        }
        throw err;
    }
}

export async function updateOrderingSession(sessionId, data) {
    await updateDoc(doc(db, 'orderingSessions', sessionId), data);
}

export async function joinOrderingSession(sessionId, userId) {
    const sessionRef = doc(db, 'orderingSessions', sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) {
        throw new Error('Session not found');
    }

    const session = sessionSnap.data();
    if (!session.participants.includes(userId)) {
        await updateDoc(sessionRef, {
            participants: [...session.participants, userId],
        });
    }
}

export async function getActiveSessionsForUser(userId) {
    const q = query(
        orderingSessionsCol(),
        where('participants', 'array-contains', userId),
        where('status', '==', 'active')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// === CART ITEMS ===

export async function saveCartItem(cartItem) {
    await setDoc(doc(db, 'cartItems', cartItem.id), cartItem);
}

export async function updateCartItem(cartItemId, data) {
    await updateDoc(doc(db, 'cartItems', cartItemId), {
        ...data,
        updatedAt: new Date().toISOString(),
    });
}

export async function removeCartItem(cartItemId) {
    await deleteDoc(doc(db, 'cartItems', cartItemId));
}

export async function getCartItemsForSession(sessionId) {
    const q = query(cartItemsCol(), where('sessionId', '==', sessionId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getUserCartForSession(sessionId, userId) {
    const q = query(
        cartItemsCol(),
        where('sessionId', '==', sessionId),
        where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function clearUserCart(sessionId, userId) {
    const q = query(
        cartItemsCol(),
        where('sessionId', '==', sessionId),
        where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
}

// === REAL-TIME LISTENERS FOR ORDERING ===

export function subscribeToSession(sessionId, onSessionUpdate) {
    return onSnapshot(doc(db, 'orderingSessions', sessionId), (snap) => {
        if (snap.exists()) {
            onSessionUpdate({ id: snap.id, ...snap.data() });
        } else {
            onSessionUpdate(null);
        }
    });
}

export function subscribeToCartItems(sessionId, onCartUpdate) {
    const q = query(cartItemsCol(), where('sessionId', '==', sessionId));
    return onSnapshot(q, (snap) => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        onCartUpdate(items);
    });
}

export function subscribeToRestaurant(restaurantId, onRestaurantUpdate) {
    return onSnapshot(doc(db, 'restaurants', restaurantId), (snap) => {
        if (snap.exists()) {
            onRestaurantUpdate({ id: snap.id, ...snap.data() });
        } else {
            onRestaurantUpdate(null);
        }
    });
}
