<!-- 2e337236-a2bc-438e-a9ba-9bc48e3af240 40db5851-87e9-4f11-9b15-9f1fc7ed1930 -->
# Plano: Corrigir OAuth no Render.com

## Problema Identificado

O `oauth.json` não está disponível no Render.com, causando falha do ytmusicapi OAuth (método primário). Isso força o uso do yt-dlp (fallback), que está sendo bloqueado pelo YouTube.

## 🤔 Performance com Conta Única

### ⚡ **RESPOSTA: NÃO, não vai ficar lento!**

**Por quê?**

1. **Cache de URLs** (já implementado!):

   - Primeira requisição: busca URL do stream (500-1000ms)
   - Próximas requisições: pega do cache (instantâneo!)
   - URLs válidas por 1 hora (cache por 50 músicas)

2. **Streaming direto do YouTube**:

   - Sua conta só BUSCA a URL
   - O ÁUDIO vem direto do YouTube para o usuário
   - Você não "repassa" o áudio (não usa sua banda)

3. **Limites do YouTube Music API**:

   - **~10.000 requests/dia** (muito generoso!)
   - 1 música = 1 request (depois vai pro cache)
   - Mesmo com 100 usuários tocando músicas diferentes: ~100 requests
   - Sobra para **~10.000 músicas/dia** antes de atingir limite

### 📊 **Exemplo Prático:**

**Cenário: 50 usuários simultâneos**

1. **Usuário 1** toca "Bohemian Rhapsody":

   - ytmusicapi busca URL (800ms)
   - Salva no cache
   - Stream vai direto YouTube → Usuário 1

2. **Usuário 2** toca "Bohemian Rhapsody":

   - Pega URL do cache (instantâneo!)
   - Stream vai direto YouTube → Usuário 2

3. **Usuário 3** toca música diferente:

   - ytmusicapi busca URL (800ms)
   - Salva no cache
   - Stream vai direto YouTube → Usuário 3

**Resultado**: Apenas músicas NOVAS são lentas (primeira vez). Músicas populares ficam no cache = RÁPIDO!

### 🚀 **Otimizações já Implementadas:**

1. ✅ **LRU Cache** (50 músicas mais tocadas)
2. ✅ **Cache de 1 hora** (URLs não expiram rápido)
3. ✅ **Streaming direto** (não passa pelo seu servidor)
4. ✅ **`audio.preload = 'auto'`** (carrega antes de tocar)
5. ✅ **Performance timing** (medimos velocidade)

### ⚠️ **Quando PODE ficar lento:**

1. **Música nunca tocada antes** = primeira vez é mais lenta (1-2s)
2. **Cache cheio** = remove músicas antigas (LRU)
3. **Rate limit atingido** = ~10.000 músicas/dia (improvável)

### 💡 **Se o site crescer muito (milhares de usuários):**

**Opção 1: Aumentar cache**

```python
STREAM_CACHE_MAX_SIZE = 200  # ao invés de 50
STREAM_CACHE_TTL = 7200  # 2 horas ao invés de 1
```

**Opção 2: Múltiplas contas** (rotação)

```python
OAUTH_ACCOUNTS = [oauth1, oauth2, oauth3]  # 3 contas = 30k requests/dia
```

**Opção 3: Login individual** (complexo, 3-5 dias de trabalho)

---

## Solução Atual: OAuth via Variável de Ambiente

### Passo 1: Ler oauth.json local

```bash
cat oauth.json
```

### Passo 2: Modificar app.py para suportar OAuth via ENV

Localizar código de inicialização do YTMusic e substituir:

```python
try:
    oauth_json_env = os.getenv('OAUTH_JSON')
    
    if oauth_json_env:
        print("🔐 OAuth encontrado em variável de ambiente...")
        oauth_data = json.loads(oauth_json_env)
        oauth_temp_path = '/tmp/oauth.json'
        with open(oauth_temp_path, 'w') as f:
            json.dump(oauth_data, f)
        yt = YTMusic(oauth_temp_path)
        print("✅ YTMusic conectado (OAuth via ENV)!")
    elif os.path.exists('oauth.json'):
        yt = YTMusic('oauth.json')
        print("✅ YTMusic conectado (OAuth via arquivo)!")
    else:
        yt = YTMusic()
        print("✅ YTMusic conectado (modo público)!")
except Exception as e:
    print(f"❌ Erro: {e}")
    import traceback
    traceback.print_exc()
    yt = None
```

### Passo 3: Adicionar logs de debug

Na função `proxy_stream()` após os logs iniciais:

```python
if yt and hasattr(yt, '_oauth') and yt._oauth:
    print(f"✅ OAuth ATIVO e funcional!")
else:
    print(f"⚠️ OAuth NÃO está ativo - vai usar modo público")
```

### Passo 4: Configurar no Render Dashboard

1. Acesse: https://dashboard.render.com
2. Selecione serviço "SoundPulse"
3. Vá em **Environment** (menu lateral)
4. Clique **Add Environment Variable**
5. Adicione:

   - **Key**: `OAUTH_JSON`
   - **Value**: [conteúdo completo do oauth.json - é um JSON grande]

6. Clique **Save Changes**
7. Render faz redeploy automático (~3-5 min)

### Passo 5: Verificar após Deploy

Nos logs do Render, deve aparecer:

```
🔐 OAuth encontrado em variável de ambiente...
📝 Arquivo OAuth temporário criado: /tmp/oauth.json
✅ YTMusic conectado (OAuth via ENV)!
```

E ao tocar música:

```
🎵 PROXY SOLICITADO PARA: videoId
✅ Cache MISS (ou HIT se já tocou antes)
🔐 MÉTODO 1: Tentando obter stream via ytmusicapi (OAuth)...
✅ streamingData encontrado!
✅ Stream URL obtida via ytmusicapi!
💾 Adicionado ao cache (válido por 59.9 minutos)
📊 Cache size: 1/50
```

**yt-dlp NÃO será usado** porque ytmusicapi OAuth vai funcionar!

### Passo 6: Manter yt-dlp como Fallback

NÃO remover yt-dlp - ele continua como backup se:

- OAuth falhar temporariamente
- Rate limit for atingido
- Vídeos não disponíveis no YouTube Music

## Arquivos a Modificar

1. `app.py` - Carregar OAuth de variável de ambiente com suporte a /tmp

## Resultado Esperado

- ⚡ **Primeira música**: 1-2 segundos
- ⚡ **Músicas em cache**: Instantâneo
- ✅ **10.000 músicas/dia** suportadas
- ✅ **Sem lentidão** para usuários
- ✅ **Streaming direto** do YouTube

## Instruções Finais

1. Implementar mudanças no `app.py`
2. Copiar TODO o conteúdo do `oauth.json` local
3. Adicionar no Render Dashboard como `OAUTH_JSON`
4. Aguardar redeploy (~3-5 min)
5. Testar streaming no site (https://soundpulse.onrender.com)
6. Verificar logs para confirmar OAuth ativo

### To-dos

- [ ] Corrigir htmx-debug.js para verificar document.body antes de adicionar event listeners
- [ ] Melhorar tratamento de erros no app.py (rota /api/search e error handlers globais)
- [ ] Melhorar tratamento de erros no app.js (verificar Content-Type antes de parse)
- [ ] Remover código duplicado do index.html
- [ ] Adicionar condicionais para carregar scripts de debug apenas em desenvolvimento
- [ ] Testar todas as funcionalidades (busca, navegação, player)