// components/NotificationButton.tsx
'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function NotificationButton() {
  const { data: session } = useSession();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      setIsSupported(true);
      setIsEnabled(Notification.permission === 'granted');
    }
  }, []);

  const handleToggleNotifications = async () => {
    if (!session || !isSupported) return;

    if (isEnabled) {
      setIsEnabled(false);
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.register('/sw.js');
        
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
        const convertedKey = urlBase64ToUint8Array(vapidKey);
        
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey as BufferSource
        });

        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            keys: {
              p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
              auth: arrayBufferToBase64(subscription.getKey('auth'))
            }
          })
        });

        setIsEnabled(true);

        new Notification('LOWIN Notifications Enabled', {
          body: "You'll be notified when new coins drop to $0.01 or below!",
          icon: '/icon.png'
        });
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
    }
  };

  if (!session || !isSupported) return null;

  return (
    <button
      onClick={handleToggleNotifications}
      className={`p-2 rounded-lg transition-colors ${
        isEnabled
          ? 'bg-purple-600 text-white hover:bg-purple-700'
          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
      }`}
      title={isEnabled ? 'Disable notifications' : 'Enable notifications'}
    >
      {isEnabled ? <Bell size={20} /> : <BellOff size={20} />}
    </button>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}