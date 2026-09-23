import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchAllUsersFromSheet } from '../../services/api';

export const KNOWN_AVATARS: Record<string, string> = {
  // Main Team & Demo Accounts
  'Administrator': 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80',
  'ADMIN01': 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80',
  'ADMIN': 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80',

  'Rajesh Sharma': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
  'MGR101': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',

  'Sandeep Verma': 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=250&q=80',
  'MGR102': 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=250&q=80',

  'Rohan Mehra': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
  'EMP101': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',

  'Amit Verma': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
  'EMP102': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',

  'Suresh Yadav': 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=250&q=80',
  'EMP103': 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=250&q=80',

  'Manish Tiwari': 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=250&q=80',
  'EMP104': 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=250&q=80',

  'Vikas Deshmukh': 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=250&q=80',
  'EMP105': 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=250&q=80',

  'Sunil Chauhan': 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=250&q=80',
  'EMP106': 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=250&q=80',

  'Gaurav Mishra': 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=250&q=80',
  'EMP107': 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=250&q=80',

  'Nikhil Aggarwal': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
  'EMP108': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',

  'Pamendra Singh Rajput': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
  'Atul Baghmar': 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=250&q=80',
};

// Global in-memory cache for dynamically registered user profile pictures from Supabase
const dynamicUserAvatarCache: Record<string, string> = {};

export const registerDynamicUserAvatar = (userIdOrName: string, profileUrl: string) => {
  if (!userIdOrName || !profileUrl) return;
  dynamicUserAvatarCache[userIdOrName.trim().toLowerCase()] = profileUrl;
};

export const getRepAvatarUrl = (nameOrId: string, currentUser?: any): string => {
  if (!nameOrId) {
    return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80';
  }

  const cleanKey = nameOrId.trim();
  const lowerKey = cleanKey.toLowerCase();

  // 1. Current logged-in user match
  if (currentUser) {
    if (
      (currentUser.userName && currentUser.userName.toLowerCase() === lowerKey) ||
      (currentUser.id && currentUser.id.toLowerCase() === lowerKey)
    ) {
      if (currentUser.profileUrl) return currentUser.profileUrl;
    }
  }

  // 2. Dynamic cache from Supabase
  if (dynamicUserAvatarCache[lowerKey]) {
    return dynamicUserAvatarCache[lowerKey];
  }

  // 3. Known avatars mapping
  for (const [key, url] of Object.entries(KNOWN_AVATARS)) {
    if (key.toLowerCase() === lowerKey) {
      return url;
    }
  }

  // 4. Default high quality fallback
  return `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80`;
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
  const [avatarUrl, setAvatarUrl] = useState<string>(() => getRepAvatarUrl(name, authState.user));
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const url = getRepAvatarUrl(name, authState.user);
    setAvatarUrl(url);
    setImgError(false);

    // Sync dynamic avatars from Supabase in the background if not cached yet
    if (!dynamicUserAvatarCache[name.trim().toLowerCase()]) {
      fetchAllUsersFromSheet().then((users) => {
        users.forEach((u) => {
          if (u.profileUrl) {
            registerDynamicUserAvatar(u.userName, u.profileUrl);
            registerDynamicUserAvatar(u.id, u.profileUrl);
          }
        });
        const updatedUrl = getRepAvatarUrl(name, authState.user);
        setAvatarUrl(updatedUrl);
      }).catch(() => {});
    }
  }, [name, authState.user]);

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
        {!imgError && avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="font-bold">{initials}</span>
        )}
      </div>

      {showRankBadge && badgeInfo && (
        <div className={`absolute -bottom-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-black shadow-md ring-2 ring-white dark:ring-slate-900 ${badgeInfo.style}`}>
          {badgeInfo.label}
        </div>
      )}
    </div>
  );
};

