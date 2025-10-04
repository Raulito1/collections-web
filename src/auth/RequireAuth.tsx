import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export default function RequireAuth({ children }: { children: React.ReactElement }) {
  const { session, loading } = useAuth();
  if (loading) return <div>Loading…</div>;
  return session ? children : <Navigate to="/login" replace />;
}