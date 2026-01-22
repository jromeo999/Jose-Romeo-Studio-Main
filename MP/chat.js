import { 
    collection, addDoc, onSnapshot, query, where, doc, setDoc, getDocs, updateDoc, deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let activeChatId = null;
let msgUnsubscribe = null;
let inboxUnsubscribe = null;
let isSelectionMode = false;

// 1. UI GENERATOR
function initChatUI() {
    console.log("Creating Chat UI...");
    // Button starts hidden, revealed by listener on login
    const html = `
        <div id="chatBtn" class="chat-float-btn hidden" onclick="toggleChatWindow()">
            💬 <div id="chatBadge" class="chat-badge hidden">0</div>
        </div>

        <div id="chatWindow" class="chat-window">
            <div class="chat-header">
                <div style="display:flex; align-items:center; gap:10px;">
                    <span id="chatBackBtn" class="hidden header-btn" style="font-size:1.2rem;" onclick="backToInbox()">‹</span>
                    <span id="chatTitle">Messages</span>
                </div>
                <div class="chat-actions">
                    <span id="btnEditChats" class="header-btn" onclick="toggleSelectionMode()">✎</span>
                    <span class="header-btn" style="font-size:1.2rem; line-height:0.10;" onclick="toggleChatWindow()" title="Minimize">_</span>
                </div>
            </div>

            <!-- INBOX VIEW -->
            <div id="chatInbox" class="chat-messages">
                <div style="text-align:center; color:#aaa; margin-top:20px;">Loading...</div>
            </div>
            
            <!-- BULK ACTIONS FOOTER -->
            <div id="bulkActions" class="bulk-actions">
                <label style="font-size:0.8rem; display:flex; align-items:center; gap:6px; cursor:pointer;">
                    <input type="checkbox" onchange="toggleSelectAll(this)"> Select All
                </label>
                <button class="btn-del-chat" onclick="deleteSelectedChats()">Delete</button>
            </div>

            <!-- MESSAGE VIEW -->
            <div id="chatMsgView" class="chat-view-container hidden">
                <div id="msgContainer" style="display:flex; flex-direction:column; gap:10px; padding-bottom:10px;"></div>
            </div>

            <!-- INPUT AREA -->
            <div id="chatInputArea" class="chat-input-area hidden">
                <input type="text" id="chatInput" class="chat-input" placeholder="Type a message..." onkeypress="handleEnter(event)">
                <button class="chat-send-btn" onclick="sendMessage()">➤</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}

// 2. LISTEN FOR INCOMING CHATS
window.startChatListener = function() {
    const currentUser = window.appGlobal.currentUser;
    if(!currentUser) return;
    window.updateChatProtection(); 

    // Reveal Button
    document.getElementById('chatBtn').classList.remove('hidden');

    // FIX: Removed 'orderBy' to prevent Indexing hangs. We sort in JS below.
    const q = query(
        collection(window.db, "chats"), 
        where("participants", "array-contains", currentUser.code)
    );

    inboxUnsubscribe = onSnapshot(q, (snapshot) => {
        const inboxDiv = document.getElementById('chatInbox');
        const badge = document.getElementById('chatBadge');
        inboxDiv.innerHTML = '';
        
        let unreadCount = 0;

        if(snapshot.empty) {
            inboxDiv.innerHTML = '<div style="text-align:center; color:#ccc; margin-top:50px;">No messages.</div>';
            badge.classList.add('hidden');
            return;
        }

        // 1. EXTRACT DATA
        let chats = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

        // 2. SORT MANUALLY (Client-Side Sorting) - Newest First
        chats.sort((a, b) => {
            const dateA = a.lastUpdated ? new Date(a.lastUpdated) : new Date(0);
            const dateB = b.lastUpdated ? new Date(b.lastUpdated) : new Date(0);
            return dateB - dateA;
        });

        // 3. RENDER
        chats.forEach(data => {
            const chatId = data.id;
            
            // Identify Other User
            const otherCode = (data.user1Code === currentUser.code) ? data.user2Code : data.user1Code;
            const otherName = (data.user1Code === currentUser.code) ? data.user2Name : data.user1Name;
            
            // Rich Data Lookup (Image & Account)
            let otherImg = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRTRFNEU3Ii8+PC9zdmc+"; 
            let otherAccount = "";

            const allUsers = [...(window.appGlobal.validVendors || []), ...(window.appGlobal.validBuyers || [])];
            const foundUser = allUsers.find(u => u.code === otherCode);
            if(foundUser) {
                if(foundUser.img) otherImg = foundUser.img;
                otherAccount = foundUser.account || "";
            }

            // Unread Logic
            const isUnread = (data.lastSenderCode !== currentUser.code) && !data.isRead;
            if(isUnread) unreadCount++;

            const timeStr = data.lastUpdated ? new Date(data.lastUpdated).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '';

            // Render Item
            const item = document.createElement('div');
            item.className = `inbox-item ${isUnread ? 'unread' : ''}`;
            item.onclick = (e) => {
                if(e.target.type === 'checkbox') return;
                if(isSelectionMode) {
                    const cb = item.querySelector('.select-chk');
                    cb.checked = !cb.checked;
                } else {
                    openChat(otherCode, otherName, chatId);
                }
            };

            item.innerHTML = `
                <input type="checkbox" class="select-chk" value="${chatId}">
                <img src="${otherImg}" class="inbox-avatar">
                <div class="inbox-info">
                    <div class="inbox-top">
                        <div>
                            <span class="inbox-name">${otherName}</span>
                            ${otherAccount ? `<span class="inbox-acc">${otherAccount}</span>` : ''}
                        </div>
                        <span class="inbox-time">${timeStr}</span>
                    </div>
                    <div class="inbox-preview" style="${isUnread ? 'font-weight:700; color:black;' : ''}">
                        ${isUnread ? '● ' : ''}${data.lastMsg || 'Attachment'}
                    </div>
                </div>
            `;
            inboxDiv.appendChild(item);
        });

        // Badge Update
        badge.innerText = unreadCount;
        if(unreadCount > 0) badge.classList.remove('hidden');
        else badge.classList.add('hidden');

    }, (error) => {
        console.error("Chat Error:", error);
    });
}
window.updateChatProtection = function() {
    const settings = window.appGlobal.settings || { chatEnabled: true };
    const currentUser = window.appGlobal.currentUser;
    const chatBtn = document.getElementById('chatBtn');
    const chatWindow = document.getElementById('chatWindow');

    if (!currentUser) return;

    // Rule: If User is Admin, they can always see chat.
    // Rule: If User is Normal, they can only see chat if chatEnabled is TRUE.
    const isAllowed = (currentUser.role === 'admin') || settings.chatEnabled;

    if (isAllowed) {
        chatBtn.classList.remove('force-hidden');
    } else {
        chatBtn.classList.add('force-hidden');
        
        // If the window is currently open, forcibly close it
        if(chatWindow.classList.contains('open')) {
            window.toggleChatWindow(); 
            window.showToast("Chat disabled by Admin", "error");
        }
    }
}

// 3. SELECTION MODE
window.toggleSelectionMode = function() {
    const win = document.getElementById('chatWindow');
    const btn = document.getElementById('btnEditChats');
    isSelectionMode = !isSelectionMode;

    if(isSelectionMode) {
        win.classList.add('selection-mode');
        btn.innerText = "✔";
        btn.style.color = "#ef4444";
    } else {
        win.classList.remove('selection-mode');
        btn.innerText = "✎";
        btn.style.color = "";
        document.querySelectorAll('.select-chk').forEach(c => c.checked = false);
    }
}

window.toggleSelectAll = function(source) {
    document.querySelectorAll('.select-chk').forEach(c => c.checked = source.checked);
}

window.deleteSelectedChats = function() {
    const checked = document.querySelectorAll('.select-chk:checked');
    if(checked.length === 0) return window.showToast("No chats selected", "error");

    window.showConfirm(
        `Permanently delete ${checked.length} conversation(s)?`, 
        async function() {
            try {
                // Show loading state if you have one, or just wait
                const promises = [];
                
                checked.forEach(c => {
                    promises.push(deleteChatCompletely(c.value));
                });
                
                await Promise.all(promises);
                
                window.showToast("Conversations cleared");
                toggleSelectionMode(); 
            } catch(e) {
                console.error("Delete Error:", e);
                window.showToast("Error deleting chats", "error");
            }
        }
    );
};
async function deleteChatCompletely(chatId) {
    // 1. Get reference to the messages subcollection
    const messagesRef = collection(window.db, "chats", chatId, "messages");
    
    // 2. Fetch all messages (Snapshot)
    const snapshot = await getDocs(messagesRef);
    
    // 3. Delete every message found
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    // 4. Finally, delete the Chat Room document itself
    await deleteDoc(doc(window.db, "chats", chatId));
}

// 4. OPEN CHAT
window.openChat = async function(targetCode, targetName, existingId = null) {
    const currentUser = window.appGlobal.currentUser;
    if(!currentUser) return window.showToast("Login to chat", "error");

    document.getElementById('chatWindow').classList.add('open');
    document.getElementById('chatBtn').classList.add('hidden');
    document.getElementById('chatInbox').classList.add('hidden');
    document.getElementById('chatMsgView').classList.remove('hidden');
    document.getElementById('chatInputArea').classList.remove('hidden');
    document.getElementById('chatBackBtn').classList.remove('hidden');
    document.getElementById('bulkActions').style.display = 'none';
    document.getElementById('btnEditChats').classList.add('hidden');
    
    document.getElementById('chatTitle').innerText = targetName;

    if(existingId) {
        activeChatId = existingId;
        // Mark Read
        await updateDoc(doc(window.db, "chats", activeChatId), { isRead: true });
    } else {
        const participants = [currentUser.code, targetCode].sort();
        activeChatId = participants.join("_");
        await ensureChatExists(activeChatId, currentUser, targetCode, targetName);
    }

    loadMessages(activeChatId);
}

async function ensureChatExists(chatId, me, otherCode, otherName) {
    const isUser1Me = (me.code < otherCode);
    const data = {
        participants: [me.code, otherCode],
        lastUpdated: new Date().toISOString()
    };
    if(isUser1Me) {
        data.user1Code = me.code; data.user1Name = me.name;
        data.user2Code = otherCode; data.user2Name = otherName;
    } else {
        data.user1Code = otherCode; data.user1Name = otherName;
        data.user2Code = me.code; data.user2Name = me.name;
    }
    await setDoc(doc(window.db, "chats", chatId), data, { merge: true });
}

// 5. LOAD MESSAGES
function loadMessages(chatId) {
    if(msgUnsubscribe) msgUnsubscribe();
    const msgBox = document.getElementById('msgContainer');
    msgBox.innerHTML = '<div style="text-align:center; padding:20px; color:#aaa;">Loading...</div>';

    const q = query(collection(window.db, "chats", chatId, "messages"));

    msgUnsubscribe = onSnapshot(q, (snapshot) => {
        msgBox.innerHTML = '';
        const docs = snapshot.docs.map(d => d.data()).sort((a,b) => (a.timestamp > b.timestamp) ? 1 : -1);

        if(docs.length === 0) {
            msgBox.innerHTML = '<div style="text-align:center; color:#ccc; margin-top:20px;">No messages yet.</div>';
            return;
        }

        const currentUser = window.appGlobal.currentUser;
        
        docs.forEach(data => {
            const isMe = data.senderCode === currentUser.code;
            
            // FORMAT TIME: "3:30 PM"
            let timeStr = "";
            if(data.timestamp) {
                timeStr = new Date(data.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            }

            const div = document.createElement('div');
            div.className = `msg ${isMe ? 'me' : 'them'}`;
            
            // ADDED: span with class 'msg-time'
            div.innerHTML = `
                ${data.text}
                <span class="msg-time">${timeStr}</span>
            `;
            msgBox.appendChild(div);
        });
        document.getElementById('chatMsgView').scrollTop = document.getElementById('chatMsgView').scrollHeight;
    });
}

// 6. SEND MESSAGE
window.sendMessage = async function() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if(!text || !activeChatId) return;
    const settings = window.appGlobal.settings || { chatEnabled: true };
    const currentUser = window.appGlobal.currentUser;
    input.value = ''; 
    if (currentUser.role !== 'admin' && !settings.chatEnabled) {
        return window.showToast("Chat is currently disabled", "error");
    }
    const timestamp = new Date().toISOString();

    await addDoc(collection(window.db, "chats", activeChatId, "messages"), {
        text: text, senderCode: currentUser.code, timestamp: timestamp
    });

    await setDoc(doc(window.db, "chats", activeChatId), {
        lastMsg: text, 
        lastUpdated: timestamp,
        lastSenderCode: currentUser.code,
        isRead: false 
    }, { merge: true });
}

window.backToInbox = function() {
    activeChatId = null;
    if(msgUnsubscribe) msgUnsubscribe();

    document.getElementById('chatInbox').classList.remove('hidden');
    document.getElementById('chatMsgView').classList.add('hidden');
    document.getElementById('chatInputArea').classList.add('hidden');
    document.getElementById('chatBackBtn').classList.add('hidden');
    document.getElementById('btnEditChats').classList.remove('hidden');
    document.getElementById('chatTitle').innerText = "Messages";
    document.getElementById('bulkActions').style.display = ''; 
    
    if(isSelectionMode) toggleSelectionMode();
}

window.toggleChatWindow = function() {
    const win = document.getElementById('chatWindow');
    const btn = document.getElementById('chatBtn');
    
    if(win.classList.contains('open')) {
        win.classList.remove('open');
        btn.classList.remove('hidden');
    } else {
        win.classList.add('open');
        btn.classList.add('hidden');
        if(!activeChatId) window.backToInbox();
    }
}

window.handleEnter = function(e) { if(e.key === 'Enter') window.sendMessage(); }

initChatUI();