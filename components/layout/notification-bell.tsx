'use client'

import { useState, useRef, useEffect } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import { cn } from '@/lib/utils'

export function NotificationBell() {
  const { notifications, priceAlerts, unreadCount, markAsRead, markAllAsRead, clearNotification, removePriceAlert } = useNotifications()
  const [open, setOpen] = useState(false)
  const [expandedNotif, setExpandedNotif] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<'notifications' | 'alerts'>('notifications')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-1.5 rounded text-zinc-400 hover:text-white hover:bg-[#2a1a00] transition-colors"
      >
        {/* Bell SVG */}
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#F32400] rounded-full text-xs text-white flex items-center justify-center font-mono">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-80 bg-[#1a0f00] border border-[#874708]/20 rounded-lg shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#874708]/20">
            <div className="flex gap-2">
              <button onClick={() => setActiveView('notifications')}
                className={cn('text-sm font-medium', activeView === 'notifications' ? 'text-white' : 'text-zinc-500')}>
                Notifications
              </button>
              <button onClick={() => setActiveView('alerts')}
                className={cn('text-sm font-medium', activeView === 'alerts' ? 'text-white' : 'text-zinc-500')}>
                Alerts {priceAlerts.filter(a => !a.triggered).length > 0 && `(${priceAlerts.filter(a => !a.triggered).length})`}
              </button>
            </div>
            {activeView === 'notifications' && unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs text-[#32BC00] hover:text-[#32BC00]">
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto">
            {activeView === 'notifications' ? (
              notifications.length === 0 ? (
                <div className="py-8 text-center text-zinc-500 text-sm">No notifications</div>
              ) : (
                notifications.slice(0, 20).map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => { markAsRead(notif.id); setExpandedNotif(expandedNotif === notif.id ? null : notif.id) }}
                    className={cn('px-4 py-2.5 border-b border-[#874708]/10 cursor-pointer hover:bg-[#2a1a00]/50 transition-colors', !notif.read && 'bg-[#2a1a00]/30')}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0',
                            notif.type === 'delisting' ? 'bg-red-400' : notif.type === 'price_alert' ? 'bg-emerald-400' : 'bg-[#FF8D19]'
                          )} />
                          <p className="text-sm font-medium text-white truncate">{notif.title}</p>
                        </div>
                        <p className={cn('text-xs text-zinc-500 mt-0.5', expandedNotif === notif.id ? 'whitespace-pre-wrap' : 'line-clamp-2')}>{notif.message}</p>
                        <p className="text-xs text-zinc-600 mt-1">
                          {new Date(notif.created_at).toLocaleDateString()} · {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); clearNotification(notif.id) }} className="text-zinc-600 hover:text-[#F32400] text-xs shrink-0 mt-0.5">×</button>
                    </div>
                  </div>
                ))
              )
            ) : (
              priceAlerts.filter(a => !a.triggered).length === 0 ? (
                <div className="py-8 text-center text-zinc-500 text-sm">No active alerts</div>
              ) : (
                priceAlerts.filter(a => !a.triggered).map((alert) => (
                  <div key={alert.id} className="px-4 py-2.5 border-b border-[#874708]/10 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white">{alert.coin_symbol}</p>
                      <p className="text-xs text-zinc-500">
                        {alert.direction === 'above' ? 'Goes above' : 'Goes below'} ${alert.target_price < 0.0001 ? alert.target_price.toFixed(8) : alert.target_price}
                      </p>
                    </div>
                    <button onClick={() => removePriceAlert(alert.id)} className="text-zinc-600 hover:text-[#F32400] text-xs">Remove</button>
                  </div>
                ))
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}