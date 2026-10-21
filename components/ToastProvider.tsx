"use client";
import React, { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react';
import { X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const DURATION_MS: Record<ToastType, number> = { success: 3500, info: 3500, error: 7000 };

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const nextId = useRef(0);

    const removeToast = useCallback((id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showToast = useCallback(
        (message: string, type: ToastType = 'info') => {
            const id = ++nextId.current;
            setToasts((prev) => [...prev.filter((t) => t.message !== message), { id, message, type }]);
            setTimeout(() => removeToast(id), DURATION_MS[type]);
        },
        [removeToast]
    );

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div
                className="fixed bottom-4 right-4 left-4 sm:left-auto z-[1000] flex flex-col gap-2 items-stretch sm:items-end"
                aria-live="polite"
            >
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        role={toast.type === 'error' ? 'alert' : 'status'}
                        className={`
              sm:max-w-md px-4 py-3 rounded-lg shadow-lg flex items-start gap-3 text-sm leading-snug text-white
              ${toast.type === 'error' ? 'bg-red-600' : ''}
              ${toast.type === 'success' ? 'bg-green-600' : ''}
              ${toast.type === 'info' ? 'bg-gray-800' : ''}
            `}
                    >
                        <span className="flex-1">{toast.message}</span>
                        <button
                            type="button"
                            onClick={() => removeToast(toast.id)}
                            className="opacity-80 hover:opacity-100 shrink-0"
                            aria-label="Dismiss notification"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
