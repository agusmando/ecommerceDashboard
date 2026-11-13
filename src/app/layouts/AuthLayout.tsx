import { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-muted/40 p-4">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold">
          CR
        </div>
        <span className="text-lg font-semibold text-foreground">Canela en Rama</span>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
