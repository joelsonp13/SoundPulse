#!/usr/bin/env python3
"""
Script para regenerar oauth.json com ytmusicapi 1.11.1+
Execute: python setup_oauth.py
"""

from ytmusicapi import setup_oauth
import json
import sys

# Client ID e Secret padrão do ytmusicapi (público)
DEFAULT_CLIENT_ID = "861556708454-d6dlm3lh05idd8npek18k6be8ba3oc68.apps.googleusercontent.com"
DEFAULT_CLIENT_SECRET = "SboVhoG9s0rNafixCSGGKXAT"

print("=" * 80)
print("CONFIGURACAO DO OAUTH - YOUTUBE MUSIC")
print("=" * 80)
print()
print("Este script ira:")
print("1. Abrir o navegador para autenticacao Google")
print("2. Gerar um novo oauth.json compativel com ytmusicapi 1.11.1")
print()
print("IMPORTANTE:")
print("   - Use uma conta Google valida")
print("   - Aceite as permissoes solicitadas")
print("   - O arquivo oauth.json sera salvo no diretorio atual")
print()
print("Usando credenciais OAuth padrao do ytmusicapi...")
print()

try:
    # Configurar OAuth (abrira navegador automaticamente)
    print("Abrindo navegador para autenticacao...")
    print()
    
    oauth_credentials = setup_oauth(
        filepath='oauth.json',
        client_id=DEFAULT_CLIENT_ID,
        client_secret=DEFAULT_CLIENT_SECRET,
        open_browser=True
    )
    
    print()
    print("=" * 80)
    print("SUCESSO!")
    print("=" * 80)
    print()
    print("Arquivo oauth.json criado com sucesso!")
    print()
    print("PROXIMOS PASSOS:")
    print()
    print("1. LOCAL:")
    print("   O arquivo oauth.json ja esta pronto para uso local")
    print()
    print("2. RENDER.COM:")
    print("   a) Abra o arquivo oauth.json")
    print("   b) Copie TODO o conteudo (Ctrl+A, Ctrl+C)")
    print("   c) Acesse: https://dashboard.render.com")
    print("   d) Va em: SoundPulse > Environment")
    print("   e) Edite a variavel OAUTH_JSON")
    print("   f) Cole o conteudo do arquivo")
    print("   g) Clique em 'Save Changes'")
    print()
    print("3. TESTAR:")
    print("   python app.py")
    print()
    print("=" * 80)
    
except KeyboardInterrupt:
    print()
    print("Cancelado pelo usuario")
    sys.exit(1)
    
except Exception as e:
    print()
    print("=" * 80)
    print("ERRO")
    print("=" * 80)
    print(f"Tipo: {type(e).__name__}")
    print(f"Mensagem: {str(e)}")
    print()
    print("POSSIVEIS SOLUCOES:")
    print("   - Verifique se tem navegador instalado")
    print("   - Tente novamente")
    print("   - Verifique sua conexao com internet")
    sys.exit(1)

