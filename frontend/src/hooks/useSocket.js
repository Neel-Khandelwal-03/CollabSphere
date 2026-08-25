'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
// The Socket.IO server attaches to the same HTTP server as the REST API
// (see backend server.js), just without the '/api' path prefix that
// every REST call uses.
const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

const SocketContext = createContext({ socket: null, connected: false, onlineByWorkspace: {} });

export function SocketProvider({ children }) {
  const status = useAuthStore((s) => s.status);
  const accessToken = useAuthStore((s) => s.accessToken);
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [onlineByWorkspace, setOnlineByWorkspace] = useState({});

  useEffect(() => {
    if (status !== 'authenticated' || !accessToken) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      setOnlineByWorkspace({});
      return;
    }

    const socket = io(SOCKET_URL, { auth: { token: accessToken }, reconnectionDelay: 1000 });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('presence:snapshot', (snapshot) => setOnlineByWorkspace(snapshot));
    socket.on('presence:update', ({ workspaceId, userId, online }) => {
      setOnlineByWorkspace((prev) => {
        const current = new Set(prev[workspaceId] || []);
        if (online) current.add(userId);
        else current.delete(userId);
        return { ...prev, [workspaceId]: [...current] };
      });
    });

    return () => socket.disconnect();
    // A stale access token isn't fatal here (the socket keeps working off
    // its original handshake auth even after the token has since been
    // refreshed elsewhere) — reconnecting on every access-token refresh
    // would drop the socket every ~15 minutes for no real benefit, so
    // this intentionally only depends on auth *status*, not the token
    // value itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, onlineByWorkspace }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}

export function useIsOnline(workspaceId, userId) {
  const { onlineByWorkspace } = useSocket();
  return (onlineByWorkspace[workspaceId] || []).includes(userId);
}
