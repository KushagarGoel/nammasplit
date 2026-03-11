import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { createExpense, createSettlement, createActivity, createGroup, createUser } from '../data/models';
import { computeBalances, getTotalBalances, getFriendBalances, simplifyDebts, getGroupBalances, getNetBalance } from '../data/balanceEngine';
import { formatINR } from '../utils/currency';
import {
    saveExpense, updateExpense, removeExpense,
    saveSettlement, saveGroup, updateGroup,
    saveActivity, subscribeToUserData,
    getFriendIds, getUserProfile, createUserProfile, addFriendLink,
} from '../data/firestore';

const AppContext = createContext(null);

export function useApp() {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useApp must be used within AppProvider');
    return ctx;
}

export function AppProvider({ children }) {
    const { user, userProfile } = useAuth();
    const [data, setData] = useState({
        friends: [],
        groups: [],
        expenses: [],
        settlements: [],
        activities: [],
    });
    const [friendIds, setFriendIds] = useState([]);
    const [toast, setToast] = useState(null);
    const [loading, setLoading] = useState(true);
    const unsubRef = useRef(null);

    const currentUser = userProfile ? {
        id: userProfile.id || userProfile.uid,
        name: userProfile.name,
        email: userProfile.email,
        avatar: userProfile.avatar || null,
    } : { id: '', name: '', email: '', avatar: null };

    // Load friend IDs then subscribe to real-time data
    useEffect(() => {
        if (!user) {
            setData({ friends: [], groups: [], expenses: [], settlements: [], activities: [] });
            setFriendIds([]);
            setLoading(false);
            return;
        }

        let cancelled = false;

        async function init() {
            const fIds = await getFriendIds(user.uid);
            if (cancelled) return;
            setFriendIds(fIds);

            // Start real-time listener
            if (unsubRef.current) unsubRef.current();
            unsubRef.current = subscribeToUserData(user.uid, fIds, (newData) => {
                if (!cancelled) {
                    setData(newData);
                    setLoading(false);
                }
            });
        }

        init();

        return () => {
            cancelled = true;
            if (unsubRef.current) unsubRef.current();
        };
    }, [user]);

    const showToast = useCallback((message) => {
        setToast(message);
        setTimeout(() => setToast(null), 2500);
    }, []);

    // ===== COMPUTED =====
    const allUsers = currentUser.id ? [currentUser, ...data.friends] : [];
    const balances = computeBalances(data.expenses, data.settlements);
    const totalBalances = currentUser.id
        ? getTotalBalances(balances, currentUser.id, data.friends.map(f => f.id))
        : { totalBalance: 0, youOwe: 0, youAreOwed: 0 };
    const friendBalances = currentUser.id
        ? getFriendBalances(balances, currentUser.id, data.friends)
        : [];

    const getUserById = useCallback((id) => {
        return allUsers.find(u => u.id === id) || { id, name: 'Unknown', email: '' };
    }, [allUsers]);

    const getGroupById = useCallback((id) => {
        return data.groups.find(g => g.id === id);
    }, [data.groups]);

    const getExpensesByGroup = useCallback((groupId) => {
        return data.expenses
            .filter(e => e.groupId === groupId)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [data.expenses]);

    const getExpensesBetweenFriends = useCallback((friendId) => {
        return data.expenses
            .filter(e => {
                if (e.groupId) return false;
                const involvesCurrent = e.paidBy === currentUser.id || e.splits.some(s => s.userId === currentUser.id);
                const involvesFriend = e.paidBy === friendId || e.splits.some(s => s.userId === friendId);
                return involvesCurrent && involvesFriend;
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [data.expenses, currentUser.id]);

    const getFriendBalance = useCallback((friendId) => {
        return getNetBalance(balances, currentUser.id, friendId);
    }, [balances, currentUser.id]);

    const getGroupBalanceDetails = useCallback((groupId) => {
        const group = data.groups.find(g => g.id === groupId);
        if (!group) return [];
        return getGroupBalances(data.expenses, data.settlements, groupId, group.members, currentUser.id);
    }, [data.groups, data.expenses, data.settlements, currentUser.id]);

    const getGroupSimplifiedDebts = useCallback((groupId) => {
        const group = data.groups.find(g => g.id === groupId);
        if (!group) return [];
        const groupExpenses = data.expenses.filter(e => e.groupId === groupId);
        const groupSettlements = data.settlements.filter(s => s.groupId === groupId);
        const groupBalances = computeBalances(groupExpenses, groupSettlements);
        return simplifyDebts(groupBalances, group.members);
    }, [data.groups, data.expenses, data.settlements]);

    // ===== ACTIONS =====
    const addExpense = useCallback(async (expenseData) => {
        const expense = createExpense(expenseData);
        // Add involvedUsers for Firestore query
        const involvedUsers = [...new Set([expense.paidBy, ...expense.splits.map(s => s.userId)])];
        expense.involvedUsers = involvedUsers;

        const payer = getUserById(expense.paidBy);
        const groupName = expense.groupId ? getGroupById(expense.groupId)?.name : '';

        const activity = createActivity({
            type: 'expense_added',
            description: `${payer.name} added "${expense.description}"${groupName ? ` in ${groupName}` : ''}`,
            userId: expense.paidBy,
            groupId: expense.groupId,
            expenseId: expense.id,
            amount: expense.amount,
            involvedUsers,
        });

        // Save to Firestore (real-time listener will update local state)
        await Promise.all([
            saveExpense(expense),
            saveActivity(activity),
        ]);

        showToast(`Added "${expense.description}" — ${formatINR(expense.amount)}`);
        return expense;
    }, [getUserById, getGroupById, showToast]);

    const editExpense = useCallback(async (expenseId, expenseData) => {
        const involvedUsers = [...new Set([expenseData.paidBy, ...expenseData.splits.map(s => s.userId)])];

        const updatedData = {
            ...expenseData,
            involvedUsers,
        };

        const payer = getUserById(expenseData.paidBy);
        const activity = createActivity({
            type: 'expense_added',
            description: `${payer.name} updated "${expenseData.description}"`,
            userId: currentUser.id,
            groupId: expenseData.groupId,
            expenseId: expenseId,
            amount: expenseData.amount,
            involvedUsers,
        });

        await Promise.all([
            updateExpense(expenseId, updatedData),
            saveActivity(activity),
        ]);

        showToast(`Updated "${expenseData.description}"`);
    }, [getUserById, currentUser.id, showToast]);

    const deleteExpense = useCallback(async (expenseId) => {
        const expense = data.expenses.find(e => e.id === expenseId);
        if (!expense) return;

        const activity = createActivity({
            type: 'expense_deleted',
            description: `${getUserById(expense.paidBy).name} deleted "${expense.description}"`,
            userId: currentUser.id,
            groupId: expense.groupId,
            expenseId: expense.id,
            amount: expense.amount,
            involvedUsers: expense.involvedUsers || [currentUser.id],
        });

        await Promise.all([
            removeExpense(expenseId),
            saveActivity(activity),
        ]);

        showToast(`Deleted "${expense.description}"`);
    }, [data.expenses, currentUser.id, getUserById, showToast]);

    const settleUp = useCallback(async (settlementData) => {
        const settlement = createSettlement(settlementData);
        const fromUser = getUserById(settlement.fromUserId);
        const toUser = getUserById(settlement.toUserId);
        const methodLabels = { upi: 'UPI', gpay: 'GPay', phonepe: 'PhonePe', cash: 'Cash', bank: 'Bank Transfer' };

        const activity = createActivity({
            type: 'settlement',
            description: `${fromUser.name} paid ${toUser.name} ${formatINR(settlement.amount)} (${methodLabels[settlement.method] || settlement.method})`,
            userId: settlement.fromUserId,
            groupId: settlement.groupId,
            amount: settlement.amount,
            involvedUsers: [settlement.fromUserId, settlement.toUserId],
        });

        await Promise.all([
            saveSettlement(settlement),
            saveActivity(activity),
        ]);

        showToast(`Settled ${formatINR(settlement.amount)} with ${fromUser.id === currentUser.id ? toUser.name : fromUser.name}`);
    }, [getUserById, currentUser.id, showToast]);

    const addGroup = useCallback(async (name, memberIds) => {
        const group = createGroup({
            name,
            members: [currentUser.id, ...memberIds],
            createdBy: currentUser.id,
        });

        const activity = createActivity({
            type: 'group_created',
            description: `${currentUser.name} created "${name}"`,
            userId: currentUser.id,
            groupId: group.id,
            involvedUsers: group.members,
        });

        await Promise.all([
            saveGroup(group),
            saveActivity(activity),
        ]);

        showToast(`Created group "${name}"`);
        return group;
    }, [currentUser, showToast]);

    const addMemberToGroup = useCallback(async (groupId, friendId) => {
        const group = data.groups.find(g => g.id === groupId);
        if (!group || group.members.includes(friendId)) return;
        const friend = data.friends.find(f => f.id === friendId) || { name: 'Someone' };

        const newMembers = [...group.members, friendId];

        const activity = createActivity({
            type: 'group_created',
            description: `${currentUser.name} added ${friend.name} to "${group.name}"`,
            userId: currentUser.id,
            groupId,
            involvedUsers: newMembers,
        });

        await Promise.all([
            updateGroup(groupId, { members: newMembers }),
            saveActivity(activity),
        ]);

        showToast(`Added ${friend.name} to ${group.name}`);
    }, [data.groups, data.friends, currentUser, showToast]);

    const addFriend = useCallback(async (name, email) => {
        // Create a demo friend user profile
        const friend = createUser({ name, email });

        await createUserProfile(friend.id, { name, email, avatar: null, isDemo: true });
        await addFriendLink(currentUser.id, friend.id);

        const activity = createActivity({
            type: 'friend_added',
            description: `${currentUser.name} added ${name} as a friend`,
            userId: currentUser.id,
            involvedUsers: [currentUser.id, friend.id],
        });

        await saveActivity(activity);

        // Update local friendIds so the real-time listener picks up the new friend
        setFriendIds(prev => [...prev, friend.id]);

        showToast(`Added ${name} as friend`);
        return friend;
    }, [currentUser, showToast]);

    const value = {
        // Data
        currentUser,
        friends: data.friends,
        groups: data.groups,
        expenses: data.expenses,
        settlements: data.settlements,
        activities: data.activities,
        loading,

        // Computed
        allUsers,
        balances,
        totalBalances,
        friendBalances,

        // Getters
        getUserById,
        getGroupById,
        getExpensesByGroup,
        getExpensesBetweenFriends,
        getFriendBalance,
        getGroupBalanceDetails,
        getGroupSimplifiedDebts,

        // Actions
        addExpense,
        editExpense,
        deleteExpense,
        settleUp,
        addGroup,
        addMemberToGroup,
        addFriend,

        // UI
        toast,
        showToast,
    };

    return (
        <AppContext.Provider value={value}>
            {children}
            {toast && <div className="toast">{toast}</div>}
        </AppContext.Provider>
    );
}
