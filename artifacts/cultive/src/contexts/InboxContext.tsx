// @refresh reset
import { createContext, useContext } from 'react';
import { useInboxMessages, type InboxMessage } from '../hooks/useInboxMessages';

type InboxContextValue = {
  messages: InboxMessage[];
  unreadCount: number;
  loading: boolean;
  signedIn: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => void;
  markAllRead: () => void;
};

const InboxContext = createContext<InboxContextValue | null>(null);

export function InboxProvider({ children }: { children: React.ReactNode }) {
  const value = useInboxMessages();
  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>;
}

export function useInbox(): InboxContextValue {
  const ctx = useContext(InboxContext);
  if (!ctx) throw new Error('useInbox must be used within InboxProvider');
  return ctx;
}
