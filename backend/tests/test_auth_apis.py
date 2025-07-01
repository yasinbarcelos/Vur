#!/usr/bin/env python3
"""
Script de Teste Completo para APIs de Autenticação
VUR - Time Series Forecasting Platform

Este script testa todos os endpoints de autenticação:
- POST /auth/register - Registro de usuário
- POST /auth/login - Login de usuário  
- GET /auth/me - Perfil do usuário atual
- PUT /auth/profile - Atualização de perfil

Uso:
    python test_auth_apis.py
    python test_auth_apis.py --verbose
    python test_auth_apis.py --base-url http://localhost:8000
"""

import asyncio
import json
import sys
import argparse
from datetime import datetime
from typing import Dict, Any, Optional
import aiohttp
import random
import string

# Configurações
DEFAULT_BASE_URL = "http://localhost:8000/api/v1"
TIMEOUT = 30

class Colors:
    """Cores para output no terminal"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    PURPLE = '\033[95m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    BOLD = '\033[1m'
    END = '\033[0m'

class AuthAPITester:
    """Testador completo das APIs de Autenticação"""
    
    def __init__(self, base_url: str = DEFAULT_BASE_URL, verbose: bool = False):
        self.base_url = base_url.rstrip('/')
        self.verbose = verbose
        self.session: Optional[aiohttp.ClientSession] = None
        self.test_results = []
        self.access_token: Optional[str] = None
        
        # Dados de teste
        self.test_user_data = {
            "email": f"test_{self._random_string(8)}@example.com",
            "username": f"testuser_{self._random_string(6)}",
            "password": "TestPassword123!",
            "full_name": "Test User API"
        }
        
        # Usuário existente para testes de login
        self.existing_user = {
            "username": "testuser",
            "password": "TestPassword123"
        }
    
    def _random_string(self, length: int) -> str:
        """Gera string aleatória"""
        return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))
    
    def _print(self, message: str, color: str = Colors.WHITE, bold: bool = False):
        """Print colorido"""
        prefix = Colors.BOLD if bold else ""
        print(f"{prefix}{color}{message}{Colors.END}")
    
    def _print_success(self, message: str):
        """Print de sucesso"""
        self._print(f"✅ {message}", Colors.GREEN, bold=True)
    
    def _print_error(self, message: str):
        """Print de erro"""
        self._print(f"❌ {message}", Colors.RED, bold=True)
    
    def _print_warning(self, message: str):
        """Print de aviso"""
        self._print(f"⚠️  {message}", Colors.YELLOW, bold=True)
    
    def _print_info(self, message: str):
        """Print de informação"""
        self._print(f"ℹ️  {message}", Colors.BLUE)
    
    def _print_test_header(self, test_name: str):
        """Print cabeçalho do teste"""
        self._print(f"\n{'='*60}", Colors.CYAN)
        self._print(f"🧪 TESTE: {test_name}", Colors.CYAN, bold=True)
        self._print(f"{'='*60}", Colors.CYAN)
    
    async def _make_request(
        self, 
        method: str, 
        endpoint: str, 
        data: Optional[Dict] = None,
        headers: Optional[Dict] = None,
        expected_status: int = 200
    ) -> Dict[str, Any]:
        """Faz requisição HTTP"""
        url = f"{self.base_url}{endpoint}"
        
        if self.verbose:
            self._print_info(f"🌐 {method} {url}")
            if data:
                self._print_info(f"📤 Dados: {json.dumps(data, indent=2)}")
        
        try:
            async with self.session.request(
                method=method,
                url=url,
                json=data,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=TIMEOUT)
            ) as response:
                
                response_data = {}
                try:
                    response_data = await response.json()
                except:
                    response_data = {"text": await response.text()}
                
                if self.verbose:
                    self._print_info(f"📥 Status: {response.status}")
                    self._print_info(f"📥 Resposta: {json.dumps(response_data, indent=2)}")
                
                return {
                    "status": response.status,
                    "data": response_data,
                    "headers": dict(response.headers),
                    "success": response.status == expected_status
                }
                
        except Exception as e:
            self._print_error(f"Erro na requisição: {str(e)}")
            return {
                "status": 0,
                "data": {"error": str(e)},
                "headers": {},
                "success": False
            }
    
    def _record_test_result(self, test_name: str, success: bool, details: str = ""):
        """Registra resultado do teste"""
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })
    
    async def test_health_check(self):
        """Testa se a API está funcionando"""
        self._print_test_header("Health Check")
        
        result = await self._make_request("GET", "/../../health")
        
        if result["success"]:
            self._print_success("API está funcionando!")
            self._record_test_result("health_check", True)
            return True
        else:
            self._print_error("API não está respondendo!")
            self._record_test_result("health_check", False, f"Status: {result['status']}")
            return False
    
    async def test_register_new_user(self):
        """Testa registro de novo usuário"""
        self._print_test_header("Registro de Novo Usuário")
        
        result = await self._make_request(
            "POST", 
            "/auth/register",
            data=self.test_user_data,
            expected_status=201
        )
        
        if result["success"]:
            self._print_success("Usuário registrado com sucesso!")
            self._print_info(f"ID: {result['data'].get('id')}")
            self._print_info(f"Username: {result['data'].get('username')}")
            self._print_info(f"Email: {result['data'].get('email')}")
            self._record_test_result("register_new_user", True)
            return True
        else:
            self._print_error("Falha no registro!")
            self._print_error(f"Erro: {result['data'].get('detail', 'Erro desconhecido')}")
            self._record_test_result("register_new_user", False, result['data'].get('detail'))
            return False
    
    async def test_register_duplicate_user(self):
        """Testa registro de usuário duplicado"""
        self._print_test_header("Registro de Usuário Duplicado")
        
        result = await self._make_request(
            "POST", 
            "/auth/register",
            data=self.test_user_data,
            expected_status=400
        )
        
        if result["success"]:
            self._print_success("Erro de duplicação detectado corretamente!")
            self._record_test_result("register_duplicate_user", True)
            return True
        else:
            self._print_warning("Deveria ter retornado erro 400 para usuário duplicado")
            self._record_test_result("register_duplicate_user", False, f"Status: {result['status']}")
            return False
    
    async def test_login_new_user(self):
        """Testa login com usuário recém-criado"""
        self._print_test_header("Login com Usuário Recém-criado")
        
        login_data = {
            "username": self.test_user_data["username"],
            "password": self.test_user_data["password"]
        }
        
        result = await self._make_request(
            "POST",
            "/auth/login", 
            data=login_data
        )
        
        if result["success"]:
            self.access_token = result["data"].get("access_token")
            self._print_success("Login realizado com sucesso!")
            self._print_info(f"Token Type: {result['data'].get('token_type')}")
            self._print_info(f"Expires In: {result['data'].get('expires_in')} segundos")
            self._record_test_result("login_new_user", True)
            return True
        else:
            self._print_error("Falha no login!")
            self._print_error(f"Erro: {result['data'].get('detail', 'Erro desconhecido')}")
            self._record_test_result("login_new_user", False, result['data'].get('detail'))
            return False
    
    async def _ensure_test_user_exists(self):
        """Garante que o usuário de teste existe, criando se necessário"""
        self._print_info("🔍 Verificando se usuário de teste existe...")
        
        # Primeiro tenta fazer login para verificar se usuário existe
        login_result = await self._make_request(
            "POST",
            "/auth/login",
            data=self.existing_user
        )
        
        if login_result["success"]:
            self._print_info("✅ Usuário de teste já existe")
            return True
        elif login_result["status"] == 401:
            # Usuário não existe, vamos criar
            self._print_info("⚠️  Usuário de teste não existe, criando...")
            
            # Dados para criar o usuário de teste
            user_data = {
                "email": "testuser@example.com",
                "username": self.existing_user["username"],
                "password": self.existing_user["password"],
                "full_name": "Test User for CI/CD"
            }
            
            register_result = await self._make_request(
                "POST",
                "/auth/register",
                data=user_data,
                expected_status=201
            )
            
            if register_result["success"]:
                self._print_success("✅ Usuário de teste criado com sucesso!")
                self._print_info(f"ID: {register_result['data'].get('id')}")
                self._print_info(f"Username: {register_result['data'].get('username')}")
                return True
            else:
                self._print_error("❌ Falha ao criar usuário de teste!")
                self._print_error(f"Erro: {register_result['data'].get('detail', 'Erro desconhecido')}")
                return False
        else:
            self._print_error(f"❌ Erro inesperado ao verificar usuário: {login_result['status']}")
            return False

    async def test_login_existing_user(self):
        """Testa login com usuário existente (cria o usuário se não existir)"""
        self._print_test_header("Login com Usuário Existente")
        
        # Garantir que o usuário existe
        if not await self._ensure_test_user_exists():
            self._print_error("Falha ao garantir que usuário de teste existe!")
            self._record_test_result("login_existing_user", False, "Usuário de teste não pôde ser criado")
            return False
        
        # Agora fazer o login
        result = await self._make_request(
            "POST",
            "/auth/login",
            data=self.existing_user
        )
        
        if result["success"]:
            self.access_token = result["data"].get("access_token")
            self._print_success("Login com usuário existente realizado!")
            self._print_info(f"Token Type: {result['data'].get('token_type')}")
            self._print_info(f"Expires In: {result['data'].get('expires_in')} segundos")
            self._record_test_result("login_existing_user", True)
            return True
        else:
            self._print_error("Falha no login com usuário existente!")
            self._print_error(f"Erro: {result['data'].get('detail', 'Erro desconhecido')}")
            self._record_test_result("login_existing_user", False, result['data'].get('detail'))
            return False
    
    async def test_login_invalid_credentials(self):
        """Testa login com credenciais inválidas"""
        self._print_test_header("Login com Credenciais Inválidas")
        
        invalid_data = {
            "username": "usuario_inexistente",
            "password": "senha_errada"
        }
        
        result = await self._make_request(
            "POST",
            "/auth/login",
            data=invalid_data,
            expected_status=401
        )
        
        if result["success"]:
            self._print_success("Erro 401 retornado corretamente para credenciais inválidas!")
            self._record_test_result("login_invalid_credentials", True)
            return True
        else:
            self._print_warning("Deveria ter retornado erro 401 para credenciais inválidas")
            self._record_test_result("login_invalid_credentials", False, f"Status: {result['status']}")
            return False
    
    async def test_get_current_user(self):
        """Testa obtenção do usuário atual"""
        self._print_test_header("Obter Usuário Atual")
        
        if not self.access_token:
            self._print_error("Token não disponível! Execute o login primeiro.")
            self._record_test_result("get_current_user", False, "Token não disponível")
            return False
        
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        result = await self._make_request(
            "GET",
            "/auth/me",
            headers=headers
        )
        
        if result["success"]:
            user_data = result["data"]
            self._print_success("Dados do usuário obtidos com sucesso!")
            self._print_info(f"ID: {user_data.get('id')}")
            self._print_info(f"Username: {user_data.get('username')}")
            self._print_info(f"Email: {user_data.get('email')}")
            self._print_info(f"Nome Completo: {user_data.get('full_name')}")
            self._print_info(f"Ativo: {user_data.get('is_active')}")
            self._print_info(f"Superuser: {user_data.get('is_superuser')}")
            self._print_info(f"Último Login: {user_data.get('last_login')}")
            self._record_test_result("get_current_user", True)
            return True
        else:
            self._print_error("Falha ao obter dados do usuário!")
            self._print_error(f"Erro: {result['data'].get('detail', 'Erro desconhecido')}")
            self._record_test_result("get_current_user", False, result['data'].get('detail'))
            return False
    
    async def test_get_current_user_invalid_token(self):
        """Testa obtenção do usuário com token inválido"""
        self._print_test_header("Obter Usuário com Token Inválido")
        
        headers = {"Authorization": "Bearer token_invalido_123"}
        
        result = await self._make_request(
            "GET",
            "/auth/me",
            headers=headers,
            expected_status=401
        )
        
        if result["success"]:
            self._print_success("Erro 401 retornado corretamente para token inválido!")
            self._record_test_result("get_current_user_invalid_token", True)
            return True
        else:
            self._print_warning("Deveria ter retornado erro 401 para token inválido")
            self._record_test_result("get_current_user_invalid_token", False, f"Status: {result['status']}")
            return False
    
    async def test_update_profile(self):
        """Testa atualização de perfil"""
        self._print_test_header("Atualização de Perfil")
        
        if not self.access_token:
            self._print_error("Token não disponível! Execute o login primeiro.")
            self._record_test_result("update_profile", False, "Token não disponível")
            return False
        
        update_data = {
            "full_name": "Nome Atualizado via API",
            "bio": "Bio atualizada através do teste de API"
        }
        
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        result = await self._make_request(
            "PUT",
            "/auth/profile",
            data=update_data,
            headers=headers
        )
        
        if result["success"]:
            user_data = result["data"]
            self._print_success("Perfil atualizado com sucesso!")
            self._print_info(f"Nome Completo: {user_data.get('full_name')}")
            self._print_info(f"Bio: {user_data.get('bio')}")
            self._record_test_result("update_profile", True)
            return True
        else:
            self._print_error("Falha na atualização do perfil!")
            self._print_error(f"Erro: {result['data'].get('detail', 'Erro desconhecido')}")
            self._record_test_result("update_profile", False, result['data'].get('detail'))
            return False
    
    async def test_update_profile_invalid_token(self):
        """Testa atualização de perfil com token inválido"""
        self._print_test_header("Atualização de Perfil com Token Inválido")
        
        update_data = {"full_name": "Não deveria funcionar"}
        headers = {"Authorization": "Bearer token_invalido_123"}
        
        result = await self._make_request(
            "PUT",
            "/auth/profile",
            data=update_data,
            headers=headers,
            expected_status=401
        )
        
        if result["success"]:
            self._print_success("Erro 401 retornado corretamente para token inválido!")
            self._record_test_result("update_profile_invalid_token", True)
            return True
        else:
            self._print_warning("Deveria ter retornado erro 401 para token inválido")
            self._record_test_result("update_profile_invalid_token", False, f"Status: {result['status']}")
            return False
    
    def _print_summary(self):
        """Imprime resumo dos testes"""
        self._print(f"\n{'='*60}", Colors.PURPLE)
        self._print("📊 RESUMO DOS TESTES", Colors.PURPLE, bold=True)
        self._print(f"{'='*60}", Colors.PURPLE)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        self._print(f"Total de Testes: {total_tests}", Colors.WHITE, bold=True)
        self._print(f"✅ Passou: {passed_tests}", Colors.GREEN, bold=True)
        self._print(f"❌ Falhou: {failed_tests}", Colors.RED, bold=True)
        self._print(f"📈 Taxa de Sucesso: {(passed_tests/total_tests)*100:.1f}%", Colors.CYAN, bold=True)
        
        if failed_tests > 0:
            self._print("\n❌ TESTES QUE FALHARAM:", Colors.RED, bold=True)
            for result in self.test_results:
                if not result["success"]:
                    self._print(f"  • {result['test']}: {result['details']}", Colors.RED)
        
        self._print(f"\n{'='*60}", Colors.PURPLE)
    
    async def run_all_tests(self):
        """Executa todos os testes"""
        self._print("🚀 INICIANDO TESTES DAS APIs DE AUTENTICAÇÃO", Colors.CYAN, bold=True)
        self._print(f"🌐 Base URL: {self.base_url}", Colors.BLUE)
        self._print(f"⏰ Timeout: {TIMEOUT}s", Colors.BLUE)
        
        # Criar sessão HTTP
        connector = aiohttp.TCPConnector(limit=10)
        self.session = aiohttp.ClientSession(connector=connector)
        
        try:
            # Lista de testes na ordem correta
            tests = [
                self.test_health_check,
                self.test_register_new_user,
                self.test_register_duplicate_user,
                self.test_login_new_user,
                self.test_login_existing_user,
                self.test_login_invalid_credentials,
                self.test_get_current_user,
                self.test_get_current_user_invalid_token,
                self.test_update_profile,
                self.test_update_profile_invalid_token,
            ]
            
            # Executar testes
            for test in tests:
                try:
                    await test()
                    await asyncio.sleep(0.5)  # Pequena pausa entre testes
                except Exception as e:
                    self._print_error(f"Erro no teste {test.__name__}: {str(e)}")
                    self._record_test_result(test.__name__, False, str(e))
            
            # Imprimir resumo
            self._print_summary()
            
        finally:
            # Fechar sessão
            await self.session.close()

async def main():
    """Função principal"""
    parser = argparse.ArgumentParser(description="Testador de APIs de Autenticação VUR")
    parser.add_argument(
        "--base-url", 
        default=DEFAULT_BASE_URL,
        help=f"URL base da API (padrão: {DEFAULT_BASE_URL})"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Modo verboso (mostra detalhes das requisições)"
    )
    
    args = parser.parse_args()
    
    # Criar e executar testador
    tester = AuthAPITester(base_url=args.base_url, verbose=args.verbose)
    await tester.run_all_tests()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}⚠️  Testes interrompidos pelo usuário{Colors.END}")
        sys.exit(1)
    except Exception as e:
        print(f"\n{Colors.RED}❌ Erro fatal: {str(e)}{Colors.END}")
        sys.exit(1) 