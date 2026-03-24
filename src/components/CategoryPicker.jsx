import { CATEGORIES } from '../utils/helpers';

export default function CategoryPicker({ selected, onSelect }) {
    return (
        <div className="category-grid">
            {CATEGORIES.map(cat => (
                <div
                    key={cat.id}
                    className={`category-item ${selected === cat.id ? 'selected' : ''}`}
                    onClick={() => onSelect(cat.id)}
                >
                    <div className="category-item-icon" style={{ background: cat.color }}>
                        <span style={{ fontSize: '1.4rem' }}>{cat.icon}</span>
                    </div>
                    <span className="category-item-label">{cat.label}</span>
                </div>
            ))}
        </div>
    );
}
