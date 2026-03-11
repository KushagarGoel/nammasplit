/**
 * Balance calculation engine.
 * Computes net balances between users and simplifies debts.
 */

/**
 * Compute pairwise balances from expenses and settlements.
 * Returns a Map of "fromId -> toId -> amount" (positive = from owes to).
 */
export function computeBalances(expenses, settlements) {
    // balances[A][B] > 0 means A owes B that amount
    const balances = {};

    function ensure(a, b) {
        if (!balances[a]) balances[a] = {};
        if (!balances[a][b]) balances[a][b] = 0;
    }

    // Process expenses
    for (const exp of expenses) {
        const { paidBy, splits, amount: totalAmount } = exp;

        // Each split tells us that split.userId owes split.amount of the expense.
        // The payer covered the total, so each non-payer participant owes payer their share.
        for (const split of splits) {
            if (split.userId !== paidBy && split.amount > 0) {
                ensure(split.userId, paidBy);
                ensure(paidBy, split.userId);
                balances[split.userId][paidBy] += split.amount;
                balances[paidBy][split.userId] -= split.amount;
            }
        }
    }

    // Process settlements (fromUser pays toUser, reducing fromUser's debt to toUser)
    for (const s of settlements) {
        ensure(s.fromUserId, s.toUserId);
        ensure(s.toUserId, s.fromUserId);
        // fromUser paid toUser, so fromUser's debt to toUser decreases
        balances[s.fromUserId][s.toUserId] -= s.amount;
        balances[s.toUserId][s.fromUserId] += s.amount;
    }

    return balances;
}

/**
 * Get net balance between two users.
 * Positive = currentUser is owed by other, Negative = currentUser owes other.
 */
export function getNetBalance(balances, userId, otherId) {
    // balances[otherId][userId] > 0 means other owes user (positive for user)
    // balances[userId][otherId] > 0 means user owes other (negative for user)
    const otherOwesMe = (balances[otherId] && balances[otherId][userId]) || 0;
    const iOweThem = (balances[userId] && balances[userId][otherId]) || 0;

    // If otherOwesMe is positive, other owes us money = good
    // If iOweThem is positive, we owe them money = bad
    // Net = how much other owes us minus how much we owe them
    // But these are already netted in computeBalances (symmetric), so just use one direction
    // balances[A][B] = -(balances[B][A]) always, so just return -balances[userId][otherId]
    return -(iOweThem);
}

/**
 * Get total balance for currentUser across all pairwise relationships.
 * Returns { totalBalance, youOwe, youAreOwed }
 */
export function getTotalBalances(balances, currentUserId, friendIds) {
    let youOwe = 0;
    let youAreOwed = 0;

    for (const friendId of friendIds) {
        const net = getNetBalance(balances, currentUserId, friendId);
        if (net > 0) youAreOwed += net;
        else if (net < 0) youOwe += Math.abs(net);
    }

    return {
        totalBalance: youAreOwed - youOwe,
        youOwe,
        youAreOwed,
    };
}

/**
 * Get per-friend balance details.
 * Returns array of { userId, name, balance } sorted by |balance| desc.
 */
export function getFriendBalances(balances, currentUserId, friends) {
    return friends
        .map(f => ({
            userId: f.id,
            name: f.name,
            balance: getNetBalance(balances, currentUserId, f.id),
        }))
        .filter(f => Math.abs(f.balance) > 0.5) // filter out near-zero
        .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
}

/**
 * Simplify debts within a group.
 * Uses greedy algorithm to minimize transactions.
 * Returns array of { from, to, amount }.
 */
export function simplifyDebts(balances, memberIds) {
    // Net amount for each person: positive = they should receive, negative = they should pay
    const nets = {};
    for (const id of memberIds) {
        nets[id] = 0;
    }

    // Compute net for each member based on pairwise balances
    for (const a of memberIds) {
        for (const b of memberIds) {
            if (a !== b) {
                const val = (balances[a] && balances[a][b]) || 0;
                // val > 0 means a owes b that amount, so a's net goes down, b's goes up
                nets[a] -= val;
            }
        }
    }

    // Separate into creditors and debtors
    const creditors = []; // people who are owed (positive net)
    const debtors = [];   // people who owe (negative net)

    for (const id of memberIds) {
        const rounded = Math.round(nets[id] * 100) / 100;
        if (rounded > 0.5) creditors.push({ id, amount: rounded });
        else if (rounded < -0.5) debtors.push({ id, amount: -rounded });
    }

    // Sort descending
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const result = [];
    let i = 0, j = 0;

    while (i < debtors.length && j < creditors.length) {
        const transfer = Math.min(debtors[i].amount, creditors[j].amount);
        if (transfer > 0.5) {
            result.push({
                from: debtors[i].id,
                to: creditors[j].id,
                amount: Math.round(transfer * 100) / 100,
            });
        }
        debtors[i].amount -= transfer;
        creditors[j].amount -= transfer;
        if (debtors[i].amount < 0.5) i++;
        if (creditors[j].amount < 0.5) j++;
    }

    return result;
}

/**
 * Get group balances: per-member net within a specific group.
 * Only considers expenses and settlements scoped to this group.
 */
export function getGroupBalances(expenses, settlements, groupId, memberIds, currentUserId) {
    const groupExpenses = expenses.filter(e => e.groupId === groupId);
    const groupSettlements = settlements.filter(s => s.groupId === groupId);
    const balances = computeBalances(groupExpenses, groupSettlements);

    return memberIds
        .filter(id => id !== currentUserId)
        .map(id => ({
            userId: id,
            balance: getNetBalance(balances, currentUserId, id),
        }))
        .filter(mb => Math.abs(mb.balance) > 0.5);
}
