import { Bell, User, BarChart3, LogOut, Settings, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import UserProfile from "@/components/auth/UserProfile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [showProfile, setShowProfile] = useState(false);

  const navigationItems = [
    { label: "Dashboard", path: "/dashboard", icon: "📊" },
    { label: "Monitoring", path: "/monitoring", icon: "📈" },
    { label: "Pipeline ML", path: "/pipeline", icon: "🔧" },
    { label: "Gerenciar Dados", path: "/data", icon: "💾" },
  ];

  const isActivePath = (path: string) => location.pathname === path;

  const getInitials = (name?: string) => {
    if (!name) return user?.username?.slice(0, 2).toUpperCase() || 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo e Título */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-white rounded-md">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold">TimeSeries Monitor</h1>
              <p className="text-xs text-blue-200">Plataforma de Análise Preditiva</p>
            </div>
          </div>

          {/* Menu de Navegação */}
          <div className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => (
              <Button
                key={item.path}
                variant="ghost"
                className={`text-white hover:bg-blue-500 hover:text-white px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActivePath(item.path) 
                    ? "bg-blue-700 text-white" 
                    : "text-blue-100 hover:text-white"
                }`}
                onClick={() => navigate(item.path)}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </Button>
            ))}
          </div>

          {/* Ações do usuário */}
          <div className="flex items-center space-x-4">
            {/* Notificações */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-blue-500 p-2"
              >
                <Bell className="w-5 h-5" />
              </Button>
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs"
              >
                3
              </Badge>
            </div>

            {/* Menu do usuário */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-blue-500 p-1 h-auto"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user?.profile_picture} />
                    <AvatarFallback className="text-xs bg-blue-500 text-white">
                      {getInitials(user?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.full_name || user?.username}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowProfile(true)}>
                  <User className="mr-2 h-4 w-4" />
                  Meu Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </DropdownMenuItem>
                {user?.is_superuser && (
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    <Shield className="mr-2 h-4 w-4" />
                    Administração
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Menu mobile */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-blue-500"
                >
                  ☰
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {navigationItems.map((item) => (
                  <DropdownMenuItem
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={isActivePath(item.path) ? "bg-blue-50" : ""}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Dialog do perfil do usuário */}
      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Perfil do Usuário</DialogTitle>
          </DialogHeader>
          <UserProfile onClose={() => setShowProfile(false)} />
        </DialogContent>
      </Dialog>
    </nav>
  );
};

export default Navbar;