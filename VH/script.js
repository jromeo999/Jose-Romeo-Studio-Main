/* =========================================
   FIREBASE IMPORTS (From window object)
   ========================================= */
const { 
    dbFS, auth, collection, doc, addDoc, setDoc, updateDoc, 
    arrayUnion, arrayRemove, query, where, orderBy, increment, deleteDoc, onSnapshot,
    createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut 
} = window.firebaseApp;

/* =========================================
   STATE MANAGEMENT
   ========================================= */
let db = { users: [], posts: [], connections: [], messages: [], notifications: [], playlists: [] };
let currentUser = null;
let activeChat = null;
let listeners = []; // Track active listeners to unsubscribe on logout

/* =========================================
   INITIALIZATION
   ========================================= */
function init() {
    console.log("🔄 Initializing Vibe (Cloud Mode)...");

    // 1. Auth State Listener
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log("✅ Logged in as:", user.email); // Will show username@vibe.internal
            
            // Get User Profile from Firestore
            const userRef = doc(dbFS, "users", user.uid);
            const unsubUser = onSnapshot(userRef, (docSnap) => {
                if (docSnap.exists()) {
                    currentUser = { id: user.uid, ...docSnap.data() };
                    // User is found, load the rest of the app
                    showView('view-user');
                    setupRealtimeListeners();
                    loadHome();
                } else {
                    // Auth exists but DB data is missing (rare edge case)
                    console.warn("Profile missing. Logging out.");
                    logout();
                }
            });
            listeners.push(unsubUser);
        } else {
            console.log("No active session.");
            currentUser = null;
            showView('view-guest');
            // Clean up listeners
            listeners.forEach(unsub => unsub());
            listeners = [];
        }
    });

    // 2. Audio Listener
    const audio = document.getElementById('audio-engine');
    if(audio) audio.addEventListener('timeupdate', updateTimeDisplay);
    
    // 3. Dark Mode
    if(localStorage.getItem('vibeDarkMode') === 'true') document.body.classList.add('dark-mode');
    
    // 4. Init Music State
    if(typeof initMusicDB === 'function') initMusicDB();
}

/* =========================================
   REALTIME DB SYNC
   ========================================= */
function setupRealtimeListeners() {
    // 1. Users Sync
    listeners.push(onSnapshot(collection(dbFS, "users"), (snap) => {
        db.users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if(currentUser) refreshView();
    }));

    // 2. Posts Sync (Newest First)
    const qPosts = query(collection(dbFS, "posts"), orderBy("timestamp", "desc"));
    listeners.push(onSnapshot(qPosts, (snap) => {
        db.posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if(currentUser) refreshView();
    }));

    // 3. Connections Sync
    listeners.push(onSnapshot(collection(dbFS, "connections"), (snap) => {
        db.connections = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if(currentUser) refreshView();
    }));

    // 4. Messages Sync
    const qMsgs = query(collection(dbFS, "messages"), orderBy("ts", "asc"));
    listeners.push(onSnapshot(qMsgs, (snap) => {
        db.messages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if(activeChat) renderMessages();
    }));

    // 5. Notifications Sync
    const qNotifs = query(collection(dbFS, "notifications"), orderBy("timestamp", "desc"));
    listeners.push(onSnapshot(qNotifs, (snap) => {
        db.notifications = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderNotifs();
    }));
    
    // 6. Playlists Sync
    listeners.push(onSnapshot(collection(dbFS, `users/${currentUser.id}/playlists`), (snap) => {
        db.playlists = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderLibrary();
    }));
}

/* =========================================
   AUTH (USERNAME & ACCESS CODE)
   ========================================= */
async function register() {
    const n = document.getElementById('reg-name').value;
    const t = document.getElementById('reg-title').value;
    const u = document.getElementById('reg-user').value.trim(); // Username
    const p = document.getElementById('reg-pass').value; // Access Code
    
    if(!n || !u || !p) return showToast('Fill all fields');
    if(p.length < 6) return showToast('Access Code must be 6+ chars');

    // GHOST EMAIL STRATEGY: 
    // We attach a fake domain so Firebase handles the security, 
    // but you never store or ask for a real email.
    const ghostEmail = `${u}@vibe.internal`.toLowerCase();

    try {
        // 1. Create secure auth record
        const userCred = await createUserWithEmailAndPassword(auth, ghostEmail, p);
        const uid = userCred.user.uid;

        // 2. Create public profile in Database
        const newUser = { 
            name: n, 
            title: t, 
            username: u, 
            avatar: '', 
            cover: '',
            coverPosY: 50
        };
        
        await setDoc(doc(dbFS, "users", uid), newUser);
        
        // 3. Init Playlist
        await addDoc(collection(dbFS, `users/${uid}/playlists`), {
            name: 'My Vibes', tracks: [], isOpen: true, timestamp: Date.now()
        });

        closeModal('register-modal');
        showToast("Account Created! Logging in...");
    } catch (error) {
        console.error("Reg Error:", error);
        if(error.code === 'auth/email-already-in-use') showToast("Username taken");
        else showToast("Error: " + error.message);
    }
}

async function login() {
    const u = document.getElementById('login-user').value.trim();
    const p = document.getElementById('login-pass').value;
    
    // Convert Username back to Ghost Email to log in
    const ghostEmail = `${u}@vibe.internal`.toLowerCase();

    try {
        await signInWithEmailAndPassword(auth, ghostEmail, p);
        closeModal('login-modal');
        showToast("Welcome Back");
    } catch (error) {
        console.error("Login Error:", error);
        showToast("Invalid Username or Access Code");
    }
}

function logout() {
    signOut(auth).then(() => window.location.reload());
}

async function deleteAccount() {
    if(confirm('Delete account? This is permanent.')) {
        try {
            await deleteDoc(doc(dbFS, "users", currentUser.id));
            const user = auth.currentUser;
            await user.delete();
            window.location.reload();
        } catch(e) {
            showToast("Error: " + e.message);
        }
    }
}

function deactivateAccount() {
    if(confirm('Log out of session?')) logout();
}

/* =========================================
   IMAGE HANDLING (Base64)
   ========================================= */
function compressImage(file, callback) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 500; 
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            callback(dataUrl);
        };
    };
}

function triggerProfileUpload(type, event) { 
    if(event) event.stopPropagation();
    document.getElementById(`upload-${type}`).click(); 
}

function handleProfileUpload(e, type) {
    const f = e.target.files[0];
    if(!f) return;

    compressImage(f, async (compressedData) => {
        const updates = {};
        if(type === 'avatar') updates.avatar = compressedData;
        if(type === 'cover') updates.cover = compressedData;
        
        try {
            await updateDoc(doc(dbFS, "users", currentUser.id), updates);
            showToast("Image Uploaded");
        } catch(err) {
            showToast("Upload failed");
        }
    });
}

/* =========================================
   UI & ROUTING
   ========================================= */
function showView(id) {
    document.querySelectorAll('.view').forEach(e => e.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function router(page) {
    document.querySelectorAll('.dropdown-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.sub-view').forEach(e => e.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.nav-btn[data-target="${page}"]`)?.classList.add('active');
    
    document.getElementById(`page-${page}`).classList.remove('hidden');
    
    if(page === 'home') { renderFeed(); renderSuggestions(); }
    if(page === 'network') { renderNetwork(); renderSuggestions(); } 
    if(page === 'dms') renderDMs();
    if(page === 'settings') document.getElementById('set-pass').value = ''; // Don't show pass
    
    updateProfileUI();
}

function loadHome() { router('home'); renderNotifs(); updateProfileUI(); }

function refreshView() {
    if(!document.getElementById('page-home').classList.contains('hidden')) renderFeed();
    if(!document.getElementById('page-network').classList.contains('hidden')) renderNetwork();
    if(!document.getElementById('page-dms').classList.contains('hidden')) renderDMs();
    renderNotifs();
    updateProfileUI();
}

function updateProfileUI() {
    if(!currentUser) return;
    
    document.getElementById('side-profile-name').innerText = currentUser.name;
    document.getElementById('side-profile-account').innerText = currentUser.title || currentUser.username;
    
    const ava = currentUser.avatar || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' fill='%23e5e7eb'/%3E%3C/svg%3E";
    
    ['side-profile-img', 'nav-profile-img', 'mobile-nav-img'].forEach(id => {
        if(document.getElementById(id)) document.getElementById(id).src = ava;
    });
    
    if(currentUser.cover) {
        document.getElementById('side-cover-photo').style.backgroundImage = `url(${currentUser.cover})`;
        document.getElementById('side-cover-photo').style.backgroundPosition = `center ${currentUser.coverPosY || 50}%`;
    } else {
        document.getElementById('side-cover-photo').style.backgroundImage = '';
    }
    
    const count = db.connections.filter(c => c.status === 'accepted' && (c.from === currentUser.id || c.to === currentUser.id)).length;
    ['side-connections', 'net-count'].forEach(id => {
        if(document.getElementById(id)) document.getElementById(id).innerText = count;
    });
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('vibeDarkMode', document.body.classList.contains('dark-mode'));
}

async function saveSettings() {
    showToast('Settings Saved (Code change requires re-login)');
}

/* =========================================
   FEED & POSTS
   ========================================= */

async function createPost() {
    const t = document.getElementById('post-input').value;
    if(!t && tempImgs.length===0) return;
    
    try {
        await addDoc(collection(dbFS, "posts"), {
            userId: currentUser.id, 
            content: t, 
            imgs: tempImgs, 
            likes: 0, 
            likedBy: [],
            comments: [], 
            timestamp: Date.now() 
        });
        document.getElementById('post-input').value = '';
        document.getElementById('preview-area').innerHTML = ''; 
        tempImgs = [];
    } catch(e) { showToast("Post failed"); }
}

function replyTo(postId, username) {
    const input = document.getElementById(`inp-${postId}`);
    input.value = `@${username} `;
    input.focus();
}

let tempImgs = [];
function handleFileSelect(e){ 
    const r = new FileReader(); 
    r.onload=v=>{
        compressImage(e.target.files[0], (res) => {
            tempImgs.push(res); 
            document.getElementById('preview-area').innerHTML+='<img src="'+res+'" style="height:40px">';
        });
    }; 
    r.readAsDataURL(e.target.files[0]); 
}
function triggerFileInput(){document.getElementById('post-file').click()}

/* =========================================
   USER MODAL & NETWORK
   ========================================= */
function openUserModal(uid) {
    uid = String(uid);
    if(uid === currentUser.id);
    const u = db.users.find(x => x.id === uid);
    if(!u) return;

    document.getElementById('user-modal').classList.remove('hidden');
    document.getElementById('modal-avatar').src = u.avatar || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' fill='%23e5e7eb'/%3E%3C/svg%3E";
    document.getElementById('modal-cover').style.backgroundImage = u.cover ? `url(${u.cover})` : 'linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%)'; 
    document.getElementById('modal-name').innerText = u.name;
    document.getElementById('modal-title').innerText = u.title || '@'+u.username;
    
    const btn = document.getElementById('modal-connect-btn');
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    const status = getConnStatus(uid);
    
    if (status === 'Connected') {
        newBtn.innerText = 'Connected';
        newBtn.className = 'btn btn-outline btn-sm';
    } else if (status === 'Pending') {
        newBtn.innerText = 'Cancel Request';
        newBtn.className = 'btn btn-secondary btn-sm';
        newBtn.onclick = () => { connect(uid); closeModal('user-modal'); };
    } else {
        newBtn.innerText = 'Connect';
        newBtn.className = 'btn btn-primary btn-sm';
        newBtn.onclick = () => { connect(uid); closeModal('user-modal'); };
    }

    const c = document.getElementById('modal-posts'); 
    c.innerHTML = '';
    db.posts.filter(p => p.userId === uid).sort((a,b) => b.timestamp - a.timestamp).forEach(p => {
        c.innerHTML += `<div class="card">
            <div class="text-muted" style="font-size:11px;">${new Date(p.timestamp).toLocaleDateString()}</div>
            <div>${p.content}</div>
            ${p.imgs.length ? `<div><img src="${p.imgs[0]}" style="height:100px;border-radius:8px;"></div>` : ''}
        </div>`;
    });
}

function getConnStatus(uid) {
    const c = db.connections.find(x => (x.from === currentUser.id && x.to === uid) || (x.from === uid && x.to === currentUser.id));
    if(!c) return 'none';
    if(c.status === 'accepted') return 'Connected';
    return 'Pending';
}


async function accept(fromId) {
    const c = db.connections.find(x => x.from === fromId && x.to === currentUser.id);
    if(c) await updateDoc(doc(dbFS, "connections", c.id), { status: 'accepted' });
}

function renderNetwork() {
    const pList = document.getElementById('pending-list'); pList.innerHTML = '';
    db.connections.filter(c => c.to === currentUser.id && c.status === 'pending').forEach(c => {
        const u = db.users.find(x => x.id === c.from);
        if(u) pList.innerHTML += `<div class="card flex-between">
            <div style="display:flex;gap:10px;align-items:center;" onclick="openUserModal('${u.id}')">
                <img src="${u.avatar}" class="avatar-sm"> <span>${u.name}</span>
            </div> 
            <button class="btn btn-sm btn-primary" onclick="accept('${c.from}')">Accept</button>
        </div>`;
    });
    document.getElementById('pending-count').innerText = pList.childElementCount;

    const mList = document.getElementById('my-network-list'); mList.innerHTML = '';
    db.connections.filter(c => c.status === 'accepted' && (c.from === currentUser.id || c.to === currentUser.id)).forEach(c => {
        const uid = c.from === currentUser.id ? c.to : c.from;
        const u = db.users.find(x => x.id === uid);
        if(u) mList.innerHTML += `<div class="flex-between" style="padding:10px; border-bottom:1px solid var(--border)">
            <div style="display:flex;gap:10px;align-items:center;" onclick="openUserModal('${u.id}')">
                <img src="${u.avatar}" class="avatar-sm"> ${u.name}
            </div>
            <button class="icon-btn" onclick="openChat('${uid}', '${u.name}', '${u.avatar || ''}')">💬</button>
        </div>`;
    });
}

function renderSuggestions() {
    const sidebarList = document.getElementById('suggestions-list');
    const networkTabList = document.getElementById('network-suggestions-list');
    if(sidebarList) sidebarList.innerHTML = '';
    if(networkTabList) networkTabList.innerHTML = '';

    const candidates = db.users.filter(u => u.id !== currentUser.id && getConnStatus(u.id) !== 'Connected');
    if(candidates.length === 0) return;

    candidates.forEach(u => {
        const status = getConnStatus(u.id);
        const btnText = status === 'Pending' ? 'Cancel' : '+';
        const html = `
        <div class="flex-between" style="margin-bottom:12px; padding: 5px 0;">
            <div style="display:flex; gap:10px; align-items:center; cursor:pointer" onclick="openUserModal('${u.id}')">
                <img src="${u.avatar || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' fill='%23e5e7eb'/%3E%3C/svg%3E"}" class="avatar-sm"> 
                <div><div style="font-size:13px; font-weight:bold">${u.name}</div></div>
            </div>
            <button class="icon-btn" style="border:1px solid var(--border);" onclick="connect('${u.id}')">${btnText}</button>
        </div>`;
        if(sidebarList) sidebarList.innerHTML += html;
        if(networkTabList) networkTabList.innerHTML += `<div class="card" style="margin-bottom:10px;">${html}</div>`;
    });
}

/* =========================================
   MESSAGING
   ========================================= */
function renderDMs() {
    const l = document.getElementById('dm-list'); l.innerHTML = '';
    const conns = db.connections.filter(c => c.status === 'accepted' && (c.from === currentUser.id || c.to === currentUser.id));
    conns.forEach(c => {
        const uid = c.from === currentUser.id ? c.to : c.from;
        const u = db.users.find(x => x.id === uid);
        if(u) l.innerHTML += `<div class="dm-user-row" onclick="openChat('${uid}', '${u.name}', '${u.avatar || ''}')">
            <img src="${u.avatar || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' fill='%23e5e7eb'/%3E%3C/svg%3E"}" class="avatar-sm"> 
            <div><div style="font-weight:bold">${u.name}</div></div>
        </div>`;
    });
}

function renderMessages() {
    if(!activeChat) return;
    const c = document.getElementById('chat-messages'); c.innerHTML = '';
    const msgs = db.messages.filter(m => (m.from === currentUser.id && m.to === activeChat) || (m.from === activeChat && m.to === currentUser.id));
    msgs.forEach(m => c.innerHTML += `<div class="message ${m.from===currentUser.id?'msg-out':'msg-in'}">${m.text}</div>`);
    c.scrollTop = c.scrollHeight;
}

async function sendMessage() {
    const t = document.getElementById('msg-input').value;
    if(t && activeChat) {
        await addDoc(collection(dbFS, "messages"), { from: currentUser.id, to: activeChat, text: t, ts: Date.now() });
        document.getElementById('msg-input').value = ''; 
    }
}
function showNewMsgModal() { showToast('Select a user from the left list'); }

/* =========================================
   MUSIC & PLAYLISTS
   ========================================= */
let musicQueue = [];
let queueIndex = 0;
if (!db.playlist) db.playlist = [];
function initMusicDB() {
    // If old 'db.playlist' exists, convert it to the new 'db.playlists' format
    if (db.playlist && Array.isArray(db.playlist)) {
        db.playlists = [
            { id: Date.now(), name: 'My Vibes', tracks: db.playlist, isOpen: true }
        ];
        delete db.playlist; // Remove old key
        saveDB();
    }
    // Default initialization
    if (!db.playlists) {
        db.playlists = [
            { id: Date.now(), name: 'My Vibes', tracks: [], isOpen: true }
        ];
    }
}
function togglePlaylist(index) {
    db.playlists[index].isOpen = !db.playlists[index].isOpen;
    saveDB();
    renderLibrary();
}

function switchMusicTab(tab) {
    document.getElementById('tab-search').classList.toggle('active', tab === 'search');
    document.getElementById('tab-library').classList.toggle('active', tab === 'library');
    document.getElementById('view-music-search').classList.toggle('hidden', tab !== 'search');
    document.getElementById('view-music-library').classList.toggle('hidden', tab !== 'library');
    if (tab === 'library') renderLibrary();
}

async function searchMusic() {
    const q = document.getElementById('music-search-input').value;
    const r = document.getElementById('music-results');
    if (!q) return showToast("Type something...");
    
    r.innerHTML = '<div style="text-align:center; padding:20px; color:#666">Scanning the archives for studio vibes...</div>';
    const exclusions = 'AND -collection:podcasts AND -subject:podcast AND -collection:etree AND -collection:live_music_archive AND -title:"live at"';
    const requirements = 'AND mediatype:audio AND format:(VBR MP3)';
    const query = `(${q}) ${requirements} ${exclusions}`;
    const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&fl[]=identifier,title,creator&rows=50&output=json`;

    try {
        const res = await fetch(url);
        const data = await res.json();
        let docs = data.response.docs;
        docs = docs.filter(doc => {
            if (!doc.title) return false;
            const wordCount = doc.title.trim().split(/\s+/).length;
            return wordCount <= 15;
        });

        if (docs.length === 0) {
            r.innerHTML = '<div style="text-align:center; padding:20px;">No studio clean matches found.</div>';
            return;
        }
        musicQueue = docs; 
        r.innerHTML = '';

        docs.forEach((t, index) => {
            const imgUrl = `https://archive.org/services/img/${t.identifier}`;
            const div = document.createElement('div');
            div.className = 'music-card';
            div.innerHTML = `
                <button class="add-btn" onclick="addToPlaylist(event, '${t.identifier}', '${escapeStr(t.title)}', '${escapeStr(t.creator)}')">+</button>
                <div onclick="playFromQueue(${index})">
                    <div class="music-art-wrapper">
                <img src="${imgUrl}" class="music-art-img" onerror="this.style.display='none'">
                <div class="music-art-fallback">🎵</div>
            </div>
                    <div style="font-weight:bold;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.title}</div>
                    <div class="text-muted" style="font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.creator || 'Unknown Artist'}</div>
                </div>
            `;
            r.appendChild(div);
        });
    } catch (e) {
        console.error(e);
        r.innerHTML = 'Error connecting to Archive.org';
    }
}

async function addToPlaylist(e, id, title, creator) {
    e.stopPropagation();
    let targetIndex = 0;
    if (db.playlists.length > 1) {
        let msg = "Playlist #:\n";
        db.playlists.forEach((p, i) => msg += `${i+1}. ${p.name}\n`);
        const input = prompt(msg, "1");
        if (!input) return;
        targetIndex = parseInt(input) - 1;
    }
    const targetList = db.playlists[targetIndex];
    if (targetList.tracks && targetList.tracks.find(x => x.identifier === id)) return showToast("Duplicate");

    await updateDoc(doc(dbFS, `users/${currentUser.id}/playlists`, targetList.id), {
        tracks: arrayUnion({ identifier: id, title: unescapeStr(title), creator: unescapeStr(creator) })
    });
    showToast(`Added to "${targetList.name}"`);
}

async function createPlaylist() {
    const name = prompt("Playlist Name:", "New Vibes");
    if (!name) return;
    await addDoc(collection(dbFS, `users/${currentUser.id}/playlists`), { name: name, tracks: [], isOpen: true, timestamp: Date.now() });
}
function removeFromPlaylist(e, id) {
    e.stopPropagation();
    db.playlist = db.playlist.filter(x => x.identifier !== id);
    saveDB();
    renderLibrary();
}

async function deletePlaylist(e, index) {
    e.stopPropagation();
    const plist = db.playlists[index];
    if(confirm(`Delete "${plist.name}"?`)) await deleteDoc(doc(dbFS, `users/${currentUser.id}/playlists`, plist.id));
}
function renameTrack(e, pIndex, tIndex) {
    e.stopPropagation();
    const currentTitle = db.playlists[pIndex].tracks[tIndex].title;
    const newTitle = prompt("Rename track:", currentTitle);
    
    if (newTitle && newTitle.trim() !== "") {
        db.playlists[pIndex].tracks[tIndex].title = newTitle.trim();
        saveDB();
        renderLibrary();
    }
}

async function removeTrack(e, pIndex, tIndex) {
    e.stopPropagation();
    const plist = db.playlists[pIndex];
    if(confirm("Remove track?")) await updateDoc(doc(dbFS, `users/${currentUser.id}/playlists`, plist.id), { tracks: arrayRemove(plist.tracks[tIndex]) });
}

function renderLibrary() {
    const l = document.getElementById('library-list'); l.innerHTML = '';
    const createBtn = document.createElement('div');
    createBtn.className = 'btn btn-primary btn-sm full-width';
    createBtn.style.marginBottom = '15px';
    createBtn.innerText = '+ New Playlist';
    createBtn.onclick = createPlaylist;
    l.appendChild(createBtn);

    db.playlists.forEach((plist, pIndex) => {
        const group = document.createElement('div');
        group.style.cssText = 'margin-bottom:10px;border:1px solid var(--border);border-radius:8px;overflow:hidden';
        group.innerHTML = `<div style="padding:12px;background:var(--bg-secondary);display:flex;justify-content:space-between;cursor:pointer" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display==='none'?'block':'none'">
            <div style="font-weight:bold;">▶ ${plist.name} <span class="text-muted">(${(plist.tracks||[]).length})</span></div>
            <button class="icon-btn danger-text" onclick="deletePlaylist(event, ${pIndex})">&times;</button>
        </div>
        <div class="plist-body" style="display:${plist.isOpen ? 'block' : 'none'};border-top:1px solid var(--border)">
            ${(plist.tracks||[]).map((t, tIndex) => `<div class="lib-row">
                <div class="lib-info" onclick="playFromLibrary(${pIndex}, ${tIndex})">
                    <div class="avatar-xs" style="background:#333;color:white;display:flex;align-items:center;justify-content:center;font-size:10px;">MP3</div>
                    <div><div style="font-weight:bold;font-size:13px">${t.title}</div><div class="text-muted" style="font-size:11px">${t.creator}</div></div>
                </div>
                <button class="icon-btn danger-text" onclick="removeTrack(event, ${pIndex}, ${tIndex})">&times;</button>
            </div>`).join('')}
        </div>`;
        l.appendChild(group);
    });
}

function playFromQueue(index) { queueIndex = index; loadTrack(musicQueue[queueIndex]); }
function playFromLibrary(pIndex, tIndex) { musicQueue = db.playlists[pIndex].tracks; queueIndex = tIndex; loadTrack(musicQueue[queueIndex]); }
async function loadTrack(track) {
    if (!track) return;
    document.getElementById('floating-player').classList.remove('hidden');
    document.getElementById('player-title').innerText = track.title;
    document.getElementById('player-artist').innerText = track.creator || 'Archive.org';
    const artImg = document.getElementById('player-art-img');
    artImg.src = `https://archive.org/services/img/${track.identifier}`;
    
    try {
        const res = await fetch(`https://archive.org/metadata/${track.identifier}`);
        const data = await res.json();
        let file = data.files.find(f => f.name.endsWith('.mp3') && f.format === 'VBR MP3') || data.files.find(f => f.name.endsWith('.mp3'));
        if (!file) return playNext();
        const audio = document.getElementById('audio-engine');
        audio.src = `https://archive.org/download/${track.identifier}/${file.name}`;
        audio.play();
        audio.onended = () => playNext();
        document.getElementById('play-icon').classList.add('hidden');
        document.getElementById('pause-icon').classList.remove('hidden');
    } catch (e) { playNext(); }
}
function playNext() {
    if (queueIndex < musicQueue.length - 1) { queueIndex++; loadTrack(musicQueue[queueIndex]); } 
    else { queueIndex = 0; loadTrack(musicQueue[queueIndex]); }
}
function togglePlay() {
    if (audio.paused) {
        audio.play();
        document.getElementById('play-icon').classList.add('hidden');
        document.getElementById('pause-icon').classList.remove('hidden');
    } else {
        audio.pause();
        document.getElementById('play-icon').classList.remove('hidden');
        document.getElementById('pause-icon').classList.add('hidden');
    }
}
function updateTimeDisplay() {
    const audio = document.getElementById('audio-engine');
    if (!audio.duration) return;
    const min = Math.floor(audio.currentTime / 60);
    const sec = Math.floor(audio.currentTime % 60);
    document.getElementById('player-time').innerText = `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

/* =========================================
   MISC & UTILS
   ========================================= */


function toggleDropdown(id) {
    const el = document.getElementById(id);
    const isHidden = el.classList.contains('hidden');
    document.querySelectorAll('.dropdown-content').forEach(d => d.classList.add('hidden'));
    if(isHidden) el.classList.remove('hidden');
}
function openLbox(src) { document.getElementById('lightbox').classList.remove('hidden'); document.getElementById('lightbox-img').src = src; }
document.querySelector('.lightbox-close').onclick=()=>document.getElementById('lightbox').classList.add('hidden');
document.getElementById('lightbox').onclick = (e) => { if (e.target.id === 'lightbox') document.getElementById('lightbox').classList.add('hidden'); };
function closeModal(id){document.getElementById(id).classList.add('hidden')}
function openModal(id){document.getElementById(id).classList.remove('hidden')}
function showToast(m){const t=document.createElement('div');t.className='toast';t.innerText=m;document.getElementById('toast-container').appendChild(t);setTimeout(()=>t.remove(),3000);}
function escapeStr(str) { if(!str) return ''; return str.replace(/'/g, "\\'").replace(/"/g, '&quot;'); }
function unescapeStr(str) { if(!str) return ''; return str.replace(/\\'/g, "'").replace(/&quot;/g, '"'); }
window.onclick = function(event) { if (!event.target.closest('.dropdown')) document.querySelectorAll('.dropdown-content').forEach(el => el.classList.add('hidden')); if (event.target.classList.contains('modal-overlay')) event.target.classList.add('hidden'); };

/* =========================================
   REPOSITION COVER
   ========================================= */
const coverWrapper = document.getElementById('draggable-cover');
const coverImg = document.getElementById('side-cover-photo');
let isRepoMode = false, isDragging = false, startY = 0, dragStartPos = 50, currentPos = 50;

function handleCoverClick(e) {
    if(isRepoMode) return;
    if(e.target.closest('.control-icon-btn') || e.target.closest('.dropdown-content') || e.target.closest('.reposition-controls')) return;
    if(currentUser.cover) openLbox(currentUser.cover);
}
function startReposition(e) {
    if(e) e.stopPropagation();
    toggleDropdown('cover-menu'); 
    if(!currentUser.cover) return showToast("No cover to adjust");
    isRepoMode = true; coverWrapper.classList.add('reposition-mode'); document.getElementById('repo-controls').classList.remove('hidden');
    currentPos = currentUser.coverPosY || 50;
}
async function saveReposition(e) {
    if(e) e.stopPropagation();
    await updateDoc(doc(dbFS, "users", currentUser.id), { coverPosY: currentPos });
    exitRepoMode(); showToast("Position Saved");
}
function cancelReposition(e) {
    if(e) e.stopPropagation();
    coverImg.style.backgroundPosition = `center ${currentUser.coverPosY || 50}%`;
    exitRepoMode();
}
function exitRepoMode() { isRepoMode = false; isDragging = false; coverWrapper.classList.remove('reposition-mode'); document.getElementById('repo-controls').classList.add('hidden'); }
coverWrapper.addEventListener('mousedown', (e) => {
    if(!isRepoMode || e.target.closest('button')) return;
    isDragging = true; startY = e.clientY; dragStartPos = currentPos;
});
window.addEventListener('mousemove', (e) => {
    if (!isDragging || !isRepoMode) return;
    e.preventDefault(); 
    let newPos = dragStartPos + ((startY - e.clientY) * 0.5);
    if (newPos < 0) newPos = 0; if (newPos > 100) newPos = 100;
    currentPos = newPos; coverImg.style.backgroundPosition = `center ${currentPos}%`;
});
window.addEventListener('mouseup', () => { isDragging = false; });
function toggleCoverMenu(e) { e.stopPropagation(); toggleDropdown('cover-menu'); }
function handleAvatarClick(e) { if(e.target.closest('.edit-icon') || currentUser.avatar) triggerProfileUpload('avatar'); else openLbox(!currentUser.avatar); }
async function removeCover() { if(confirm('Remove cover?')) await updateDoc(doc(dbFS, "users", currentUser.id), { cover: '', coverPosY: 50 }); }

/* ================= HELPERS ================= */
function formatTime(ms) {
    if (!ms) return '';
    const seconds = Math.floor((Date.now() - ms) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + 'm';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + 'h';
    return new Date(ms).toLocaleDateString(); // Fallback to date
}

/* ================= FEED & COMMENTS ================= */
function renderFeed(filterMe = false) {
    const c = filterMe ? document.getElementById('my-posts-container') : document.getElementById('feed-container');
    if(!c) return;
    c.innerHTML = '';
    
    let posts = db.posts;
    if(filterMe) posts = posts.filter(p => p.userId === currentUser.id);
    
    posts.forEach(post => {
        const u = db.users.find(x => x.id === post.userId) || {name:'Unknown', avatar:'', username:'?'};
        const isLiked = post.likedBy && post.likedBy.includes(currentUser.id);
        const heartFill = isLiked ? 'var(--primary)' : 'none';
        const timeAgo = formatTime(post.timestamp); // NEW: Time formatting
        
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <div class="feed-header">
                <img src="${u.avatar || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' fill='%23e5e7eb'/%3E%3C/svg%3E"}" class="avatar-sm" style="cursor:pointer" onclick="openUserModal('${u.id}')">
                <div>
                    <div style="font-weight:bold; cursor:pointer" onclick="openUserModal('${u.id}')">${u.name} <span class="text-muted" style="font-weight:normal; margin-left:5px;">• ${timeAgo}</span></div>
                    <div class="text-muted">${u.title || '@'+u.username}</div>
                </div>
            </div>
            <div class="feed-content">${post.content}</div>
            <div class="feed-img-grid">
                ${post.imgs.map(src => `<img src="${src}" onclick="openLbox('${src}')">`).join('')}
            </div>
            <div class="feed-actions">
                <div class="action-item" onclick="likePost('${post.id}', '${post.userId}')">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="${heartFill}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                    <span style="${isLiked ? 'color:var(--primary); font-weight:bold;' : ''}">${post.likes}</span>
                </div>
                <div class="action-item" onclick="document.getElementById('c-${post.id}').classList.toggle('hidden')">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                    ${post.comments ? post.comments.length : 0}
                </div>
            </div>
            <div id="c-${post.id}" class="hidden" style="margin-top:10px;">
                ${(post.comments || []).map(cm => `
                    <div class="comment-bubble">
                        <div style="display:flex;justify-content:space-between;">
                            <b>${cm.user}</b> 
                            <span style="font-size:10px;color:gray;">${formatTime(cm.timestamp || Date.now())}</span>
                        </div>
                        <div>${cm.text}</div>
                        <div class="reply-btn" onclick="replyTo('${post.id}', '${cm.user}')">Reply</div>
                    </div>`).join('')}
                <div class="comment-input-area">
                    <input id="inp-${post.id}" placeholder="Vibe back..." style="font-size:12px;">
                    <button class="btn btn-sm btn-primary" onclick="addComment('${post.id}')">Send</button>
                </div>
            </div>
        `;
        c.appendChild(div);
    });
}

// UPDATE: Add timestamp to comments
async function addComment(postId) {
    const t = document.getElementById(`inp-${postId}`).value;
    if(t) { 
        await updateDoc(doc(dbFS, "posts", postId), {
            comments: arrayUnion({
                user: currentUser.name, 
                text: t, 
                timestamp: Date.now() // Added Timestamp
            })
        });
        // Optional: Notify post owner
        const p = db.posts.find(x => x.id === postId);
        if(p && p.userId !== currentUser.id) notify(p.userId, 'commented on your vibe.', 'post', postId);
    }
}

// UPDATE: Notify Logic
async function likePost(postId, postOwnerId) {
    const p = db.posts.find(x => x.id === postId);
    if (!p) return;
    const isLiked = p.likedBy && p.likedBy.includes(currentUser.id);
    const postRef = doc(dbFS, "posts", postId);

    if (isLiked) {
        await updateDoc(postRef, { likes: increment(-1), likedBy: arrayRemove(currentUser.id) });
    } else {
        await updateDoc(postRef, { likes: increment(1), likedBy: arrayUnion(currentUser.id) });
        if(postOwnerId !== currentUser.id) notify(postOwnerId, 'liked your vibe.', 'post', postId);
    }
}

/* ================= NETWORK & MESSAGING ================= */

// UPDATE: Redirect to DMs page when opening chat
function openChat(uid, name, ava) {
    activeChat = uid;
    router('dms'); // NEW: Force switch to DM view
    
    // Slight delay to ensure DOM is ready if switching views
    setTimeout(() => {
        document.getElementById('chat-header').classList.remove('hidden');
        document.getElementById('chat-header').innerHTML = `<div style="display:flex;align-items:center;gap:10px;cursor:pointer" onclick="openUserModal('${uid}')">
            <img id="chat-img" src="${ava || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' fill='%23e5e7eb'/%3E%3C/svg%3E"}" class="avatar-sm"> 
            <span id="chat-name" style="font-weight:bold">${name}</span>
        </div>`;
        document.getElementById('chat-input-area').classList.remove('hidden');
        renderMessages();
    }, 50);
}

// UPDATE: Connect Notification type
async function connect(id) {
    const existing = db.connections.find(x => (x.from === currentUser.id && x.to === id) && x.status === 'pending');
    if (existing) {
        await deleteDoc(doc(dbFS, "connections", existing.id));
        showToast("Request Cancelled");
    } else {
        await addDoc(collection(dbFS, "connections"), { from: currentUser.id, to: id, status: 'pending' });
        notify(id, 'sent a vibe request.', 'network', currentUser.id); // Add type
        showToast('Request Sent');
    }
}

/* ================= NOTIFICATIONS ================= */

// UPDATE: Notify accepts type and refId
async function notify(uid, txt, type = 'general', refId = null){ 
    await addDoc(collection(dbFS, "notifications"), { 
        to: uid, 
        text: txt, 
        fromName: currentUser.name, // useful for display
        fromId: currentUser.id,
        type: type, 
        refId: refId,
        read: false, 
        timestamp: Date.now() 
    }); 
}

// UPDATE: Handle clicks and mark as read
async function markNotifsRead() {
    const unread = db.notifications.filter(x => x.to === currentUser.id && !x.read);
    // Batch update (simple version)
    unread.forEach(async n => {
        await updateDoc(doc(dbFS, "notifications", n.id), { read: true });
    });
    document.getElementById('notif-badge').classList.add('hidden');
}

function handleNotifClick(type, refId, fromId) {
    toggleDropdown('notif-dropdown'); // close dropdown
    if (type === 'network') {
        router('network');
    } else if (type === 'post') {
        // Since we don't have a single post view, open the user's modal who made the post or interacted
        // Or if it's a like on YOUR post, open your own profile? 
        // Simplest: Open the profile of the person who interacted.
        openUserModal(fromId);
    } else {
        openUserModal(fromId);
    }
}

function renderNotifs() {
    const l = document.getElementById('notif-list'); l.innerHTML = '';
    const n = db.notifications.filter(x => x.to === currentUser.id);
    
    // Badge logic
    const unreadCount = n.filter(x=>!x.read).length;
    const badge = document.getElementById('notif-badge');
    if(unreadCount > 0) {
        badge.classList.remove('hidden');
        badge.innerText = unreadCount;
    } else {
        badge.classList.add('hidden');
    }

    if(n.length === 0) l.innerHTML = '<div style="padding:10px;color:#999">No vibes yet.</div>';
    else {
        n.forEach(x => {
            const timeAgo = formatTime(x.timestamp);
            l.innerHTML += `
            <div style="padding:10px;border-bottom:1px solid var(--border);font-size:13px;cursor:pointer; ${x.read ? '' : 'background:var(--input-bg);'}" 
                 onclick="handleNotifClick('${x.type}', '${x.refId}', '${x.fromId}')">
                <b>${x.fromName || 'Someone'}</b> ${x.text}
                <div style="font-size:10px;color:gray;margin-top:2px;">${timeAgo}</div>
            </div>`;
        });
    }
}
/* =========================================
   EXPOSE TO WINDOW (Fixes "Modal Shit")
   ========================================= */
window.init = init;
window.register = register;
window.markNotifsRead = markNotifsRead;
window.handleNotifClick = handleNotifClick;
window.login = login;
window.logout = logout;
window.openModal = openModal;
window.closeModal = closeModal;
window.router = router;
window.showView = showView;
window.loadHome = loadHome;
window.refreshView = refreshView;
window.toggleDarkMode = toggleDarkMode;
window.triggerProfileUpload = triggerProfileUpload;
window.handleProfileUpload = handleProfileUpload;
window.saveSettings = saveSettings;
window.renderFeed = renderFeed;
window.createPost = createPost;
window.likePost = likePost;
window.addComment = addComment;
window.replyTo = replyTo;
window.openUserModal = openUserModal;
window.connect = connect;
window.accept = accept;
window.renderNetwork = renderNetwork;
window.removeFromPlaylist = removeFromPlaylist;
window.togglePlaylist = togglePlaylist;
window.switchMusicTab = switchMusicTab;
window.searchMusic = searchMusic;
window.loadTrack = loadTrack;
window.renderLibrary = renderLibrary;
window.addToPlaylist = addToPlaylist;
window.createPlaylist = createPlaylist;
window.deletePlaylist = deletePlaylist;
window.renameTrack = renameTrack;
window.removeTrack = removeTrack;
window.playFromQueue = playFromQueue;
window.playFromLibrary = playFromLibrary;
window.togglePlay = togglePlay;
window.renderDMs = renderDMs;
window.openChat = openChat;
window.sendMessage = sendMessage;
window.showNewMsgModal = showNewMsgModal;
window.handleFileSelect = handleFileSelect;
window.triggerFileInput = triggerFileInput;
window.openLbox = openLbox;
window.toggleDropdown = toggleDropdown;
window.handleCoverClick = handleCoverClick;
window.startReposition = startReposition;
window.saveReposition = saveReposition;
window.cancelReposition = cancelReposition;
window.toggleCoverMenu = toggleCoverMenu;
window.handleAvatarClick = handleAvatarClick;
window.removeCover = removeCover;
window.deactivateAccount = deactivateAccount;
window.deleteAccount = deleteAccount;

// START APP
init();