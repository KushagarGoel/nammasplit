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
