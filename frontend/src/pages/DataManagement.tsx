import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Database, Download, Trash2 } from "lucide-react";

const DataManagement = () => {
  const datasets = [
    { name: "Sales_Data_2024", size: "2.3 MB", lastModified: "2024-01-15", records: "10,000" },
    { name: "Customer_Behavior", size: "5.1 MB", lastModified: "2024-01-14", records: "25,000" },
    { name: "Inventory_History", size: "1.8 MB", lastModified: "2024-01-13", records: "8,500" },
    { name: "Market_Trends", size: "3.2 MB", lastModified: "2024-01-12", records: "15,000" },
  ];

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Gerenciar Dados</h1>
          <p className="text-lg text-gray-600">Gerencie seus datasets e fontes de dados</p>
        </div>

        {/* Action Button */}
        <div className="flex justify-end mb-6">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Upload className="w-4 h-4 mr-2" />
            Importar Dataset
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total de Datasets
              </CardTitle>
              <Database className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">45</div>
              <p className="text-xs text-gray-600 mt-1">+5 esta semana</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Espaço Utilizado
              </CardTitle>
              <Database className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12.4 GB</div>
              <p className="text-xs text-gray-600 mt-1">de 100 GB disponível</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Últimas Atualizações
              </CardTitle>
              <Database className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-gray-600 mt-1">nas últimas 24h</p>
            </CardContent>
          </Card>
        </div>

        {/* Datasets Table */}
        <Card>
          <CardHeader>
            <CardTitle>Datasets Disponíveis</CardTitle>
            <CardDescription>Gerencie seus datasets e visualize informações</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {datasets.map((dataset, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <Database className="w-8 h-8 text-blue-600" />
                    <div>
                      <h3 className="font-medium">{dataset.name}</h3>
                      <p className="text-sm text-gray-500">
                        {dataset.records} registros • {dataset.size} • Modificado em {dataset.lastModified}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                    <Button variant="outline" size="sm">
                      Visualizar
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DataManagement; 