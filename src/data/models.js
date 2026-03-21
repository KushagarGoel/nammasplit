import { generateId } from '../utils/helpers';

export function createUser({ name, email, avatar = null }) {
    return {
        id: generateId(),
        name,
        email,
        avatar,
        createdAt: new Date().toISOString(),
    };
}

export function createGroup({ name, members = [], createdBy }) {
    return {
        id: generateId(),
        name,
        members, // array of user IDs
        createdBy,
        createdAt: new Date().toISOString(),
    };
}

export function createExpense({
    description,
    amount,
    paidBy,
    splitType = 'equal', // 'equal' | 'exact' | 'percentage' | 'shares'
    splits = [],        // [{ userId, amount }] — computed amount each person owes
    groupId = null,
    category = 'other',
    notes = '',
    date = null,
    involvedUsers = [],
}) {
    return {
        id: generateId(),
        description,
        amount: parseFloat(amount),
        paidBy, // userId who paid
        splitType,
        splits,  // [{ userId, amount }]
        groupId,
        category,
        notes,
        date: date || new Date().toISOString(),
        createdAt: new Date().toISOString(),
        involvedUsers,
    };
}

export function createSettlement({ fromUserId, toUserId, amount, method = 'cash', groupId = null }) {
    return {
        id: generateId(),
        fromUserId,
        toUserId,
        amount: parseFloat(amount),
        method, // 'upi' | 'gpay' | 'phonepe' | 'cash' | 'bank'
        groupId,
        date: new Date().toISOString(),
    };
}

export function createActivity({ type, description, userId, groupId = null, expenseId = null, amount = null, involvedUsers = [] }) {
    return {
        id: generateId(),
        type, // 'expense_added' | 'expense_updated' | 'expense_deleted' | 'settlement' | 'group_created' | 'friend_added'
        description,
        userId,
        groupId,
        expenseId,
        amount,
        involvedUsers,
        timestamp: new Date().toISOString(),
    };
}

// ===== Restaurant & Group Ordering Models =====

export function createRestaurant({ name, address = '', phone = '', cuisine = '', createdBy, imageUrl = null }) {
    return {
        id: generateId(),
        name,
        address,
        phone,
        cuisine,
        imageUrl,
        createdBy,
        createdAt: new Date().toISOString(),
    };
}

export function createMenuItem({ name, description = null, price, category = 'UNKNOWN' }) {
    return {
        id: generateId(),
        name,
        description: description || null,
        price: parseFloat(price),
        category, // 'VEG' | 'NON_VEG' | 'UNKNOWN'
        createdAt: new Date().toISOString(),
    };
}

export function createOrderingSession({ restaurantId, restaurantName, createdBy, hostName }) {
    return {
        id: generateId(),
        restaurantId,
        restaurantName,
        createdBy,
        hostName,
        status: 'active', // 'active' | 'completed' | 'cancelled'
        participants: [createdBy],
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    };
}

export function createCartItem({ sessionId, userId, userName, menuItemId, menuItemName, price, quantity = 1, specialInstructions = '' }) {
    return {
        id: generateId(),
        sessionId,
        userId,
        userName,
        menuItemId,
        menuItemName,
        price: parseFloat(price),
        quantity: parseInt(quantity, 10),
        specialInstructions,
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
}
