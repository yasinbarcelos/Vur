#!/usr/bin/env python3
"""
Servidor HTTP simples para servir o frontend VUR
Uso: python serve_test.py
Acesse: http://localhost:8080/auth
"""

import http.server
import socketserver
import webbrowser
import os
from pathlib import Path
import urllib.parse

PORT = 8080
FRONTEND_DIR = "frontend/dist"

class SPAHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)
    
    def end_headers(self):
        # Adicionar headers CORS para evitar problemas
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()
    
    def do_GET(self):
        # Parse da URL
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path
        
        # Se for uma rota do SPA (não é um arquivo), servir index.html
        if not path.startswith('/assets/') and not path.endswith(('.js', '.css', '.ico', '.png', '.jpg', '.svg', '.csv')):
            if path != '/' and not os.path.exists(os.path.join(FRONTEND_DIR, path.lstrip('/'))):
                # Redirecionar para index.html para SPA routing
                self.path = '/index.html'
        
        return super().do_GET()

def main():
    # Verificar se o diretório do frontend existe
    if not Path(FRONTEND_DIR).exists():
        print(f"❌ Diretório {FRONTEND_DIR} não encontrado!")
        print("Execute 'npm run build' no diretório frontend primeiro.")
        return
    
    # Verificar se o index.html existe
    if not Path(f"{FRONTEND_DIR}/index.html").exists():
        print(f"❌ Arquivo {FRONTEND_DIR}/index.html não encontrado!")
        print("Execute 'npm run build' no diretório frontend primeiro.")
        return
    
    print(f"🚀 Iniciando servidor VUR na porta {PORT}")
    print(f"📁 Servindo arquivos do diretório: {os.path.abspath(FRONTEND_DIR)}")
    print(f"🌐 Acesse: http://localhost:{PORT}")
    print(f"🔐 Login: http://localhost:{PORT}/auth")
    print(f"📊 Dashboard: http://localhost:{PORT}/dashboard")
    print("⏹️  Pressione Ctrl+C para parar o servidor")
    print("-" * 60)
    
    try:
        with socketserver.TCPServer(("", PORT), SPAHTTPRequestHandler) as httpd:
            # Abrir automaticamente no navegador
            webbrowser.open(f"http://localhost:{PORT}/auth")
            
            print(f"✅ Servidor VUR rodando em http://localhost:{PORT}")
            print(f"🎯 Backend API: http://localhost:8000")
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n🛑 Servidor parado pelo usuário")
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"❌ Porta {PORT} já está em uso!")
            print("Tente usar uma porta diferente ou pare o processo que está usando a porta.")
        else:
            print(f"❌ Erro ao iniciar servidor: {e}")

if __name__ == "__main__":
    main() 