import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Brain, BarChart3, TrendingUp, Database, Settings, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import SimpleLoginForm from '@/components/auth/SimpleLoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import ConnectionTest from '@/components/debug/ConnectionTest';
import ResetSystem from '@/components/debug/ResetSystem';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showConnectionTest, setShowConnectionTest] = useState(false);
  const [showResetSystem, setShowResetSystem] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar autenticação simples
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('vur_auth_token');
      const tokenExpiry = localStorage.getItem('vur_token_expiry');
      
      if (token && tokenExpiry) {
        const expiryTime = parseInt(tokenExpiry);
        const now = Date.now();
        
        if (now < expiryTime) {
          setIsAuthenticated(true);
        } else {
          // Token expirado, limpar
          localStorage.removeItem('vur_auth_token');
          localStorage.removeItem('vur_token_expiry');
        }
      }
      
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  // Redirecionar se já estiver autenticado
  if (isAuthenticated) {
    return <Navigate to="/pipeline" replace />;
  }

  // Mostrar loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Brain className="w-12 h-12 mx-auto mb-4 text-blue-600 animate-pulse" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Lado esquerdo - Informações da plataforma */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-12 flex-col justify-center">
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <Brain className="w-10 h-10" />
            <h1 className="text-3xl font-bold">VUR</h1>
          </div>
          
          <h2 className="text-4xl font-bold mb-6">
            Plataforma de Séries Temporais
          </h2>
          
          <p className="text-xl mb-8 text-blue-100">
            Transforme seus dados temporais em insights poderosos com machine learning avançado.
          </p>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="bg-blue-500 p-2 rounded-lg">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Análise Avançada</h3>
                <p className="text-blue-100 text-sm">
                  Algoritmos clássicos e deep learning para previsões precisas
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-blue-500 p-2 rounded-lg">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Monitoramento Real-time</h3>
                <p className="text-blue-100 text-sm">
                  Acompanhe suas predições e métricas em tempo real
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-blue-500 p-2 rounded-lg">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Pipeline Completo</h3>
                <p className="text-blue-100 text-sm">
                  Do upload dos dados até o deploy do modelo em produção
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 p-4 bg-blue-500/20 rounded-lg border border-blue-400/30">
            <p className="text-sm text-blue-100">
              <strong>Novo na plataforma?</strong> Comece criando sua conta e explore 
              todas as funcionalidades de machine learning para séries temporais.
            </p>
          </div>
        </div>
      </div>

      {/* Lado direito - Formulários de autenticação */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <Brain className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">VUR</h1>
          </div>

          {/* Formulários */}
          {isLogin ? (
            <SimpleLoginForm onSwitchToRegister={() => setIsLogin(false)} />
          ) : (
            <RegisterForm onSwitchToLogin={() => setIsLogin(true)} />
          )}

          {/* Botões de diagnóstico */}
          <div className="mt-6 text-center space-y-2">
            <div className="flex gap-2 justify-center">
              <Dialog open={showConnectionTest} onOpenChange={setShowConnectionTest}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-gray-600">
                    <Settings className="w-4 h-4 mr-2" />
                    Testar Conectividade
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Diagnóstico de Conectividade</DialogTitle>
                  </DialogHeader>
                  <ConnectionTest />
                </DialogContent>
              </Dialog>

              <Dialog open={showResetSystem} onOpenChange={setShowResetSystem}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reset Sistema
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Reset do Sistema</DialogTitle>
                  </DialogHeader>
                  <ResetSystem />
                </DialogContent>
              </Dialog>
            </div>

            <p className="text-xs text-gray-500">
              Use "Reset Sistema" se estiver com problemas de login persistentes
            </p>
          </div>

          {/* Informações adicionais mobile */}
          <div className="lg:hidden mt-8 text-center">
            <p className="text-sm text-gray-600">
              Plataforma completa de machine learning para análise de séries temporais
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
