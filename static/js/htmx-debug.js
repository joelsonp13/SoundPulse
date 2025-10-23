/**
 * HTMX Debug Helper
 * Monitora e exibe todos os eventos e erros do HTMX no console
 */

(function() {
    'use strict';

    // Aguardar o DOM estar completamente carregado
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHTMXDebug);
    } else {
        initHTMXDebug();
    }

    function initHTMXDebug() {
        // Verificar se document.body existe
        if (!document.body) {
            console.error('%c❌ document.body não encontrado!', 'background: #dc2626; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
            return;
        }

        console.log('%c🌐 HTMX Debug Mode ATIVO', 'background: #3366cc; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');

        // Verificar se HTMX está carregado
        if (typeof htmx === 'undefined') {
            console.error('%c❌ HTMX NÃO ENCONTRADO!', 'background: #dc2626; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
            return;
        }

        console.log('%c✅ HTMX versão detectada', 'color: #10b981; font-weight: bold;');

        // Contador de requisições
        let requestCount = 0;
        const requestHistory = [];

        // HTMX Event Logging
        const htmxEvents = [
            // Lifecycle events
            'htmx:load',
            'htmx:configRequest',
            'htmx:beforeRequest',
            'htmx:afterRequest',
            'htmx:sendError',
            'htmx:responseError',
            
            // Swap events
            'htmx:beforeSwap',
            'htmx:afterSwap',
            'htmx:beforeSettle',
            'htmx:afterSettle',
            
            // Validation events
            'htmx:validation:validate',
            'htmx:validation:failed',
            'htmx:validation:halted',
            
            // History events
            'htmx:beforeHistoryUpdate',
            'htmx:afterHistoryUpdate',
            'htmx:pushedIntoHistory',
            'htmx:replacedInHistory',
            
            // Other events
            'htmx:trigger',
            'htmx:abort',
            'htmx:confirm',
            'htmx:prompt'
        ];

        // Registrar todos os eventos
        htmxEvents.forEach(eventName => {
            document.body.addEventListener(eventName, (event) => {
                const shortName = eventName.replace('htmx:', '');
                
                // Cores diferentes para diferentes tipos de eventos
                let color = '#3366cc'; // Azul padrão
                if (eventName.includes('Error')) color = '#dc2626'; // Vermelho para erros
                else if (eventName.includes('before')) color = '#f59e0b'; // Laranja para "before"
                else if (eventName.includes('after')) color = '#10b981'; // Verde para "after"
                else if (eventName.includes('Swap')) color = '#8b5cf6'; // Roxo para swap
                
                console.log(
                    `%c${shortName}`,
                    `background: ${color}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;`,
                    event.detail
                );
            });
        });

        // Monitorar requisições HTTP
        document.body.addEventListener('htmx:beforeRequest', (event) => {
            requestCount++;
            const detail = event.detail;
            const xhr = detail.xhr;
            const elt = detail.elt;
            
            const requestInfo = {
                id: requestCount,
                method: xhr ? 'GET/POST' : 'Unknown',
                url: elt.getAttribute('hx-get') || elt.getAttribute('hx-post') || 'Unknown',
                element: elt.tagName + (elt.id ? '#' + elt.id : ''),
                timestamp: new Date().toLocaleTimeString()
            };
            
            requestHistory.push(requestInfo);
            
            console.group(`%c📤 REQUISIÇÃO #${requestCount}`, 'background: #3366cc; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
            console.log('🎯 Elemento:', elt);
            console.log('🔗 URL:', requestInfo.url);
            console.log('⏰ Horário:', requestInfo.timestamp);
            console.groupEnd();
        });

        // Monitorar respostas HTTP
        document.body.addEventListener('htmx:afterRequest', (event) => {
            const detail = event.detail;
            const xhr = detail.xhr;
            const successful = detail.successful;
            
            const status = xhr ? xhr.status : 'Unknown';
            const statusText = xhr ? xhr.statusText : '';
            
            console.group(
                `%c📥 RESPOSTA ${successful ? 'SUCESSO' : 'ERRO'}`,
                `background: ${successful ? '#10b981' : '#dc2626'}; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;`
            );
            console.log('📊 Status:', status, statusText);
            console.log('⏱️ Duração:', detail.duration || 'N/A');
            if (!successful) {
                console.error('❌ Falhou:', detail);
            }
            console.groupEnd();
        });

        // Monitorar swaps de conteúdo
        document.body.addEventListener('htmx:beforeSwap', (event) => {
            const detail = event.detail;
            console.group('%c🔄 ANTES DO SWAP', 'background: #8b5cf6; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
            console.log('🎯 Target:', detail.target);
            console.log('🔧 Swap Style:', detail.swapStyle);
            console.log('📦 Conteúdo:', detail.serverResponse ? detail.serverResponse.substring(0, 100) + '...' : 'N/A');
            console.groupEnd();
        });

        document.body.addEventListener('htmx:afterSwap', (event) => {
            const detail = event.detail;
            console.group('%c✅ DEPOIS DO SWAP', 'background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
            console.log('🎯 Target:', detail.target);
            console.log('✨ Novo conteúdo inserido!');
            console.groupEnd();
        });

        // Monitorar erros
        document.body.addEventListener('htmx:sendError', (event) => {
            console.group('%c🚨 ERRO DE ENVIO', 'background: #dc2626; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
            console.error('Erro ao enviar requisição:', event.detail);
            console.groupEnd();
        });

        document.body.addEventListener('htmx:responseError', (event) => {
            const detail = event.detail;
            console.group('%c🚨 ERRO DE RESPOSTA', 'background: #dc2626; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
            console.error('Status:', detail.xhr.status);
            console.error('Erro:', detail);
            console.groupEnd();
        });

        // Função global para ver histórico de requisições
        window.htmxHistory = function() {
            console.group('%c📊 HISTÓRICO DE REQUISIÇÕES HTMX', 'background: #3366cc; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
            console.table(requestHistory);
            console.groupEnd();
        };

        // Função global para inspecionar elemento HTMX
        window.inspectHTMX = function(element) {
            if (typeof element === 'string') {
                element = document.querySelector(element);
            }
            
            if (!element) {
                console.error('Elemento não encontrado!');
                return;
            }

            console.group('%c🔍 INSPEÇÃO HTMX', 'background: #3366cc; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
            console.log('📍 Elemento:', element);
            
            // Verificar atributos HTMX
            const htmxAttrs = [
                'hx-get', 'hx-post', 'hx-put', 'hx-delete', 'hx-patch',
                'hx-trigger', 'hx-target', 'hx-swap', 'hx-select',
                'hx-include', 'hx-vals', 'hx-confirm', 'hx-push-url'
            ];
            
            const foundAttrs = {};
            htmxAttrs.forEach(attr => {
                const value = element.getAttribute(attr);
                if (value) {
                    foundAttrs[attr] = value;
                }
            });
            
            if (Object.keys(foundAttrs).length > 0) {
                console.log('🎯 Atributos HTMX:', foundAttrs);
            } else {
                console.warn('⚠️ Nenhum atributo HTMX encontrado neste elemento!');
            }
            
            console.groupEnd();
        };

        console.log('%c💡 Dica: Execute "htmxHistory()" para ver histórico de requisições!', 'color: #3366cc; font-style: italic;');
        console.log('%c💡 Dica: Execute "inspectHTMX(elemento)" para inspecionar atributos HTMX!', 'color: #3366cc; font-style: italic;');
    }
})();
