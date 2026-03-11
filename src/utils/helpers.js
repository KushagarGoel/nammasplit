/**
 * Get initials from a name
 */
export function getInitials(name) {
    if (!name) return '?';
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

/**
 * Generate a consistent color from a string (for avatars)
 */
const AVATAR_COLORS = [
    '#FF6B35', '#E91E63', '#9C27B0', '#673AB7',
    '#3F51B5', '#00897B', '#43A047', '#F4511E',
    '#1E88E5', '#00ACC1', '#7CB342', '#FFB300',
    '#8E24AA', '#D81B60', '#5E35B1', '#039BE5',
];

export function getAvatarColor(str) {
    if (!str) return AVATAR_COLORS[0];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/**
 * Format a date relative to now
 */
export function formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
}

/**
 * Format full date for expense detail
 */
export function formatFullDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

/**
 * Generate a simple unique ID
 */
export function generateId() {
    return crypto.randomUUID ? crypto.randomUUID() :
        'xxxx-xxxx-xxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
}

/**
 * Expense categories with icons (using lucide icon names)
 */
export const CATEGORIES = [
    { id: 'food', label: 'Food & Dining', icon: 'UtensilsCrossed', color: '#FF6B35' },
    { id: 'drinks', label: 'Drinks', icon: 'Coffee', color: '#8D6E63' },
    { id: 'groceries', label: 'Groceries', icon: 'ShoppingCart', color: '#43A047' },
    { id: 'transport', label: 'Transport', icon: 'Car', color: '#1E88E5' },
    { id: 'rent', label: 'Rent', icon: 'Home', color: '#7CB342' },
    { id: 'bills', label: 'Bills & Utilities', icon: 'Zap', color: '#FFB300' },
    { id: 'entertainment', label: 'Entertainment', icon: 'Film', color: '#E91E63' },
    { id: 'shopping', label: 'Shopping', icon: 'ShoppingBag', color: '#9C27B0' },
    { id: 'travel', label: 'Travel', icon: 'Plane', color: '#00ACC1' },
    { id: 'medical', label: 'Medical', icon: 'Heart', color: '#EF5350' },
    { id: 'education', label: 'Education', icon: 'GraduationCap', color: '#5E35B1' },
    { id: 'other', label: 'Other', icon: 'MoreHorizontal', color: '#78909C' },
];

export function getCategoryById(id) {
    return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}
