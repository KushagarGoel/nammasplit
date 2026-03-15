import { Outlet, useNavigate } from 'react-router-dom';
import { IndianRupee } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getInitials, getAvatarColor } from '../utils/helpers';
import BottomNav from './BottomNav';

export default function Layout() {
    const { currentUser } = useApp();
    const navigate = useNavigate();

    return (
        <div className="app-container">
            <header className="top-bar">
                <div className="top-bar-logo" onClick={() => navigate('/')}>
                    <IndianRupee size={22} />
                    NammaSplit
                </div>
                <div
                    className="top-bar-avatar"
                    style={{ background: getAvatarColor(currentUser.name) }}
                    onClick={() => navigate('/account')}
                >
                    {getInitials(currentUser.name)}
                </div>
            </header>

            <main className="page-content">
                <Outlet />
            </main>

            <BottomNav />
        </div>
    );
}
