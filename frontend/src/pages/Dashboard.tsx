import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Database, AlertTriangle } from "lucide-react";

const Dashboard = () => {
  const stats = [
    {
      title: "Modelos Ativos",
      value: "12",
      description: "Modelos em produção",
      icon: BarChart3,
      trend: "+2 este mês"
    },
    {
      title: "Precisão Média",
      value: "94.2%",
      description: "Across all models",
      icon: TrendingUp,
      trend: "+1.2% vs último mês"
    },
    {
      title: "Datasets",
      value: "45",
      description: "Datasets disponíveis",
      icon: Database,
      trend: "+5 esta semana"
    },
    {
      title: "Alertas",
      value: "3",
      description: "Requerem atenção",
      icon: AlertTriangle,
      trend: "2 novos hoje"
    }
  ];

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-lg text-gray-600">Visão geral dos seus modelos de séries temporais</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-gray-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-gray-600 mt-1">{stat.description}</p>
                  <p className="text-xs text-green-600 mt-1">{stat.trend}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Atividade Recente</CardTitle>
              <CardDescription>Últimas ações nos seus modelos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Modelo Sales_Forecast treinado com sucesso</p>
                    <p className="text-xs text-gray-500">há 2 horas</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Novo dataset importado: Q4_Sales_Data</p>
                    <p className="text-xs text-gray-500">há 4 horas</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Alerta: Modelo Inventory_Prediction com baixa precisão</p>
                    <p className="text-xs text-gray-500">há 6 horas</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Próximas Tarefas</CardTitle>
              <CardDescription>Ações recomendadas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Retreinar modelo Customer_Churn</p>
                    <p className="text-xs text-gray-500">Vence em 2 dias</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Revisar pipeline de dados</p>
                    <p className="text-xs text-gray-500">Agendado para amanhã</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Backup automático dos modelos</p>
                    <p className="text-xs text-gray-500">Executado diariamente</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 