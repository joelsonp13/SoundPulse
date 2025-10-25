// ========================================
// LAZY LOADING DE IMAGENS (OTIMIZAÇÃO)
// ========================================

/**
 * Configura lazy loading para todas as imagens
 * Carrega imagens apenas quando estão visíveis na tela
 */
document.addEventListener('DOMContentLoaded', function() {
    // Configurar IntersectionObserver para lazy loading
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const src = img.getAttribute('data-src');
                    
                    if (src) {
                        img.src = src;
                        img.removeAttribute('data-src');
                        img.classList.remove('lazy');
                        img.classList.add('lazy-loaded');
                        observer.unobserve(img);
                    }
                }
            });
        }, {
            rootMargin: '50px 0px', // Começar a carregar 50px antes de entrar na tela
            threshold: 0.01
        });
        
        // Observar todas as imagens com a classe 'lazy' ou atributo 'data-src'
        const observeImages = () => {
            document.querySelectorAll('img[data-src], img.lazy').forEach(img => {
                imageObserver.observe(img);
            });
        };
        
        // Observar imagens iniciais
        observeImages();
        
        // Re-observar quando novo conteúdo for adicionado via HTMX
        document.body.addEventListener('htmx:afterSwap', observeImages);
    }
});

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Aumenta a resolução de thumbnails do Google/YouTube
 * USA PROXY para evitar CORS e Rate Limiting (429)
 */
function getHighResThumbnail(url) {
    if (!url) return '/static/images/placeholder.jpg';
    
    // Se url é um objeto (array de thumbnails), extrair a URL
    if (typeof url === 'object' && !Array.isArray(url)) {
        // Pode ser { url: "...", width: 120, height: 90 }
        url = url.url || url.href || '';
        if (!url) return '/static/images/placeholder.jpg';
    } else if (Array.isArray(url) && url.length > 0) {
        // Se é um array, pegar a maior thumbnail disponível
        const sortedThumbnails = url.sort((a, b) => {
            const sizeA = (a.width || 0) * (a.height || 0);
            const sizeB = (b.width || 0) * (b.height || 0);
            return sizeB - sizeA;
        });
        url = sortedThumbnails[0].url || sortedThumbnails[0].href || '';
        if (!url) return '/static/images/placeholder.jpg';
    }
    
    // Garantir que url é string
    if (typeof url !== 'string') return '/static/images/placeholder.jpg';
    
    // Se já é um caminho local, retornar direto
    if (url.startsWith('/')) return url;
    
    // Para TODAS as URLs do Google/YouTube, usar proxy com ALTA QUALIDADE
    if (url.includes('googleusercontent.com') || url.includes('ggpht.com') || url.includes('ytimg.com') || url.includes('gstatic.com')) {
        
        // URLs do googleusercontent e gstatic (INCLUI yt3, lh3, etc) - ALTA QUALIDADE =s800
        if (url.includes('googleusercontent.com') || url.includes('ggpht.com') || url.includes('gstatic.com')) {
            // Converter TODOS os formatos para =s800 (ALTA QUALIDADE)
            // Limpar TUDO depois do = ou ? e adicionar =s800
            if (url.includes('=')) {
                const baseUrl = url.split('=')[0];
                url = baseUrl + '=s800';
            } else if (url.includes('?')) {
                const baseUrl = url.split('?')[0];
                url = baseUrl + '?sqp=CMjZ1tgF-oaymwEGCDwQPFgB&rs=ALLJMcL7TCigANJCPRDX39EDsxqZ57jUrw';
            } else {
                url = url + '=s800';
            }
        }
        
        // URLs .jpg do YouTube (i.ytimg.com)
        else if (url.includes('ytimg.com')) {
            // Vídeos normais - MÁXIMA QUALIDADE
            url = url.replace(/\/default\.jpg/g, '/maxresdefault.jpg')
                     .replace(/\/mqdefault\.jpg/g, '/maxresdefault.jpg')
                     .replace(/\/sddefault\.jpg/g, '/maxresdefault.jpg')
                     .replace(/\/hqdefault\.jpg/g, '/maxresdefault.jpg');
            // Playlists/Podcasts - manter URL original (qualidade limitada pela API)
        }
        
        // USAR PROXY - Solução simples para evitar CORS
        return '/api/image-proxy?url=' + encodeURIComponent(url);
    }
    
    return url;
}

// Expor globalmente para uso no Alpine.js
window.getHighResThumbnail = getHighResThumbnail;

// ========================================
// ALPINE.JS INITIALIZATION
// ========================================

// Alpine.js App Initialization
document.addEventListener('alpine:init', () => {
    
    // ========================================
    // DIRETIVA ALPINE.JS PARA LAZY LOADING
    // ========================================
    Alpine.directive('lazy-src', (el, { expression }, { evaluateLater, effect }) => {
        const getSrc = evaluateLater(expression);
        let observerCreated = false;
        
        effect(() => {
            getSrc(src => {
                if (!src) {
                    el.src = '/static/images/placeholder.jpg';
                    return;
                }
                
                // Evitar criar múltiplos observers
                if (observerCreated) return;
                observerCreated = true;
                
                // Configurar lazy loading
                el.setAttribute('data-src', src);
                el.classList.add('lazy');
                
                // Criar observer para esta imagem
                if ('IntersectionObserver' in window) {
                    const observer = new IntersectionObserver((entries) => {
                        entries.forEach(entry => {
                            if (entry.isIntersecting) {
                                const img = entry.target;
                                const dataSrc = img.getAttribute('data-src');
                                if (dataSrc) {
                                    // Carregar imagem
                                    img.src = dataSrc;
                                    img.removeAttribute('data-src');
                                    img.classList.remove('lazy');
                                    img.classList.add('lazy-loaded');
                                }
                                observer.unobserve(img);
                            }
                        });
                    }, {
                        rootMargin: '400px 0px', // Começar a carregar 400px antes (mais agressivo)
                        threshold: 0.01
                    });
                    
                    // Observar elemento
                    observer.observe(el);
                    
                    // Se já estiver visível, carregar imediatamente
                    const rect = el.getBoundingClientRect();
                    const isVisible = (
                        rect.top >= -400 && 
                        rect.bottom <= (window.innerHeight + 400)
                    );
                    
                    if (isVisible) {
                        setTimeout(() => {
                            if (el.getAttribute('data-src')) {
                                el.src = el.getAttribute('data-src');
                                el.removeAttribute('data-src');
                                el.classList.remove('lazy');
                                el.classList.add('lazy-loaded');
                                observer.unobserve(el);
                            }
                        }, 50);
                    }
                } else {
                    // Fallback para navegadores sem IntersectionObserver
                    el.src = src;
                    el.classList.remove('lazy');
                    el.classList.add('lazy-loaded');
                }
            });
        });
    });
    
        // Global stores
    Alpine.store('player', {
        currentTrack: null,
        isPlaying: false,
        isLoading: false,
        queue: [],
        currentIndex: 0,
        volume: 1.0,  // 0-1 para corresponder ao slider (1.0 = 100%)
        // ✨ Nova barra de progresso moderna
        currentTime: 0,
        totalDuration: 0,
        progressPercent: 0,
        isDragging: false,
        updateTimer: null,
        showRelated: false,
        relatedSongs: [],
        showLyricsModal: false,
        lyricsText: '',
        lyricsLoading: false,
        lyricsError: null,
        youtubePlayer: null,
        youtubeReady: false,
        // Novos controles
        repeatMode: 'off', // 'off', 'one', 'all'
        shuffleMode: false,
        originalQueue: [], // Para guardar ordem original quando shuffle ativo

        init() {
            // YouTube player será inicializado quando onYouTubeIframeAPIReady() for chamado
        },

        initYouTubePlayer() {
            const player = Alpine.store('player');
            
            try {
                player.youtubePlayer = new YT.Player('youtube-player', {
                    height: '0',
                    width: '0',
                    playerVars: {
                        'controls': 0,
                        'disablekb': 1,
                        'fs': 0,
                        'modestbranding': 1,
                        'playsinline': 1,
                        'rel': 0,
                        'showinfo': 0,
                        'iv_load_policy': 3,
                        'origin': window.location.origin,
                        'widget_referrer': window.location.href,
                        'enablejsapi': 1
                    },
                    events: {
                        'onReady': (event) => {
                        // Guardar referência ao player do evento (mais confiável)
                        player.youtubePlayer = event.target;
                        player.youtubeReady = true;
                        
                        // Definir volume inicial
                        try {
                            const youtubeVolume = Math.round(player.volume * 100);
                            if (player.youtubePlayer && typeof player.youtubePlayer.setVolume === 'function') {
                                player.youtubePlayer.setVolume(youtubeVolume);
                            } else {
                                setTimeout(() => {
                                    if (player.youtubePlayer && typeof player.youtubePlayer.setVolume === 'function') {
                                        player.youtubePlayer.setVolume(youtubeVolume);
                                    }
                                }, 100);
                            }
                        } catch (error) {
                            // Silenciar erro de volume
                        }
                    },
                        'onStateChange': (event) => {
                            // -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
                            if (event.data === YT.PlayerState.PLAYING) {
                                player.isPlaying = true;
                                player.isLoading = false;
                                player.startProgressUpdate();
                            } else if (event.data === YT.PlayerState.PAUSED) {
                                player.isPlaying = false;
                                player.stopProgressUpdate();
                            } else if (event.data === YT.PlayerState.ENDED) {
                                player.isPlaying = false;
                                player.stopProgressUpdate();
                                player.next();
                            } else if (event.data === YT.PlayerState.BUFFERING) {
                                player.isLoading = true;
                            }
                        },
                        'onError': (event) => {
                            player.isLoading = false;
                            player.isPlaying = false;
                        }
                    }
                });
            } catch (error) {
                // Erro ao criar player
            }
        },

        async playTrack(track) {
            try {
                // Aguardar YouTube player estar pronto (com timeout de 10 segundos)
                if (!this.youtubeReady || !this.youtubePlayer) {
                    const maxWait = 10000; // 10 segundos
                    const startTime = Date.now();
                    
                    while ((!this.youtubeReady || !this.youtubePlayer) && (Date.now() - startTime < maxWait)) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                    
                    if (!this.youtubeReady || !this.youtubePlayer) {
                        console.error('❌ Timeout: YouTube player não ficou pronto');
                        alert('Erro ao carregar o player. Por favor, recarregue a página.');
                        return;
                    }
                }
                
                // Verificar se loadVideoById está disponível
                if (typeof this.youtubePlayer.loadVideoById !== 'function') {
                    // Tentar aguardar mais um pouco
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    if (typeof this.youtubePlayer.loadVideoById !== 'function') {
                        console.error('❌ Player não está pronto');
                        alert('Erro: Player não está pronto. Por favor, recarregue a página.');
                        return;
                    }
                }
                
                this.currentTrack = track;
                this.isLoading = true;
                
                console.log('🎵 Track carregada no player:', {
                    title: track.title,
                    artist: track.artist,
                    thumbnails: track.thumbnails,
                    videoId: track.videoId
                });
                
                this.youtubePlayer.loadVideoById(track.videoId);
                
                // Load related songs em background
                this.loadRelatedSongs(track.videoId);
                
            } catch (error) {
                console.error('❌ ERRO AO REPRODUZIR:', error);
                console.error('❌ Stack trace:', error.stack);
                this.isLoading = false;
            }
        },

        togglePlay() {
            if (!this.youtubeReady || !this.youtubePlayer) return;
            
            if (this.isPlaying) {
                this.youtubePlayer.pauseVideo();
            } else {
                this.youtubePlayer.playVideo();
            }
        },

        next() {
            // Se repeat mode = 'one', repetir a mesma música
            if (this.repeatMode === 'one') {
                this.playTrack(this.currentTrack);
                return;
            }

            // Se tiver fila
            if (this.queue.length > 0) {
                if (this.currentIndex < this.queue.length - 1) {
                    this.currentIndex++;
                    this.playTrack(this.queue[this.currentIndex]);
                } else if (this.repeatMode === 'all') {
                    // Voltar para o início se repeat all
                    this.currentIndex = 0;
                    this.playTrack(this.queue[this.currentIndex]);
                }
            }
        },

        previous() {
            if (this.currentIndex > 0) {
                this.currentIndex--;
                this.playTrack(this.queue[this.currentIndex]);
            } else if (this.repeatMode === 'all' && this.queue.length > 0) {
                // Se repeat all, ir para última música
                this.currentIndex = this.queue.length - 1;
                this.playTrack(this.queue[this.currentIndex]);
            }
        },

        // Toggle repeat mode: off -> all -> one -> off
        toggleRepeat() {
            if (this.repeatMode === 'off') {
                this.repeatMode = 'all';
            } else if (this.repeatMode === 'all') {
                this.repeatMode = 'one';
            } else {
                this.repeatMode = 'off';
            }
        },

        // Toggle shuffle mode
        toggleShuffle() {
            // Verificar se tem fila
            if (this.queue.length === 0) {
                return;
            }

            this.shuffleMode = !this.shuffleMode;
            
            if (this.shuffleMode) {
                // Salvar ordem original
                this.originalQueue = [...this.queue];
                
                // Embaralhar fila (mantendo música atual)
                const currentTrack = this.queue[this.currentIndex];
                const otherTracks = this.queue.filter((_, i) => i !== this.currentIndex);
                
                // Fisher-Yates shuffle
                for (let i = otherTracks.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [otherTracks[i], otherTracks[j]] = [otherTracks[j], otherTracks[i]];
                }
                
                // Reconstruir fila com música atual no início
                this.queue = [currentTrack, ...otherTracks];
                this.currentIndex = 0;
            } else {
                // Restaurar ordem original
                if (this.originalQueue.length > 0) {
                    // Encontrar índice da música atual na fila original
                    const currentTrack = this.queue[this.currentIndex];
                    this.queue = [...this.originalQueue];
                    
                    // Verificar se currentTrack existe antes de buscar videoId
                    if (currentTrack && currentTrack.videoId) {
                        this.currentIndex = this.queue.findIndex(t => t && t.videoId === currentTrack.videoId);
                        if (this.currentIndex === -1) this.currentIndex = 0;
                    } else {
                        this.currentIndex = 0;
                    }
                    
                    this.originalQueue = [];
                }
            }
        },

        addToQueue(tracks) {
            // Aceita tanto array quanto objeto único
            const tracksArray = Array.isArray(tracks) ? tracks : [tracks];
            this.queue = [...this.queue, ...tracksArray];
        },

        clearQueue() {
            this.queue = [];
            this.currentIndex = 0;
        },

        setQueue(tracks) {
            // Define a queue com as músicas fornecidas
            this.queue = Array.isArray(tracks) ? tracks : [tracks];
            this.currentIndex = 0;
        },

        async loadRelatedSongs(videoId) {
            try {
                const response = await fetch(`/api/related/${videoId}`);
                const data = await response.json();
                this.relatedSongs = data.related || [];
            } catch (error) {
                console.error('Erro ao carregar músicas relacionadas:', error);
            }
        },

        formatTime(seconds) {
            if (seconds === null || seconds === undefined || isNaN(seconds) || seconds < 0) return '0:00';
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        },

        setVolume(value) {
            // Converter de 0-1 (slider) para 0-100 (YouTube API)
            this.volume = parseFloat(value);
            const youtubeVolume = Math.round(this.volume * 100);
            
            if (this.youtubeReady && this.youtubePlayer) {
                try {
                    if (typeof this.youtubePlayer.setVolume === 'function') {
                        this.youtubePlayer.setVolume(youtubeVolume);
                    } else {
                        console.warn('⚠️ setVolume não é uma função');
                    }
                } catch (error) {
                    console.error('❌ Erro ao definir volume:', error);
                }
            }
        },

        // ========== ✨ NOVA BARRA DE PROGRESSO MODERNA ========== //
        
        startProgressUpdate() {
            if (this.updateTimer) return;
            
            console.log('🎯 startProgressUpdate chamado');
            
            // Atualizar imediatamente ao iniciar
            if (this.youtubePlayer && this.youtubeReady) {
                try {
                    this.totalDuration = this.youtubePlayer.getDuration() || 0;
                    this.currentTime = this.youtubePlayer.getCurrentTime() || 0;
                    this.progressPercent = this.totalDuration > 0 
                        ? (this.currentTime / this.totalDuration) * 100 
                        : 0;
                    console.log('⏱️ Duração inicial:', this.totalDuration, 'segundos');
                } catch (e) {
                    console.warn('⚠️ Erro ao obter duração inicial:', e);
                }
            } else {
                console.warn('⚠️ Player não está pronto ainda');
            }
            
            this.updateTimer = setInterval(() => {
                if (!this.isDragging && this.youtubePlayer && this.youtubeReady) {
                    try {
                        this.currentTime = this.youtubePlayer.getCurrentTime() || 0;
                        const newDuration = this.youtubePlayer.getDuration() || 0;
                        
                        // Log apenas quando duração mudar de 0
                        if (this.totalDuration === 0 && newDuration > 0) {
                            console.log('✅ Duração carregada:', newDuration, 'segundos');
                        }
                        
                        this.totalDuration = newDuration;
                        this.progressPercent = this.totalDuration > 0 
                            ? (this.currentTime / this.totalDuration) * 100 
                            : 0;
                    } catch (e) {
                        // Silenciar erros
                    }
                }
            }, 100);
        },
        
        stopProgressUpdate() {
            if (this.updateTimer) {
                clearInterval(this.updateTimer);
                this.updateTimer = null;
            }
        },
        
        seekTo(event) {
            if (!this.youtubePlayer || this.isDragging) return;
            
            const track = event.currentTarget;
            const rect = track.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
            
            try {
                const duration = this.youtubePlayer.getDuration() || 0;
                if (duration > 0) {
                    const newTime = (percent / 100) * duration;
                    this.youtubePlayer.seekTo(newTime, true);
                    console.log('🎯 Seek:', this.formatTime(newTime), '/', this.formatTime(duration));
                } else {
                    console.warn('⚠️ Duração ainda não disponível para seek');
                }
            } catch (e) {
                console.warn('❌ Erro ao fazer seek:', e);
            }
        },
        
        startDrag(event) {
            if (!this.youtubePlayer) {
                console.warn('⚠️ Drag ignorado: player não está pronto');
                return;
            }
            
            this.isDragging = true;
            event.preventDefault();
            
            console.log('🖱️ Drag iniciado');
            
            // Guardar referência ao track element
            const trackElement = event.currentTarget;
            
            const handleMove = (e) => {
                if (!this.isDragging) return;
                
                const rect = trackElement.getBoundingClientRect();
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const x = clientX - rect.left;
                const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
                
                this.progressPercent = percent;
                this.currentTime = (percent / 100) * this.totalDuration;
            };
            
            const handleEnd = () => {
                if (!this.isDragging) return;
                
                this.isDragging = false;
                const duration = this.youtubePlayer.getDuration();
                if (duration > 0) {
                    const newTime = (this.progressPercent / 100) * duration;
                    this.youtubePlayer.seekTo(newTime, true);
                    console.log('✅ Drag finalizado:', this.formatTime(newTime), '/', this.formatTime(duration));
                }
                
                document.removeEventListener('mousemove', handleMove);
                document.removeEventListener('mouseup', handleEnd);
                document.removeEventListener('touchmove', handleMove);
                document.removeEventListener('touchend', handleEnd);
            };
            
            document.addEventListener('mousemove', handleMove);
            document.addEventListener('mouseup', handleEnd);
            document.addEventListener('touchmove', handleMove, { passive: false });
            document.addEventListener('touchend', handleEnd);
            
            // Processar evento inicial
            handleMove(event);
        },

        async showRelatedSongs() {
            if (!this.currentTrack) return;
            
            this.showRelated = !this.showRelated;
            
            if (this.showRelated && this.relatedSongs.length === 0) {
                try {
                    const response = await fetch(`/api/related/${this.currentTrack.videoId}`);
                    const data = await response.json();
                    
                    if (data.success) {
                        this.relatedSongs = data.related || [];
                    }
                } catch (error) {
                    console.error('Erro ao carregar músicas relacionadas:', error);
                }
            }
        },

        async showLyrics() {
            if (!this.currentTrack) return;
            
            this.showLyricsModal = true;
            this.lyricsLoading = true;
            this.lyricsError = null;
            this.lyricsText = '';
            
            try {
                const response = await fetch(`/api/lyrics/${this.currentTrack.videoId}`);
                const data = await response.json();
                
                if (data.success && data.lyrics) {
                    this.lyricsText = data.lyrics;
                } else {
                    // Mensagem de erro amigável do backend
                    this.lyricsError = data.error || 'Letras não disponíveis para esta música';
                }
            } catch (error) {
                console.error('Erro ao carregar letras:', error);
                this.lyricsError = 'Erro de conexão ao buscar letras';
            } finally {
                this.lyricsLoading = false;
            }
        },

        hideLyrics() {
            this.showLyricsModal = false;
            this.lyricsText = '';
            this.lyricsError = null;
        },

        toggleRelatedSongs() {
            this.showRelated = !this.showRelated;
        },

        playRelatedSong(song) {
            // Adicionar músicas relacionadas à fila se ainda não estiver
            if (this.relatedSongs.length > 0 && this.queue.length === 0) {
                this.queue = [...this.relatedSongs];
                this.currentIndex = this.queue.findIndex(s => s.videoId === song.videoId);
                if (this.currentIndex === -1) {
                    this.currentIndex = 0;
                }
            } else if (this.relatedSongs.length > 0) {
                // Adicionar relacionadas que não estão na fila
                const newSongs = this.relatedSongs.filter(rs => 
                    !this.queue.some(q => q.videoId === rs.videoId)
                );
                this.queue = [...this.queue, ...newSongs];
            }
            
            this.playTrack(song);
        },
        
        addRelatedToQueue() {
            // Adicionar todas as músicas relacionadas à fila
            if (this.relatedSongs.length > 0) {
                const newSongs = this.relatedSongs.filter(rs => 
                    !this.queue.some(q => q.videoId === rs.videoId)
                );
                this.queue = [...this.queue, ...newSongs];
            }
        }
    });

    // Global modals store
    Alpine.store('modals', {
        activeModal: null,
        
        show(modalName) {
            this.activeModal = modalName;
        },
        
        hide() {
            this.activeModal = null;
        }
    });
    
    // Charts Store
    Alpine.store('charts', {
        selectedCountry: 'BR',
        countryName: 'Brasil',
        countries: {
            'ZZ': 'Global',
            'BR': 'Brasil',
            'US': 'EUA',
            'GB': 'Reino Unido',
            'DE': 'Alemanha',
            'FR': 'França',
            'IT': 'Itália',
            'ES': 'Espanha',
            'MX': 'México',
            'AR': 'Argentina',
            'CL': 'Chile',
            'CO': 'Colômbia',
            'JP': 'Japão',
            'KR': 'Coreia do Sul',
            'IN': 'Índia',
            'AU': 'Austrália',
            'CA': 'Canadá',
            'RU': 'Rússia',
            'PL': 'Polônia',
            'TR': 'Turquia',
            'SE': 'Suécia',
            'NO': 'Noruega',
            'DK': 'Dinamarca',
            'FI': 'Finlândia',
            'NL': 'Holanda',
            'BE': 'Bélgica',
            'CH': 'Suíça',
            'AT': 'Áustria',
            'PT': 'Portugal',
            'GR': 'Grécia',
            'CZ': 'República Tcheca',
            'HU': 'Hungria',
            'RO': 'Romênia',
            'BG': 'Bulgária',
            'UA': 'Ucrânia',
            'ZA': 'África do Sul',
            'EG': 'Egito',
            'NG': 'Nigéria',
            'KE': 'Quênia',
            'TH': 'Tailândia',
            'VN': 'Vietnã',
            'PH': 'Filipinas',
            'MY': 'Malásia',
            'SG': 'Singapura',
            'ID': 'Indonésia',
            'NZ': 'Nova Zelândia',
            'CN': 'China',
            'PE': 'Peru',
            'EC': 'Equador',
            'VE': 'Venezuela',
            'BO': 'Bolívia',
            'PY': 'Paraguai',
            'UY': 'Uruguai'
        },
        
        loadCharts() {
            this.countryName = this.countries[this.selectedCountry] || this.selectedCountry;
            
            // Trigger HTMX reload for all chart elements
            htmx.trigger(document.body, 'countryChanged');
            
            // Update all chart sections with the new country
            const chartElements = document.querySelectorAll('[hx-get*="/api/charts/"]');
            chartElements.forEach(el => {
                const currentUrl = el.getAttribute('hx-get');
                // Replace the last segment (country code) with the new one
                const newUrl = currentUrl.replace(/\/[A-Z]{2}$/, `/${this.selectedCountry}`);
                el.setAttribute('hx-get', newUrl);
                htmx.trigger(el, 'load');
            });
        }
    });
    
    // Explore Store
    Alpine.store('explore', {
        moods: [],
        selectedMood: null,
        playlists: [],
        
        async loadMoods() {
            try {
                const response = await fetch('/api/moods');
                const html = await response.text();
                const container = document.querySelector('#moods-container');
                if (container) {
                    container.innerHTML = html;
                }
            } catch (error) {
                console.error('Erro ao carregar moods:', error);
            }
        },
        
        async loadMoodPlaylists(params) {
            try {
                this.selectedMood = params;
                const response = await fetch(`/api/mood/${params}`);
                const html = await response.text();
                const container = document.querySelector('#mood-playlists');
                if (container) {
                    container.innerHTML = html;
                }
            } catch (error) {
                console.error('Erro ao carregar playlists do mood:', error);
            }
        }
    });
});

// Main app component - Simplified for navigation state only
function app() {
    return {
        currentSection: 'home',
        sidebarOpen: false,  // Controlar sidebar mobile

        init() {
        },

        toggleSidebar() {
            this.sidebarOpen = !this.sidebarOpen;
        },

        closeSidebar() {
            this.sidebarOpen = false;
        }
    };
}

// Funções helper globais para uso com HTMX
window.playTrackFromCard = function(card) {
    const videoId = card.dataset.videoId;
    const titleElement = card.querySelector('h4, .music-card-title, .track-title');
    const artistElement = card.querySelector('p, .music-card-artist, .track-artist');
    const imgElement = card.querySelector('img');
    
    if (!videoId) {
        console.error('❌ videoId não encontrado no card');
        return;
    }
    
    if (!titleElement || !artistElement || !imgElement) {
        console.error('❌ Elementos não encontrados no card');
        return;
    }
    
    const track = {
        videoId: videoId,
        title: titleElement.textContent.trim(),
        artist: artistElement.textContent.trim(),
        thumbnails: [{ url: imgElement.src }]
    };
    
    // Use Alpine store to play track
    if (window.Alpine && Alpine.store('player')) {
        Alpine.store('player').playTrack(track);
    } else {
        console.error('❌ Alpine ou player store não disponível');
    }
};

window.openPlaylistFromCard = function(card) {
    // Verificar se card é válido
    if (!card || !card.dataset) {
        console.error('❌ Card inválido passado para openPlaylistFromCard');
        return;
    }
    
    const browseId = card.dataset.browseId;
    
    if (!browseId) {
        console.error('❌ browseId não encontrado no card');
        return;
    }
    
    // Use função navigateTo global que atualiza a URL
    if (window.navigateTo) {
        window.navigateTo(`/pages/playlist/${browseId}`);
    } else if (window.htmx) {
        htmx.ajax('GET', `/pages/playlist/${browseId}`, {
            target: '#main-content',
            swap: 'innerHTML'
        });
        history.pushState({url: `/pages/playlist/${browseId}`}, '', `/pages/playlist/${browseId}`);
    }
};

window.openArtistFromCard = function(card) {
    // Verificar se card é válido
    if (!card || !card.dataset) {
        console.error('❌ Card inválido passado para openArtistFromCard');
        return;
    }
    
    const browseId = card.dataset.browseId;
    
    if (!browseId) {
        console.error('❌ browseId não encontrado no card');
        return;
    }
    
    console.log('🎤 Abrindo artista:', browseId);
    
    // Use função navigateTo global que atualiza a URL
    if (window.navigateTo) {
        window.navigateTo(`/pages/artist/${browseId}`);
    } else if (window.htmx) {
        htmx.ajax('GET', `/pages/artist/${browseId}`, {
            target: '#main-content',
            swap: 'innerHTML'
        });
        history.pushState({url: `/pages/artist/${browseId}`}, '', `/pages/artist/${browseId}`);
    }
};

window.openAlbumFromCard = function(card) {
    const browseId = card.dataset.browseId;
    const titleElement = card.querySelector('.music-card-title');
    const imgElement = card.querySelector('.music-card-image');
    
    if (!browseId || !titleElement || !imgElement) {
        console.error('❌ Dados incompletos no card do álbum:', { browseId, titleElement, imgElement });
        return;
    }
    
    const title = titleElement.textContent;
    const thumbnail = imgElement.src;
    
    const album = {
        browseId: browseId,
        title: title,
        thumbnails: [{ url: thumbnail }]
    };
    
    console.log('💿 Abrindo álbum:', album);
    
    // Use função navigateTo global que atualiza a URL
    if (window.navigateTo) {
        window.navigateTo(`/pages/album/${browseId}`);
    } else if (window.htmx) {
        htmx.ajax('GET', `/pages/album/${browseId}`, {
            target: '#main-content',
            swap: 'innerHTML'
        });
        history.pushState({url: `/pages/album/${browseId}`}, '', `/pages/album/${browseId}`);
    }
};

window.playAlbumFromCard = function(buttonElement) {
    // Buscar o card pai que contém data-browse-id
    const card = buttonElement.closest('[data-browse-id]');
    
    if (!card) {
        console.error('❌ Card do álbum não encontrado');
        return;
    }
    
    const browseId = card.dataset.browseId;
    console.log('▶️ Tentando reproduzir álbum:', browseId);
    
    // Use função navigateTo global que atualiza a URL
    if (window.navigateTo) {
        window.navigateTo(`/pages/album/${browseId}`);
    } else if (window.htmx) {
        htmx.ajax('GET', `/pages/album/${browseId}`, {
            target: '#main-content',
            swap: 'innerHTML'
        });
        history.pushState({url: `/pages/album/${browseId}`}, '', `/pages/album/${browseId}`);
    }
};

// Search Component
// Debounce utility function to prevent rapid successive calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

window.searchComponent = function() {
    return {
        searchQuery: '',
        searchResults: [],
        filterType: 'all',
        isLoading: false,
        hasSearched: false,
        showSuggestions: false,
        displayedSongsCount: 30, // Mostrar 30 músicas inicialmente
        displayedPlaylistsCount: 20, // Mostrar 20 playlists inicialmente
        mainArtist: null,
        topSongs: [],
        loadingSongs: false,
        
        // Cache de buscas para performance
        searchCache: new Map(),
        artistSongsCache: new Map(), // Cache para músicas de artistas
        currentSearchController: null, // Para cancelar buscas anteriores
        
        // Initialize categorizedResults with empty arrays to prevent undefined errors
        categorizedResults: {
            artists: [],
            playlists: [],
            songs: [],
            albums: []
        },
        
        // Inicialização: carregar query da URL se existir
        init() {
            const urlParams = new URLSearchParams(window.location.search);
            const query = urlParams.get('q');
            if (query) {
                this.searchQuery = query;
                this.performSearch();
            }
        },
        
        // Getters para limitar resultados no filtro 'all'
        get limitedArtists() {
            if (this.filterType === 'all' && Array.isArray(this.categorizedResults.artists)) {
                return this.categorizedResults.artists.slice(0, 10);
            }
            return this.categorizedResults.artists || [];
        },
        
        get limitedPlaylists() {
            if (this.filterType === 'all' && Array.isArray(this.categorizedResults.playlists)) {
                return this.categorizedResults.playlists.slice(0, 10);
            }
            return this.categorizedResults.playlists || [];
        },
        
        get limitedSongs() {
            if (this.filterType === 'all' && Array.isArray(this.categorizedResults.songs)) {
                return this.categorizedResults.songs.slice(0, 20);
            }
            return this.categorizedResults.songs || [];
        },
        
        get limitedAlbums() {
            if (this.filterType === 'all' && Array.isArray(this.categorizedResults.albums)) {
                return this.categorizedResults.albums.slice(0, 10);
            }
            return this.categorizedResults.albums || [];
        },
        
        async performSearch() {
            if (!this.searchQuery.trim()) return;
            
            const query = this.searchQuery.trim().toLowerCase();
            
            // ⚡ RESETAR dados do artista anterior IMEDIATAMENTE
            this.mainArtist = null;
            this.topSongs = [];
            this.loadingSongs = false;
            
            // ⚡ CACHE: Verificar se já temos resultado em cache
            if (this.searchCache.has(query)) {
                console.log('⚡ Usando cache para:', query);
                const cachedData = this.searchCache.get(query);
                this.searchResults = cachedData.results;
                this.categorizeResults();
                // Chamar imediatamente sem setTimeout
                this.loadMainArtist();
                return;
            }
            
            // Cancelar busca anterior se ainda estiver executando
            if (this.currentSearchController) {
                this.currentSearchController.abort();
            }
            this.currentSearchController = new AbortController();
            
            this.isLoading = true;
            this.hasSearched = true;
            this.displayedSongsCount = 30;
            this.displayedPlaylistsCount = 20;
            const startTime = performance.now();
            console.log('🔍 Buscando:', query);
            
            // Atualizar URL com a query de busca (sem recarregar a página)
            const newUrl = `/pages/search?q=${encodeURIComponent(this.searchQuery)}`;
            history.pushState({url: newUrl}, '', newUrl);
            
            // Atualizar previousUrl para detecção correta de direção no histórico
            if (typeof window.previousUrl !== 'undefined') {
                window.previousUrl = newUrl;
            }
            
            try {
                // ⚡ Busca com AbortController para cancelamento
                const response = await fetch(
                    `/api/search?q=${encodeURIComponent(this.searchQuery)}&filter=`,
                    { signal: this.currentSearchController.signal }
                );
                const data = await response.json();
                
                if (data.success) {
                    this.searchResults = data.results || [];
                    
                    // ⚡ CACHE: Salvar resultado no cache (máximo 20 buscas)
                    if (this.searchCache.size >= 20) {
                        // Remover mais antigo (primeiro item)
                        const firstKey = this.searchCache.keys().next().value;
                        this.searchCache.delete(firstKey);
                    }
                    this.searchCache.set(query, { results: this.searchResults });
                    
                    // Categorize results into their respective types
                    this.categorizeResults();
                    
                    const elapsed = (performance.now() - startTime).toFixed(0);
                    console.log(`⚡ Busca concluída em ${elapsed}ms`);
                    
                    // Carregar artista principal e suas músicas (imediato)
                    this.loadMainArtist();
                } else {
                    console.error('❌ Erro na busca:', data.error);
                    this.searchResults = [];
                    this.categorizedResults = {
                        artists: [], playlists: [], songs: [], albums: []
                    };
                }
            } catch (error) {
                // Ignorar erros de abort (cancelamento)
                if (error.name === 'AbortError') {
                    console.log('🚫 Busca cancelada');
                    return;
                }
                console.error('❌ Erro ao buscar:', error);
                this.searchResults = [];
                this.categorizedResults = {
                    artists: [], playlists: [], songs: [], albums: []
                };
            } finally {
                this.isLoading = false;
                this.currentSearchController = null;
            }
        },
        
        async loadMainArtist() {
            if (this.categorizedResults.artists && this.categorizedResults.artists.length > 0) {
                // ⚡ DEFINIR ARTISTA IMEDIATAMENTE (foto aparece instantaneamente)
                this.mainArtist = this.categorizedResults.artists[0];
                console.log('🎤 ARTISTA PRINCIPAL DEFINIDO:', this.mainArtist);
                
                // ⚡ Forçar atualização do DOM imediatamente
                this.$nextTick(() => {
                    // DOM atualizado com nova foto
                });
                
                // Carregar músicas do artista (se tiver browseId)
                if (this.mainArtist?.browseId) {
                    const artistId = this.mainArtist.browseId;
                    
                    // ⚡ CACHE: Verificar se já temos músicas deste artista
                    if (this.artistSongsCache.has(artistId)) {
                        console.log('⚡ Usando cache de músicas para artista:', artistId);
                        this.topSongs = this.artistSongsCache.get(artistId);
                        this.loadingSongs = false;
                        return;
                    }
                    
                    console.log('🎤 Carregando músicas do artista:', artistId);
                    this.loadingSongs = true;
                    
                    // ⚡ Buscar músicas em background (não bloqueia UI)
                    try {
                        const response = await fetch(`/api/artist/${artistId}`);
                        const data = await response.json();
                        
                        if (data.success && data.artist?.songs?.results) {
                            // Garantir thumbnails válidas em cada música
                            const songs = data.artist.songs.results.slice(0, 5).map(song => {
                                this.ensureItemThumbnails(song);
                                return song;
                            });
                            this.topSongs = songs;
                            
                            // ⚡ CACHE: Salvar músicas no cache (máximo 10 artistas)
                            if (this.artistSongsCache.size >= 10) {
                                const firstKey = this.artistSongsCache.keys().next().value;
                                this.artistSongsCache.delete(firstKey);
                            }
                            this.artistSongsCache.set(artistId, songs);
                            
                            console.log('🎤 Top músicas carregadas:', this.topSongs.length);
                        } else {
                            this.topSongs = [];
                        }
                    } catch (err) {
                        console.error('❌ Erro ao carregar músicas do artista:', err);
                        this.topSongs = [];
                    } finally {
                        this.loadingSongs = false;
                    }
                } else {
                    // Se não tem browseId, limpar músicas
                    this.topSongs = [];
                    this.loadingSongs = false;
                }
            } else {
                // Se não há artistas, limpar tudo
                this.mainArtist = null;
                this.topSongs = [];
                this.loadingSongs = false;
            }
        },
        
        // ✅ Garante que cada item tenha thumbnails válidas (IGUAL AO PERFIL DO ARTISTA)
        ensureItemThumbnails(item) {
            if (!item) return item;
            
            // Verificar se thumbnails existe e é válido
            const hasValidThumbnails = (
                item.thumbnails && 
                Array.isArray(item.thumbnails) && 
                item.thumbnails.length > 0 &&
                item.thumbnails.some(t => t && t.url)
            );
            
            if (!hasValidThumbnails) {
                // Se não tem thumbnail válido, adiciona placeholder
                item.thumbnails = [{ url: '/static/images/placeholder.jpg', width: 160, height: 160 }];
            } else {
                // Remover thumbnails sem URL válida e ordenar por tamanho (maior primeiro)
                const validThumbnails = item.thumbnails
                    .filter(t => t && t.url)
                    .sort((a, b) => {
                        const sizeA = (a.width || 0) * (a.height || 0);
                        const sizeB = (b.width || 0) * (b.height || 0);
                        return sizeB - sizeA; // Maior primeiro
                    });
                
                if (validThumbnails.length > 0) {
                    item.thumbnails = validThumbnails;
                } else {
                    item.thumbnails = [{ url: '/static/images/placeholder.jpg', width: 160, height: 160 }];
                }
            }
            
            return item;
        },
        
        // Calcula score de relevância (usado apenas para playlists)
        calculateRelevanceScore(item, query) {
            const searchTerm = query.toLowerCase().trim();
            const itemName = (item.name || item.artist || item.title || '').toLowerCase();
            
            // Score base
            let score = 0;
            
            // Match exato = mais relevante
            if (itemName === searchTerm) {
                score += 1000;
            }
            // Nome começa com a busca = muito relevante
            else if (itemName.startsWith(searchTerm)) {
                score += 500;
            }
            // Nome contém a busca = relevante
            else if (itemName.includes(searchTerm)) {
                score += 100;
            }
            
            // Palavras individuais (para "Eminem feat X" encontrar "Eminem")
            const searchWords = searchTerm.split(' ');
            const nameWords = itemName.split(' ');
            
            searchWords.forEach(searchWord => {
                nameWords.forEach(nameWord => {
                    if (nameWord === searchWord) {
                        score += 50; // Palavra exata
                    } else if (nameWord.startsWith(searchWord)) {
                        score += 25; // Palavra começa
                    }
                });
            });
            
            return score;
        },
        
        // Categorizar resultados por tipo - método que atualiza a propriedade
        categorizeResults() {
            const startTime = performance.now();
            
            // Resetar com arrays vazios garantidos
            const categorized = {
                artists: [],
                playlists: [],
                songs: [],
                albums: []
            };
            
            // Verificação explícita antes de iterar - garante que searchResults é um array
            if (!this.searchResults || !Array.isArray(this.searchResults)) {
                console.warn('⚠️ searchResults não está disponível, resetando categorizedResults');
                this.categorizedResults = categorized;
                return;
            }
            
            // ⚡ OTIMIZAÇÃO: Processar thumbnails inline durante categorização
            this.searchResults.forEach(item => {
                const type = item.resultType || item.category || '';
                
                // ⚡ Processar thumbnail imediatamente (inline)
                this.ensureItemThumbnails(item);
                
                if (type === 'artist') {
                    // Apenas artistas COM browseId
                    if (item.browseId) {
                        categorized.artists.push(item);
                    }
                } else if (type === 'playlist') {
                    // Apenas playlists COM browseId
                    if (item.browseId) {
                        categorized.playlists.push(item);
                    }
                } else if (type === 'song' || type === 'video') {
                    categorized.songs.push(item);
                } else if (type === 'album') {
                    categorized.albums.push(item);
                }
            });
            
            // Ordenar playlists por relevância
            if (categorized.playlists.length > 0 && this.searchQuery) {
                categorized.playlists.sort((a, b) => {
                    const scoreA = this.calculateRelevanceScore(a, this.searchQuery);
                    const scoreB = this.calculateRelevanceScore(b, this.searchQuery);
                    return scoreB - scoreA;
                });
            }
            
            // Log resumo de resultados
            const elapsed = (performance.now() - startTime).toFixed(1);
            console.log(`📊 Categorizados em ${elapsed}ms:`, {
                artistas: categorized.artists.length,
                playlists: categorized.playlists.length,
                músicas: categorized.songs.length,
                álbuns: categorized.albums.length
            });
            
            // Update the property instead of returning
            this.categorizedResults = categorized;
        },
        
        // Músicas a serem exibidas (com paginação)
        get displayedSongs() {
            if (!this.categorizedResults?.songs || !Array.isArray(this.categorizedResults.songs)) {
                return [];
            }
            // No filtro 'all', usar limitedSongs (20 músicas)
            if (this.filterType === 'all') {
                return this.limitedSongs;
            }
            // Nos outros filtros, usar paginação normal
            return this.categorizedResults.songs.slice(0, this.displayedSongsCount);
        },
        
        // Verificar se há mais músicas para carregar
        get hasMoreSongs() {
            if (!this.categorizedResults?.songs || !Array.isArray(this.categorizedResults.songs)) {
                return false;
            }
            // No filtro 'all', não mostrar "Carregar mais" (limitado a 20)
            if (this.filterType === 'all') {
                return false;
            }
            return this.displayedSongsCount < this.categorizedResults.songs.length;
        },
        
        // Carregar mais 20 músicas
        loadMoreSongs() {
            // Usar Alpine.nextTick para garantir que o DOM seja atualizado de forma segura
            this.$nextTick(() => {
                this.displayedSongsCount += 20;
                console.log('📦 Carregando mais músicas. Total exibindo:', this.displayedSongsCount);
            });
        },
        
        // Playlists a serem exibidas (com paginação)
        get displayedPlaylists() {
            if (!this.categorizedResults?.playlists || !Array.isArray(this.categorizedResults.playlists)) {
                return [];
            }
            return this.categorizedResults.playlists.slice(0, this.displayedPlaylistsCount);
        },
        
        // Verificar se há mais playlists para carregar
        get hasMorePlaylists() {
            if (!this.categorizedResults?.playlists || !Array.isArray(this.categorizedResults.playlists)) {
                return false;
            }
            return this.displayedPlaylistsCount < this.categorizedResults.playlists.length;
        },
        
        // Carregar mais 20 playlists
        loadMorePlaylists() {
            this.$nextTick(() => {
                this.displayedPlaylistsCount += 20;
                console.log('📦 Carregando mais playlists. Total exibindo:', this.displayedPlaylistsCount);
            });
        },
        
        getHighResThumbnail(url) {
            if (!url) return '/static/images/placeholder.jpg';
            return '/api/image-proxy?url=' + encodeURIComponent(url);
        },
        
        getArtistName(item) {
            if (item.artists && item.artists.length > 0) {
                return item.artists[0].name;
            }
            if (item.author) {
                return typeof item.author === 'string' ? item.author : item.author.name;
            }
            return 'Artista desconhecido';
        },
        
        playItem(item) {
            if (item.videoId && window.Alpine && Alpine.store('player')) {
                const track = {
                    videoId: item.videoId,
                    title: item.title,
                    artist: this.getArtistName(item),
                    thumbnails: item.thumbnails || []
                };
                Alpine.store('player').playTrack(track);
            }
        },
        
        handleItemClick(item) {
            console.log('🎵 Item clicado:', item);
            let type = (item.resultType || item.category || '').toLowerCase();
            const browseId = item.browseId;
            
            // Se não tem tipo definido, detectar pelo browseId ou por outras propriedades
            if (!type && browseId) {
                if (browseId.startsWith('UC')) {
                    type = 'artist';
                    console.log('🎤 Detectado como ARTISTA pelo browseId (UC...)');
                } else if (browseId.startsWith('MPREb_') || browseId.startsWith('OLAK') || item.year) {
                    type = 'album';
                    console.log('💿 Detectado como ÁLBUM pelo browseId (MPREb_/OLAK) ou propriedade year');
                } else if (browseId.startsWith('RDCLAK') || browseId.startsWith('VLPL') || browseId.startsWith('PL')) {
                    type = 'playlist';
                    console.log('📀 Detectado como PLAYLIST pelo browseId');
                }
            }
            
            console.log('🔍 Tipo final:', type, '| browseId:', browseId);
            
            if (type === 'song' || type === 'video') {
                this.playItem(item);
            } else if ((type === 'artist' || type === 'artists') && browseId) {
                console.log('🎤 Navegando para artista:', browseId);
                const url = `/pages/artist/${browseId}`;
                
                if (window.navigateTo) {
                    console.log('✅ Usando window.navigateTo');
                    window.navigateTo(url);
                } else if (window.htmx) {
                    console.log('✅ Usando HTMX');
                    htmx.ajax('GET', url, {
                        target: '#main-content',
                        swap: 'innerHTML'
                    });
                    history.pushState({url: url}, '', url);
                } else {
                    console.error('❌ Nenhum método de navegação disponível');
                }
            } else if (type === 'album' && browseId) {
                console.log('💿 Navegando para álbum:', browseId);
                const url = `/pages/album/${browseId}`;
                if (window.navigateTo) {
                    window.navigateTo(url);
                } else {
                    htmx.ajax('GET', url, {
                        target: '#main-content',
                        swap: 'innerHTML'
                    });
                    history.pushState({url: url}, '', url);
                }
            } else if (type === 'playlist' && browseId) {
                console.log('📀 Navegando para playlist:', browseId);
                const url = `/pages/playlist/${browseId}`;
                if (window.navigateTo) {
                    window.navigateTo(url);
                } else {
                    htmx.ajax('GET', url, {
                        target: '#main-content',
                        swap: 'innerHTML'
                    });
                    history.pushState({url: url}, '', url);
                }
            } else {
                console.warn('⚠️ Tipo de item não reconhecido:', type, item);
            }
        }
    };
};

// Debug logs
document.addEventListener('alpine:initialized', () => {
    console.log('✅ Alpine.js inicializado com sucesso!');
    console.log('🎵 Player store disponível:', !!Alpine.store('player'));
    console.log('🎵 App store disponível:', !!Alpine.store('app'));
    
    // ✨ CARREGAR YOUTUBE API APENAS DEPOIS DO ALPINE.JS
    if (typeof YT === 'undefined') {
        console.log('📥 Carregando YouTube IFrame API...');
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        document.head.appendChild(script);
    } else {
        console.log('🎬 YouTube API já estava carregada, inicializando player...');
        if (Alpine.store('player')) {
            Alpine.store('player').initYouTubePlayer();
        }
    }
});

// ========================================
// YOUTUBE IFRAME API INITIALIZATION
// ========================================

// Esta função é chamada automaticamente quando a YouTube IFrame API está pronta
window.onYouTubeIframeAPIReady = function() {
    console.log('🎬 YouTube IFrame API pronta!');
    
    // Aguardar Alpine.js estar pronto
    const initPlayer = () => {
        if (window.Alpine && Alpine.store('player')) {
            console.log('🔧 Inicializando YouTube Player...');
            Alpine.store('player').initYouTubePlayer();
        } else {
            setTimeout(initPlayer, 50);
        }
    };
    
    initPlayer();
};

// Fallback: Tentar inicializar após alguns segundos se o callback não for chamado
setTimeout(() => {
    if (window.Alpine && Alpine.store('player') && !Alpine.store('player').youtubeReady) {
        console.warn('⚠️ YouTube callback não foi chamado, tentando forçar inicialização...');
        
        // Verificar se YT está disponível
        if (typeof YT !== 'undefined' && typeof YT.Player !== 'undefined') {
            console.log('✅ YT disponível, inicializando player...');
            Alpine.store('player').initYouTubePlayer();
        } else {
            console.error('❌ YT não está disponível. Tentando recarregar...');
            
            // Última tentativa: recarregar o script do YouTube
            const script = document.createElement('script');
            script.src = 'https://www.youtube.com/iframe_api';
            script.async = true;
            document.head.appendChild(script);
            
            console.log('🔄 Script do YouTube recarregado');
        }
    }
}, 3000);
