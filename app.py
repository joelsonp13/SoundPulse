from flask import Flask, render_template, jsonify, request, stream_with_context, Response
from flask_cors import CORS
from ytmusicapi import YTMusic
import json
import os
import requests
from functools import lru_cache
from datetime import datetime, timedelta

app = Flask(__name__)

# Configuração CORS mais robusta
CORS(app, 
     resources={
         r"/api/*": {
             "origins": "*",
             "methods": ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
             "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
             "supports_credentials": True
         },
         r"/static/*": {
             "origins": "*",
             "methods": ["GET"],
             "allow_headers": ["Content-Type"]
         }
     },
     supports_credentials=True)

# Headers adicionais para resolver CORB e melhorar segurança
@app.after_request
def after_request(response):
    # Headers CORS (permitir requisições locais)
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS, PUT, DELETE'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
    
    # Headers de segurança (remover X-Frame-Options DENY para permitir iframes locais)
    response.headers['X-Content-Type-Options'] = 'nosniff'
    
    # Corrigir Content-Type para arquivos estáticos (resolver CORB)
    path = request.path
    if path.endswith('.js'):
        response.headers['Content-Type'] = 'application/javascript; charset=utf-8'
    elif path.endswith('.css'):
        response.headers['Content-Type'] = 'text/css; charset=utf-8'
    elif path.endswith('.json'):
        response.headers['Content-Type'] = 'application/json; charset=utf-8'
    elif path.endswith('.html'):
        response.headers['Content-Type'] = 'text/html; charset=utf-8'
    
    return response

# ========================================
# JINJA2 CUSTOM FILTERS
# ========================================

def highres_thumbnail(url):
    """Usa proxy para evitar 429 - puxar normal como músicas"""
    if not url:
        return '/static/images/placeholder.jpg'
    
    import re
    from urllib.parse import quote
    
    # Para TODAS as URLs do Google/YouTube, usar proxy do servidor
    if 'googleusercontent.com' in url or 'ggpht.com' in url or 'ytimg.com' in url or 'gstatic.com' in url:
        # URLs do googleusercontent e gstatic (INCLUI yt3, lh3, etc) - ALTA QUALIDADE =s800
        if 'googleusercontent.com' in url or 'ggpht.com' in url or 'gstatic.com' in url:
            # Converter TODOS os formatos para =s800 (ALTA QUALIDADE)
            # Limpar TUDO depois do = ou ? e adicionar =s800
            if '=' in url:
                # Pegar só até o =
                base_url = url.split('=')[0]
                url = base_url + '=s800'
            elif '?' in url:
                # Pegar só até o ?
                base_url = url.split('?')[0]
                url = base_url + '?sqp=CMjZ1tgF-oaymwEGCDwQPFgB&rs=ALLJMcL7TCigANJCPRDX39EDsxqZ57jUrw'
            else:
                # Se não tem = nem ?, adicionar =s800
                url = url + '=s800'
        
        # URLs .jpg do YouTube (i.ytimg.com)
        elif 'ytimg.com' in url:
            # Vídeos normais - MÁXIMA QUALIDADE
            url = url.replace('/default.jpg', '/maxresdefault.jpg')
            url = url.replace('/mqdefault.jpg', '/maxresdefault.jpg')
            url = url.replace('/sddefault.jpg', '/maxresdefault.jpg')
            url = url.replace('/hqdefault.jpg', '/maxresdefault.jpg')
            # Playlists/Podcasts - manter URL original (qualidade limitada pela API)
        
        # USAR PROXY - Solução simples
        return f'/api/image-proxy?url={quote(url)}'
    
    return url

# Registrar filtro customizado
app.jinja_env.filters['highres'] = highres_thumbnail

# ========================================
# YTMUSIC SETUP
# ========================================

# Configurar YTMusic com OAuth existente
try:
    from ytmusicapi.auth.oauth.credentials import OAuthCredentials
    
    # Tentar carregar OAuth de variável de ambiente primeiro (para Render.com)
    oauth_json_env = os.getenv('OAUTH_JSON')
    
    if oauth_json_env:
        print("[OAuth] OAuth encontrado em variável de ambiente...")
        try:
            # Parse JSON da variável de ambiente
            oauth_data = json.loads(oauth_json_env)
            
            # Extrair client_id e client_secret ANTES de passar para YTMusic
            client_id = oauth_data.pop('client_id', None)
            client_secret = oauth_data.pop('client_secret', None)
            
            # Nova API do ytmusicapi (1.11+): criar objeto OAuthCredentials
            oauth_credentials = OAuthCredentials(
                client_id=client_id,
                client_secret=client_secret
            )
            
            print(f"[Info] Usando OAuth credentials da variável de ambiente")
            yt = YTMusic(auth=oauth_data, oauth_credentials=oauth_credentials)
            print("[OK] YTMusic conectado com sucesso (OAuth via ENV)!")
            
        except json.JSONDecodeError as e:
            print(f"[ERRO] Erro ao parsear OAUTH_JSON: {e}")
            print("[AVISO] Usando modo público...")
            yt = YTMusic()
    
    elif os.path.exists('oauth.json'):
        print("[OAuth] OAuth encontrado em arquivo local...")
        try:
            # Ler oauth.json
            with open('oauth.json', 'r') as f:
                oauth_data = json.load(f)
            
            # Extrair client_id e client_secret ANTES de passar para YTMusic
            client_id = oauth_data.pop('client_id', None)
            client_secret = oauth_data.pop('client_secret', None)
            
            # Nova API do ytmusicapi (1.11+): criar objeto OAuthCredentials
            oauth_credentials = OAuthCredentials(
                client_id=client_id,
                client_secret=client_secret
            )
            
            yt = YTMusic(auth=oauth_data, oauth_credentials=oauth_credentials)
            print("[OK] YTMusic conectado com sucesso (OAuth via arquivo)!")
        except Exception as e:
            print(f"[ERRO] Erro ao carregar OAuth do arquivo: {e}")
            import traceback
            traceback.print_exc()
            print("[AVISO] Usando modo público...")
            yt = YTMusic()
    
    else:
        print("[AVISO] oauth.json não encontrado, usando modo público...")
        yt = YTMusic()
        print("[OK] YTMusic conectado com sucesso (modo público)!")

except Exception as e:
    print(f"[ERRO] Erro ao inicializar OAuth: {e}")
    import traceback
    traceback.print_exc()
    print("[AVISO] Usando modo público...")
    yt = YTMusic()
    yt = None

# Criar instância pública como fallback para quando OAuth der 403
try:
    yt_public = YTMusic()
    print("[OK] YTMusic público criado como fallback para erros 403")
except:
    yt_public = None
    print("[AVISO] Falha ao criar YTMusic público")

# ========================================
# CACHE DE IMAGENS (LRU)
# ========================================
# Cache para armazenar imagens em memória (reduz requisições repetidas)
image_cache = {}
IMAGE_CACHE_MAX_SIZE = 200  # Máximo de 200 imagens em cache
IMAGE_CACHE_TTL = 3600  # 1 hora de TTL

def safe_ytmusic_call(func, *args, use_fallback=True, **kwargs):
    """
    Executa uma chamada do ytmusicapi com fallback automático.
    Se OAuth der 403, tenta com yt_public.
    """
    try:
        # Tentar primeiro com yt (OAuth se disponível)
        if yt:
            return func(yt, *args, **kwargs)
        elif yt_public:
            return func(yt_public, *args, **kwargs)
        else:
            raise Exception("YTMusic não disponível")
    except Exception as e:
        error_msg = str(e)
        # Se for 403 e tivermos fallback público, tentar com ele
        if use_fallback and "403" in error_msg and yt_public and yt != yt_public:
            print(f"[AVISO] OAuth deu 403, tentando com modo público...")
            try:
                return func(yt_public, *args, **kwargs)
            except Exception as e2:
                print(f"[ERRO] Fallback público também falhou: {e2}")
                raise e  # Lançar erro original
        else:
            raise

def create_svg_placeholder():
    """Cria um SVG placeholder inline (nunca causa CORB)"""
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
        <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:rgb(6,182,212);stop-opacity:0.2" />
                <stop offset="100%" style="stop-color:rgb(59,130,246);stop-opacity:0.2" />
            </linearGradient>
        </defs>
        <rect width="160" height="160" fill="url(#grad)"/>
        <text x="80" y="80" font-family="Arial" font-size="48" fill="rgba(255,255,255,0.3)" text-anchor="middle" dominant-baseline="middle">[Musica]</text>
    </svg>'''
    
    return Response(
        svg,
        mimetype='image/svg+xml',
        headers={
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=86400',
            'Content-Type': 'image/svg+xml'
        }
    )

@app.route('/api/image-proxy', methods=['GET', 'OPTIONS'])
def image_proxy():
    """Proxy para imagens externas (resolve CORB e CORS) - COM CACHE"""
    
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        response = Response()
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        return response
    
    image_url = request.args.get('url', '')
    
    if not image_url:
        # Retorna SVG placeholder inline (nunca causa CORB)
        return create_svg_placeholder()
    
    # ==== CACHE: Verificar se imagem já está no cache ====
    cache_key = image_url
    if cache_key in image_cache:
        cached_data = image_cache[cache_key]
        # Verificar se cache ainda é válido (TTL)
        if datetime.now().timestamp() - cached_data['timestamp'] < IMAGE_CACHE_TTL:
            print(f"[CACHE] Imagem recuperada do cache: {image_url[:60]}...")
            return Response(
                cached_data['content'],
                mimetype=cached_data['content_type'],
                headers={
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Cache-Control': 'public, max-age=86400',
                    'X-Content-Type-Options': 'nosniff',
                    'Content-Type': cached_data['content_type'],
                    'Vary': 'Origin',
                    'X-Cache': 'HIT'  # Indica que veio do cache
                }
            )
        else:
            # Cache expirado, remover
            del image_cache[cache_key]
    
    try:
        # Headers para simular navegador e evitar bloqueio
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Referer': 'https://music.youtube.com/',
            'Connection': 'keep-alive'
        }
        
        # Faz a requisição da imagem com timeout REDUZIDO (5s ao invés de 15s)
        response = requests.get(image_url, headers=headers, timeout=5, stream=True)
        
        # Verifica se foi bem-sucedido
        if response.status_code != 200:
            # Fallback: Se maxresdefault.jpg falhar (404), tentar sddefault.jpg
            if response.status_code == 404 and 'maxresdefault.jpg' in image_url:
                print(f"[Retry] maxresdefault 404, tentando sddefault: {image_url[:60]}...")
                fallback_url = image_url.replace('maxresdefault.jpg', 'sddefault.jpg')
                try:
                    fallback_response = requests.get(fallback_url, headers=headers, timeout=10, stream=True)
                    if fallback_response.status_code == 200:
                        print(f"[OK] Fallback bem-sucedido: sddefault.jpg")
                        return Response(
                            fallback_response.content,
                            mimetype='image/jpeg',
                            headers={
                                'Access-Control-Allow-Origin': '*',
                                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                                'Cache-Control': 'public, max-age=86400',
                                'Content-Type': 'image/jpeg',
                                'X-Content-Type-Options': 'nosniff',
                                'Vary': 'Origin'
                            }
                        )
                except:
                    pass
            
            print(f"[AVISO] Imagem falhou com status {response.status_code}: {image_url[:60]}...")
            return create_svg_placeholder()
        
        # Determina o Content-Type correto (prioriza o header da resposta)
        content_type = response.headers.get('Content-Type', 'image/jpeg')
        
        # Se não tem Content-Type ou é incorreto, deduz pela URL
        if not content_type or content_type == 'application/octet-stream':
            if '.png' in image_url.lower():
                content_type = 'image/png'
            elif '.webp' in image_url.lower():
                content_type = 'image/webp'
            elif '.gif' in image_url.lower():
                content_type = 'image/gif'
            else:
                content_type = 'image/jpeg'
        
        # Log de sucesso
        print(f"[OK] Imagem carregada: {content_type} - {image_url[:60]}...")
        
        # ==== CACHE: Salvar imagem no cache ====
        image_content = response.content
        
        # Limitar tamanho do cache (FIFO - remover mais antigo se estiver cheio)
        if len(image_cache) >= IMAGE_CACHE_MAX_SIZE:
            # Remover o item mais antigo (primeira chave)
            oldest_key = next(iter(image_cache))
            del image_cache[oldest_key]
            print(f"[CACHE] Cache cheio, removendo item mais antigo")
        
        # Adicionar ao cache
        image_cache[cache_key] = {
            'content': image_content,
            'content_type': content_type,
            'timestamp': datetime.now().timestamp()
        }
        print(f"[CACHE] Imagem adicionada ao cache ({len(image_cache)}/{IMAGE_CACHE_MAX_SIZE})")
        
        # Retorna a imagem com headers CORRETOS para evitar CORB
        return Response(
            image_content,
            mimetype=content_type,
            headers={
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Cache-Control': 'public, max-age=86400',
                'X-Content-Type-Options': 'nosniff',
                'Content-Type': content_type,  # Garantir Content-Type explícito
                'Vary': 'Origin',
                'X-Cache': 'MISS'  # Indica que foi baixado (não estava no cache)
            }
        )
    except requests.exceptions.Timeout:
        print(f"[TIMEOUT] Imagem demorou mais de 5s para carregar: {image_url[:60]}...")
        return create_svg_placeholder()
    except requests.exceptions.RequestException as e:
        print(f"[Web] ERRO de rede ao carregar imagem: {type(e).__name__}")
        print(f"   URL que falhou: {image_url[:80]}")
        return create_svg_placeholder()
    except Exception as e:
        print(f"[ERRO] ERRO DESCONHECIDO ao carregar imagem: {type(e).__name__}: {e}")
        print(f"   URL que falhou: {image_url[:60]}...")
        return create_svg_placeholder()

@app.route('/')
def index():
    """Página principal do site de streaming"""
    return render_template('index.html')

@app.route('/api/search')
def search():
    """Buscar músicas no YouTube Music"""
    if not yt and not yt_public:
        return jsonify({'error': 'YTMusic não conectado'}), 500
    
    query = request.args.get('q', '')
    filter_type = request.args.get('filter', '')  # [OK] CORRIGIDO: padrão vazio para busca geral
    
    if not query:
        return jsonify({'error': 'Query vazia'}), 400
    
    try:
        print(f"[Debug] BUSCA: query='{query}', filter='{filter_type}'")
        
        # Busca otimizada - Limites reduzidos para performance
        print(f"[Star] Fazendo busca otimizada")
        all_results = []
        
        # 1. Buscar músicas (30 suficientes para paginação inicial)
        songs = safe_ytmusic_call(lambda ytm: ytm.search(query, filter='songs', limit=30))
        all_results.extend([r for r in songs if r.get('resultType') == 'song'])
        print(f"   [Musica] Músicas: {len([r for r in songs if r.get('resultType') == 'song'])}")
        
        # 2. Buscar artistas (15 suficientes)
        artists = safe_ytmusic_call(lambda ytm: ytm.search(query, filter='artists', limit=15))
        artist_results = [r for r in artists if r.get('resultType') == 'artist' and r.get('browseId')]
        all_results.extend(artist_results)
        print(f"   [Artist] Artistas: {len(artist_results)}")
        
        # 3. Buscar playlists (15 suficientes)
        playlists = safe_ytmusic_call(lambda ytm: ytm.search(query, filter='playlists', limit=15))
        playlist_results = [r for r in playlists if r.get('resultType') == 'playlist' and r.get('browseId')]
        all_results.extend(playlist_results)
        print(f"   [Playlist] Playlists: {len(playlist_results)}")
        
        # 4. Buscar álbuns (15 suficientes)
        albums = safe_ytmusic_call(lambda ytm: ytm.search(query, filter='albums', limit=15))
        all_results.extend([r for r in albums if r.get('resultType') == 'album'])
        print(f"   [Album] Álbuns: {len([r for r in albums if r.get('resultType') == 'album'])}")
        
        filtered_results = all_results
        print(f"[OK] TOTAL de resultados: {len(filtered_results)}")
        
        return jsonify({'success': True, 'results': filtered_results})
    except Exception as e:
        print(f"[ERRO] ERRO na busca: {str(e)}")
        return jsonify({'error': f'Erro na busca: {str(e)}'}), 500

@app.route('/api/watch/<videoId>')
def get_watch_playlist(videoId):
    """Obter playlist de watch (músicas relacionadas)"""
    if not yt and not yt_public:
        return jsonify({'error': 'YTMusic não conectado'}), 500
    
    try:
        watch_playlist = safe_ytmusic_call(lambda ytm: ytm.get_watch_playlist(videoId))
        return jsonify({'success': True, 'related': watch_playlist.get('tracks', [])})
    except Exception as e:
        return jsonify({'error': f'Erro ao obter watch playlist: {str(e)}'}), 500

@app.route('/api/song/<videoId>')
def get_song_info(videoId):
    """Obter informações detalhadas da música"""
    if not yt and not yt_public:
        return jsonify({'error': 'YTMusic não conectado'}), 500
    
    try:
        song_info = safe_ytmusic_call(lambda ytm: ytm.get_song(videoId))
        return jsonify({'success': True, 'song': song_info})
    except Exception as e:
        return jsonify({'error': f'Erro ao obter informações da música: {str(e)}'}), 500

@app.route('/api/playlist/<playlistId>')
def get_playlist(playlistId):
    """Obter playlist completa"""
    if not yt and not yt_public:
        return jsonify({'error': 'YTMusic não conectado'}), 500
    
    try:
        playlist = safe_ytmusic_call(lambda ytm: ytm.get_playlist(playlistId, limit=100))
        return jsonify({'success': True, 'playlist': playlist, 'tracks': playlist.get('tracks', [])})
    except Exception as e:
        return jsonify({'error': f'Erro ao obter playlist: {str(e)}'}), 500

@app.route('/api/playlist/<playlistId>/more-songs')
def get_more_playlist_songs(playlistId):
    """Obter mais músicas da playlist (paginação)"""
    if not yt and not yt_public:
        return jsonify({'error': 'YTMusic não conectado'}), 500
    
    try:
        page = int(request.args.get('page', 1))
        limit = 10
        
        playlist = safe_ytmusic_call(lambda ytm: ytm.get_playlist(playlistId, limit=limit, offset=(page-1)*limit))
        tracks = playlist.get('tracks', [])
        
        return jsonify({
            'success': True, 
            'tracks': tracks,
            'hasMore': len(tracks) >= limit
        })
    except Exception as e:
        return jsonify({'error': f'Erro ao obter mais músicas: {str(e)}'}), 500

@app.route('/api/artist/<artistId>')
def get_artist(artistId):
    """Obter informações do artista"""
    if not yt and not yt_public:
        return jsonify({'error': 'YTMusic não conectado'}), 500
    
    try:
        artist = safe_ytmusic_call(lambda ytm: ytm.get_artist(artistId))
        return jsonify({'success': True, 'artist': artist})
    except Exception as e:
        return jsonify({'error': f'Erro ao obter artista: {str(e)}'}), 500

@app.route('/api/artist/<artistId>/albums')
def get_artist_albums(artistId):
    """Obter álbuns do artista"""
    if not yt and not yt_public:
        return jsonify({'error': 'YTMusic não conectado'}), 500
    
    try:
        artist = safe_ytmusic_call(lambda ytm: ytm.get_artist(artistId))
        albums = artist.get('albums', {}).get('results', [])
        return jsonify({'success': True, 'albums': albums})
    except Exception as e:
        return jsonify({'error': f'Erro ao obter álbuns: {str(e)}'}), 500

@app.route('/api/artist/<artistId>/playlists')
def get_artist_playlists(artistId):
    """Obter playlists do artista"""
    if not yt and not yt_public:
        return jsonify({'error': 'YTMusic não conectado'}), 500
    
    try:
        artist = safe_ytmusic_call(lambda ytm: ytm.get_artist(artistId))
        playlists = artist.get('playlists', {}).get('results', [])
        return jsonify({'success': True, 'playlists': playlists})
    except Exception as e:
        return jsonify({'error': f'Erro ao obter playlists: {str(e)}'}), 500

@app.route('/api/artist/<artistId>/more-playlists')
def get_more_artist_playlists(artistId):
    """Obter mais playlists do artista (paginação)"""
    if not yt and not yt_public:
        return jsonify({'error': 'YTMusic não conectado'}), 500
    
    try:
        page = int(request.args.get('page', 1))
        limit = 10
        
        artist = safe_ytmusic_call(lambda ytm: ytm.get_artist(artistId))
        playlists = artist.get('playlists', {}).get('results', [])
        
        # Simular paginação (YTMusic não suporta offset para playlists)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_playlists = playlists[start_idx:end_idx]
        
        return jsonify({
            'success': True, 
            'playlists': paginated_playlists,
            'hasMore': end_idx < len(playlists)
        })
    except Exception as e:
        return jsonify({'error': f'Erro ao obter mais playlists: {str(e)}'}), 500

@app.route('/api/artist/<artistId>/more-songs')
def get_more_artist_songs(artistId):
    """Obter mais músicas do artista (paginação)"""
    if not yt and not yt_public:
        return jsonify({'error': 'YTMusic não conectado'}), 500
    
    try:
        page = int(request.args.get('page', 1))
        limit = 10
        
        artist = safe_ytmusic_call(lambda ytm: ytm.get_artist(artistId))
        songs = artist.get('songs', {}).get('results', [])
        
        # Simular paginação
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_songs = songs[start_idx:end_idx]
        
        return jsonify({
            'success': True, 
            'tracks': paginated_songs,
            'hasMore': end_idx < len(songs)
        })
    except Exception as e:
        return jsonify({'error': f'Erro ao obter mais músicas: {str(e)}'}), 500

@app.route('/api/lyrics/<videoId>')
def get_lyrics(videoId):
    """Obter letras da música"""
    if not yt and not yt_public:
        return jsonify({'error': 'YTMusic não conectado'}), 500
    
    try:
        print(f"[Lyrics] Buscando letras para: {videoId}")
        
        # PASSO 1: Buscar informações da música para obter browseId das letras
        song_info = safe_ytmusic_call(lambda ytm: ytm.get_song(videoId))
        print(f"[Lyrics] Informações da música obtidas: {type(song_info)}")
        
        # Verificar se tem browseId de letras
        lyrics_browse_id = None
        if song_info and isinstance(song_info, dict):
            videoDetails = song_info.get('videoDetails', {})
            lyrics_browse_id = videoDetails.get('lyricsId') or song_info.get('lyricsId')
            
            # Tentar outros lugares onde o ID pode estar
            if not lyrics_browse_id:
                playabilityStatus = song_info.get('playabilityStatus', {})
                lyrics_browse_id = playabilityStatus.get('lyricsId')
        
        if not lyrics_browse_id:
            print(f"[Lyrics] Nenhum browseId de letras encontrado na música")
            return jsonify({'success': False, 'error': 'Esta música não possui letras disponíveis'})
        
        print(f"[Lyrics] browseId encontrado: {lyrics_browse_id}")
        
        # PASSO 2: Buscar as letras usando o browseId correto
        lyrics_data = safe_ytmusic_call(lambda ytm: ytm.get_lyrics(lyrics_browse_id))
        print(f"[Lyrics] Resposta das letras: {type(lyrics_data)}")
        
        # Verificar se as letras existem e não estão vazias
        if lyrics_data and isinstance(lyrics_data, dict) and lyrics_data.get('lyrics'):
            return jsonify({'success': True, 'lyrics': lyrics_data['lyrics']})
        elif lyrics_data and isinstance(lyrics_data, str) and lyrics_data.strip():
            return jsonify({'success': True, 'lyrics': lyrics_data})
        else:
            print(f"[Lyrics] Letras vazias ou inválidas")
            return jsonify({'success': False, 'error': 'Letras não disponíveis para esta música'})
            
    except Exception as e:
        error_msg = str(e).lower()
        print(f"[Lyrics] ERRO ao obter letras para {videoId}: {str(e)}")
        
        # Mensagens de erro mais amigáveis
        if '403' in error_msg or 'forbidden' in error_msg:
            return jsonify({'success': False, 'error': 'Letras não disponíveis no YouTube Music para esta música'})
        elif '404' in error_msg or 'not found' in error_msg:
            return jsonify({'success': False, 'error': 'Letras não encontradas para esta música'})
        elif '400' in error_msg or 'bad request' in error_msg:
            return jsonify({'success': False, 'error': 'Esta música não possui letras disponíveis'})
        else:
            return jsonify({'success': False, 'error': 'Letras indisponíveis no momento'})

@app.route('/api/related/<videoId>')
def get_related_songs(videoId):
    """Obter músicas relacionadas"""
    if not yt and not yt_public:
        return jsonify({'error': 'YTMusic não conectado'}), 500
    
    try:
        # Tenta usar get_watch_playlist ao invés de get_song_related
        watch_playlist = safe_ytmusic_call(lambda ytm: ytm.get_watch_playlist(videoId))
        related = watch_playlist.get('tracks', [])[:10]  # Pega apenas 10 músicas relacionadas
        return jsonify({'success': True, 'related': related})
    except Exception as e:
        print(f"Erro ao obter músicas relacionadas para {videoId}: {str(e)}")
        # Retorna lista vazia ao invés de erro 500
        return jsonify({'success': True, 'related': []})

@app.route('/api/radio/<videoId>')
def get_radio_playlist(videoId):
    """Obter playlist de rádio baseada na música"""
    if not yt and not yt_public:
        return jsonify({'error': 'YTMusic não conectado'}), 500
    
    try:
        radio_playlist = safe_ytmusic_call(lambda ytm: ytm.get_watch_playlist(videoId, radio=True))
        return jsonify({'success': True, 'radio': radio_playlist})
    except Exception as e:
        return jsonify({'error': f'Erro ao obter rádio: {str(e)}'}), 500

# ===== PAGE ENDPOINTS (Return HTML Partials) =====

@app.route('/pages/home')
def page_home():
    """Home page"""
    # Se for requisição HTMX, retorna apenas o partial
    if request.headers.get('HX-Request'):
        return render_template('partials/home.html')
    # Se for acesso direto, retorna página completa
    return render_template('index.html')

@app.route('/pages/search')
def page_search():
    """Search page"""
    search_query = request.args.get('q', '')
    
    if request.headers.get('HX-Request'):
        return render_template('partials/search.html', initial_query=search_query)
    return render_template('index.html')

@app.route('/pages/library')
def page_library():
    """Library page"""
    if request.headers.get('HX-Request'):
        return render_template('partials/library.html')
    return render_template('index.html')

@app.route('/pages/charts')
def page_charts():
    """Charts page"""
    country = request.args.get('country', 'BR')
    if request.headers.get('HX-Request'):
        return render_template('partials/charts.html', country=country)
    return render_template('index.html')

@app.route('/pages/explore')
def page_explore():
    """Explore page"""
    mood = request.args.get('mood', None)
    if request.headers.get('HX-Request'):
        return render_template('partials/explore.html', mood=mood)
    return render_template('index.html')

@app.route('/pages/artist/<browseId>')
def page_artist(browseId):
    """Artist page"""
    if not request.headers.get('HX-Request'):
        return render_template('index.html')
    
    try:
        artist = safe_ytmusic_call(lambda ytm: ytm.get_artist(browseId))
        if not artist:
            raise Exception("Não foi possível carregar os dados do artista")
        
        # Debug: Log da estrutura de dados
        print("[DEBUG] Dados do artista recebidos:")
        print(f"  - Nome: {artist.get('name', 'N/A')}")
        print(f"  - channelId: {artist.get('channelId', 'N/A')}")
        print(f"  - subscribers: {artist.get('subscribers', 'N/A')}")
        print(f"  - songs: {'SIM' if artist.get('songs') else 'NÃO'}")
        if artist.get('songs'):
            print(f"    - songs.results: {len(artist['songs'].get('results', []))} músicas")
        print(f"  - albums: {'SIM' if artist.get('albums') else 'NÃO'}")
        if artist.get('albums'):
            print(f"    - albums.results: {len(artist['albums'].get('results', []))} álbuns")
        print(f"  - singles: {'SIM' if artist.get('singles') else 'NÃO'}")
        if artist.get('singles'):
            print(f"    - singles.results: {len(artist['singles'].get('results', []))} singles")
        print(f"  - related: {'SIM' if artist.get('related') else 'NÃO'}")
        if artist.get('related'):
            print(f"    - related.results: {len(artist['related'].get('results', []))} artistas relacionados")
        
        # Preparar dados para evitar problemas de sintaxe no template
        top_songs = []
        all_songs = []  # Para "This Is" (mais músicas)
        if artist.get('songs') and artist.get('songs').get('results'):
            all_results = artist['songs']['results']
            top_songs = all_results[:5]  # Apenas 5 para mostrar na lista
            all_songs = all_results[:30]  # Até 30 para "This Is"
        
        # Combinar albums + singles para ter mais releases
        albums = []
        if artist.get('albums') and artist.get('albums').get('results'):
            albums.extend(artist['albums']['results'])
        if artist.get('singles') and artist.get('singles').get('results'):
            albums.extend(artist['singles']['results'])
        # Limitar a 12 releases (6 albums + 6 singles possíveis)
        albums = albums[:12]
        
        related_artists = []
        if artist.get('related') and artist.get('related').get('results'):
            related_artists = artist['related']['results'][:8]
            # Debug: Mostrar estrutura de um artista relacionado
            if related_artists:
                print(f"[DEBUG] Exemplo de artista relacionado:")
                print(f"  - Keys disponíveis: {list(related_artists[0].keys())}")
                print(f"  - Dados: {related_artists[0]}")
        
        print(f"[DEBUG] Dados processados para template:")
        print(f"  - topSongs: {len(top_songs)}")
        print(f"  - allSongs: {len(all_songs)}")
        print(f"  - albums (albums + singles): {len(albums)}")
        print(f"  - relatedArtists: {len(related_artists)}")
        
        return render_template('partials/artist.html', 
                             artist=artist,
                             topSongs=top_songs,
                             allSongs=all_songs,
                             albums=albums,
                             relatedArtists=related_artists)
    except Exception as e:
        print(f"[ERRO] Falha ao carregar artista: {str(e)}")
        return render_template('components/error_state.html', 
                             title='Erro ao carregar artista',
                             message=str(e),
                             retry=True)

@app.route('/pages/album/<browseId>')
def page_album(browseId):
    """Album page"""
    if not request.headers.get('HX-Request'):
        return render_template('index.html')
    
    try:
        album = safe_ytmusic_call(lambda ytm: ytm.get_album(browseId))
        if not album:
            raise Exception("Não foi possível carregar os dados do álbum")
        return render_template('partials/album.html', album=album)
    except Exception as e:
        return render_template('components/error_state.html',
                             title='Erro ao carregar álbum',
                             message=str(e),
                             retry=True)

@app.route('/pages/playlist/<playlistId>')
def page_playlist(playlistId):
    """Playlist page"""
    if not request.headers.get('HX-Request'):
        return render_template('index.html')
    
    try:
        playlist = safe_ytmusic_call(lambda ytm: ytm.get_playlist(playlistId))
        if not playlist:
            raise Exception("Não foi possível carregar os dados da playlist")
        return render_template('partials/playlist.html', playlist=playlist)
    except Exception as e:
        return render_template('components/error_state.html',
                             title='Erro ao carregar playlist',
                             message=str(e),
                             retry=True)

@app.route('/pages/podcast/<browseId>')
def page_podcast(browseId):
    """Podcast page"""
    if not request.headers.get('HX-Request'):
        return render_template('index.html')
    
    try:
        podcast = safe_ytmusic_call(lambda ytm: ytm.get_podcast(browseId))
        if not podcast:
            raise Exception("Não foi possível carregar os dados do podcast")
        return render_template('partials/podcast.html', podcast=podcast)
    except Exception as e:
        return render_template('components/error_state.html',
                             title='Erro ao carregar podcast',
                             message=str(e),
                             retry=True)

# ===== CHARTS ENDPOINTS =====

@app.route('/api/charts/songs/<country>')
def charts_songs(country):
    """Charts songs by country"""
    if not yt and not yt_public:
        return render_template('components/error_state.html', 
                             title='Erro',
                             message='YTMusic não conectado')
    
    try:
        # Usar busca direta ao invés de get_charts (mais confiável)
        country_names = {
            'BR': 'Brazil', 'US': 'USA', 'GB': 'UK', 'DE': 'Germany',
            'FR': 'France', 'IT': 'Italy', 'ES': 'Spain', 'MX': 'Mexico',
            'AR': 'Argentina', 'JP': 'Japan', 'KR': 'Korea', 'ZZ': 'Global'
        }
        
        country_name = country_names.get(country.upper(), 'trending')
        query = f'top hits {country_name} 2024'
        
        songs = safe_ytmusic_call(lambda ytm: ytm.search(query, filter='songs', limit=10))
        
        # Filtrar apenas músicas válidas
        songs = [s for s in songs if s.get('videoId') and s.get('title')]
        
        return render_template('components/cards_grid.html', items=songs, type='music')
    except Exception as e:
        print(f"Erro em charts_songs: {str(e)}")
        return render_template('components/error_state.html',
                             title='Erro ao carregar charts',
                             message=str(e))

# ===== HOME SECTION ENDPOINTS =====

@app.route('/api/trending-songs')
def trending_songs_endpoint():
    """Trending songs"""
    if not yt and not yt_public:
        return render_template('components/error_state.html',
                             title='Erro',
                             message='YTMusic não conectado')
    
    try:
        results = safe_ytmusic_call(lambda ytm: ytm.search('trending music 2024', filter='songs', limit=10))
        return render_template('components/cards_grid.html', items=results, type='music')
    except Exception as e:
        return render_template('components/error_state.html',
                             title='Erro ao carregar músicas',
                             message=str(e))

@app.route('/api/new-releases')
def new_releases_endpoint():
    """New album releases"""
    if not yt and not yt_public:
        return render_template('components/error_state.html',
                             title='Erro',
                             message='YTMusic não conectado')
    
    try:
        results = safe_ytmusic_call(lambda ytm: ytm.search('new releases albums 2024', filter='albums', limit=10))
        return render_template('components/cards_grid.html', items=results, type='album')
    except Exception as e:
        return render_template('components/error_state.html',
                             title='Erro ao carregar lançamentos',
                             message=str(e))

@app.route('/api/trending-podcasts')
def trending_podcasts_endpoint():
    """Trending podcasts"""
    if not yt and not yt_public:
        return render_template('components/error_state.html',
                             title='Erro',
                             message='YTMusic não conectado')
    
    try:
        # Search for popular podcasts
        results = safe_ytmusic_call(lambda ytm: ytm.search('best podcasts 2024', limit=15))
        
        # Filtrar e processar podcasts
        podcasts = []
        for r in results:
            # Verificar se é podcast ou playlist
            if ('podcast' in str(r.get('resultType', '')).lower() or 
                'podcast' in str(r.get('category', '')).lower() or
                r.get('resultType') == 'playlist'):
                
                # Melhorar thumbnails se possível
                if r.get('thumbnails'):
                    # Pegar a maior thumbnail disponível
                    thumbnails = sorted(r['thumbnails'], key=lambda x: x.get('width', 0) * x.get('height', 0), reverse=True)
                    r['thumbnails'] = thumbnails
                
                podcasts.append(r)
                
                if len(podcasts) >= 10:
                    break
        
        return render_template('components/cards_grid.html', items=podcasts, type='podcast')
    except Exception as e:
        return render_template('components/error_state.html',
                             title='Erro ao carregar podcasts',
                             message=str(e))

@app.route('/api/charts/artists/<country>')
def charts_artists(country):
    """Charts artists by country"""
    if not yt and not yt_public:
        return render_template('components/error_state.html',
                             title='Erro',
                             message='YTMusic não conectado')
    
    try:
        # Usar busca direta ao invés de get_charts (mais confiável)
        country_names = {
            'BR': 'Brazil', 'US': 'USA', 'GB': 'UK', 'DE': 'Germany',
            'FR': 'France', 'IT': 'Italy', 'ES': 'Spain', 'MX': 'Mexico',
            'AR': 'Argentina', 'JP': 'Japan', 'KR': 'Korea', 'ZZ': 'Global'
        }
        
        country_name = country_names.get(country.upper(), 'trending')
        query = f'top artists {country_name} 2024'
        
        artists = safe_ytmusic_call(lambda ytm: ytm.search(query, filter='artists', limit=10))
        
        # Filtrar apenas artistas válidos
        artists = [a for a in artists if a.get('browseId')]
        
        return render_template('components/cards_grid.html', items=artists, type='artist')
    except Exception as e:
        print(f"Erro em charts_artists: {str(e)}")
        return render_template('components/error_state.html',
                             title='Erro ao carregar charts',
                             message=str(e))

@app.route('/api/charts/videos/<country>')
def charts_videos(country):
    """Charts videos by country"""
    if not yt and not yt_public:
        return render_template('components/error_state.html',
                             title='Erro',
                             message='YTMusic não conectado')
    
    try:
        # Usar busca direta ao invés de get_charts (mais confiável)
        country_names = {
            'BR': 'Brazil', 'US': 'USA', 'GB': 'UK', 'DE': 'Germany',
            'FR': 'France', 'IT': 'Italy', 'ES': 'Spain', 'MX': 'Mexico',
            'AR': 'Argentina', 'JP': 'Japan', 'KR': 'Korea', 'ZZ': 'Global'
        }
        
        country_name = country_names.get(country.upper(), 'trending')
        query = f'top music videos {country_name} 2024'
        
        videos = safe_ytmusic_call(lambda ytm: ytm.search(query, filter='videos', limit=10))
        
        # Filtrar apenas vídeos válidos
        videos = [v for v in videos if v.get('videoId')]
        
        return render_template('components/cards_grid.html', items=videos, type='music')
    except Exception as e:
        print(f"Erro em charts_videos: {str(e)}")
        return render_template('components/error_state.html',
                             title='Erro ao carregar charts',
                             message=str(e))

# ===== ARTIST ENDPOINTS =====

@app.route('/api/artist/<browseId>/top-songs')
def artist_top_songs_endpoint(browseId):
    """Artist top songs"""
    if not yt and not yt_public:
        return render_template('components/error_state.html',
                             title='Erro',
                             message='YTMusic não conectado')
    
    try:
        artist = safe_ytmusic_call(lambda ytm: ytm.get_artist(browseId))
        songs = artist.get('songs', {}).get('results', [])[:10]
        return render_template('components/cards_grid.html', items=songs, type='music')
    except Exception as e:
        return render_template('components/error_state.html',
                             title='Erro ao carregar músicas',
                             message=str(e))

# ===== ALBUM ENDPOINTS =====

@app.route('/api/album/<browseId>/tracks')
def album_tracks_endpoint(browseId):
    """Album tracks"""
    if not yt and not yt_public:
        return render_template('components/error_state.html',
                             title='Erro',
                             message='YTMusic não conectado')
    
    try:
        album = safe_ytmusic_call(lambda ytm: ytm.get_album(browseId))
        tracks = album.get('tracks', [])
        return render_template('partials/tracklist.html', tracks=tracks)
    except Exception as e:
        return render_template('components/error_state.html',
                             title='Erro ao carregar faixas',
                             message=str(e))

# ===== PLAYLIST ENDPOINTS =====

@app.route('/api/playlist/<playlistId>/tracks')
def playlist_tracks_endpoint(playlistId):
    """Playlist tracks"""
    if not yt and not yt_public:
        return render_template('components/error_state.html',
                             title='Erro',
                             message='YTMusic não conectado')
    
    try:
        playlist = safe_ytmusic_call(lambda ytm: ytm.get_playlist(playlistId))
        tracks = playlist.get('tracks', [])
        return render_template('partials/tracklist.html', tracks=tracks)
    except Exception as e:
        return render_template('components/error_state.html',
                             title='Erro ao carregar músicas',
                             message=str(e))

# ===== PODCAST ENDPOINTS =====

@app.route('/api/podcast/<browseId>/episodes')
def podcast_episodes_endpoint(browseId):
    """Podcast episodes"""
    if not yt and not yt_public:
        return render_template('components/error_state.html',
                             title='Erro',
                             message='YTMusic não conectado')
    
    try:
        episodes = safe_ytmusic_call(lambda ytm: ytm.get_channel_episodes(browseId))
        return render_template('partials/episode_list.html', episodes=episodes)
    except Exception as e:
        return render_template('components/error_state.html',
                             title='Erro ao carregar episódios',
                             message=str(e))

# ===== EXPLORE MUSIC ENDPOINTS =====

@app.route('/api/moods')
def get_moods_endpoint():
    """Get mood categories"""
    if not yt and not yt_public:
        return render_template('components/error_state.html',
                             title='Erro',
                             message='YTMusic não conectado')
    
    try:
        mood_data = safe_ytmusic_call(lambda ytm: ytm.get_mood_categories())
        # mood_data é dict com {'Moods & moments': [...], 'Genres': [...]}
        moods = []
        if isinstance(mood_data, dict):
            for category, items in mood_data.items():
                if isinstance(items, list):
                    moods.extend(items)
        return render_template('partials/mood_categories.html', moods=moods)
    except Exception as e:
        print(f"Erro em get_moods: {str(e)}")
        return render_template('components/error_state.html',
                             title='Erro ao carregar categorias',
                             message=str(e))

@app.route('/api/moods-preview')
def get_moods_preview_endpoint():
    """Get mood categories preview (first 6)"""
    if not yt and not yt_public:
        return render_template('components/error_state.html',
                             title='Erro',
                             message='YTMusic não conectado')
    
    try:
        mood_data = safe_ytmusic_call(lambda ytm: ytm.get_mood_categories())
        # mood_data é dict com {'Moods & moments': [...], 'Genres': [...]}
        moods = []
        if isinstance(mood_data, dict):
            for category, items in mood_data.items():
                if isinstance(items, list):
                    moods.extend(items)
        # Pega apenas os primeiros 6
        moods_preview = moods[:6] if len(moods) > 6 else moods
        return render_template('partials/mood_categories.html', moods=moods_preview)
    except Exception as e:
        print(f"Erro em get_moods_preview: {str(e)}")
        return render_template('components/error_state.html',
                             title='Erro ao carregar categorias',
                             message=str(e))

@app.route('/api/mood/<params>')
def mood_playlists_endpoint(params):
    """Get playlists by mood"""
    if not yt and not yt_public:
        return render_template('components/error_state.html',
                             title='Erro',
                             message='YTMusic não conectado')
    
    try:
        playlists = safe_ytmusic_call(lambda ytm: ytm.get_mood_playlists(params))
        return render_template('components/cards_grid.html', items=playlists, type='playlist')
    except Exception as e:
        return render_template('components/error_state.html',
                             title='Erro ao carregar playlists',
                             message=str(e))

# ===== SEARCH ENDPOINTS =====

@app.route('/api/search-suggestions')
def search_suggestions_endpoint():
    """Search suggestions"""
    if not yt and not yt_public:
        return ''
    
    query = request.args.get('q', '')
    if len(query) < 2:
        return ''
    
    try:
        suggestions = safe_ytmusic_call(lambda ytm: ytm.get_search_suggestions(query))
        html = '<div class="suggestions-list">'
        for suggestion in suggestions[:5]:
            html += f'<div class="suggestion-item p-2 hover:bg-white/10 cursor-pointer">{suggestion}</div>'
        html += '</div>'
        return html
    except Exception as e:
        return ''

if __name__ == '__main__':
    print("Iniciando Site de Streaming de Musica...")
    print("Acesse: http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
