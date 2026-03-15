import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, UserPlus, Activity, Plus } from 'lucide-react';
import { useState } from 'react';
import AddExpenseModal from './AddExpenseModal';
import { useApp } from '../context/AppContext';

const NAV_ITEMS = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/groups', label: 'Groups', icon: Users },
    { path: 'add', label: 'Add', icon: Plus, isAdd: true },
    { path: '/friends', label: 'Friends', icon: UserPlus },
    { path: '/activity', label: 'Activity', icon: Activity },
];

export default function BottomNav() {
    const location = useLocation();
    const navigate = useNavigate();
    const { friends, showToast } = useApp();
    const [showAddExpense, setShowAddExpense] = useState(false);

    const handleAddExpenseClick = () => {
        if (friends.length === 0) {
            showToast('Add friends first to create an expense');
            return;
        }
        setShowAddExpense(true);
    };

    return (
        <>
            <nav className="bottom-nav">
                {NAV_ITEMS.map(item => {
                    if (item.isAdd) {
                        return (
                            <button
                                key="add"
                                className="bottom-nav-add"
                                onClick={handleAddExpenseClick}
                                aria-label="Add expense"
                            >
                                <Plus strokeWidth={2.5} />
                            </button>
                        );
                    }

                    const isActive = location.pathname === item.path ||
                        (item.path !== '/' && location.pathname.startsWith(item.path));

                    return (
                        <button
                            key={item.path}
                            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => navigate(item.path)}
                        >
                            <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </nav>

            {showAddExpense && (
                <AddExpenseModal onClose={() => setShowAddExpense(false)} />
            )}
        </>
    );
}
