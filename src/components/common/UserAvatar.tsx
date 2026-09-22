import React from 'react';
import { useAuth } from '../../context/AuthContext';

export const KNOWN_AVATARS: Record<string, string> = {
  'ADMIN': 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=250&q=80',
  'Devi Naidu': 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80',
  'Pradeep Kumar': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
  'Pamendra Singh Rajput': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
  'Vivek Yadav': 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=250&q=80',
  'Alankriti Singh': 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=250&q=80',
};

export const getRepAvatarUrl = (name: string, currentUser?: any): string => {
  if (!name) return `https://ui-avatars.com/api/?name=User&background=23328b&color=ffffff&bold=true&rounded=true&size=128`;
  if (currentUser && currentUser.userName && currentUser.userName.toLowerCase() === name.toLowerCase() && currentUser.profileUrl) {
    return currentUser.profileUrl;
  }
  if (KNOWN_AVATARS[name]) {
    return KNOWN_AVATARS[name];
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=23328b&color=ffffff&bold=true&rounded=true&size=128`;
};

interface UserAvatarProps {
  name: string;
  rank?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showRankBadge?: boolean;
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  rank,
  size = 'md',
  showRankBadge = true,
  className = '',
}) => {
  const { authState } = useAuth();
  const avatarUrl = getRepAvatarUrl(name, authState.user);
  const initials = (name || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase();

  const sizeClasses = {
    xs: 'w-6 h-6 text-[9px]',
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-12 h-12 text-sm',
  }[size];

  const getRankBadge = (r?: number) => {
    if (r === 1) return { label: '🥇', style: 'bg-amber-500 text-white shadow-amber-500/40' };
    if (r === 2) return { label: '🥈', style: 'bg-slate-400 text-white shadow-slate-400/40' };
    if (r === 3) return { label: '🥉', style: 'bg-amber-700 text-white shadow-amber-700/40' };
    return { label: String(r || ''), style: 'bg-slate-800 text-slate-100 border border-slate-600' };
  };

  const badgeInfo = rank ? getRankBadge(rank) : null;

  return (
    <div className={`relative shrink-0 select-none ${className}`}>
      <div className={`${sizeClasses} rounded-2xl overflow-hidden ring-2 ring-slate-200/80 dark:ring-slate-700/80 shadow-md bg-gradient-to-br from-indigo-500 to-sky-600 flex items-center justify-center text-white font-black`}>
        <img
          src={avatarUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <span className="absolute z-0">{initials}</span>
      </div>

      {showRankBadge && badgeInfo && (
        <div className={`absolute -bottom-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-black shadow-md ring-2 ring-white dark:ring-slate-900 ${badgeInfo.style}`}>
          {badgeInfo.label}
        </div>
      )}
    </div>
  );
};
