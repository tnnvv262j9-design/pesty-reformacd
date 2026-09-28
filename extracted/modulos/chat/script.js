// modulos/chat/script.js
(function() {
    // Load CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'modulos/chat/style.css?v=' + Date.now();
    document.head.appendChild(link);

    let isViewLoaded = false;
    let currentChatTechId = null;
    let chatPollingInterval = null;

    function escapeHtmlLocal(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Initialize Module
    window.renderChatView = async function() {
        if (!isViewLoaded) {
            await loadViewHtml();
        }
        
        // If user is tech, automatically open chat with company
        if (AppState.currentUser.type === 'tech') {
            initTechChat();
        } else {
            loadContacts();
        }
        
        startChatPolling();
    };

    async function loadViewHtml() {
        const container = getEl('chat-view'); // Assuming the view container id is 'chat-view' (standard pattern)
        // If the container is different (e.g. if we add it to index.html), adjust here.
        // Based on script.js, views are typically id="{module}-view".
        
        if (!container) return;

        try {
            const response = await fetch('modulos/chat/view.html');
            if (!response.ok) throw new Error('Failed to load view');
            const html = await response.text();
            container.innerHTML = html;
            
            // Event Listeners
            const form = getEl('chat-form');
            if (form) form.addEventListener('submit', handleSendMessage);
            
            const backBtn = getEl('back-to-list-btn');
            if (backBtn) backBtn.addEventListener('click', closeChat);
            
            const searchInput = getEl('chat-contact-search');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    const term = e.target.value.toLowerCase();
                    const items = document.querySelectorAll('.contact-item');
                    items.forEach(item => {
                        const name = item.querySelector('.contact-name').textContent.toLowerCase();
                        item.style.display = name.includes(term) ? 'flex' : 'none';
                    });
                });
            }

            isViewLoaded = true;
        } catch (error) {
            console.error('Error loading chat view:', error);
            container.innerHTML = '<p class="error">Error al cargar el chat.</p>';
        }
    }

    function initTechChat() {
        // Hide sidebar for tech
        const sidebar = getEl('chat-sidebar');
        if (sidebar) sidebar.style.display = 'none';
        
        const main = getEl('chat-main');
        if (main) {
            main.style.width = '100%';
            main.style.display = 'flex';
        }

        // Open chat immediately
        currentChatTechId = AppState.currentUser.id; // Self
        
        // Setup UI for tech
        const emptyState = getEl('chat-empty-state');
        const activeView = getEl('chat-active-view');
        const nameEl = getEl('current-chat-name');
        const avatarEl = getEl('current-chat-avatar');
        
        if (emptyState) emptyState.style.display = 'none';
        if (activeView) {
            activeView.classList.remove('hidden');
            activeView.style.display = 'flex';
        }
        if (nameEl) nameEl.textContent = 'Administración / Oficina';
        if (avatarEl) {
            avatarEl.textContent = 'O';
            avatarEl.style.background = 'var(--accent-secondary)';
        }

        loadMessages();
    }

    async function loadContacts() {
        const list = getEl('chat-contacts-list');
        if (!list) return;

        try {
            const response = await fetch(`api/chat_list.php?company_id=${AppState.currentUser.companyId}`);
            const result = await response.json();
            
            if (result.success) {
                list.innerHTML = '';
                if (result.chats.length === 0) {
                    list.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-medium);">No hay técnicos disponibles.</div>';
                    return;
                }

                result.chats.forEach(chat => {
                    const div = document.createElement('div');
                    div.className = 'contact-item';
                    if (currentChatTechId == chat.id) div.classList.add('active');
                    
                    const lastMsg = chat.last_message || 'Sin mensajes';
                    const unreadHtml = chat.unread_count > 0 ? `<span class="unread-badge">${chat.unread_count}</span>` : '';
                    
                    div.innerHTML = `
                        <div class="contact-avatar">${chat.name.charAt(0).toUpperCase()}</div>
                        <div class="contact-info">
                            <div class="contact-name">${escapeHtmlLocal(chat.name)}</div>
                            <div class="contact-last-msg">${escapeHtmlLocal(lastMsg)}</div>
                        </div>
                        ${unreadHtml}
                    `;
                    
                    div.onclick = () => openChat(chat);
                    list.appendChild(div);
                });
            }
        } catch (e) {
            console.error('Error loading contacts:', e);
        }
    }

    function openChat(chat) {
        currentChatTechId = chat.id;
        
        // UI Updates
        const container = getEl('chat-container');
        if (container) container.classList.add('chat-active');
        
        const emptyState = getEl('chat-empty-state');
        const activeView = getEl('chat-active-view');
        
        if (emptyState) emptyState.style.display = 'none';
        if (activeView) {
            activeView.classList.remove('hidden');
            activeView.style.display = 'flex';
        }
        
        getEl('current-chat-name').textContent = chat.name;
        getEl('current-chat-avatar').textContent = chat.name.charAt(0).toUpperCase();
        
        // Mark as active in list
        document.querySelectorAll('.contact-item').forEach(el => el.classList.remove('active'));
        // Re-render list to show active state properly? No, just load messages.
        
        loadMessages();
        markAsRead();
    }

    function closeChat() {
        currentChatTechId = null;
        const container = getEl('chat-container');
        if (container) container.classList.remove('chat-active');
        
        getEl('chat-empty-state').style.display = 'flex';
        
        const activeView = getEl('chat-active-view');
        if (activeView) {
            activeView.style.display = 'none';
            activeView.classList.add('hidden');
        }
        
        loadContacts(); // Refresh list
    }

    async function loadMessages() {
        if (!currentChatTechId) return;
        
        const msgArea = getEl('chat-messages-area');
        // Don't clear if polling, but maybe clear on first load?
        // Let's just append new ones or replace all for simplicity.
        // To avoid scroll jumping, replace all is tricky.
        
        try {
            let url = `api/chat_get.php?company_id=${AppState.currentUser.companyId}&user_type=${AppState.currentUser.type}&requesting_user_id=${AppState.currentUser.id}`;
            if (AppState.currentUser.type !== 'tech') {
                url += `&technician_id=${currentChatTechId}`;
            }

            const response = await fetch(url);
            const result = await response.json();
            
            if (result.success) {
                // Check if new messages arrived to scroll down
                const shouldScroll = msgArea.scrollTop + msgArea.clientHeight >= msgArea.scrollHeight - 50;
                
                msgArea.innerHTML = ''; // Simple render
                
                let lastDate = '';
                
                result.messages.forEach(msg => {
                    // Date divider
                    const date = new Date(msg.created_at).toLocaleDateString();
                    if (date !== lastDate) {
                        msgArea.innerHTML += `<div style="text-align:center; font-size:0.7rem; color:var(--text-medium); margin: 10px 0;">${date}</div>`;
                        lastDate = date;
                    }
                    
                    const isMe = (AppState.currentUser.type === 'tech' && msg.direction === 'to_company') ||
                                 (AppState.currentUser.type !== 'tech' && msg.direction === 'to_tech');
                                 
                    const div = document.createElement('div');
                    div.className = `message ${isMe ? 'sent' : 'received'}`;
                    
                    const time = new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    
                    div.innerHTML = `
                        ${escapeHtmlLocal(msg.message)}
                        <div class="message-time">
                            ${time} 
                            ${isMe ? (msg.is_read == 1 ? '✓✓' : '✓') : ''}
                        </div>
                    `;
                    
                    msgArea.appendChild(div);
                });
                
                // Scroll to bottom
                msgArea.scrollTop = msgArea.scrollHeight;
            }
        } catch (e) {
            console.error('Error loading messages:', e);
        }
    }

    async function handleSendMessage(e) {
        e.preventDefault();
        const input = getEl('chat-input');
        const text = input.value.trim();
        if (!text || !currentChatTechId) return;
        
        input.value = ''; // Clear early
        
        try {
            const payload = {
                company_id: AppState.currentUser.companyId,
                user_type: AppState.currentUser.type,
                requesting_user_id: AppState.currentUser.id,
                message: text,
                technician_id: currentChatTechId // Required if sender is company
            };
            
            const response = await fetch('api/chat_send.php', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            if (result.success) {
                loadMessages();
                if (AppState.currentUser.type !== 'tech') {
                    loadContacts(); // Refresh sidebar for last message update
                }
            } else {
                showAlert('Error al enviar mensaje');
            }
        } catch (e) {
            console.error('Error sending message:', e);
        }
    }

    async function markAsRead() {
        if (!currentChatTechId) return;
        
        try {
            const payload = {
                company_id: AppState.currentUser.companyId,
                technician_id: currentChatTechId,
                user_type: AppState.currentUser.type
            };
            
            await fetch('api/chat_mark_read.php', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            // Don't need to wait for result
        } catch (e) { console.error(e); }
    }

    function startChatPolling() {
        if (chatPollingInterval) clearInterval(chatPollingInterval);
        
        chatPollingInterval = setInterval(() => {
            const chatView = getEl('chat-view');
            // Only poll if view is visible
            if (chatView && !chatView.classList.contains('hidden')) {
                if (currentChatTechId) {
                    loadMessages();
                    markAsRead();
                }
                
                if (AppState.currentUser.type !== 'tech') {
                    loadContacts();
                }
            }
        }, 5000); // 5 seconds
    }
    
    // Hook into global destroy/cleanup if needed
    // Not strictly needed as polling checks visibility
})();
