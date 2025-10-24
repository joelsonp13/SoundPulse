// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Aumenta a resolução de thumbnails do Google/YouTube
 * USA PROXY para evitar CORS e Rate Limiting (429)
 */
function getHighResThumbnail(url) {
    if (!url) return '/static/images/placeholder.jpg';
    
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

// ========================================
// ALPINE.JS INITIALIZATION
// ========================================

// Alpine.js App Initialization
document.addEventListener('alpine:init', () => {
    console.log('🎵 Alpine.js inicializando...');
    
    // Global stores
    Alpine.store('player', {
        currentTrack: null,
        isPlaying: false,
        isLoading: false,
        queue: [],
        currentIndex: 0,
        currentTime: 0,
        duration: 0,
        progress: 0,
        volume: 100,
        showRelated: false,
        relatedSongs: [],
        showLyricsModal: false,
        lyricsText: '',
        lyricsLoading: false,
        lyricsError: null,
        youtubePlayer: null,
        youtubeReady: false,
        updateInterval: null,

        init() {
            console.log('🎵 Player store inicializado - YouTube IFrame API');
            // YouTube player será inicializado quando onYouTubeIframeAPIReady() for chamado
            console.log('⏳ Aguardando YouTube IFrame API...');
        },

        initYouTubePlayer() {
            console.log('🔧 Inicializando YouTube Player...');
            
            const player = Alpine.store('player');
            
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
                    'showinfo': 0
                },
                events: {
                    'onReady': () => {
                        console.log('✅ YouTube Player pronto!');
                        player.youtubeReady = true;
                        player.youtubePlayer.setVolume(player.volume);
                    },
                    'onStateChange': (event) => {
                        console.log('🎵 YouTube State Changed:', event.data);
                        
                        // -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
                        if (event.data === YT.PlayerState.PLAYING) {
                            console.log('▶️ Playing');
                            player.isPlaying = true;
                            player.isLoading = false;
                            player.startUpdateInterval();
                        } else if (event.data === YT.PlayerState.PAUSED) {
                            console.log('⏸️ Paused');
                            player.isPlaying = false;
                            player.stopUpdateInterval();
                        } else if (event.data === YT.PlayerState.ENDED) {
                            console.log('🏁 Ended');
                            player.isPlaying = false;
                            player.stopUpdateInterval();
                            player.next();
                        } else if (event.data === YT.PlayerState.BUFFERING) {
                            console.log('⏳ Buffering');
                            player.isLoading = true;
                        }
                    },
                    'onError': (event) => {
                        console.error('❌ YouTube Player Error:', event.data);
                        player.isLoading = false;
                        player.isPlaying = false;
                    }
                }
            });
            
            console.log('✅ YouTube Player inicializado');
        },

        startUpdateInterval() {
            if (this.updateInterval) return;
            
            this.updateInterval = setInterval(() => {
                if (this.youtubePlayer && this.youtubeReady) {
                    try {
                        this.currentTime = this.youtubePlayer.getCurrentTime() || 0;
                        this.duration = this.youtubePlayer.getDuration() || 0;
                        this.progress = this.duration ? (this.currentTime / this.duration) * 100 : 0;
                    } catch (e) {
                        // Silenciar erros de atualização
                    }
                }
            }, 100);
        },

        stopUpdateInterval() {
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
                this.updateInterval = null;
            }
        },

        async playTrack(track) {
            console.log('\n' + '='.repeat(80));
            console.log('🎵 PLAYTRACK INICIADO - YouTube IFrame API');
            console.log('='.repeat(80));
            console.log('📦 Track:', track.title);
            console.log('🎬 VideoID:', track.videoId);
            
            try {
                if (!this.youtubeReady || !this.youtubePlayer) {
                    console.warn('⚠️ YouTube player não está pronto ainda');
                    return;
                }
                
                this.currentTrack = track;
                this.isLoading = true;
                
                console.log('▶️ Carregando vídeo no YouTube Player...');
                this.youtubePlayer.loadVideoById(track.videoId);
                
                console.log('✅ MÚSICA CARREGADA!');
                console.log('='.repeat(80) + '\n');
                
                // Load related songs em background
                this.loadRelatedSongs(track.videoId);
                
            } catch (error) {
                console.error('❌ ERRO AO REPRODUZIR:', error);
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
            if (this.queue.length > 0 && this.currentIndex < this.queue.length - 1) {
                this.currentIndex++;
                this.playTrack(this.queue[this.currentIndex]);
            }
        },

        previous() {
            if (this.currentIndex > 0) {
                this.currentIndex--;
                this.playTrack(this.queue[this.currentIndex]);
            }
        },

        addToQueue(tracks) {
            this.queue = [...this.queue, ...tracks];
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
            if (!seconds || isNaN(seconds)) return '0:00';
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        },

        setVolume(value) {
            this.volume = parseFloat(value);
            if (this.youtubeReady && this.youtubePlayer) {
                this.youtubePlayer.setVolume(this.volume);
            }
        },

        seek(event) {
            if (!this.youtubeReady || !this.youtubePlayer) return;
            
            const progressBar = event.currentTarget;
            const rect = progressBar.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const percentage = clickX / rect.width;
            const newTime = this.duration * percentage;
            
            if (!isNaN(newTime) && isFinite(newTime)) {
                this.youtubePlayer.seekTo(newTime, true);
                console.log(`⏩ Seek para: ${this.formatTime(newTime)}`);
            }
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
                    // Mostrar mensagem mais amigável
                    if (data.error && data.error.includes('400')) {
                        this.lyricsError = 'Letras não disponíveis para esta música no YouTube Music';
                    } else {
                        this.lyricsError = data.error || 'Letras não disponíveis para esta música';
                    }
                }
            } catch (error) {
                console.error('Erro ao carregar letras:', error);
                this.lyricsError = 'Erro ao carregar letras';
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
            this.playTrack(song);
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
            console.log(`📊 Carregando charts de: ${this.countryName}`);
            
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

        init() {
            console.log('🎵 SoundPulse inicializado com HTMX + Alpine.js + Tailwind CSS');
        }
    };
}

// Funções helper globais para uso com HTMX
window.playTrackFromCard = function(card) {
    const videoId = card.dataset.videoId;
    const title = card.querySelector('h4').textContent;
    const artist = card.querySelector('p').textContent;
    const thumbnail = card.querySelector('img').src;
    
    const track = {
        videoId: videoId,
        title: title,
        artist: artist,
        thumbnails: [{ url: thumbnail }]
    };
    
    // Use Alpine store to play track
    if (window.Alpine && Alpine.store('player')) {
        Alpine.store('player').playTrack(track);
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
    
    console.log('📋 Abrindo playlist:', browseId);
    
    // Use HTMX para navegar para a página da playlist
    if (window.htmx) {
        htmx.ajax('GET', `/pages/playlist/${browseId}`, {
            target: '#main-content',
            swap: 'innerHTML'
        });
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
    
    // Use HTMX para navegar para a página do artista
    if (window.htmx) {
        htmx.ajax('GET', `/pages/artist/${browseId}`, {
            target: '#main-content',
            swap: 'innerHTML'
        });
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
    
    // Use HTMX para navegar para a página do álbum
    if (window.htmx) {
        htmx.ajax('GET', `/pages/album/${browseId}`, {
            target: '#main-content',
            swap: 'innerHTML'
        });
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
    
    // Navegar para a página do álbum (onde o usuário pode clicar em músicas específicas)
    if (window.htmx) {
        htmx.ajax('GET', `/pages/album/${browseId}`, {
            target: '#main-content',
            swap: 'innerHTML'
        });
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
        
        // Initialize categorizedResults with empty arrays to prevent undefined errors
        categorizedResults: {
            artists: [],
            playlists: [],
            songs: [],
            albums: []
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
            
            this.isLoading = true;
            this.hasSearched = true;
            this.displayedSongsCount = 30; // Reset ao fazer nova busca
            this.displayedPlaylistsCount = 20; // Reset ao fazer nova busca
            console.log('🔍 Buscando:', this.searchQuery);
            
            try {
                // ✅ Sempre busca sem filtro - filtros são aplicados no frontend
                const response = await fetch(`/api/search?q=${encodeURIComponent(this.searchQuery)}&filter=`);
                const data = await response.json();
                
                if (data.success) {
                    this.searchResults = data.results || [];
                    // Categorize results into their respective types
                    this.categorizeResults();
                    
                    // Carregar artista principal e suas músicas
                    this.loadMainArtist();
                } else {
                    console.error('❌ Erro na busca:', data.error);
                    this.searchResults = [];
                    // Reset categorizedResults on error
                    this.categorizedResults = {
                        artists: [],
                        playlists: [],
                        songs: [],
                        albums: []
                    };
                }
            } catch (error) {
                console.error('❌ Erro ao buscar:', error);
                this.searchResults = [];
                // Reset categorizedResults on error
                this.categorizedResults = {
                    artists: [],
                    playlists: [],
                    songs: [],
                    albums: []
                };
            } finally {
                this.isLoading = false;
            }
        },
        
        async loadMainArtist() {
            // Esperar um frame para garantir que categorizedResults foi atualizado
            await new Promise(resolve => setTimeout(resolve, 100));
            
            if (this.categorizedResults.artists && this.categorizedResults.artists.length > 0) {
                this.mainArtist = this.categorizedResults.artists[0];
                console.log('🎤 ARTISTA PRINCIPAL DEFINIDO:', this.mainArtist);
                
                if (this.mainArtist?.browseId) {
                    console.log('🎤 Carregando músicas do artista:', this.mainArtist.browseId);
                    this.loadingSongs = true;
                    
                    try {
                        const response = await fetch(`/api/artist/${this.mainArtist.browseId}`);
                        const data = await response.json();
                        console.log('🎤 Dados do artista recebidos:', data);
                        
                        if (data.success && data.artist?.songs?.results) {
                            this.topSongs = data.artist.songs.results.slice(0, 5);
                            console.log('🎤 Top músicas carregadas:', this.topSongs.length);
                        }
                    } catch (err) {
                        console.error('❌ Erro ao carregar músicas do artista:', err);
                    } finally {
                        this.loadingSongs = false;
                    }
                }
            }
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
            
            // Debug: contar tipos encontrados
            const typeCounts = {};
            
            this.searchResults.forEach(item => {
                const type = item.resultType || item.category || '';
                typeCounts[type] = (typeCounts[type] || 0) + 1;
                
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
            return getHighResThumbnail(url);
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
            const type = item.resultType || item.category;
            
            if (type === 'song' || type === 'video') {
                this.playItem(item);
            } else if (type === 'artist' && item.browseId) {
                htmx.ajax('GET', `/pages/artist/${item.browseId}`, {
                    target: '#main-content',
                    swap: 'innerHTML'
                });
            } else if (type === 'album' && item.browseId) {
                htmx.ajax('GET', `/pages/album/${item.browseId}`, {
                    target: '#main-content',
                    swap: 'innerHTML'
                });
            } else if (type === 'playlist' && item.browseId) {
                htmx.ajax('GET', `/pages/playlist/${item.browseId}`, {
                    target: '#main-content',
                    swap: 'innerHTML'
                });
            }
        }
    };
};

// Debug logs
document.addEventListener('alpine:initialized', () => {
    console.log('✅ Alpine.js inicializado com sucesso!');
    console.log('🎵 Player store disponível:', !!Alpine.store('player'));
    console.log('🎵 App store disponível:', !!Alpine.store('app'));
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
            console.log('⏳ Aguardando Alpine.js...');
            setTimeout(initPlayer, 100);
        }
    };
    
    initPlayer();
};
