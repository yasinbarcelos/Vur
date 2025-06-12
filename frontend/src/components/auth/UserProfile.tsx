import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Edit3, Save, X, LogOut, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const profileSchema = z.object({
  email: z.string().email('Email inválido'),
  username: z.string()
    .min(3, 'Username deve ter pelo menos 3 caracteres')
    .max(50, 'Username deve ter no máximo 50 caracteres'),
  full_name: z.string().max(100, 'Nome deve ter no máximo 100 caracteres').optional(),
  bio: z.string().max(500, 'Bio deve ter no máximo 500 caracteres').optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface UserProfileProps {
  onClose?: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const { user, updateProfile, logout, isLoading } = useAuth();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      email: user?.email || '',
      username: user?.username || '',
      full_name: user?.full_name || '',
      bio: user?.bio || '',
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    try {
      await updateProfile(data);
      setIsEditing(false);
      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro na atualização",
        description: "Não foi possível atualizar o perfil",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    reset();
    setIsEditing(false);
  };

  const handleLogout = () => {
    logout();
    if (onClose) onClose();
  };

  const getInitials = (name?: string) => {
    if (!name) return user?.username?.slice(0, 2).toUpperCase() || 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!user) return null;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={user.profile_picture} />
              <AvatarFallback className="text-lg">
                {getInitials(user.full_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">
                {user.full_name || user.username}
              </CardTitle>
              <CardDescription>@{user.username}</CardDescription>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={user.is_active ? "default" : "secondary"}>
                  {user.is_active ? "Ativo" : "Inativo"}
                </Badge>
                {user.is_superuser && (
                  <Badge variant="outline" className="text-purple-600 border-purple-600">
                    <Shield className="w-3 h-3 mr-1" />
                    Admin
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Editar
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit(onSubmit)}
                  disabled={isSubmitting || !isDirty}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                disabled={!isEditing || isSubmitting}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                {...register('username')}
                disabled={!isEditing || isSubmitting}
                className={errors.username ? 'border-red-500' : ''}
              />
              {errors.username && (
                <p className="text-sm text-red-500">{errors.username.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Nome Completo</Label>
            <Input
              id="full_name"
              type="text"
              {...register('full_name')}
              disabled={!isEditing || isSubmitting}
              className={errors.full_name ? 'border-red-500' : ''}
            />
            {errors.full_name && (
              <p className="text-sm text-red-500">{errors.full_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              {...register('bio')}
              disabled={!isEditing || isSubmitting}
              placeholder="Conte um pouco sobre você..."
              className={errors.bio ? 'border-red-500' : ''}
              rows={3}
            />
            {errors.bio && (
              <p className="text-sm text-red-500">{errors.bio.message}</p>
            )}
          </div>
        </form>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Informações da Conta</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-gray-600">Membro desde</Label>
              <p className="font-medium">{formatDate(user.created_at)}</p>
            </div>
            <div>
              <Label className="text-gray-600">Último login</Label>
              <p className="font-medium">{formatDate(user.last_login)}</p>
            </div>
            <div>
              <Label className="text-gray-600">ID do usuário</Label>
              <p className="font-medium font-mono">#{user.id}</p>
            </div>
            <div>
              <Label className="text-gray-600">Status</Label>
              <p className="font-medium">
                {user.is_active ? 'Conta ativa' : 'Conta inativa'}
              </p>
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-red-600">Zona de Perigo</h3>
            <p className="text-sm text-gray-600">
              Ações irreversíveis relacionadas à sua conta
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={handleLogout}
            disabled={isLoading}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair da Conta
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserProfile;
