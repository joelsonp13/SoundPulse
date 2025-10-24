/**
 * Tailwind CSS Debug Helper
 * Mostra erros e avisos do Tailwind no console do navegador
 */

(function() {
    'use strict';

    console.log('%c🎨 Tailwind Debug Mode ATIVO', 'background: #06b6d4; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');

    // Lista de prefixos válidos do Tailwind
    const validPrefixes = [
        'p-', 'm-', 'px-', 'py-', 'pt-', 'pb-', 'pl-', 'pr-', 'mx-', 'my-', 'mt-', 'mb-', 'ml-', 'mr-',
        '-p-', '-m-', '-px-', '-py-', '-pt-', '-pb-', '-pl-', '-pr-', '-mx-', '-my-', '-mt-', '-mb-', '-ml-', '-mr-',
        'w-', 'h-', 'min-w-', 'min-h-', 'max-w-', 'max-h-',
        'text-', 'font-', 'leading-', 'tracking-', 'align-', 'placeholder-',
        'bg-', 'from-', 'via-', 'to-',
        'border-', 'rounded-', 'shadow-',
        'flex-', 'grid-', 'gap-', 'space-', 'justify-', 'items-', 'content-', 'self-',
        'opacity-', 'z-',
        'transition-', 'duration-', 'ease-', 'delay-', 'animate-',
        'hover:', 'focus:', 'active:', 'group-hover:', 'dark:',
        'sm:', 'md:', 'lg:', 'xl:', '2xl:',
        'backdrop-blur-', 'backdrop-', 'blur-', 'brightness-', 'contrast-', 'grayscale-', 'hue-rotate-', 'invert-', 'saturate-', 'sepia-',
        'overflow-', 'overscroll-', 'whitespace-', 'break-', 'line-clamp-',
        'col-', 'row-', 'auto-cols-', 'auto-rows-',
        'top-', 'right-', 'bottom-', 'left-', 'inset-',
        '-top-', '-right-', '-bottom-', '-left-', '-inset-',
        'divide-', 'ring-', 'outline-',
        'translate-', 'rotate-', 'skew-', 'scale-',
        '-translate-', '-rotate-', '-skew-', '-scale-',
        'object-', 'aspect-'
    ];

    // Lista de classes válidas completas
    const validClasses = [
        'hidden', 'block', 'inline', 'inline-block', 'flex', 'inline-flex', 'grid', 'inline-grid',
        'table', 'table-cell', 'table-row',
        'static', 'fixed', 'absolute', 'relative', 'sticky',
        'overflow-auto', 'overflow-hidden', 'overflow-visible', 'overflow-scroll', 'overflow-x-auto', 'overflow-y-auto', 'overflow-x-hidden', 'overflow-y-hidden',
        'truncate', 'line-clamp-1', 'line-clamp-2', 'line-clamp-3',
        'cursor-pointer', 'cursor-default', 'cursor-wait', 'cursor-move',
        'select-none', 'select-text', 'select-all',
        'pointer-events-none', 'pointer-events-auto',
        'whitespace-normal', 'whitespace-nowrap', 'whitespace-pre', 'whitespace-pre-line', 'whitespace-pre-wrap', 'whitespace-break-spaces',
        'break-normal', 'break-words', 'break-all', 'break-keep',
        'inset-0', 'inset-x-0', 'inset-y-0',
        'top', 'right', 'bottom', 'left',
        'border', 'group', 'transform',
        'object-cover', 'object-contain', 'object-fill', 'object-none', 'object-scale-down'
    ];

    // Classes customizadas do projeto (ignorar no debug)
    const projectCustomClasses = [
        // Player
        'volume-slider',
        'player-left',
        'player-center',
        'player-right',
        'player-controls',
        'player-album-art',
        'player-track-info',
        'player-track-title',
        'player-track-artist',
        'player-like-button',
        'play-pause-btn',
        'player-progress',
        'time-current',
        'progress-bar',
        'progress-fill',
        'time-duration',
        'volume-control',
        // Cards
        'music-card',
        'music-card-artist',
        'music-card-title',
        'music-card-image',
        'music-card-image-wrapper',
        'music-card-play-button',
        'album-card',
        'album-card-title',
        'album-card-artist',
        'album-card-image',
        'album-card-image-wrapper',
        'album-card-play-button',
        'artist-card',
        'artist-card-title',
        'artist-card-type',
        'artist-card-image',
        'artist-card-image-wrapper',
        'artist-avatar',
        'playlist-card',
        'playlist-card-title',
        'playlist-card-author',
        'playlist-card-image',
        'playlist-card-image-wrapper',
        'playlist-card-play-button',
        'cards-grid',
        // Skeleton Loading
        'skeleton-card',
        'skeleton-image',
        'skeleton-title',
        'skeleton-subtitle',
        // Tracklist
        'tracklist-container',
        'tracklist',
        'track-item',
        'track-number',
        'track-play-button',
        'track-thumbnail',
        'track-info',
        'track-title',
        'track-artist',
        'track-duration',
        'track-like-button',
        // Podcast
        'podcast-page',
        'podcast-header',
        'podcast-cover',
        'podcast-badge',
        'podcast-actions',
        'podcast-card',
        'podcast-card-image-wrapper',
        'podcast-card-badge',
        'podcast-card-image',
        'podcast-card-play-button',
        'podcast-card-title',
        'podcast-card-author',
        'episode-list-container',
        'episode-title',
        'episode-thumbnail',
        // Layout
        'sidebar',
        'sidebar-link',
        'sidebar-country-selector',
        'sidebar-overlay',
        'menu-toggle',
        'main-content',
        'main-header',
        // Pages
        'album-page',
        'album-header',
        'album-cover',
        'album-type',
        'album-actions',
        'artist-page',
        'artist-header',
        'artist-header-content',
        'artist-page-spotify',
        'artist-hero-spotify',
        'spotify-follow-button',
        'spotify-popular-list',
        'spotify-song-row',
        'spotify-card',
        'spotify-artist-card',
        'home-page',
        // Header
        'header-nav-buttons',
        'header-actions',
        'header-search',
        'nav-button',
        'upgrade-button',
        'profile-button',
        // Search
        'search-page',
        'search-results',
        'search-input',
        'search-input-container',
        'search-input-wrapper',
        'search-icon',
        'search-clear-btn',
        'search-submit-btn',
        'search-btn-text',
        // Scroll
        'scroll-nav-button',
        'scroll-container',
        // Seções
        'related-songs-section',
        'top-songs-list',
        // Efeitos
        'neon-text',
        'image-loading',
        'image-error',
        'lazy-loading',
        'lazy-loaded',
        'background-animation',
        // Animações customizadas
        'animate-blob',
        'animate-gradient-shift',
        'animate-gradient-x',
        'animate-spin-custom-slow',
        'animate-pulse-slow',
        'search-icon-hero',
        'search-icon-container',
        // Botões
        'load-more-btn',
        'btn-primary',
        'btn-secondary',
        // Utility
        'sr-only',
        'group',
        // Outros
        'nav-link',
        'active',
        'section-header',
        'section-title',
        'section-show-all',
        'content-section'
    ];

    // Detectar classes que podem não ser do Tailwind
    function isTailwindClass(className) {
        // Ignorar classes vazias
        if (!className || className.trim() === '') return true;
        
        // Ignorar classes customizadas do projeto
        if (projectCustomClasses.includes(className)) return true;
        
        // Ignorar classes que claramente não são Tailwind
        if (className.startsWith('fa-') || 
            className.startsWith('fas') || 
            className.startsWith('fab') || 
            className.startsWith('far') ||
            className.startsWith('alpine-') ||
            className.startsWith('htmx-')) {
            return true;
        }

        // Verificar se é uma classe válida completa
        if (validClasses.includes(className)) return true;

        // Verificar se começa com um prefixo válido
        for (const prefix of validPrefixes) {
            if (className.startsWith(prefix)) return true;
        }

        return false;
    }

    // Analisar todas as classes no DOM
    function analyzeClasses() {
        const suspiciousClasses = new Map();
        const allElements = document.querySelectorAll('[class]');

        allElements.forEach(element => {
            const classes = element.className.split(/\s+/);
            
            classes.forEach(className => {
                if (!isTailwindClass(className) && className.trim() !== '') {
                    if (!suspiciousClasses.has(className)) {
                        suspiciousClasses.set(className, {
                            count: 0,
                            elements: []
                        });
                    }
                    
                    const data = suspiciousClasses.get(className);
                    data.count++;
                    if (data.elements.length < 3) { // Guardar até 3 exemplos
                        data.elements.push(element);
                    }
                }
            });
        });

        // Debug desabilitado para console mais limpo
        // Se necessário reativar, descomentar o bloco abaixo
        /*
        if (suspiciousClasses.size > 0) {
            console.group('%c⚠️ Classes Potencialmente Inválidas do Tailwind', 'background: #f59e0b; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
            
            suspiciousClasses.forEach((data, className) => {
                console.warn(
                    `%c${className}%c usado ${data.count} vez(es)`,
                    'background: #ef4444; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;',
                    'color: #f59e0b; font-weight: normal;'
                );
                
                if (data.elements.length > 0) {
                    console.log('Exemplos de elementos:', data.elements);
                }
            });
            
            console.groupEnd();
        }
        */
    }

    // Monitorar erros CSS
    const originalConsoleError = console.error;
    console.error = function(...args) {
        const message = args.join(' ');
        
        if (message.includes('CSS') || 
            message.includes('style') || 
            message.includes('class') ||
            message.includes('tailwind')) {
            console.group('%c🚨 ERRO CSS DETECTADO', 'background: #dc2626; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
            originalConsoleError.apply(console, args);
            console.groupEnd();
        } else {
            originalConsoleError.apply(console, args);
        }
    };

    // Monitorar warnings CSS
    const originalConsoleWarn = console.warn;
    console.warn = function(...args) {
        const message = args.join(' ');
        
        if (message.includes('CSS') || 
            message.includes('style') || 
            message.includes('class') ||
            message.includes('tailwind')) {
            console.group('%c⚠️ WARNING CSS', 'background: #f59e0b; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
            originalConsoleWarn.apply(console, args);
            console.groupEnd();
        } else {
            originalConsoleWarn.apply(console, args);
        }
    };

    // Executar análise quando a página carregar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(analyzeClasses, 1000);
        });
    } else {
        setTimeout(analyzeClasses, 1000);
    }

    // Re-analisar quando o DOM mudar (útil para SPAs e conteúdo dinâmico)
    const observer = new MutationObserver(() => {
        // Debounce para evitar muitas execuções
        clearTimeout(window.tailwindDebugTimeout);
        window.tailwindDebugTimeout = setTimeout(analyzeClasses, 2000);
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
    });

    // Adicionar comando global para análise manual
    window.checkTailwind = analyzeClasses;
    
    console.log('%c💡 Dica: Execute "checkTailwind()" no console para analisar classes novamente!', 'color: #06b6d4; font-style: italic;');
})();

