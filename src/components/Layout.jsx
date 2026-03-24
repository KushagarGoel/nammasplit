import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

export default function Layout({ children }) {
    return (
        <div className="app-container">
            <main className="page-content">
                {children || <Outlet />}
            </main>

            <BottomNav />
        </div>
    );
}
