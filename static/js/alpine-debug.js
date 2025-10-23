/**
 * Alpine.js Debug Helper
 * Monitora e exibe todos os eventos e erros do Alpine.js no console
 */

(function() {
    'use strict';

    console.log('%c⛰️ Alpine.js Debug Mode ATIVO', 'background: #8bc0d0; color: black; padding: 4px 8px; border-radius: 4px; font-weight: bold;');

    // Aguardar Alpine.js carregar
    document.addEventListener('alpine:init', () => {
        console.log('%c✅ Alpine.js inicializado!', 'color: #10b981; font-weight: bold;');
        
        // Verificar versão (se disponível)
        if (window.Alpine && window.Alpine.version) {
            console.log(`%c📦 Versão: ${window.Alpine.version}`, 'color: #8bc0d0;');
        }
    });

    // Monitorar componentes inicializados
    document.addEventListener('alpine:initialized', (event) => {
        console.log(
            '%cinitialized',
            'background: #10b981; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;',
            'Componente Alpine inicializado'
        );
    });

    // Contador de componentes
    let componentCount = 0;
    const components = new Map();

    // Interceptar erros do Alpine
    const originalConsoleError = console.error;
    console.error = function(...args) {
        const message = args.join(' ');
        
        if (message.includes('Alpine') || 
            message.includes('x-') || 
            message.includes('Alpine Expression Error') ||
            message.includes('_x_')) {
            
            console.group('%c🚨 ERRO ALPINE.JS DETECTADO', 'background: #dc2626; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
            
            // Tentar extrair informações úteis
            if (message.includes('Expression:')) {
                const expressionMatch = message.match(/Expression: "(.+?)"/);
                if (expressionMatch) {
                    console.error('📝 Expressão:', expressionMatch[1]);
                }
            }
            
            originalConsoleError.apply(console, args);
            
            // Sugestões de solução
            if (message.includes('undefined')) {
                console.warn('💡 Dica: Verifique se a propriedade está definida no x-data');
                console.warn('💡 Use optional chaining (?) ou valores padrão (||)');
            }
            if (message.includes('x-for')) {
                console.warn('💡 Dica: Garanta que a expressão do x-for retorna um array');
                console.warn('💡 Use: Array.isArray(data) ? data : []');
            }
            
            console.groupEnd();
        } else {
            originalConsoleError.apply(console, args);
        }
    };

    // Interceptar warnings do Alpine
    const originalConsoleWarn = console.warn;
    console.warn = function(...args) {
        const message = args.join(' ');
        
        if (message.includes('Alpine') || message.includes('x-')) {
            console.group('%c⚠️ WARNING ALPINE.JS', 'background: #f59e0b; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
            originalConsoleWarn.apply(console, args);
            console.groupEnd();
        } else {
            originalConsoleWarn.apply(console, args);
        }
    };

    // Monitorar diretivas Alpine no DOM
    function scanAlpineDirectives() {
        const directives = [
            'x-data', 'x-init', 'x-show', 'x-if', 'x-for', 'x-text', 'x-html',
            'x-model', 'x-bind', 'x-on', 'x-cloak', 'x-transition',
            'x-ref', 'x-teleport', 'x-ignore', 'x-effect'
        ];
        
        const results = {};
        
        directives.forEach(directive => {
            const elements = document.querySelectorAll(`[${directive}]`);
            if (elements.length > 0) {
                results[directive] = elements.length;
            }
        });
        
        if (Object.keys(results).length > 0) {
            console.group('%c📊 DIRETIVAS ALPINE ENCONTRADAS', 'background: #8bc0d0; color: black; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
            console.table(results);
            console.groupEnd();
        }
    }

    // Função para inspecionar componente Alpine
    window.inspectAlpine = function(element) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        
        if (!element) {
            console.error('Elemento não encontrado!');
            return;
        }

        console.group('%c🔍 INSPEÇÃO ALPINE.JS', 'background: #8bc0d0; color: black; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
        console.log('📍 Elemento:', element);
        
        // Verificar se tem x-data
        const xData = element.getAttribute('x-data');
        if (xData) {
            console.log('🎯 x-data:', xData);
        }
        
        // Verificar todas as diretivas Alpine
        const alpineAttrs = {};
        Array.from(element.attributes).forEach(attr => {
            if (attr.name.startsWith('x-') || attr.name.startsWith('@') || attr.name.startsWith(':')) {
                alpineAttrs[attr.name] = attr.value;
            }
        });
        
        if (Object.keys(alpineAttrs).length > 0) {
            console.log('📋 Diretivas Alpine:', alpineAttrs);
        } else {
            console.warn('⚠️ Nenhuma diretiva Alpine encontrada neste elemento!');
        }
        
        // Tentar acessar o $data do Alpine
        if (window.Alpine && element._x_dataStack) {
            console.log('💾 Dados do componente:', element._x_dataStack);
        }
        
        console.groupEnd();
    };

    // Função para listar todos os componentes Alpine
    window.listAlpineComponents = function() {
        const components = document.querySelectorAll('[x-data]');
        
        console.group('%c📦 COMPONENTES ALPINE.JS', 'background: #8bc0d0; color: black; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
        console.log(`Total de componentes: ${components.length}`);
        
        components.forEach((comp, index) => {
            const xData = comp.getAttribute('x-data');
            const id = comp.id || `componente-${index + 1}`;
            console.log(`${index + 1}. ${id}:`, xData);
        });
        
        console.groupEnd();
    };

    // Função para verificar reatividade
    window.checkAlpineReactivity = function(element) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        
        if (!element || !element._x_dataStack) {
            console.error('Elemento não é um componente Alpine válido!');
            return;
        }

        console.group('%c🔄 VERIFICAÇÃO DE REATIVIDADE', 'background: #8bc0d0; color: black; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
        
        const data = element._x_dataStack[0];
        
        console.log('📊 Estado atual:', data);
        
        // Verificar se é um Proxy (reativo)
        const isProxy = data && typeof data === 'object' && data.constructor.name === 'Proxy';
        
        if (isProxy) {
            console.log('%c✅ Dados são reativos (Proxy)', 'color: #10b981; font-weight: bold;');
        } else {
            console.warn('%c⚠️ Dados podem não ser reativos', 'color: #f59e0b; font-weight: bold;');
        }
        
        console.groupEnd();
    };

    // Escanear diretivas após carregamento
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(scanAlpineDirectives, 1500);
        });
    } else {
        setTimeout(scanAlpineDirectives, 1500);
    }

    // Re-escanear quando DOM mudar
    const observer = new MutationObserver(() => {
        clearTimeout(window.alpineDebugTimeout);
        window.alpineDebugTimeout = setTimeout(scanAlpineDirectives, 2000);
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['x-data', 'x-for', 'x-if', 'x-show']
    });

    console.log('%c💡 Dica: Execute "inspectAlpine(elemento)" para inspecionar componente!', 'color: #8bc0d0; font-style: italic;');
    console.log('%c💡 Dica: Execute "listAlpineComponents()" para listar todos os componentes!', 'color: #8bc0d0; font-style: italic;');
    console.log('%c💡 Dica: Execute "checkAlpineReactivity(elemento)" para verificar reatividade!', 'color: #8bc0d0; font-style: italic;');
})();

