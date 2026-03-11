import * as Icons from 'lucide-react';
import { CATEGORIES } from '../utils/helpers';

export default function CategoryPicker({ selected, onSelect }) {
    return (
        <div className="category-grid">
            {CATEGORIES.map(cat => {
                const IconComponent = Icons[cat.icon] || Icons.MoreHorizontal;
                return (
                    <div
                        key={cat.id}
                        className={`category-item ${selected === cat.id ? 'selected' : ''}`}
                        onClick={() => onSelect(cat.id)}
                    >
                        <div className="category-item-icon" style={{ background: cat.color }}>
                            <IconComponent size={18} />
                        </div>
                        <span className="category-item-label">{cat.label}</span>
                    </div>
                );
            })}
        </div>
    );
}
