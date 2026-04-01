import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  loadingModal: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: ReactNode;
}

export function Modal({ isOpen, loadingModal , onClose, title, children, size = 'md', footer }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {loadingModal && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
        </div>
      )}

      {!loadingModal && (
        <>
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />
          
          {/* Modal */}
          <div className={cn(
            'relative bg-card border border-border rounded-lg shadow-xl w-full mx-4',
            'max-h-[90vh] flex flex-col',
            sizes[size]
          )}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-foreground">{title}</h2>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
                {footer}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
