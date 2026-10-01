const { io } = window;
import { SOCKET_URL, API_ORIGIN } from './config.js';
import { api } from './api.js';
import { getState } from './store.js';
import { escapeHtml, icon, showToast } from './ui.js';

let socket;
let activeConversation;
let unread = 0;
const mutedUsersKey = 'konekta_muted_users';
const getMutedUsers = () => JSON.parse(localStorage.getItem(mutedUsersKey) || '[]');
const setMutedUsers = (users) => localStorage.setItem(mutedUsersKey, JSON.stringify(users));
const notificationsEnabled = (contactId) => {
  if (!contactId) return JSON.parse(localStorage.getItem('konekta_settings') || '{}').notifications !== false;
  return !getMutedUsers().includes(String(contactId));
};
const toggleMuteUser = (userId) => {
  const muted = getMutedUsers();
  const id = String(userId);
  const next = muted.includes(id) ? muted.filter((value) => value !== id) : [...muted, id];
  setMutedUsers(next);
  return next.includes(id);
};
const avatarType = (user, className = 'avatar') => {
  const name = user?.name || 'U';
  const image = user?.avatar ? (user.avatar.startsWith('http') ? user.avatar : `${API_ORIGIN}${user.avatar}`) : '';
  if (!image) return `<div class="${className} profile-fallback">${escapeHtml(String(name).charAt(0).toUpperCase())}</div>`;
  return `<div class="${className}"><img src="${escapeHtml(image)}" alt="${escapeHtml(name)}"></div>`;
};
const updateUnread = (value) => { unread = value; const badge = document.querySelector('#chat-unread'); if (badge) { badge.textContent = unread > 9 ? '9+' : String(unread); badge.hidden = unread === 0; } };
const createMediaModal = (src) => {
  const modal = document.querySelector('#chat-media-modal');
  if (modal) modal.remove();
  const wrapper = document.createElement('div');
  wrapper.id = 'chat-media-modal';
  wrapper.className = 'chat-media-modal';
  wrapper.innerHTML = `<div class="chat-media-backdrop"><button class="icon-button chat-media-close" type="button" aria-label="Cerrar">×</button><img src="${escapeHtml(src)}" alt="Imagen ampliada"></div>`;
  document.body.appendChild(wrapper);
  wrapper.querySelector('.chat-media-close').addEventListener('click', () => wrapper.remove());
  wrapper.addEventListener('click', (event) => { if (event.target === wrapper) wrapper.remove(); });
};
const bindInteractiveMessageActions = () => {
  document.querySelectorAll('.chat-image').forEach((image) => {
    image.addEventListener('click', () => createMediaModal(image.src));
  });
  document.querySelectorAll('[data-delete-message]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      const messageId = button.dataset.deleteMessage;
      if (!messageId) return;
      try {
        await api.delete(`/chat/messages/${messageId}`);
        const message = document.querySelector(`[data-message-id="${messageId}"]`);
        message?.remove();
        showToast('Mensaje eliminado', 'success');
      } catch (error) { showToast(error.message); }
    });
  });
};
const messageBubble = (message) => {
  const senderId = String(message.sender?._id || message.sender || '');
  const mine = senderId === String(getState().user?.id || getState().user?._id || '');
  const imageMarkup = message.image ? `<img class="chat-image" src="${escapeHtml(message.image.startsWith('http') ? message.image : `${SOCKET_URL}${message.image}`)}" alt="Imagen compartida">` : '';
  const textMarkup = message.text ? `<span>${escapeHtml(message.text)}</span>` : '';
  const deleteButton = mine ? `<button class="message-action" type="button" data-delete-message="${message._id}" aria-label="Eliminar mensaje">${icon('trash')}</button>` : '';
  return `<div class="message ${mine ? 'message-self' : ''}" data-message-id="${message._id}">${imageMarkup}${textMarkup}<div class="message-meta"><small>${new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>${deleteButton}</div></div>`;
};
const scrollMessages = () => { const box = document.querySelector('#chat-messages'); if (box) box.scrollTop = box.scrollHeight; };
const contactFor = (conversation) => { const userId = String(getState().user?.id || getState().user?._id); const contact = String(conversation.seller?._id) === userId ? conversation.buyer : conversation.seller; return { id: contact?._id || null, name: contact?.name || 'Contacto', company: conversation.product?.company || 'Empresa no indicada', avatar: contact?.avatar || null, role: contact?.role || 'Usuario', isOnline: true }; };
const populateProfileCard = (conversation) => {
  const card = document.querySelector('#chat-profile-card'); if (!card || !conversation) return;
  const contact = contactFor(conversation);
  const muted = getMutedUsers().includes(String(contact.id));
  card.innerHTML = `<div class="chat-profile-content">${avatarType(contact, 'avatar')}<div class="chat-profile-meta"><strong>${escapeHtml(contact.name)}</strong><small>${escapeHtml(contact.role)}</small><small>${escapeHtml(contact.company)}</small><span class="chat-status"><span class="chat-status-dot"></span>${contact.isOnline ? 'Activo ahora' : 'Sin actividad reciente'}</span></div></div><div class="chat-profile-actions"><button class="btn btn-secondary" type="button" id="chat-mute-toggle">${muted ? 'Activar notificaciones' : 'Silenciar contacto'}</button><button class="btn btn-ghost" type="button" id="chat-profile-close">Cerrar</button></div>`;
  card.querySelector('#chat-profile-close')?.addEventListener('click', () => { card.hidden = true; });
  card.querySelector('#chat-mute-toggle')?.addEventListener('click', () => {
    const nextMuted = toggleMuteUser(contact.id);
    card.querySelector('#chat-mute-toggle').textContent = nextMuted ? 'Activar notificaciones' : 'Silenciar contacto';
  });
};
const updateContactHeader = (conversation) => {
  const contact = contactFor(conversation);
  const nameNode = document.querySelector('#chat-contact-name');
  const statusNode = document.querySelector('#chat-contact-status');
  const avatarNode = document.querySelector('#chat-contact-avatar');
  if (nameNode) nameNode.textContent = contact.name;
  if (statusNode) { statusNode.textContent = notificationsEnabled(contact.id) ? 'Activo ahora' : 'Notificaciones silenciadas'; }
  if (avatarNode) avatarNode.innerHTML = avatarType(contact, 'avatar');
  populateProfileCard(conversation);
};
export const initChat = () => { if (socket || !getState().token) return; socket = io(SOCKET_URL, { auth: { token: getState().token } }); socket.on('connect_error', () => { if (notificationsEnabled()) showToast('No se pudo conectar el chat. Revisa tu conexión.'); }); socket.on('message:new', (message) => { const mine = String(message.sender?._id || message.sender) === String(getState().user?.id || getState().user?._id); if (activeConversation?._id === message.conversation) { if (!mine) document.querySelector('#chat-messages')?.insertAdjacentHTML('beforeend', messageBubble(message)); bindInteractiveMessageActions(); scrollMessages(); } else if (!mine) { updateUnread(unread + 1); if (notificationsEnabled(activeConversation?.buyer?._id || activeConversation?.seller?._id)) showToast('Tienes un mensaje nuevo', 'info'); } if (!mine) { loadConversations(); } }); socket.on('message:deleted', ({ messageId, conversationId }) => { if (activeConversation?._id === conversationId) { document.querySelector(`[data-message-id="${messageId}"]`)?.remove(); } loadConversations(); }); };
export const openPanel = () => document.querySelector('#chat-panel')?.classList.add('is-open');
export const closePanel = () => document.querySelector('#chat-panel')?.classList.remove('is-open');
export const renderChat = () => `<button class="chat-fab" id="chat-fab" aria-label="Abrir chat">${icon('chat')}<span class="unread-badge" id="chat-unread" hidden>0</span></button><aside class="chat-panel" id="chat-panel" aria-label="Mensajes"><header><strong>Mensajes</strong><button class="icon-button" id="chat-close" type="button" aria-label="Cerrar">×</button></header><div class="chat-content"><div class="chat-list" id="chat-list"><p class="muted">Cargando conversaciones...</p></div><div class="chat-conversation" id="chat-conversation" hidden><button class="btn btn-ghost" id="back-chat" type="button">← Conversaciones</button><button class="chat-contact-button" id="chat-contact-button" type="button"><span id="chat-contact-avatar" class="avatar"></span><span class="chat-contact-meta"><strong id="chat-contact-name">Contacto</strong><span class="chat-status"><span class="chat-status-dot"></span><small id="chat-contact-status">Activo ahora</small></span></span></button><div class="chat-profile-card" id="chat-profile-card" hidden></div><div class="chat-messages" id="chat-messages"></div><form id="chat-form"><textarea class="input" name="text" rows="1" placeholder="Escribe un mensaje"></textarea><label class="chat-attach" for="chat-image" title="Adjuntar imagen">${icon('paperclip')}</label><input class="chat-file" id="chat-image" name="image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" aria-label="Adjuntar imagen"><button class="btn btn-primary" type="submit">Enviar</button></form></div></div></aside>`;
const loadConversations = async () => { try { const conversations = (await api.get('/chat/conversations')).data; const list = document.querySelector('#chat-list'); if (list) list.innerHTML = conversations.length ? conversations.map((conversation) => { const contact = contactFor(conversation); return `<button class="conversation-item" data-conversation="${conversation._id}">${avatarType(contact, 'avatar mini-avatar')}<span class="conversation-body"><strong>${escapeHtml(contact.name)}</strong><span>${escapeHtml(contact.company)}</span><small>${escapeHtml(conversation.product?.name || 'Conversación')} · ${escapeHtml(conversation.lastMessage?.text || 'Sin mensajes')}</small></span></button>`; }).join('') : '<p class="muted">No tienes conversaciones.</p>'; document.querySelectorAll('[data-conversation]').forEach((button) => button.addEventListener('click', () => openConversation(button.dataset.conversation))); } catch (error) { showToast(`No se pudieron cargar los mensajes: ${error.message}`); } };
const openConversation = async (id) => { try { const data = (await api.get(`/chat/conversations/${id}`)).data; activeConversation = data.conversation; updateContactHeader(activeConversation); socket?.emit('conversation:join', { conversationId: id }); document.querySelector('#chat-list').hidden = true; document.querySelector('#chat-conversation').hidden = false; document.querySelector('#chat-messages').innerHTML = data.messages.map(messageBubble).join(''); bindInteractiveMessageActions(); scrollMessages(); document.querySelector('#chat-profile-card')?.setAttribute('hidden', 'hidden'); } catch (error) { activeConversation = null; showToast(`No se pudo abrir la conversación: ${error.message}`); await loadConversations(); } };
export const openChat = async (productId) => { try { initChat(); const response = await api.post('/chat/conversations', { productId }); openPanel(); await openConversation(response.data._id); } catch (error) { showToast(error.message); } };
export const bindChat = async () => { document.querySelector('#chat-fab')?.addEventListener('click', async () => { initChat(); updateUnread(0); openPanel(); await loadConversations(); }); document.querySelector('#chat-close')?.addEventListener('click', closePanel); document.querySelector('#back-chat')?.addEventListener('click', () => { activeConversation = null; document.querySelector('#chat-conversation').hidden = true; document.querySelector('#chat-list').hidden = false; }); document.querySelector('#chat-contact-button')?.addEventListener('click', () => { const card = document.querySelector('#chat-profile-card'); if (!activeConversation) return; if (!card) return; card.hidden = !card.hidden; if (!card.hidden) { populateProfileCard(activeConversation); } }); document.querySelector('#delete-conversation')?.addEventListener('click', async () => { if (!activeConversation?._id || !confirm('¿Eliminar esta conversación?')) return; try { await api.delete(`/chat/conversations/${activeConversation._id}`); activeConversation = null; document.querySelector('#chat-conversation').hidden = true; document.querySelector('#chat-list').hidden = false; await loadConversations(); showToast('Conversación eliminada', 'success'); } catch (error) { showToast(`No se pudo eliminar: ${error.message}`); } }); document.querySelector('#chat-form')?.addEventListener('submit', async (event) => { event.preventDefault(); const form = event.currentTarget; const text = new FormData(form).get('text')?.trim(); const file = form.querySelector('#chat-image')?.files?.[0]; if ((!text && !file) || !activeConversation?._id) return; const button = form.querySelector('button[type="submit"]'); button.disabled = true; try { if (file || !socket?.connected) { const data = new FormData(form); const response = await api.upload(`/chat/conversations/${activeConversation._id}/messages`, data); document.querySelector('#chat-messages')?.insertAdjacentHTML('beforeend', messageBubble(response.data)); bindInteractiveMessageActions(); scrollMessages(); } else { socket.emit('message:send', { conversationId: activeConversation._id, text }); } form.reset(); } catch (error) { showToast(`No se pudo enviar: ${error.message}`); } finally { button.disabled = false; } }); await loadConversations(); };
