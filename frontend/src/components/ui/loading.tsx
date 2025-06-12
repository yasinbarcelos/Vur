import React from 'react';
import { Brain, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

const Loading: React.FC<LoadingProps> = ({ 
  size = 'md', 
  text = 'Carregando...', 
  className,
  fullScreen = false 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const containerClasses = fullScreen 
    ? 'min-h-screen flex items-center justify-center bg-gray-50'
    : 'flex items-center justify-center p-4';

  return (
    <div className={cn(containerClasses, className)}>
      <div className="text-center">
        <div className="flex justify-center mb-4">
          {fullScreen ? (
            <Brain className={cn(sizeClasses[size], 'text-blue-600 animate-pulse')} />
          ) : (
            <Loader2 className={cn(sizeClasses[size], 'text-blue-600 animate-spin')} />
          )}
        </div>
        <p className={cn(textSizeClasses[size], 'text-gray-600')}>{text}</p>
      </div>
    </div>
  );
};

// Componente para loading inline
export const InlineLoading: React.FC<{ text?: string; size?: 'sm' | 'md' }> = ({ 
  text = 'Carregando...', 
  size = 'sm' 
}) => {
  return (
    <div className="flex items-center gap-2">
      <Loader2 className={cn(
        size === 'sm' ? 'w-4 h-4' : 'w-5 h-5',
        'text-blue-600 animate-spin'
      )} />
      <span className={cn(
        size === 'sm' ? 'text-sm' : 'text-base',
        'text-gray-600'
      )}>
        {text}
      </span>
    </div>
  );
};

// Componente para loading de página completa
export const FullPageLoading: React.FC<{ text?: string }> = ({ 
  text = 'Carregando aplicação...' 
}) => {
  return <Loading size="lg" text={text} fullScreen />;
};

// Componente para loading de autenticação
export const AuthLoading: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <Brain className="w-12 h-12 mx-auto mb-4 text-blue-600 animate-pulse" />
        <p className="text-lg text-gray-600">Verificando autenticação...</p>
      </div>
    </div>
  );
};

export default Loading;
