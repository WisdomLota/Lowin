// components/Header.tsx
'use client';

import { signOut, useSession } from 'next-auth/react';
import { LogOut, User } from 'lucide-react';
import NotificationButton from './NotificationButton';
import { useRouter } from 'next/navigation';

export default function Header() {
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <header className="bg-gray-900 border-b border-purple-500 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between cursor-pointer" onClick={() =>router.push('/dashboard')}>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              LOWIN
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Discover coins ≤ $0.01
            </p>
          </div>

          {session?.user && (
            <div className="flex items-center gap-4">
              <NotificationButton />
              
              <div className="flex items-center gap-2">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-white">
                    {session.user.name || session.user.email}
                  </p>
                  <p className="text-xs text-gray-400">
                    {session.user.email}
                  </p>
                </div>
                
                <button
                  onClick={() => signOut()}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  title="Sign out"
                >
                  <LogOut size={20} className="text-gray-400" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-yellow-900 bg-opacity-20 border-t border-yellow-600 py-2 px-4">
        <p className="text-xs text-yellow-200 text-center">
          ⚠️ Not financial advice. Crypto is highly volatile. Always DYOR (Do Your Own Research).
        </p>
      </div>
    </header>
  );
}