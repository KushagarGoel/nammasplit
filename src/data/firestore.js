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

// ===== USER =====
export async function createUserProfile(uid, data) {
    await setDoc(doc(db, 'users', uid), {
        ...data,
        uid,
        createdAt: new Date().toISOString(),
    });
}

export async function getUserProfile(uid) {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
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
    await setDoc(doc(db, 'users', uid, 'friends', friendId), { addedAt: new Date().toISOString() });
    await setDoc(doc(db, 'users', friendId, 'friends', uid), { addedAt: new Date().toISOString() });
}

export async function getFriendIds(uid) {
    const snap = await getDocs(collection(db, 'users', uid, 'friends'));
    return snap.docs.map(d => d.id);
}

// ===== GROUPS =====
export async function saveGroup(group) {
    await setDoc(doc(db, 'groups', group.id), group);
}

export async function updateGroup(groupId, data) {
    await updateDoc(doc(db, 'groups', groupId), data);
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

// ===== SETTLEMENTS =====
export async function saveSettlement(settlement) {
    await setDoc(doc(db, 'settlements', settlement.id), settlement);
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
export function subscribeToUserData(uid, friendIds, onData) {
    const allUserIds = [uid, ...friendIds];
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

    // Listen to friend profiles
    if (friendIds.length > 0) {
        // Firestore 'in' queries limited to 30 items, batch if needed
        const batches = [];
        for (let i = 0; i < friendIds.length; i += 30) {
            batches.push(friendIds.slice(i, i + 30));
        }
        for (const batch of batches) {
            const q = query(usersCol(), where('__name__', 'in', batch));
            unsubs.push(onSnapshot(q, snap => {
                const friends = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                // Merge with existing friends from other batches
                const existingIds = new Set(friends.map(f => f.id));
                currentData.friends = [
                    ...currentData.friends.filter(f => !existingIds.has(f.id)),
                    ...friends,
                ];
                emit();
            }));
        }
    }

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
