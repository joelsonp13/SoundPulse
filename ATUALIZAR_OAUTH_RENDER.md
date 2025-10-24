# 🔐 ATUALIZAR OAUTH NO RENDER.COM

## ✅ Situação Atual

- ✅ OAuth configurado e funcionando LOCALMENTE
- ✅ Arquivo `oauth.json` gerado com sucesso
- ✅ Servidor local testado e funcionando (porta 5000)
- ❌ RENDER.COM precisa do novo `oauth.json`

---

## 📋 PASSOS PARA ATUALIZAR RENDER.COM

### 1️⃣ Copiar conteúdo do oauth.json

**Windows:**
```bash
type oauth.json | clip
```
Ou abra o arquivo `oauth.json` no editor, selecione tudo (Ctrl+A) e copie (Ctrl+C).

**Linux/Mac:**
```bash
cat oauth.json | pbcopy
```

---

### 2️⃣ Acessar o Render Dashboard

1. Abra: https://dashboard.render.com
2. Faça login com sua conta
3. Clique em **SoundPulse** (seu Web Service)

---

### 3️⃣ Atualizar variável OAUTH_JSON

1. No menu lateral, clique em **Environment**
2. Procure pela variável **OAUTH_JSON**
3. Clique no ícone de **editar** (lápis) ao lado dela
4. **Delete** o conteúdo antigo
5. **Cole** o novo conteúdo que você copiou (Ctrl+V)
6. Clique em **Save Changes** (botão azul no topo)

---

### 4️⃣ Aguardar redeploy automático

O Render.com irá:
- Detectar a mudança
- Reiniciar automaticamente o serviço
- Aplicar o novo OAuth

**Tempo estimado:** 2-3 minutos

---

### 5️⃣ Verificar logs do Render

1. No menu lateral, clique em **Logs**
2. Procure por estas mensagens:
   ```
   [OAuth] OAuth encontrado em variavel de ambiente...
   [OK] YTMusic conectado com sucesso (OAuth via ENV)!
   ```

Se você ver essas mensagens, **SUCESSO!** ✅

---

## ❓ PROBLEMAS?

### Erro: `RefreshingToken.__init__() got an unexpected keyword argument 'client_id'`

**Solução:** Você copiou o oauth.json antigo. Use o novo que foi gerado pelo `setup_oauth.py`.

---

### Erro: `yt-dlp: Sign in to confirm you're not a bot`

**Solução:** O OAuth não está ativo. Verifique se:
1. A variável OAUTH_JSON foi atualizada corretamente
2. O conteúdo foi colado COMPLETO (sem cortes)
3. O serviço foi reiniciado

---

### Como testar se está funcionando?

Acesse: https://soundpulse.onrender.com

Tente reproduzir uma música. Se funcionar, o OAuth está ativo! ✅

---

## 🔄 PRÓXIMOS PASSOS APÓS ATUALIZAR

1. **Teste no Render.com:**
   - Busque por uma música
   - Tente reproduzir
   - Verifique se o áudio toca sem erro 404

2. **Commit das mudanças:**
   ```bash
   git add .
   git commit -m "Atualizar OAuth para ytmusicapi 1.11+ e remover emojis"
   git push origin main
   ```

3. **Opcional: Deletar arquivos temporários:**
   ```bash
   del setup_oauth.py remove_emojis.py test_oauth.ps1
   ```

---

## 📊 ARQUIVOS MODIFICADOS

- ✅ `app.py` - Removidos 92 emojis para compatibilidade Windows
- ✅ `oauth.json` - Novo arquivo OAuth compatível com ytmusicapi 1.11+
- ✅ `setup_oauth.py` - Script para regenerar OAuth
- ✅ `requirements.txt` - ytmusicapi>=1.8.0, yt-dlp>=2025.10.14

---

## 🆘 SUPORTE

Se mesmo após seguir todos os passos o streaming não funcionar no Render.com:

1. Verifique os logs do Render para mensagens de erro
2. Confirme que a variável OAUTH_JSON foi salva corretamente
3. Tente fazer um "Manual Deploy" no Render Dashboard

---

**Data de criação:** 2025-10-24
**Versão ytmusicapi:** 1.11.1
**Versão yt-dlp:** 2025.10.22

