import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ToastMessage } from '../../types';

interface ToastItemProps {
  toast: ToastMessage;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const duration = toast.duration || 4000;
  const [progress, setProgress] = useState(100);
  const [isHovered, setIsHovered] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(duration);

  useEffect(() => {
    if (isHovered) {
      remainingTimeRef.current = (progress / 100) * duration;
      return;
    }

    startTimeRef.current = Date.now();
    const initialRemaining = remainingTimeRef.current;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const currentRemaining = Math.max(0, initialRemaining - elapsed);
      const newProgress = (currentRemaining / duration) * 100;
      setProgress(newProgress);

      if (currentRemaining <= 0) {
        clearInterval(interval);
        onRemove(toast.id);
      }
    }, 25);

    return () => clearInterval(interval);
  }, [isHovered, onRemove, toast.id, duration]);

  const typeStyles = {
    success: {
      icon: CheckCircle2,
      iconColor: 'text-emerald-500 dark:text-emerald-400',
      iconBox: 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20 dark:border-emerald-500/30',
      border: 'border-emerald-500/30 dark:border-emerald-500/30',
      glow: 'shadow-[0_8px_20px_-4px_rgba(16,185,129,0.15)] dark:shadow-[0_10px_25px_rgba(0,0,0,0.5),0_0_15px_rgba(16,185,129,0.18)]',
      progressGradient: 'from-emerald-500 to-teal-400',
      tagText: 'text-emerald-600 dark:text-emerald-400',
    },
    error: {
      icon: AlertCircle,
      iconColor: 'text-rose-500 dark:text-rose-400',
      iconBox: 'bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/20 dark:border-rose-500/30',
      border: 'border-rose-500/30 dark:border-rose-500/30',
      glow: 'shadow-[0_8px_20px_-4px_rgba(244,63,94,0.15)] dark:shadow-[0_10px_25px_rgba(0,0,0,0.5),0_0_15px_rgba(244,63,94,0.18)]',
      progressGradient: 'from-rose-500 to-red-500',
      tagText: 'text-rose-600 dark:text-rose-400',
    },
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-amber-500 dark:text-amber-400',
      iconBox: 'bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/20 dark:border-amber-500/30',
      border: 'border-amber-500/30 dark:border-amber-500/30',
      glow: 'shadow-[0_8px_20px_-4px_rgba(245,158,11,0.15)] dark:shadow-[0_10px_25px_rgba(0,0,0,0.5),0_0_15px_rgba(245,158,11,0.18)]',
      progressGradient: 'from-amber-500 to-orange-400',
      tagText: 'text-amber-600 dark:text-amber-400',
    },
    info: {
      icon: Info,
      iconColor: 'text-sky-500 dark:text-sky-400',
      iconBox: 'bg-sky-500/10 dark:bg-sky-500/20 border-sky-500/20 dark:border-sky-500/30',
      border: 'border-sky-500/30 dark:border-sky-500/30',
      glow: 'shadow-[0_8px_20px_-4px_rgba(14,165,233,0.15)] dark:shadow-[0_10px_25px_rgba(0,0,0,0.5),0_0_15px_rgba(14,165,233,0.18)]',
      progressGradient: 'from-sky-500 to-blue-500',
      tagText: 'text-sky-600 dark:text-sky-400',
    },
  };

  const current = typeStyles[toast.type] || typeStyles.info;
  const IconComponent = current.icon;

  return (
    <motion.div
      layout
      drag="x"
      dragConstraints={{ left: 0, right: 180 }}
      dragElastic={0.5}
      onDragEnd={(_, info) => {
        if (info.offset.x > 70 || info.velocity.x > 250) {
          onRemove(toast.id);
        }
      }}
      initial={{ opacity: 0, y: -16, scale: 0.94, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ 
        opacity: 0, 
        x: 60, 
        scale: 0.9, 
        filter: 'blur(3px)',
        transition: { duration: 0.18, ease: 'easeIn' } 
      }}
      whileHover={{ scale: 1.015, transition: { duration: 0.15 } }}
      transition={{ 
        type: 'spring' as const, 
        damping: 24, 
        stiffness: 420,
        layout: { duration: 0.2, ease: 'easeOut' }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`pointer-events-auto relative overflow-hidden rounded-xl border backdrop-blur-xl px-3.5 py-2.5 cursor-grab active:cursor-grabbing select-none transition-colors duration-150 bg-white/95 dark:bg-slate-900/95 ${current.border} ${current.glow}`}
    >
      <div className="flex items-center gap-2.5 relative z-10">
        {/* Compact Glowing Icon */}
        <div className={`w-7 h-7 rounded-lg border shrink-0 flex items-center justify-center ${current.iconBox}`}>
          <IconComponent className={`w-3.5 h-3.5 ${current.iconColor}`} />
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0 pr-1">
          <h4 className="text-xs font-bold leading-none tracking-tight text-slate-900 dark:text-white truncate">
            {toast.title}
          </h4>
          {toast.message && (
            <p className="text-[11px] text-slate-500 dark:text-slate-300 leading-snug mt-1 line-clamp-2">
              {toast.message}
            </p>
          )}
        </div>

        {/* Small Close Button */}
        <motion.button
          whileHover={{ scale: 1.15, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(toast.id);
          }}
          className="shrink-0 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </motion.button>
      </div>

      {/* Slim Modern Progress Countdown Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-100 dark:bg-slate-800/80 overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${current.progressGradient} transition-all duration-75 ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useAuth();

  return (
    <div 
      aria-live="polite"
      className="fixed top-16 sm:top-5 right-3 sm:right-5 left-3 sm:left-auto z-[9999] flex flex-col gap-2 max-w-[340px] sm:w-[340px] mx-auto sm:mx-0 pointer-events-none"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={removeToast}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
