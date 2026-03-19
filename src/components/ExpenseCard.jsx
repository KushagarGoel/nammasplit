import * as Icons from 'lucide-react';
import { getCategoryById } from '../utils/helpers';
import { formatINR } from '../utils/currency';
import { formatDate } from '../utils/helpers';
import { useApp } from '../context/AppContext';

export default function ExpenseCard({ expense, onClick }) {
    const { currentUser, getUserById } = useApp();
    const category = getCategoryById(expense.category);
    const payer = getUserById(expense.paidBy);
    const IconComponent = Icons[category.icon] || Icons.MoreHorizontal;

    // Calculate what currentUser owes/lent for this expense
    const currentUserSplit = expense.splits.find(s => s.userId === currentUser.id);
    const currentUserSplitAmount = currentUserSplit ? currentUserSplit.amount : 0;

    let youLabel = '';
    let youClass = '';

    if (expense.paidBy === currentUser.id) {
        const lentAmount = expense.amount - currentUserSplitAmount;
        if (lentAmount > 0) {
            youLabel = `you lent ${formatINR(lentAmount)}`;
            youClass = 'lent';
        }
    } else {
        if (currentUserSplitAmount > 0) {
            youLabel = `you owe ${formatINR(currentUserSplitAmount)}`;
            youClass = 'borrowed';
        }
    }

    return (
        <div className="expense-card" onClick={onClick} style={{ position: 'relative', cursor: 'pointer' }}>
            <div className="expense-icon" style={{ background: category.color }}>
                <IconComponent size={20} />
            </div>
            <div className="expense-info">
                <div className="expense-desc">{expense.description}</div>
                <div className="expense-meta">
                    {payer.name} paid · {formatDate(expense.date)}
                </div>
            </div>
            <div className="expense-amount-section">
                <div className="expense-total">{formatINR(expense.amount)}</div>
                {youLabel && (
                    <div className={`expense-you ${youClass}`}>{youLabel}</div>
                )}
            </div>
        </div>
    );
}
