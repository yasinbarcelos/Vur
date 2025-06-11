import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Activity, TrendingUp, Brain, BarChart3 } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-blue-600 rounded-full">
              <TrendingUp className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Plataforma de Séries Temporais
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Solução completa para modelagem, treinamento e monitoramento de modelos de séries temporais com IA avançada
          </p>
          
          {/* Dashboard Access Button */}
          <Button 
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg mb-8"
            size="lg"
          >
            <BarChart3 className="h-5 w-5 mr-2" />
            Acessar Dashboard
          </Button>
        </div>

        {/* Main Action Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          <Card className="hover:shadow-lg transition-shadow duration-300 border-2 hover:border-blue-300">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Building2 className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <CardTitle className="text-2xl text-gray-900">
                Criar Pipeline de Modelagem
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-6">
                Configure e treine novos modelos de séries temporais com nosso pipeline intuitivo e automatizado
              </p>
              <ul className="text-sm text-gray-500 mb-6 space-y-2">
                <li>• Upload e pré-processamento de dados</li>
                <li>• Engenharia de atributos automática</li>
                <li>• Divisão treino/teste inteligente</li>
                <li>• Configuração de modelos (uni/multivariável)</li>
                <li>• Treinamento com múltiplos algoritmos</li>
              </ul>
              <Button 
                onClick={() => navigate('/pipeline')}
                className="w-full"
                size="lg"
              >
                Iniciar Novo Pipeline
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300 border-2 hover:border-green-300">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <Activity className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-2xl text-gray-900">
                Monitoramento de Modelos
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-6">
                Acompanhe modelos em produção com previsões em tempo real e detecção automática de drift
              </p>
              <ul className="text-sm text-gray-500 mb-6 space-y-2">
                <li>• Visualização de modelos em tempo real</li>
                <li>• Previsões futuras automáticas</li>
                <li>• Detecção de drift de dados</li>
                <li>• Histórico de performance</li>
                <li>• Retreinamento inteligente</li>
              </ul>
              <Button 
                onClick={() => navigate('/monitoring')}
                variant="outline"
                className="w-full border-green-600 text-green-600 hover:bg-green-50"
                size="lg"
              >
                Acessar Monitoramento
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            Recursos Avançados
          </h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="p-6 bg-white rounded-lg shadow-sm">
              <Brain className="h-8 w-8 text-purple-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">IA Avançada</h3>
              <p className="text-sm text-gray-600">
                Algoritmos LSTM, ARIMA, Prophet e Random Forest
              </p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-sm">
              <TrendingUp className="h-8 w-8 text-orange-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Previsões Precisas</h3>
              <p className="text-sm text-gray-600">
                Modelagem uni e multivariável com múltiplos horizontes
              </p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-sm">
              <Activity className="h-8 w-8 text-red-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Monitoramento Contínuo</h3>
              <p className="text-sm text-gray-600">
                Detecção automática de drift e alertas inteligentes
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
