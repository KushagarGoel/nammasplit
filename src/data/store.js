const STORAGE_KEY = 'splitwise_clone_data';

function loadData() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getAppData() {
    return loadData() || createSeedData();
}

export function setAppData(data) {
    saveData(data);
}

export function clearAppData() {
    localStorage.removeItem(STORAGE_KEY);
}

function createSeedData() {
    const currentUser = {
        id: 'user-current',
        name: 'Arjun Sharma',
        email: 'arjun@email.com',
        avatar: null,
        createdAt: new Date().toISOString(),
    };

    const friends = [
        { id: 'user-2', name: 'Priya Patel', email: 'priya@email.com', avatar: null, createdAt: new Date().toISOString() },
        { id: 'user-3', name: 'Rahul Verma', email: 'rahul@email.com', avatar: null, createdAt: new Date().toISOString() },
        { id: 'user-4', name: 'Neha Gupta', email: 'neha@email.com', avatar: null, createdAt: new Date().toISOString() },
        { id: 'user-5', name: 'Vikram Singh', email: 'vikram@email.com', avatar: null, createdAt: new Date().toISOString() },
        { id: 'user-6', name: 'Ananya Reddy', email: 'ananya@email.com', avatar: null, createdAt: new Date().toISOString() },
        { id: 'user-7', name: 'Karan Mehta', email: 'karan@email.com', avatar: null, createdAt: new Date().toISOString() },
    ];

    const allUsers = [currentUser, ...friends];

    const groups = [
        {
            id: 'group-1',
            name: 'Goa Trip 🏖️',
            members: ['user-current', 'user-2', 'user-3', 'user-4'],
            createdBy: 'user-current',
            createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
        },
        {
            id: 'group-2',
            name: 'Flat Expenses 🏠',
            members: ['user-current', 'user-3', 'user-5'],
            createdBy: 'user-current',
            createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        },
        {
            id: 'group-3',
            name: 'Office Lunch 🍱',
            members: ['user-current', 'user-2', 'user-6', 'user-7'],
            createdBy: 'user-6',
            createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
        },
    ];

    const expenses = [
        // Goa Trip expenses
        {
            id: 'exp-1',
            description: 'Hotel booking at Calangute',
            amount: 12000,
            paidBy: 'user-current',
            splitType: 'equal',
            splits: [
                { userId: 'user-current', amount: 3000 },
                { userId: 'user-2', amount: 3000 },
                { userId: 'user-3', amount: 3000 },
                { userId: 'user-4', amount: 3000 },
            ],
            groupId: 'group-1',
            category: 'travel',
            notes: 'Beach-view room for 2 nights',
            date: new Date(Date.now() - 5 * 86400000).toISOString(),
            createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        },
        {
            id: 'exp-2',
            description: 'Dinner at Fisherman\'s Wharf',
            amount: 4800,
            paidBy: 'user-2',
            splitType: 'equal',
            splits: [
                { userId: 'user-current', amount: 1200 },
                { userId: 'user-2', amount: 1200 },
                { userId: 'user-3', amount: 1200 },
                { userId: 'user-4', amount: 1200 },
            ],
            groupId: 'group-1',
            category: 'food',
            notes: '',
            date: new Date(Date.now() - 4 * 86400000).toISOString(),
            createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
        },
        {
            id: 'exp-3',
            description: 'Scooter rental',
            amount: 1500,
            paidBy: 'user-3',
            splitType: 'equal',
            splits: [
                { userId: 'user-current', amount: 375 },
                { userId: 'user-2', amount: 375 },
                { userId: 'user-3', amount: 375 },
                { userId: 'user-4', amount: 375 },
            ],
            groupId: 'group-1',
            category: 'transport',
            notes: '2 scooters for 3 days',
            date: new Date(Date.now() - 5 * 86400000).toISOString(),
            createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        },
        {
            id: 'exp-4',
            description: 'Water sports at Baga',
            amount: 3200,
            paidBy: 'user-current',
            splitType: 'equal',
            splits: [
                { userId: 'user-current', amount: 800 },
                { userId: 'user-2', amount: 800 },
                { userId: 'user-3', amount: 800 },
                { userId: 'user-4', amount: 800 },
            ],
            groupId: 'group-1',
            category: 'entertainment',
            notes: 'Parasailing + Jet ski',
            date: new Date(Date.now() - 3 * 86400000).toISOString(),
            createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        },
        // Flat Expenses
        {
            id: 'exp-5',
            description: 'Electricity bill - March',
            amount: 2400,
            paidBy: 'user-current',
            splitType: 'equal',
            splits: [
                { userId: 'user-current', amount: 800 },
                { userId: 'user-3', amount: 800 },
                { userId: 'user-5', amount: 800 },
            ],
            groupId: 'group-2',
            category: 'bills',
            notes: '',
            date: new Date(Date.now() - 2 * 86400000).toISOString(),
            createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        },
        {
            id: 'exp-6',
            description: 'WiFi bill',
            amount: 999,
            paidBy: 'user-5',
            splitType: 'equal',
            splits: [
                { userId: 'user-current', amount: 333 },
                { userId: 'user-3', amount: 333 },
                { userId: 'user-5', amount: 333 },
            ],
            groupId: 'group-2',
            category: 'bills',
            notes: 'Airtel fiber',
            date: new Date(Date.now() - 1 * 86400000).toISOString(),
            createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
        },
        {
            id: 'exp-7',
            description: 'Groceries from BigBasket',
            amount: 1850,
            paidBy: 'user-3',
            splitType: 'equal',
            splits: [
                { userId: 'user-current', amount: 617 },
                { userId: 'user-3', amount: 617 },
                { userId: 'user-5', amount: 616 },
            ],
            groupId: 'group-2',
            category: 'groceries',
            notes: '',
            date: new Date(Date.now() - 3 * 86400000).toISOString(),
            createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        },
        // Office Lunch
        {
            id: 'exp-8',
            description: 'Biryani from Behrouz',
            amount: 1600,
            paidBy: 'user-6',
            splitType: 'equal',
            splits: [
                { userId: 'user-current', amount: 400 },
                { userId: 'user-2', amount: 400 },
                { userId: 'user-6', amount: 400 },
                { userId: 'user-7', amount: 400 },
            ],
            groupId: 'group-3',
            category: 'food',
            notes: 'Monday treat',
            date: new Date(Date.now() - 1 * 86400000).toISOString(),
            createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
        },
        {
            id: 'exp-9',
            description: 'Chai & samosa',
            amount: 320,
            paidBy: 'user-current',
            splitType: 'equal',
            splits: [
                { userId: 'user-current', amount: 80 },
                { userId: 'user-2', amount: 80 },
                { userId: 'user-6', amount: 80 },
                { userId: 'user-7', amount: 80 },
            ],
            groupId: 'group-3',
            category: 'drinks',
            notes: '',
            date: new Date(Date.now() - 6 * 3600000).toISOString(),
            createdAt: new Date(Date.now() - 6 * 3600000).toISOString(),
        },
        // Non-group (direct friend)
        {
            id: 'exp-10',
            description: 'Movie tickets - Pushpa 2',
            amount: 600,
            paidBy: 'user-current',
            splitType: 'equal',
            splits: [
                { userId: 'user-current', amount: 300 },
                { userId: 'user-4', amount: 300 },
            ],
            groupId: null,
            category: 'entertainment',
            notes: 'IMAX show 🎬',
            date: new Date(Date.now() - 10 * 86400000).toISOString(),
            createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
        },
    ];

    const settlements = [
        {
            id: 'settle-1',
            fromUserId: 'user-4',
            toUserId: 'user-current',
            amount: 1000,
            method: 'gpay',
            groupId: 'group-1',
            date: new Date(Date.now() - 2 * 86400000).toISOString(),
        },
    ];

    const activities = [
        {
            id: 'act-1',
            type: 'expense_added',
            description: 'Arjun added "Chai & samosa" in Office Lunch',
            userId: 'user-current',
            groupId: 'group-3',
            expenseId: 'exp-9',
            amount: 320,
            timestamp: new Date(Date.now() - 6 * 3600000).toISOString(),
        },
        {
            id: 'act-2',
            type: 'settlement',
            description: 'Neha paid Arjun ₹1,000 (GPay)',
            userId: 'user-4',
            groupId: 'group-1',
            expenseId: null,
            amount: 1000,
            timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
        },
        {
            id: 'act-3',
            type: 'expense_added',
            description: 'Arjun added "Electricity bill - March" in Flat Expenses',
            userId: 'user-current',
            groupId: 'group-2',
            expenseId: 'exp-5',
            amount: 2400,
            timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
        },
        {
            id: 'act-4',
            type: 'expense_added',
            description: 'Ananya added "Biryani from Behrouz" in Office Lunch',
            userId: 'user-6',
            groupId: 'group-3',
            expenseId: 'exp-8',
            amount: 1600,
            timestamp: new Date(Date.now() - 1 * 86400000).toISOString(),
        },
        {
            id: 'act-5',
            type: 'group_created',
            description: 'Arjun created "Goa Trip 🏖️"',
            userId: 'user-current',
            groupId: 'group-1',
            expenseId: null,
            amount: null,
            timestamp: new Date(Date.now() - 7 * 86400000).toISOString(),
        },
    ];

    const data = {
        currentUser,
        friends,
        groups,
        expenses,
        settlements,
        activities,
    };

    saveData(data);
    return data;
}
