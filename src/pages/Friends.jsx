import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Search, X, Check, Link as LinkIcon, Copy, Share2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatINR } from '../utils/currency';
import { getInitials, getAvatarColor } from '../utils/helpers';
import { createInviteToken } from '../data/firestore';
import ShareOptions from '../components/ShareOptions';

export default function Friends() {
    const { currentUser, friends, getFriendBalance, showToast } = useApp();
    const navigate = useNavigate();
    const [showAdd, setShowAdd] = useState(false);
    const [search, setSearch] = useState('');
    const [inviteLink, setInviteLink] = useState('');
    const [generatingLink, setGeneratingLink] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const [showShareOptions, setShowShareOptions] = useState(false);
    const [copiedUpiId, setCopiedUpiId] = useState(null);

    const handleCopyUpi = async (upiId, e) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(upiId);
            setCopiedUpiId(upiId);
            showToast('UPI ID copied!');
            setTimeout(() => setCopiedUpiId(null), 2000);
        } catch (err) {
            const textArea = document.createElement('textarea');
            textArea.value = upiId;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopiedUpiId(upiId);
            showToast('UPI ID copied!');
            setTimeout(() => setCopiedUpiId(null), 2000);
        }
    };

    const generateInviteLink = async () => {
        setGeneratingLink(true);
        try {
            const token = await createInviteToken(currentUser.id);
            const link = `${window.location.origin}/invite/${token}`;
            setInviteLink(link);
        } catch (err) {
            console.error('Failed to generate invite link:', err);
            showToast('Failed to generate invite link');
        } finally {
            setGeneratingLink(false);
        }
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(inviteLink);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = inviteLink;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
        }
    };

    const shareInvite = () => {
        setShowShareOptions(true);
    };

    const filteredFriends = friends.filter(f =>
        f.name.toLowerCase().includes(search.toLowerCase())
    );

    // Separate into owed and owes
    const friendsWithBalances = filteredFriends.map(f => ({
        ...f,
        balance: getFriendBalance(f.id),
    }));

    const friendsYouOwe = friendsWithBalances.filter(f => f.balance < -0.5);
    const friendsOweYou = friendsWithBalances.filter(f => f.balance > 0.5);
    const friendsSettled = friendsWithBalances.filter(f => Math.abs(f.balance) <= 0.5);

    const renderFriendItem = (friend) => (
        <div
            key={friend.id}
            className="list-item"
            onClick={() => navigate(`/friends/${friend.id}`)}
        >
            <div
                className="avatar"
                style={{
                    background: friend.avatar ? 'transparent' : getAvatarColor(friend.name),
                    overflow: friend.avatar ? 'hidden' : 'visible'
                }}
            >
                {friend.avatar ? (
                    <img
                        src={friend.avatar}
                        alt={friend.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                ) : (
                    getInitials(friend.name)
                )}
            </div>
            <div className="list-item-content">
                <div className="list-item-title">{friend.name}</div>
                <div className="list-item-subtitle">
                    {friend.upiId ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {friend.upiId}
                            <button
                                onClick={(e) => handleCopyUpi(friend.upiId, e)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: '2px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    color: 'var(--text-tertiary)',
                                    marginLeft: '2px'
                                }}
                                title="Copy UPI ID"
                            >
                                {copiedUpiId === friend.upiId ? <span style={{ fontSize: '0.75rem' }}>✓</span> : <Copy size={12} />}
                            </button>
                        </span>
                    ) : (
                        friend.balance > 0.5
                            ? 'owes you'
                            : friend.balance < -0.5
                                ? 'you owe'
                                : 'settled up ✓'
                    )}
                </div>
            </div>
            <div className="list-item-right">
                {Math.abs(friend.balance) > 0.5 ? (
                    <div className={`list-item-amount ${friend.balance > 0 ? 'positive' : 'negative'}`}>
                        {formatINR(Math.abs(friend.balance))}
                    </div>
                ) : (
                    <span className="badge badge-positive">settled</span>
                )}
            </div>
        </div>
    );

    return (
        <div>
            <div className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 className="page-title">Friends</h1>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
                        <UserPlus size={16} /> Invite
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="search-bar">
                <Search />
                <input
                    type="text"
                    className="form-input"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search friends..."
                    style={{ paddingLeft: 40 }}
                />
            </div>

            {filteredFriends.length === 0 && !search ? (
                <div className="empty-state">
                    <div className="empty-state-icon">
                        <UserPlus size={36} />
                    </div>
                    <h3 className="empty-state-title">No friends yet</h3>
                    <p className="empty-state-desc">Invite friends to start splitting expenses.</p>
                    <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
                        <UserPlus size={18} /> Invite Friend
                    </button>
                </div>
            ) : (
                <>
                    {friendsOweYou.length > 0 && (
                        <div className="section">
                            <div className="section-header">
                                <h3 className="section-title">Owes You</h3>
                            </div>
                            <div className="card">
                                {friendsOweYou.map(renderFriendItem)}
                            </div>
                        </div>
                    )}

                    {friendsYouOwe.length > 0 && (
                        <div className="section">
                            <div className="section-header">
                                <h3 className="section-title">You Owe</h3>
                            </div>
                            <div className="card">
                                {friendsYouOwe.map(renderFriendItem)}
                            </div>
                        </div>
                    )}

                    {friendsSettled.length > 0 && (
                        <div className="section">
                            <div className="section-header">
                                <h3 className="section-title">Settled Up</h3>
                            </div>
                            <div className="card">
                                {friendsSettled.map(renderFriendItem)}
                            </div>
                        </div>
                    )}

                    {filteredFriends.length === 0 && search && (
                        <div className="empty-state">
                            <h3 className="empty-state-title">No results</h3>
                            <p className="empty-state-desc">No friends match &quot;{search}&quot;</p>
                        </div>
                    )}
                </>
            )}

            {/* Invite Friend Modal */}
            {showAdd && (
                <div className="modal-overlay" onClick={() => setShowAdd(false)}>
                    <div className="modal-content invite-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: '50%',
                                    background: 'var(--primary-bg)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--primary)'
                                }}>
                                    <UserPlus size={20} />
                                </div>
                                <h2 className="modal-title">Invite Friend</h2>
                            </div>
                            <button className="modal-close" onClick={() => setShowAdd(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            {!inviteLink ? (
                                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                                    <div style={{
                                        width: 80,
                                        height: 80,
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto 20px',
                                        boxShadow: '0 8px 30px rgba(255, 138, 101, 0.3)'
                                    }}>
                                        <LinkIcon size={36} style={{ color: 'white' }} />
                                    </div>
                                    <h3 style={{
                                        fontFamily: 'var(--font-display)',
                                        fontWeight: 600,
                                        fontSize: '1.2rem',
                                        color: 'var(--text-primary)',
                                        marginBottom: '8px'
                                    }}>Invite your friends</h3>
                                    <p style={{ color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.5 }}>
                                        Generate a unique invite link to share with friends. They can use it to join and automatically connect with you.
                                    </p>
                                    <button
                                        className="btn btn-primary btn-full"
                                        onClick={generateInviteLink}
                                        disabled={generatingLink}
                                        style={{ padding: '14px 24px' }}
                                    >
                                        {generatingLink ? (
                                            <>
                                                <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2, display: 'inline-block', marginRight: 8, verticalAlign: 'middle', marginBottom: 0 }} />
                                                <span style={{ verticalAlign: 'middle' }}>Generating...</span>
                                            </>
                                        ) : (
                                            <>
                                                <LinkIcon size={18} style={{ display: 'inline-block', marginRight: 8, verticalAlign: 'middle' }} />
                                                <span style={{ verticalAlign: 'middle' }}>Generate Invite Link</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <div style={{
                                        padding: '16px',
                                        background: 'var(--bg-tertiary)',
                                        borderRadius: '12px',
                                        marginBottom: '20px'
                                    }}>
                                        <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                                            Share this link with your friend. When they sign up or log in using this link, you&apos;ll be automatically connected.
                                        </p>
                                    </div>

                                    <label style={{
                                        display: 'block',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        color: 'var(--text-tertiary)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        marginBottom: '8px'
                                    }}>Invite Link</label>
                                    <div style={{
                                        display: 'flex',
                                        gap: 8,
                                        marginBottom: 20
                                    }}>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={inviteLink}
                                            readOnly
                                            style={{
                                                flex: 1,
                                                fontSize: '0.8rem',
                                                background: 'var(--bg-tertiary)',
                                                border: '1px solid var(--border)'
                                            }}
                                        />
                                        <button
                                            className="btn btn-primary"
                                            onClick={copyToClipboard}
                                            style={{ padding: '10px 16px' }}
                                        >
                                            {linkCopied ? <Check size={18} /> : <Copy size={18} />}
                                        </button>
                                    </div>

                                    <div style={{ display: 'flex', gap: 12 }}>
                                        <button
                                            className="btn btn-primary flex-1"
                                            onClick={shareInvite}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                        >
                                            <Share2 size={18} /> Share
                                        </button>
                                        <button
                                            className="btn btn-secondary flex-1"
                                            onClick={() => setInviteLink('')}
                                        >
                                            <LinkIcon size={18} /> New Link
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary btn-full" onClick={() => {
                                setShowAdd(false);
                                setInviteLink('');
                                setLinkCopied(false);
                            }}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Share Options Modal */}
            {showShareOptions && inviteLink && (
                <ShareOptions
                    link={inviteLink}
                    title="Join me on NammaSplit"
                    message={`Connect with me on NammaSplit to split expenses!`}
                    onClose={() => setShowShareOptions(false)}
                />
            )}
        </div>
    );
}
