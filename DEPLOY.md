# 🚀 Deploy no Render.com - Guia Completo

## ✅ Pré-requisitos
- [ ] Conta no GitHub
- [ ] Conta no Render.com (grátis)
- [ ] Código commitado no GitHub

---

## 📋 Passo a Passo

### 1️⃣ Preparar o Repositório GitHub

**a) Criar repositório no GitHub:**
```bash
# Se ainda não tem repositório remoto
git init
git add .
git commit -m "Preparar para deploy no Render"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
git push -u origin main
```

**b) Verificar arquivos importantes:**
- ✅ `requirements.txt` (com gunicorn)
- ✅ `render.yaml` (configuração automática)
- ✅ `app.py` (aplicação Flask)
- ✅ Pastas `static/` e `templates/`

---

### 2️⃣ Deploy no Render

**a) Acessar Render.com:**
1. Vá para: https://render.com
2. Clique em **"Get Started for Free"**
3. Faça login com **GitHub**

**b) Criar novo Web Service:**
1. No Dashboard, clique em **"New +"**
2. Selecione **"Web Service"**
3. Clique em **"Build and deploy from a Git repository"**
4. Clique em **"Next"**

**c) Conectar Repositório:**
1. Autorize o Render a acessar seu GitHub
2. Selecione o repositório do projeto
3. Clique em **"Connect"**

**d) Configurar Service (Render detecta automaticamente o render.yaml):**

Se o Render **NÃO** detectar o `render.yaml`, configure manualmente:

```
Name: testando-jamendo (ou qualquer nome)
Region: Oregon (US West) - mais próximo
Branch: main
Runtime: Python 3
Build Command: pip install -r requirements.txt
Start Command: gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120
Instance Type: Free
```

**e) Variáveis de Ambiente (opcional):**
- Se precisar de chaves de API, adicione em **Environment Variables**
- Por enquanto, não precisa de nenhuma

**f) Clicar em "Create Web Service":**
- O Render vai começar o build automaticamente
- Aguarde 5-10 minutos para o primeiro deploy

---

### 3️⃣ Acompanhar o Deploy

**Logs em tempo real:**
- Você verá os logs do build e deploy no painel
- Procure por mensagens de erro em vermelho
- Sucesso quando aparecer: `Your service is live 🎉`

**URL do seu site:**
- Após deploy, seu site estará em:
- `https://testando-jamendo.onrender.com`
- (ou o nome que você escolheu)

---

## 🔧 Problemas Comuns

### ❌ Erro: "Failed to build"
**Solução:**
- Verifique os logs de build
- Certifique-se que `requirements.txt` está correto
- Tente adicionar `runtime.txt` com:
  ```
  python-3.11.0
  ```

### ❌ Erro: "Application failed to respond"
**Solução:**
- Verifique se o `gunicorn` está no `requirements.txt`
- Confirme que o start command está correto:
  ```
  gunicorn app:app --bind 0.0.0.0:$PORT
  ```

### ❌ Site fica em "sleep mode"
**Normal no plano free:**
- Após 15 minutos de inatividade, o site "dorme"
- Primeira requisição demora 30-60 segundos para "acordar"
- Visitas subsequentes são rápidas

### ❌ Erro 502 Bad Gateway
**Solução:**
- Aumentar timeout no start command:
  ```
  gunicorn app:app --bind 0.0.0.0:$PORT --timeout 120
  ```

---

## 🔄 Atualizar o Site

**Qualquer commit no GitHub dispara deploy automático:**

```bash
# Fazer mudanças no código
git add .
git commit -m "Descrição das mudanças"
git push origin main
```

O Render detecta o push e faz deploy automático! 🎉

---

## 📊 Monitoramento

**Ver logs:**
- Dashboard → Seu Service → Logs
- Logs em tempo real de todas as requisições

**Ver métricas:**
- Dashboard → Seu Service → Metrics
- CPU, memória, requests, etc.

**Reiniciar manualmente:**
- Dashboard → Seu Service → Manual Deploy → Deploy latest commit

---

## 🎯 Próximos Passos (Opcional)

### Domínio Customizado
1. No Render: Settings → Custom Domains
2. Adicionar seu domínio
3. Configurar DNS (CNAME)

### Upgrade para Pago (se precisar)
- $7/mês: 
  - Sem sleep mode
  - Mais CPU/RAM
  - Múltiplas instâncias

---

## 🆘 Suporte

**Render Docs:** https://render.com/docs
**Render Community:** https://community.render.com

---

## ✅ Checklist Final

Antes de fazer deploy:
- [ ] Código funciona localmente
- [ ] `requirements.txt` tem todas as dependências
- [ ] `gunicorn` está no `requirements.txt`
- [ ] Código está no GitHub
- [ ] Sem segredos/senhas hardcoded no código
- [ ] Arquivos `.env` não estão commitados

**Tudo certo? Vamos para o deploy! 🚀**

