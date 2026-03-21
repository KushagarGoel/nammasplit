import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { createExpense, createSettlement, createActivity, createGroup } from '../data/models';
import { computeBalances, getTotalBalances, getFriendBalances, simplifyDebts, getGroupBalances, getNetBalance } from '../data/balanceEngine';
import { formatINR } from '../utils/currency';
import {
    saveExpense, updateExpense, removeExpense, removeExpensesByGroup,
    saveSettlement, saveGroup, getGroup, updateGroup, removeGroup, removeSettlementsByGroup,
    saveActivity, subscribeToUserData,
    getFriendIds, getUserProfile, addFriendLink, getUserByEmail,
    createInvitation, getInvitationsForEmail, deleteInvitation,
    getUsersByIds,
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
    const [extraUsers, setExtraUsers] = useState({}); // Cache for users not in friends list

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
            unsubRef.current = subscribeToUserData(user.uid, (newData) => {
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

    // Fetch unknown users (for group members not in friends list)
    const fetchUnknownUsers = useCallback(async (userIds) => {
        const unknownIds = userIds.filter(id => !allUsers.find(u => u.id === id) && !extraUsers[id]);
        if (unknownIds.length === 0) return;

        try {
            const users = await getUsersByIds(unknownIds);
            setExtraUsers(prev => {
                const next = { ...prev };
                users.forEach(u => { next[u.id] = u; });
                return next;
            });
        } catch (err) {
            console.error('Failed to fetch unknown users:', err);
        }
    }, [allUsers, extraUsers]);

    const getUserById = useCallback((id) => {
        const user = allUsers.find(u => u.id === id) || extraUsers[id];
        return user || { id, name: 'Unknown', email: '' };
    }, [allUsers, extraUsers]);

    const getGroupById = useCallback((id) => {
        if (!id) {
            return { id: null, name: 'Personal', members: [currentUser.id] };
        }
        const group = data.groups.find(g => g.id === id);
        // Fetch unknown group members
        if (group?.members) {
            fetchUnknownUsers(group.members);
        }
        return group;
    }, [data.groups, currentUser.id, fetchUnknownUsers]);

    const getExpensesByGroup = useCallback((groupId) => {
        return data.expenses
            .filter(e => e.groupId === groupId)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [data.expenses]);

    const getExpensesBetweenFriends = useCallback((friendId) => {
        return data.expenses
            .filter(e => {
                // Include expenses with no group OR from auto-created shared groups
                const isAutoCreatedGroup = e.groupId?.startsWith('grp-');
                if (e.groupId && !isAutoCreatedGroup) return false;
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

    // Get balance breakdown by group for a specific friend
    const getFriendBalanceBreakdown = useCallback((friendId) => {
        const breakdown = [];

        // Check direct expenses (no group)
        const directExpenses = data.expenses.filter(e => {
            if (e.groupId) return false;
            const involvesCurrent = e.paidBy === currentUser.id || e.splits.some(s => s.userId === currentUser.id);
            const involvesFriend = e.paidBy === friendId || e.splits.some(s => s.userId === friendId);
            return involvesCurrent && involvesFriend;
        });

        const directSettlements = data.settlements.filter(s => {
            if (s.groupId) return false;
            return (s.fromUserId === currentUser.id && s.toUserId === friendId) ||
                   (s.fromUserId === friendId && s.toUserId === currentUser.id);
        });

        if (directExpenses.length > 0 || directSettlements.length > 0) {
            const directBalances = computeBalances(directExpenses, directSettlements);
            const directNet = getNetBalance(directBalances, currentUser.id, friendId);
            if (Math.abs(directNet) > 0.5) {
                breakdown.push({ groupId: null, groupName: 'Direct', balance: directNet });
            }
        }

        // Check each group
        data.groups.forEach(group => {
            if (!group.members.includes(currentUser.id) || !group.members.includes(friendId)) return;

            const groupExpenses = data.expenses.filter(e => e.groupId === group.id);
            const groupSettlements = data.settlements.filter(s => s.groupId === group.id);
            const groupBalances = computeBalances(groupExpenses, groupSettlements);
            const groupNet = getNetBalance(groupBalances, currentUser.id, friendId);

            if (Math.abs(groupNet) > 0.5) {
                breakdown.push({ groupId: group.id, groupName: group.name, balance: groupNet });
            }
        });

        return breakdown.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
    }, [data.groups, data.expenses, data.settlements, currentUser.id]);

    // Get settlements for a specific friend (optionally filtered by group)
    const getSettlementsWithFriend = useCallback((friendId, groupId = null) => {
        return data.settlements
            .filter(s => {
                const involvesBoth = (s.fromUserId === currentUser.id && s.toUserId === friendId) ||
                                    (s.fromUserId === friendId && s.toUserId === currentUser.id);
                if (groupId === null) return involvesBoth;
                return involvesBoth && s.groupId === groupId;
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [data.settlements, currentUser.id]);

    // ===== ACTIONS =====
    const addExpense = useCallback(async (expenseData) => {
        let finalGroupId = expenseData.groupId;
        const { suggestedGroupName, ...restExpenseData } = expenseData;

        // Get all participants from splits before creating expense
        const involvedUsers = [...new Set([expenseData.paidBy, ...expenseData.splits.map(s => s.userId)])];
        const isPersonalExpense = involvedUsers.length === 1 && involvedUsers[0] === currentUser.id;
        const isDirectFriendExpense = involvedUsers.length === 2 && !finalGroupId;

        // For shared expenses without a group, create a new named group (but not for direct 1-on-1 friend expenses)
        if (!finalGroupId && !isPersonalExpense && !isDirectFriendExpense) {
            // Generate a unique group ID based on sorted participants and timestamp
            const sortedUserIds = [...involvedUsers].sort().join('-');
            const groupId = `grp-${sortedUserIds}-${Date.now()}`;

            // Use suggested name or generate default
            const groupName = suggestedGroupName || `${currentUser.name} & Friends`;

            const newGroup = createGroup({
                name: groupName,
                members: involvedUsers,
                createdBy: currentUser.id,
            });
            newGroup.id = groupId;

            try {
                await saveGroup(newGroup);
            } catch (err) {
                console.error('Failed to create group:', err);
                throw new Error('Failed to create group: ' + err.message);
            }

            finalGroupId = groupId;
        }

        const expense = createExpense({ ...restExpenseData, groupId: finalGroupId });
        // Add involvedUsers for Firestore query
        expense.involvedUsers = involvedUsers;

        const payer = getUserById(expense.paidBy);

        // Get display name for the expense context
        let contextName = 'Personal';
        if (!isPersonalExpense) {
            if (isDirectFriendExpense) {
                // For direct 1-on-1 expenses, show the friend's name
                const otherUserId = involvedUsers.find(id => id !== currentUser.id);
                const otherUser = getUserById(otherUserId);
                contextName = otherUser?.name || 'Shared';
            } else {
                contextName = getGroupById(expense.groupId)?.name || 'Shared';
            }
        }

        // Ensure activity involvedUsers always includes the payer (for security rules)
        const activityInvolvedUsers = [...new Set([expense.paidBy, ...involvedUsers])];

        const activity = createActivity({
            type: 'expense_added',
            description: `${payer.name} added "${expense.description}"${isPersonalExpense ? '' : ` in ${contextName}`}`,
            userId: expense.paidBy,
            groupId: expense.groupId,
            expenseId: expense.id,
            amount: expense.amount,
            involvedUsers: activityInvolvedUsers,
        });

        // Save to Firestore (real-time listener will update local state)
        try {
            await saveExpense(expense);
        } catch (err) {
            console.error('Failed to save expense:', err, 'Expense data:', expense);
            throw new Error('Failed to save expense: ' + err.message);
        }

        try {
            await saveActivity(activity);
        } catch (err) {
            console.error('Failed to save activity:', err, 'Activity data:', activity);
            throw new Error('Failed to save activity: ' + err.message);
        }

        const toastMessage = isPersonalExpense
            ? `Added "${expense.description}" — ${formatINR(expense.amount)}`
            : `Added "${expense.description}" with ${contextName} — ${formatINR(expense.amount)}`;
        showToast(toastMessage);
        return expense;
    }, [getUserById, getGroupById, showToast, data.groups, currentUser.id, currentUser.name]);

    const editExpense = useCallback(async (expenseId, expenseData) => {
        const involvedUsers = [...new Set([expenseData.paidBy, ...expenseData.splits.map(s => s.userId)])];

        const updatedData = {
            ...expenseData,
            involvedUsers,
        };

        const activity = createActivity({
            type: 'expense_updated',
            description: `${currentUser.name} updated "${expenseData.description}"`,
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
            description: `${currentUser.name} deleted "${expense.description}"`,
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
        const { fromUserId, toUserId, amount, method, groupId: requestedGroupId } = settlementData;
        const fromUser = getUserById(fromUserId);
        const toUser = getUserById(toUserId);
        const methodLabels = { upi: 'UPI', gpay: 'GPay', phonepe: 'PhonePe', cash: 'Cash', bank: 'Bank Transfer' };

        let settlementsToCreate = [];

        if (requestedGroupId) {
            // Group-specific settlement: just create one settlement
            settlementsToCreate.push(createSettlement({
                fromUserId,
                toUserId,
                amount,
                method,
                groupId: requestedGroupId,
            }));
        } else {
            // Friend-level settlement: distribute across groups with balances
            const balanceBreakdown = getFriendBalanceBreakdown(fromUserId === currentUser.id ? toUserId : fromUserId);
            let remainingAmount = amount;

            // Sort by absolute balance (largest first) - settle groups with larger balances first
            const sortedBreakdown = balanceBreakdown
                .filter(b => Math.abs(b.balance) > 0.5)
                .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

            for (const groupBalance of sortedBreakdown) {
                if (remainingAmount <= 0) break;

                // Only apply settlement if the balance direction matches
                // (i.e., if we're paying someone who owes us in this group, skip)
                // If balance > 0: friend owes currentUser (friend should pay currentUser)
                // If balance < 0: currentUser owes friend (currentUser should pay friend)
                const balanceDirectionMatches =
                    (fromUserId === currentUser.id && groupBalance.balance < 0) ||
                    (toUserId === currentUser.id && groupBalance.balance > 0);

                if (!balanceDirectionMatches) continue;

                const groupBalanceAmount = Math.abs(groupBalance.balance);
                const settlementAmount = Math.min(remainingAmount, groupBalanceAmount);

                settlementsToCreate.push(createSettlement({
                    fromUserId,
                    toUserId,
                    amount: settlementAmount,
                    method,
                    groupId: groupBalance.groupId, // null for direct expenses
                }));

                remainingAmount -= settlementAmount;
            }

            // If there's still remaining amount, create a settlement with no groupId
            // This handles overpayment scenarios
            if (remainingAmount > 0.01) {
                settlementsToCreate.push(createSettlement({
                    fromUserId,
                    toUserId,
                    amount: remainingAmount,
                    method,
                    groupId: null,
                }));
            }
        }

        // Create activities for each settlement
        const activities = settlementsToCreate.map(s => createActivity({
            type: 'settlement',
            description: `${fromUser.name} paid ${toUser.name} ${formatINR(s.amount)} (${methodLabels[method] || method})`,
            userId: fromUserId,
            groupId: s.groupId,
            amount: s.amount,
            involvedUsers: [fromUserId, toUserId],
        }));

        // Save all settlements and activities
        const savePromises = [
            ...settlementsToCreate.map(s => saveSettlement(s)),
            ...activities.map(a => saveActivity(a)),
        ];

        await Promise.all(savePromises);

        const totalSettled = settlementsToCreate.reduce((sum, s) => sum + s.amount, 0);
        showToast(`Settled ${formatINR(totalSettled)} with ${fromUser.id === currentUser.id ? toUser.name : fromUser.name}`);
    }, [getUserById, currentUser, showToast, getFriendBalanceBreakdown]);

    const addGroup = useCallback(async (name, memberIds) => {
        const allMembers = [currentUser.id, ...memberIds];
        const group = createGroup({
            name,
            members: allMembers,
            createdBy: currentUser.id,
        });

        // Create friend links between all group members (full mesh)
        const friendLinkPromises = [];
        for (let i = 0; i < allMembers.length; i++) {
            for (let j = i + 1; j < allMembers.length; j++) {
                const userA = allMembers[i];
                const userB = allMembers[j];
                // Create bidirectional friend links
                friendLinkPromises.push(
                    addFriendLink(userA, userB).catch(() => {}),
                    addFriendLink(userB, userA).catch(() => {})
                );
            }
        }

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
            ...friendLinkPromises,
        ]);

        showToast(`Created group "${name}"`);
        return group;
    }, [currentUser, showToast]);

    const addMemberToGroup = useCallback(async (groupId, friendId) => {
        const group = data.groups.find(g => g.id === groupId);
        if (!group || group.members.includes(friendId)) return;
        const friend = data.friends.find(f => f.id === friendId) || { name: 'Someone' };

        const newMembers = [...group.members, friendId];

        // Create friend links between new member and all existing group members
        const friendLinkPromises = [];
        for (const existingMemberId of group.members) {
            friendLinkPromises.push(
                addFriendLink(friendId, existingMemberId).catch(() => {}),
                addFriendLink(existingMemberId, friendId).catch(() => {})
            );
        }

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
            ...friendLinkPromises,
        ]);

        showToast(`Added ${friend.name} to ${group.name}`);
    }, [data.groups, data.friends, currentUser, showToast]);

    const deleteGroup = useCallback(async (groupId) => {
        const group = data.groups.find(g => g.id === groupId);
        if (!group) return;

        // Only allow creator to delete
        if (group.createdBy !== currentUser.id) {
            showToast('Only the group creator can delete');
            return;
        }

        const activity = createActivity({
            type: 'group_created',
            description: `${currentUser.name} deleted group "${group.name}"`,
            userId: currentUser.id,
            groupId,
            involvedUsers: group.members,
        });

        // Delete all expenses and settlements for this group, then the group itself
        await removeExpensesByGroup(groupId);
        await removeSettlementsByGroup(groupId);
        await Promise.all([
            removeGroup(groupId),
            saveActivity(activity),
        ]);

        showToast(`Deleted group "${group.name}"`);
    }, [data.groups, currentUser, showToast]);

    const addFriend = useCallback(async (name, email) => {
        if (!currentUser.id) {
            showToast('Please wait, loading...');
            return;
        }
        try {
            // Check if user with this email already exists
            let friend = null;
            if (email) {
                try {
                    const existingUser = await getUserByEmail(email);
                    if (existingUser) {
                        friend = existingUser;
                    }
                } catch (err) {
                    console.error('Error checking existing user:', err);
                }
            }

            if (friend) {
                // User exists - create direct friend link
                try {
                    await addFriendLink(currentUser.id, friend.id);
                } catch (err) {
                    console.error('Error creating friend link:', err);
                    throw new Error('Failed to link friends: ' + err.message);
                }

                // Save activity
                const activity = createActivity({
                    type: 'friend_added',
                    description: `${currentUser.name} added ${name} as a friend`,
                    userId: currentUser.id,
                    involvedUsers: [currentUser.id, friend.id],
                });

                try {
                    await saveActivity(activity);
                } catch (err) {
                    console.error('Error saving activity:', err);
                }

                // Update local friendIds so the real-time listener picks up the new friend
                setFriendIds(prev => [...prev, friend.id]);

                showToast(`Added ${name} as friend`);
                return friend;
            } else {
                // User doesn't exist - create a pending invitation
                if (!email) {
                    throw new Error('Email is required to invite a new friend');
                }

                try {
                    await createInvitation(currentUser.id, email, name);
                } catch (err) {
                    console.error('Error creating invitation:', err);
                    throw new Error('Failed to create invitation: ' + err.message);
                }

                // Save activity for the invitation
                const activity = createActivity({
                    type: 'friend_added',
                    description: `${currentUser.name} invited ${name} to join`,
                    userId: currentUser.id,
                    involvedUsers: [currentUser.id],
                });

                try {
                    await saveActivity(activity);
                } catch (err) {
                    console.error('Error saving activity:', err);
                }

                showToast(`Invitation sent to ${name}`);
                return { id: null, name, email, isPending: true };
            }
        } catch (err) {
            console.error('addFriend error:', err);
            showToast('Error: ' + err.message);
            throw err;
        }
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
        getFriendBalanceBreakdown,
        getSettlementsWithFriend,

        // Actions
        addExpense,
        editExpense,
        deleteExpense,
        settleUp,
        addGroup,
        addMemberToGroup,
        deleteGroup,
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
