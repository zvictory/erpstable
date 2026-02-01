import React from 'react';
import ShellClient from './ShellClient';
import { UserRole } from '@/auth.config';
import { auth } from '@/auth';

export default async function Shell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userRole = session?.user?.role as UserRole | undefined;

  return <ShellClient userRole={userRole}>{children}</ShellClient>;
}
