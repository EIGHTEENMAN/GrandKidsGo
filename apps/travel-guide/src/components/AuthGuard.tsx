'use client';

import { useState, useEffect, ReactNode } from 'react';
import { isLoggedIn } from '@/lib/auth';
import AuthModal from './AuthModal';

type AuthGuardProps = {
  children: ReactNode;
  mode?: 'optional' | 'required';
  onGuarded?: () => void;
};

export default function AuthGuard({ children, mode = 'optional', onGuarded }: AuthGuardProps) {
  const [showModal, setShowModal] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      setShowModal(true);
    } else {
      setAuthed(true);
    }
  }, []);

  const handleLogin = () => {
    setAuthed(true);
    setShowModal(false);
    onGuarded?.();
  };

  const handleClose = () => {
    setShowModal(false);
    if (mode === 'required' && !isLoggedIn()) {
      setShowModal(true);
    }
  };

  if (authed || isLoggedIn()) {
    return <>{children}</>;
  }

  return (
    <>
      {mode === 'optional' && children}
      <AuthModal
        open={showModal}
        onClose={handleClose}
        onLogin={handleLogin}
        force={mode === 'required'}
      />
    </>
  );
}
