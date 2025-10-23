# 🚀 Deploy Rápido - Render.com

## ⚡ Comandos Git (Copie e Cole)

### 1️⃣ Verificar status
```bash
git status
```

### 2️⃣ Adicionar todos os arquivos
```bash
git add .
```

### 3️⃣ Fazer commit
```bash
git commit -m "Preparar deploy no Render.com"
```

### 4️⃣ Se AINDA NÃO tem repositório GitHub:

```bash
# Criar repositório no GitHub primeiro em: https://github.com/new
# Depois execute:

git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
git branch -M main
git push -u origin main
```

### 5️⃣ Se JÁ TEM repositório GitHub:

```bash
git push origin main
```

---

## 🎯 Próximo Passo: Render.com

1. Acesse: **https://render.com**
2. Clique em **"Get Started for Free"**
3. Faça login com **GitHub**
4. Clique em **"New +"** → **"Web Service"**
5. Selecione seu repositório
6. Clique em **"Connect"**
7. Configurações (o Render detecta automaticamente):
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app --bind 0.0.0.0:$PORT`
8. Clique em **"Create Web Service"**
9. Aguarde 5-10 minutos ⏳
10. **PRONTO!** Seu site estará no ar! 🎉

---

## 📝 Arquivos Criados para Deploy

✅ `requirements.txt` - Dependências Python (com gunicorn)  
✅ `render.yaml` - Configuração automática do Render  
✅ `runtime.txt` - Versão do Python (3.11.0)  
✅ `build.sh` - Script de build  
✅ `DEPLOY.md` - Guia completo com troubleshooting  

---

## 🔄 Atualizar Site (após deploy inicial)

```bash
git add .
git commit -m "Descrição das mudanças"
git push origin main
```

O Render faz deploy **AUTOMÁTICO** a cada push! 🚀

---

## 🆘 Problemas?

Leia o **DEPLOY.md** para guia completo e troubleshooting.

---

## ✅ Checklist Antes de Deployar

- [ ] Código funciona localmente (`python app.py`)
- [ ] Sem erros no console do navegador
- [ ] Arquivos de deploy criados (requirements.txt, render.yaml, etc)
- [ ] Código commitado no Git
- [ ] Repositório no GitHub criado

**Tudo OK? Vamos lá! 🚀**

