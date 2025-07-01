#!/usr/bin/env python3
"""
Script Auxiliar para Executar Testes das APIs
VUR - Time Series Forecasting Platform

Este script permite executar testes específicos ou todos os testes
com diferentes configurações.

Uso:
    python run_tests.py                    # Todos os testes
    python run_tests.py --auth             # Apenas testes de autenticação
    python run_tests.py --quick            # Testes rápidos
    python run_tests.py --production       # Testes para produção
"""

import asyncio
import sys
import argparse
from pathlib import Path

# Adicionar o diretório atual ao path
sys.path.append(str(Path(__file__).parent))

from test_auth_apis import AuthAPITester, Colors

class TestRunner:
    """Runner para executar diferentes tipos de teste"""
    
    def __init__(self):
        self.results = {}
    
    def _print(self, message: str, color: str = Colors.WHITE, bold: bool = False):
        """Print colorido"""
        prefix = Colors.BOLD if bold else ""
        print(f"{prefix}{color}{message}{Colors.END}")
    
    def _print_header(self, title: str):
        """Print cabeçalho"""
        self._print(f"\n{'='*80}", Colors.CYAN)
        self._print(f"🚀 {title}", Colors.CYAN, bold=True)
        self._print(f"{'='*80}", Colors.CYAN)
    
    async def run_auth_tests(self, base_url: str, verbose: bool = False):
        """Executa testes de autenticação"""
        self._print_header("TESTES DE AUTENTICAÇÃO")
        
        tester = AuthAPITester(base_url=base_url, verbose=verbose)
        await tester.run_all_tests()
        
        # Calcular estatísticas
        total = len(tester.test_results)
        passed = sum(1 for r in tester.test_results if r["success"])
        
        self.results["auth"] = {
            "total": total,
            "passed": passed,
            "failed": total - passed,
            "success_rate": (passed / total) * 100 if total > 0 else 0
        }
        
        return passed == total
    
    async def run_quick_tests(self, base_url: str, verbose: bool = False):
        """Executa apenas testes rápidos (health check e login)"""
        self._print_header("TESTES RÁPIDOS")
        
        tester = AuthAPITester(base_url=base_url, verbose=verbose)
        
        # Criar sessão HTTP
        import aiohttp
        connector = aiohttp.TCPConnector(limit=10)
        tester.session = aiohttp.ClientSession(connector=connector)
        
        try:
            # Executar apenas testes essenciais
            await tester.test_health_check()
            
            # Se health check passou, executar testes de login
            if len(tester.test_results) > 0 and tester.test_results[-1]["success"]:
                await tester.test_login_existing_user()
                await tester.test_get_current_user()
            else:
                tester._print_warning("Pulando testes de login pois API não está respondendo")
            
            # Imprimir resumo
            total = len(tester.test_results)
            passed = sum(1 for r in tester.test_results if r["success"])
            
            self._print(f"\n📊 RESUMO RÁPIDO:", Colors.PURPLE, bold=True)
            self._print(f"✅ {passed}/{total} testes passaram", Colors.GREEN)
            
            self.results["quick"] = {
                "total": total,
                "passed": passed,
                "failed": total - passed,
                "success_rate": (passed / total) * 100 if total > 0 else 0
            }
            
            return passed == total
            
        finally:
            await tester.session.close()
    
    async def run_production_tests(self, base_url: str, verbose: bool = False):
        """Executa testes adequados para produção (sem criar usuários)"""
        self._print_header("TESTES DE PRODUÇÃO")
        
        tester = AuthAPITester(base_url=base_url, verbose=verbose)
        
        # Criar sessão HTTP
        import aiohttp
        connector = aiohttp.TCPConnector(limit=10)
        tester.session = aiohttp.ClientSession(connector=connector)
        
        try:
            # Executar apenas testes que não modificam dados
            await tester.test_health_check()
            await tester.test_login_invalid_credentials()
            await tester.test_get_current_user_invalid_token()
            await tester.test_update_profile_invalid_token()
            
            # Tentar login com usuário existente (se disponível)
            try:
                await tester.test_login_existing_user()
                await tester.test_get_current_user()
            except:
                self._print("⚠️  Usuário de teste não disponível em produção", Colors.YELLOW)
            
            # Imprimir resumo
            total = len(tester.test_results)
            passed = sum(1 for r in tester.test_results if r["success"])
            
            self._print(f"\n📊 RESUMO PRODUÇÃO:", Colors.PURPLE, bold=True)
            self._print(f"✅ {passed}/{total} testes passaram", Colors.GREEN)
            
            self.results["production"] = {
                "total": total,
                "passed": passed,
                "failed": total - passed,
                "success_rate": (passed / total) * 100 if total > 0 else 0
            }
            
            return passed == total
            
        finally:
            await tester.session.close()
    
    def print_final_summary(self):
        """Imprime resumo final de todos os testes executados"""
        if not self.results:
            return
        
        self._print_header("RESUMO FINAL")
        
        total_tests = sum(r["total"] for r in self.results.values())
        total_passed = sum(r["passed"] for r in self.results.values())
        total_failed = sum(r["failed"] for r in self.results.values())
        
        self._print(f"📊 ESTATÍSTICAS GERAIS:", Colors.WHITE, bold=True)
        self._print(f"   Total de Testes: {total_tests}", Colors.WHITE)
        self._print(f"   ✅ Passou: {total_passed}", Colors.GREEN)
        self._print(f"   ❌ Falhou: {total_failed}", Colors.RED)
        self._print(f"   📈 Taxa de Sucesso: {(total_passed/total_tests)*100:.1f}%", Colors.CYAN)
        
        self._print(f"\n📋 DETALHES POR CATEGORIA:", Colors.WHITE, bold=True)
        for category, stats in self.results.items():
            status_color = Colors.GREEN if stats["failed"] == 0 else Colors.RED
            self._print(f"   {category.upper()}: {stats['passed']}/{stats['total']} ({stats['success_rate']:.1f}%)", status_color)

async def main():
    """Função principal"""
    parser = argparse.ArgumentParser(description="Runner de Testes VUR")
    
    # Tipos de teste
    parser.add_argument("--auth", action="store_true", help="Executar testes de autenticação")
    parser.add_argument("--quick", action="store_true", help="Executar apenas testes rápidos")
    parser.add_argument("--production", action="store_true", help="Executar testes para produção")
    parser.add_argument("--all", action="store_true", help="Executar todos os tipos de teste")
    
    # Configurações
    parser.add_argument("--base-url", default="http://localhost:8000/api/v1", help="URL base da API")
    parser.add_argument("--verbose", "-v", action="store_true", help="Modo verboso")
    
    args = parser.parse_args()
    
    # Se nenhum tipo específico foi escolhido, executar testes de auth por padrão
    if not any([args.auth, args.quick, args.production, args.all]):
        args.auth = True
    
    runner = TestRunner()
    success = True
    
    try:
        if args.all:
            # Executar todos os tipos
            success &= await runner.run_quick_tests(args.base_url, args.verbose)
            success &= await runner.run_auth_tests(args.base_url, args.verbose)
            success &= await runner.run_production_tests(args.base_url, args.verbose)
        else:
            # Executar tipos específicos
            if args.quick:
                success &= await runner.run_quick_tests(args.base_url, args.verbose)
            
            if args.auth:
                success &= await runner.run_auth_tests(args.base_url, args.verbose)
            
            if args.production:
                success &= await runner.run_production_tests(args.base_url, args.verbose)
        
        # Imprimir resumo final
        runner.print_final_summary()
        
        # Código de saída
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}⚠️  Testes interrompidos pelo usuário{Colors.END}")
        sys.exit(1)
    except Exception as e:
        print(f"\n{Colors.RED}❌ Erro fatal: {str(e)}{Colors.END}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main()) 