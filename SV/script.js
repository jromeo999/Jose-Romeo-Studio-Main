    /* ==========================================================================
   VIBE HUB: FIREBASE PRODUCTION (RESTORED & FIXED)
   ========================================================================== */

const firebaseConfig = {
    apiKey: "AIzaSyB0_Dy-ORhDZCHiZa6DJfP7yLkqRpxwJac",
    authDomain: "vibe-hub-8af3e.firebaseapp.com",
    projectId: "vibe-hub-8af3e",
    storageBucket: "vibe-hub-8af3e.firebasestorage.app",
    messagingSenderId: "738938735570",
    appId: "1:738938735570:web:cf008947efa25a7873560b",
    measurementId: "G-S52Q74R1WN"
};

// Initialize Firebase
if (!window.firebase.apps.length) window.firebase.initializeApp(firebaseConfig);
const auth = window.firebase.auth();
const db = window.firebase.firestore();

/* --- GLOBAL STATE & ASSETS --- */
const DEFAULT_AVATAR = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHdpZHRoPSIyNTYiIGhlaWdodD0iMjU2IiB2aWV3Qm94PSIwIDAgMjU2IDI1NiIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+PGcgc3R5bGU9InN0cm9rZTogbm9uZTsgc3Ryb2tlLXdpZHRoOiAwOyBzdHJva2UtZGFzaGFycmF5OiBub25lOyBzdHJva2UtbGluZWNhcDogYnV0dDsgc3Ryb2tlLWxpbmVqb2luOiBtaXRlcjsgc3Ryb2tlLW1pdGVybGltaXQ6IDEwOyBmaWxsOiBub25lOyBmaWxsLXJ1bGU6IG5vbnplcm87IG9wYWNpdHk6IDE7IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxLjQwNjU5MzQwNjU5MzQwMTYgMS40MDY1OTM0MDY1OTM0MDE2KSBzY2FsZSgyLjgxIDIuODEpIj4KCTxwYXRoIGQ9Ik0gNDUgMCBDIDIwLjE0NyAwIDAgMjAuMTQ3IDAgNDUgYyAwIDI0Ljg1MyAyMC4xNDcgNDUgNDUgNDUgcyA0NSAtMjAuMTQ3IDQ1IC00NSBDIDkwIDIwLjE0NyA2OS44NTMgMCA0NSAwIHogTSA0NSAyMi4wMDcgYyA4Ljg5OSAwIDE2LjE0IDcuMjQxIDE2LjE0IDE2LjE0IGMgMCA4LjkgLTcuMjQxIDE2LjE0IC0xNi4xNCAxNi4xNCBjIC04LjkgMCAtMTYuMTQgLTcuMjQgLTE2LjE0IC0xNi4xNCBDIDI4Ljg2IDI5LjI0OCAzNi4xIDIyLjAwNyA0NSAyMi4wMDcgeiBNIDQ1IDgzLjg0MyBjIC0xMS4xMzUgMCAtMjEuMTIzIC00Ljg4NSAtMjcuOTU3IC0xMi42MjMgYyAzLjE3NyAtNS43NSA4LjE0NCAtMTAuNDc2MTQuMDUgLTEzLjM0MSBjIDIuMDA5IC0wLjk3NCA0LjM1NCAtMC45NTggNi40MzUgMC4wNDEgYyAyLjM0MyAxLjEyNiA0Ljg1NyAxLjY5NiA3LjQ3MyAxLjY5NiBjIDIuNjE1IDAgNS4xMyAtMC41NzEgNy40NzMgLTEuNjk2IGMgMi4wODMgLTEgNC44MjggLTEuMDE1IDYuNDM1IC0wLjA0MSBjIDUuOTA2IDIuODY0IDEwLjg3MiA3LjU5MSAxNC4wNDkgMTMuMzQxIEMgNjYuMTIzIDc4Ljk1NyA1Ni4xMzUgODMuODQzIDQ1IDgzLjg0MyB6IiBzdHlsZT0ic3Ryb2tlOiBub25lOyBzdHJva2Utd2lkdGg6IDE7IHN0cm9rZS1kYXNoYXJyYXk6IG5vbmU7IHN0cm9rZS1saW5lY2FwOiBidXR0OyBzdHJva2UtbGluZWpvaW46IG1pdGVyOyBzdHJva2UtbWl0ZXJsaW1pdDogMTA7IGZpbGw6IHJnYigwLDAsMCk7IGZpbGwtcnVsZTogbm9uemVybzsgb3BhY2l0eTogMTsiIHRyYW5zZm9ybT0iIG1hdHJpeCgxIDAgMCAxIDAgMCkgIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPC9nPgo8L3N2Zz4=";

let currentUser = null;
let profileFeedUnsubscribe = null;
let currentZoom = 100;
let activeChatTargetId = null;
let activeChatTargetUsername = null;
let activeChatListener = null;
let dockedUsers = new Set();
let postAttachments = [];
let tempProfileData = {};
const unreadTracker = {}; 
let areGlobalNotificationsEnabled = false;
let otCountdownTimer = null;
let hasConfirmedOvertime = false; 
function toggleToolsDock() {
    const dock = document.getElementById('mini-tools-dock');
    if (dock) {
        dock.classList.toggle('active');
    } else {
        console.error("Error: Could not find element with id 'mini-tools-dock'");
    }
}
/* =========================================
   SIMPLE ALARM CLOCK LOGIC
   ========================================= */

let simpleAlarmInterval = null;
let simpleAlarmTarget = null; // Stores "HH:MM" string
let simpleAlarmRinging = false;

// 1. Initialize Realtime Clock in Alarm Tool
setInterval(() => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', {hour12:false, hour:'2-digit', minute:'2-digit'});
    const secStr = now.toLocaleTimeString('en-US', {hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit'});
    
    const display = document.getElementById('ac-current-time');
    if(display) display.innerText = secStr;

    // Check Alarm
    if (simpleAlarmTarget && !simpleAlarmRinging) {
        if (timeStr === simpleAlarmTarget) {
            triggerSimpleAlarm();
        }
    }
}, 1000);

function setSimpleAlarm() {
    const input = document.getElementById('ac-input').value;
    const label = document.getElementById('ac-label').value || "Alarm";

    if (!input) return showToast("Please select a time", "error");

    simpleAlarmTarget = input; // Format is HH:MM (24hr)
    
    // UI Updates
    document.getElementById('btn-set-alarm').classList.add('hidden');
    document.getElementById('btn-stop-alarm').classList.remove('hidden');
    document.getElementById('ac-status').innerText = `Set for ${tConvert(input)} (${label})`;
    document.getElementById('ac-current-time').classList.add('active-alarm');
    
    showToast(`Alarm set for ${tConvert(input)}`);
    
    // Save to local storage (optional persistence)
    localStorage.setItem('vibe_simple_alarm', input);
}

function triggerSimpleAlarm() {
    simpleAlarmRinging = true;
    
    // 1. Visuals
    const display = document.getElementById('ac-current-time');
    display.classList.remove('active-alarm');
    display.classList.add('ringing');
    document.getElementById('ac-status').innerText = "WAKE UP! WAKE UP!";
    
    // 2. Audio (Reusing the Break Tool's Sound Logic)
    // Make sure 'playAlarm' from your existing code handles 'looping' or we loop it here
    playAlarm(); 

    // 3. System Notification
    const label = document.getElementById('ac-label').value || "Alarm";
    sendSystemNotification("Vibe Alarm", `Time is up: ${label}`);

    // 4. Force Tool Open
    const tool = document.getElementById('tool-alarm');
    if (tool.classList.contains('hidden')) toggleMiniTool('alarm');
}

function stopSimpleAlarm() {
    // Reset Logic
    simpleAlarmTarget = null;
    simpleAlarmRinging = false;
    localStorage.removeItem('vibe_simple_alarm');

    // Stop Sound
    stopAlarm(); // Uses existing function from Break Tool logic

    // UI Reset
    document.getElementById('btn-set-alarm').classList.remove('hidden');
    document.getElementById('btn-stop-alarm').classList.add('hidden');
    document.getElementById('ac-status').innerText = "No alarm set";
    
    const display = document.getElementById('ac-current-time');
    display.classList.remove('active-alarm');
    display.classList.remove('ringing');

    showToast("Alarm stopped");
}

// Restore Alarm on Load
window.addEventListener('load', () => {
    const saved = localStorage.getItem('vibe_simple_alarm');
    if (saved) {
        document.getElementById('ac-input').value = saved;
        setSimpleAlarm();
    }
});
function toggleGlobalNotifications(checkbox) {
    if (checkbox.checked) {
        // 1. Check Browser Support
        if (!("Notification" in window)) {
            showToast("Notifications not supported", "error");
            checkbox.checked = false;
            return;
        }

        // 2. Request Permission
        if (Notification.permission === "granted") {
            enableNotifications(true);
            new Notification("Vibe Hub", { body: "System Alerts Active", icon: "assets/icon.png" });
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    enableNotifications(true);
                } else {
                    // User denied
                    checkbox.checked = false;
                    enableNotifications(false);
                }
            });
        } else {
            // Previously denied
            showToast("Notifications blocked in browser settings", "error");
            checkbox.checked = false;
            enableNotifications(false);
        }
    } else {
        // User turned it off manually
        enableNotifications(false);
        showToast("System Alerts Muted");
    }
}

// Helper to save state
function enableNotifications(isEnabled) {
    areGlobalNotificationsEnabled = isEnabled;
    localStorage.setItem('vibe_notify_enabled', isEnabled); // <--- SAVES TO STORAGE
}
function loadNotificationState() {
    const savedState = localStorage.getItem('vibe_notify_enabled');
    const toggle = document.getElementById('global-notify-toggle');

    // Only enable if user previously said YES and browser still allows it
    if (savedState === 'true' && Notification.permission === 'granted') {
        areGlobalNotificationsEnabled = true;
        if (toggle) toggle.checked = true;
    } else {
        areGlobalNotificationsEnabled = false;
        if (toggle) toggle.checked = false;
    }
}
function sendSystemNotification(title, body) {
    if (areGlobalNotificationsEnabled && Notification.permission === "granted") {
        new Notification(title, {
            body: body,
            icon: "assets/icon.png", // Ensure this path is correct
            silent: false
        });
    }
}


/* --- MUSIC DATA --- */
const vibeTracks = [
    { cat: "🎧 Lofi & Chill", tracks: [{ title: "📚🎶 Lofi Girl", id: "jfKfPfyJRdk" }, { title: "☕🎵 Chillhop", id: "5yx6BWlEVcY" }] },
    { cat: "🎷 Jazz & Blues", tracks: [{ title: "🔥🎷 Warm Jazz", id: "NJuSStkIZBg" }, { title: "💙🎸 Relaxing Blues", id: "neV3EPgvZ3g" }] },
    { cat: "🌿 Nature & Zen", tracks: [{ title: "🌊💙 Ocean Waves", id: "bn9F19Hi1Lk" }, { title: "🌧️🌙 Heavy Rain", id: "mPZkdNFkNps" }] },
    { cat: "💿✨ Music Vault", tracks: [{ title: "🇵🇭🎶 Classic OPM", id: "7ZPueWVdoGM" }, { title: "📼💞 Oldies", id: "7aKHwO8OGsU" }, { title: "🎸🖤 Alt Rock (Chill)", id: "fRVAcwJKgXI" },
    { title: "⚡ Alt Rock (Hype)", id: "YrSdTScobfo" },{ title: "🎧💫 RNB 90s–00s", id: "x_SHYfE-v40" },{ title: "🎤💙 Boybands Vibe", id: "03rI6bsVkko" },
    ] }
];

/* --- INITIALIZATION --- */
window.onload = () => {
    feather.replace();
    
    auth.onAuthStateChanged(async (user) => {
    if (user) {
        const doc = await db.collection('users').doc(user.uid).get();
        if (doc.exists) {
            currentUser = doc.data();
            currentUser.id = user.uid;
            if (user.email === 'admin@svibe.hub') {
                currentUser.isSuperAdmin = true;
                showToast("ADMIN MODE ACTIVE", "success");
            }
            const now = new Date();
            if (currentUser.suspendedUntil && currentUser.suspendedUntil.toDate() > now) {
                // RENDER RESTRICTED VIEW
                document.getElementById('landing-view').classList.add('hidden');
                document.getElementById('app-view').classList.remove('hidden'); // Show app container
                
                // Hide normal UI elements
                document.querySelector('header').classList.add('hidden');
                document.querySelector('.main-grid').classList.add('hidden');
                document.querySelector('.mobile-nav').classList.add('hidden');
                
                // Show Suspended Overlay
                const suspendView = document.getElementById('suspended-view');
                const liftDate = currentUser.suspendedUntil.toDate();
                document.getElementById('suspend-lift-time').innerText = liftDate.toLocaleString();
                suspendView.classList.remove('hidden');
                
                // Allow Chat System to initialize (so they can chat admin)
                listenToDock(); 
                feather.replace();
                return; // STOP HERE. Do not load feed.
            }

            // 3. NORMAL LOAD
            if (currentUser.isDeactivated) {
                await db.collection('users').doc(user.uid).update({ isDeactivated: false });
                currentUser.isDeactivated = false;
            }
            
            document.getElementById('landing-view').classList.add('hidden');
            document.getElementById('app-view').classList.remove('hidden');
            
            // Ensure UI is visible (in case they were previously suspended)
            document.querySelector('header').classList.remove('hidden');
            document.querySelector('.main-grid').classList.remove('hidden');
            document.getElementById('suspended-view').classList.add('hidden');
            
            initApp();
        } else {
            // Logic for Admin if they don't have a Firestore User Doc yet
            if (user.email === 'admin@svibe.hub') {
                
                // 1. CREATE THE DOC AUTOMATICALLY so users can find you
                const newAdmin = { 
                    id: user.uid, 
                    displayName: 'Vibe Admin', // Or "Super Admin"
                    username: 'admin',         // This is what we search for
                    avatar: DEFAULT_AVATAR,
                    friends: [],
                    isSuperAdmin: true 
                };
                
                // Save to DB immediately
                await db.collection('users').doc(user.uid).set(newAdmin);

                currentUser = newAdmin;
                
                document.getElementById('landing-view').classList.add('hidden');
                document.getElementById('app-view').classList.remove('hidden');
                initApp();
            } else {
                auth.signOut();
                location.reload();
            }
        
        }
    } else {
        document.getElementById('landing-view').classList.remove('hidden');
        document.getElementById('app-view').classList.add('hidden');
    }
});

    setupGlobalListeners();
    setupDragDropPost();
    renderVibeStation();
    makeAllToolsDraggable();
    makeAllToolsResizable();
    loadNotificationState();
};
function isUserMuted(user) {
    if (!user || !user.suspendedUntil) return false;
    return user.suspendedUntil.toDate() > new Date();
}
function makeAllToolsDraggable() {
    document.querySelectorAll('.mini-tool-box').forEach(el => {
        const header = el.querySelector('.drag-handle');
        
        // 1. Setup Dragging
        if(header) setupToolDrag(el, header);

        // 2. Setup "Bring to Front" on Click
        el.addEventListener('mousedown', () => {
            bringToolToFront(el);
        });
        
        // Handle Touch for Mobile
        el.addEventListener('touchstart', () => {
            bringToolToFront(el);
        }, { passive: true });
    });
}

function setupToolDrag(el, handle) {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    // --- HELPER: SHOULD WE DRAG? ---
    const shouldDrag = (target) => {
        // 1. If clicking a button wrapper (mt-controls) -> NO DRAG
        if (target.closest('.mt-controls')) return false;
        
        // 2. If clicking an SVG/Icon (The Close 'X') -> NO DRAG
        if (target.closest('svg') || target.tagName === 'I' || target.tagName === 'PATH') return false;
        
        // 3. If clicking something with an onclick attribute -> NO DRAG
        if (target.closest('[onclick]')) return false;

        return true;
    };

    // --- 1. MOUSE EVENTS ---
    handle.addEventListener('mousedown', (e) => {
        // STOP if we clicked a button/icon
        if (!shouldDrag(e.target)) return;
        
        // Only Left Click
        if (e.button !== 0) return;

        e.preventDefault(); 
        startDrag(e.clientX, e.clientY);
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    function onMouseMove(e) { moveDrag(e.clientX, e.clientY); }
    
    function onMouseUp() {
        isDragging = false;
        handle.style.cursor = 'grab';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }

    // --- 2. TOUCH EVENTS (Mobile) ---
    handle.addEventListener('touchstart', (e) => {
        // STOP if we touched a button/icon
        if (!shouldDrag(e.target)) {
            // Do NOT prevent default here, let the 'click' fire!
            return; 
        }

        e.preventDefault(); // Stop scrolling ONLY if we are dragging
        
        const touch = e.touches[0];
        startDrag(touch.clientX, touch.clientY);
        
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd);
    }, { passive: false });

    function onTouchMove(e) {
        if (!isDragging) return;
        e.preventDefault(); 
        const touch = e.touches[0];
        moveDrag(touch.clientX, touch.clientY);
    }

    function onTouchEnd() {
        isDragging = false;
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
    }

    // --- SHARED PHYSICS ---
    function startDrag(x, y) {
        isDragging = true;
        startX = x;
        startY = y;
        handle.style.cursor = 'grabbing';

        const rect = el.getBoundingClientRect();
        
        // Convert to absolute positioning to prevent jumping
        el.style.transform = 'none'; 
        el.style.left = rect.left + 'px';
        el.style.top = rect.top + 'px';
        
        // Reset margins/bottom/right so left/top takes over
        el.style.margin = '0';
        el.style.bottom = 'auto'; 
        el.style.right = 'auto';
        
        initialLeft = rect.left;
        initialTop = rect.top;
    }

    function moveDrag(x, y) {
        if (!isDragging) return;
        const dx = x - startX;
        const dy = y - startY;
        el.style.left = `${initialLeft + dx}px`;
        el.style.top = `${initialTop + dy}px`;
    }
}
function setupGlobalListeners() {
    window.addEventListener('mouseup', () => {
        if (window.isDragging) { window.isDragging = false; document.getElementById('side-cover').style.cursor = 'default'; }
    });
    window.addEventListener('mousemove', (e) => {
        if (window.isDragging) {
            const diff = window.startY - e.clientY;
            let val = Math.max(0, Math.min(100, window.currentY + (diff * 0.3)));
            document.getElementById('side-cover').style.backgroundPositionY = `${val}%`;
            tempProfileData.coverPosY = val;
            window.startY = e.clientY;
            window.currentY = val;
        }
    });
    window.onclick = (e) => {
        if (e.target.classList.contains('modal-overlay')) e.target.classList.add('hidden');
        if (e.target.classList.contains('lightbox')) e.target.classList.add('hidden');
        if (!e.target.closest('.nav-btn') && !e.target.closest('.dropdown-content')) {
            document.querySelectorAll('.dropdown-content').forEach(d => d.classList.add('hidden'));
        }
    };
    /* --- GLOBAL KEY LISTENER (Updated) --- */
window.onkeydown = (e) => {
    if (e.key === 'Escape') {
        
        // 1. PRIORITY: Close Overlays (Modals, Lightbox, Dropdowns)
        const modals = document.querySelectorAll('.modal-overlay:not(.hidden)');
        const lightbox = document.getElementById('lightbox');
        const dropdowns = document.querySelectorAll('.dropdown-content:not(.hidden)');
        
        if (modals.length > 0 || !lightbox.classList.contains('hidden') || dropdowns.length > 0) {
            modals.forEach(el => el.classList.add('hidden'));
            lightbox.classList.add('hidden');
            dropdowns.forEach(d => d.classList.add('hidden'));
            return; // Stop here if we closed an overlay
        }

        // 2. CREATE POST LOGIC (The Backup)
        const postInput = document.getElementById('new-post-text');
        // Check if user is typing in the post box OR if the box has focus
        if (document.activeElement === postInput) {
            
            // A. If attachments exist -> Clear them first
            if (postAttachments && postAttachments.length > 0) {
                postAttachments = [];
                const preview = document.getElementById('attachment-preview');
                preview.innerHTML = '';
                preview.classList.add('hidden');
                
                showToast("Attachments cleared");
                e.preventDefault(); // Keep focus in the box
                return;
            }

            // B. If no attachments -> Clear text or Blur
            if (postInput.value.trim().length > 0) {
                // Optional: Ask for confirmation or just clear?
                // For "Cancel" behavior, usually simply clearing is expected:
                postInput.value = '';
                e.preventDefault();
            } else {
                // If empty and no attachments, just unfocus
                postInput.blur();
            }
        }
    }
    
};
}

function setupDragDropPost() {
    const area = document.getElementById('new-post-text');
    const box = document.querySelector('.create-post-box');
    
    // 1. Drag & Drop Visuals
    box.addEventListener('dragover', e => { e.preventDefault(); box.classList.add('drag-active'); });
    box.addEventListener('dragleave', e => { box.classList.remove('drag-active'); });
    box.addEventListener('drop', e => { 
        e.preventDefault(); 
        box.classList.remove('drag-active'); 
        handlePostFiles(e.dataTransfer.files);
    });

    // 2. Paste Images
    area.addEventListener('paste', e => {
        if (e.clipboardData.files.length > 0) {
            e.preventDefault();
            handlePostFiles(e.clipboardData.files);
        }
    });

    // 3. NEW: Ctrl + Enter to Post
    area.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault(); // Stop it from adding a new line
            createPost();       // Submit
        }
    });
}

function initApp() {
    if (currentUser && auth.currentUser && auth.currentUser.email) {
        
        // 1. Get the actual email (e.g., "john@vibehub.app")
        const fullEmail = auth.currentUser.email;
        const loginId = fullEmail.split('@')[0];

        const saveUser = {
            username: loginId, // THIS is now the correct login username
            displayName: currentUser.displayName,
            avatar: currentUser.avatar || DEFAULT_AVATAR
        };
        
        localStorage.setItem('vibe_last_user', JSON.stringify(saveUser));
    }
    checkAdminAccess(); 
    updateSidebar(currentUser.id);
    listenToFeed();
    listenToNetwork(); 
    listenToDock();
    renderSuggestions();
    fetchAndRenderNotes();
    cleanGhostFriends(); 
    if(localStorage.getItem('vibe_theme') === 'dark') document.body.setAttribute('data-theme', 'dark');
    feather.replace(); // Ensure this runs to catch the new X icon and Grid icon
    listenToBreakData(); 
    setInterval(() => {
        checkAutoClockOut();
    }, 1000);
    setTimeout(() => {
        cleanupStaleSessions();
    }, 3000);
    document.addEventListener('keydown', (e) => {
    // Only intercept if Calculator is visible
    const calcBox = document.getElementById('tool-calc');
    // We use a specific check here, but we do NOT use 'return' to kill the whole function yet
    if (calcBox && !calcBox.classList.contains('hidden')) {
        
        // ESC to close
        if (e.key === 'Escape') {
            toggleMiniTool('calc');
            return; // Now we can return, because we handled the event
        }
        
        // ENTER to calculate
        if (e.key === 'Enter') {
            e.preventDefault();
            calcEval();
            return;
        }

        // Number & Operator keys
        const allowed = "0123456789.+-*/";
        if (allowed.includes(e.key)) {
            e.preventDefault();
            calcInput(e.key);
            return;
        }
        
        // Backspace to clear
        if (e.key === 'Backspace') {
            document.getElementById('calc-display').value = '';
            return;
        }
    }

    // ===============================================
    // 2. FOCUS TRAP (Only runs if a Modal is Open)
    // ===============================================
    // Only intercept Tab
    if (e.key === 'Tab') {
        const activeModal = document.querySelector('.modal-overlay:not(.hidden)');
        
        // If a modal is open, we MUST trap the focus
        if (activeModal) {
            const focusableElements = activeModal.querySelectorAll(
                'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
            );
            
            if (focusableElements.length > 0) {
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                // Shift + Tab (Backwards)
                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } 
                // Tab (Forwards)
                else {
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        }
    }
    makeAllToolsDraggable(); // Enable drag logic
    makeAllToolsResizable();
    loadNotificationState();
    const savedAlarm = localStorage.getItem('vibe_alarm_type') || 'beep';
    updateAlarmLabel(savedAlarm);
    highlightSelectedAlarm(savedAlarm);
    feather.replace();
});
}
function highlightSelectedAlarm(type) {
    if (!type) return;

    // 1. Clear 'selected' from ALL rows
    const allRows = document.querySelectorAll('.alarm-opt-row');
    allRows.forEach(row => {
        row.classList.remove('selected');
        row.style.borderColor = ''; // Safety clear
        row.style.background = '';  // Safety clear
    });

    // 2. Find the target row (Case insensitive check)
    // We convert input to lowercase to match the HTML data-type="beep"
    const targetRow = document.querySelector(`.alarm-opt-row[data-type="${type.toLowerCase()}"]`);

    // 3. Apply 'selected' class
    if (targetRow) {
        targetRow.classList.add('selected');
    }
}
function makeAllToolsResizable() {
    document.querySelectorAll('.mini-tool-box').forEach(el => {
        const resizers = el.querySelectorAll('.resizer');
        resizers.forEach(resizer => setupResizer(el, resizer));
    });
}

function setupResizer(el, resizer) {
    let isResizing = false;
    let startX, startY, startW, startH, startLeft, startTop;

    // Detect which handle this is
    const isN = resizer.classList.contains('n') || resizer.classList.contains('ne') || resizer.classList.contains('nw');
    const isS = resizer.classList.contains('s') || resizer.classList.contains('se') || resizer.classList.contains('sw');
    const isE = resizer.classList.contains('e') || resizer.classList.contains('ne') || resizer.classList.contains('se');
    const isW = resizer.classList.contains('w') || resizer.classList.contains('nw') || resizer.classList.contains('sw');

    // --- MOUSE & TOUCH HANDLERS ---
    
    // Mouse
    resizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        initResize(e.clientX, e.clientY);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
    });

    // Mobile Touch
    resizer.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Stop scroll
        const t = e.touches[0];
        initResize(t.clientX, t.clientY);
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd);
    }, { passive: false });


    function initResize(clientX, clientY) {
        isResizing = true;
        startX = clientX;
        startY = clientY;
        
        const rect = el.getBoundingClientRect();
        startW = rect.width;
        startH = rect.height;
        startLeft = rect.left;
        startTop = rect.top;

        // Force inline styles for calculation
        el.style.left = startLeft + 'px';
        el.style.top = startTop + 'px';
        el.style.transform = 'none'; 
    }

    function syncResize(clientX, clientY) {
        if (!isResizing) return;
        
        const dx = clientX - startX;
        const dy = clientY - startY;

        // WIDTH & LEFT calculation
        if (isE) {
            el.style.width = `${startW + dx}px`;
        } else if (isW) {
            // Pulling left means expanding width BUT also moving left
            el.style.width = `${startW - dx}px`;
            el.style.left = `${startLeft + dx}px`;
        }

        // HEIGHT & TOP calculation
        if (isS) {
            el.style.height = `${startH + dy}px`;
        } else if (isN) {
            // Pulling up means expanding height BUT also moving top
            el.style.height = `${startH - dy}px`;
            el.style.top = `${startTop + dy}px`;
        }
    }

    // Event Wrappers
    function onMove(e) { syncResize(e.clientX, e.clientY); }
    function onEnd() { 
        isResizing = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onEnd);
    }

    function onTouchMove(e) {
        e.preventDefault();
        const t = e.touches[0];
        syncResize(t.clientX, t.clientY);
    }
    function onTouchEnd() {
        isResizing = false;
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
    }
}
function updateAlarmLabel(type) {
    // 1. Map IDs
    const labelBT = document.getElementById('bt-alarm-label'); // Break Tool
    const labelAC = document.getElementById('ac-alarm-label'); // Alarm Tool

    let text = type;
    
    // Custom formatted names
    const names = {
        'beep': 'Beep',
        'rooster': 'Rooster',
        'school': 'School',
        'cuckoo': 'Cuckoo',
        'elise': 'Fur Elise',
        'slot1': 'Slot 1',
        'slot2': 'Slot 2',
        'slot3': 'Slot 3',
        'slot4': 'Slot 4',
    };

    if (names[type]) text = names[type];
    
    // 2. Update Both Elements if they exist
    if (labelBT) labelBT.innerText = text;
    if (labelAC) labelAC.innerText = text;
}

// 4. View List
function toggleNoteList() {
    const list = document.getElementById('mt-note-list');
    list.classList.toggle('hidden');
    if(!list.classList.contains('hidden')) renderSavedNotes();
}

function showTest(el) { 
    // Only show if NOT currently testing something else
    if(!currentTestType || el.classList.contains('active-test-row')) {
        el.querySelector('.test-btn').classList.remove('hidden'); 
    }
}
function hideTest(el) { 
    // Only hide if NOT currently playing
    if (!el.classList.contains('active-test-row')) {
        el.querySelector('.test-btn').classList.add('hidden'); 
    }
}

// Test Sound Trigger
function testSound(type) {
    // Determine source based on type
    let src = '';
    if (type === 'beep') { playAlarm(); return; } // Use oscillator for beep
    
    if (type === 'rooster') src = 'assets/rooster.mp3';
    else if (type === 'school') src = 'assets/school.mp3';
    else if (type === 'cuckoo') src = 'assets/cuckoo.mp3';
    else if (type === 'elise') src = 'assets/fur-elise.mp3';
    else if (type.startsWith('slot')) src = `assets/${type}.mp3`; // slot1.mp3, etc.

    if (src) {
        const audio = new Audio(src);
        audio.play().catch(e => showToast("Sound file not found: " + src, "error"));
    }
    if (activeAudio && !activeAudio.paused && alarmType === type) {
        stopAlarm();
        return;
    }
    const originalType = alarmType; // Remember what the user actually selected
    alarmType = type;
    playAlarm();
    alarmType = originalType; 
}

/* --- COMPRESSION --- */
function compressImage(file, maxWidth = 450, quality = 0.4) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width, h = img.height;
                
                // Resize logic
                if (w > maxWidth) { 
                    h *= maxWidth / w; 
                    w = maxWidth; 
                }
                
                canvas.width = w; 
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                
                // EXPORT AS WEBP (Smaller size)
                resolve(canvas.toDataURL('image/webp', quality));
            };
        };
    });
}
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        if(file.size > 500 * 1024) { reject("File too large (Max 500KB)"); return; }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

/* --- SIDEBAR UPLOAD & VIEWING (FIXED) --- */
async function handleSidebarUpload(type, input) {
    if (input.files && input.files[0]) {
        showToast("Processing...", "success");
        try {
            const base64String = await compressImage(input.files[0], 500, 0.5);
            if (type === 'cover') {
                document.getElementById('side-cover').style.backgroundImage = `url(${base64String})`;
                tempProfileData.cover = base64String;
            } else {
                document.getElementById('side-avatar').src = base64String;
                tempProfileData.avatar = base64String;
            }
            showToast("Ready to Save");
        } catch (err) {
            showToast("Error processing", "error");
        }
    }
}

async function updateSidebar(uid = currentUser.id) {
    let u = currentUser;
    if (uid !== currentUser.id) {
        try {
            const doc = await db.collection('users').doc(uid).get();
            if (doc.exists) { u = doc.data(); u.id = uid; }
        } catch (e) { console.error(e); }
    }
    
    const isMe = (uid === currentUser.id);
    const avatarSrc = u.avatar || DEFAULT_AVATAR;

    // 1. UPDATE PROFILE VISUALS
    const cover = document.getElementById('side-cover');
     if (cover) {
        const coverUrl = u.cover || ''; // Get URL safely
        
        cover.style.backgroundImage = coverUrl ? `url(${coverUrl})` : 'none';
        cover.style.backgroundPositionY = `${u.coverPosY || 50}%`;
        cover.style.backgroundSize = `${u.coverZoom || 100}%`;

        // --- RESTORED: CLICK TO OPEN LIGHTBOX ---
        if (coverUrl) {
            // Only add click if there is an image
            cover.onclick = () => openLightbox(coverUrl);
            cover.style.cursor = 'zoom-in';
        } else {
            cover.onclick = null;
            cover.style.cursor = 'default';
        }
    }
    
    document.getElementById('side-avatar').src = avatarSrc;
    const safeName = u.displayName || "User";
document.getElementById('side-name').innerHTML = formatShortName(safeName);
document.getElementById('side-name').title = safeName; // Shows full name on hover // innerHTML allows badges if added later
    document.getElementById('side-account').innerText = formatShortAccount(u.account);
// Optional: Add a title attribute so you can see the full text on hover
document.getElementById('side-account').title = u.account;     document.getElementById('side-role').innerText = u.role || ''; // YOUR NEW ROLE FIELD
    document.getElementById('side-friends-count').innerText = (u.friends || []).length;

    // 2. CHECK MUTE STATUS
    const sidebarCard = document.getElementById('sidebar-card');
    if (isUserMuted(u) && !isMe) {
        sidebarCard.classList.add('muted-visual');
    } else {
        sidebarCard.classList.remove('muted-visual');
    }

    // 3. BUTTON LOGIC (Restored Original Flow)
    const penBtn = document.getElementById('sb-edit-pen');
    const actionBtns = document.getElementById('side-actions');
    const btnConn = document.getElementById('btn-side-connect');
    const btnMsg = document.getElementById('btn-side-msg');

    // Reset visibility first
    if(penBtn) penBtn.classList.add('hidden');
    if(actionBtns) actionBtns.classList.add('hidden'); // Default to hidden

    if (isMe) {
        if(penBtn) penBtn.classList.remove('hidden');
        
        // Sync Nav Images
        const navImg = document.getElementById('nav-profile-img');
        if(navImg) navImg.src = avatarSrc;
        const mobImg = document.getElementById('mobile-nav-img');
        if(mobImg) mobImg.src = avatarSrc;
        const cpImg = document.getElementById('create-post-avatar');
        if(cpImg) cpImg.src = avatarSrc;

    } else {
        // --- VIEWING OTHERS ---
        
        // CONDITION: If Admin, show NO buttons (as you requested).
        // If Normal/Mod, show the Connect/Chat buttons.
        if (!currentUser.isSuperAdmin) {
            actionBtns.classList.remove('hidden'); // Show container
            
            // LOGIC: Connect vs Disconnect
            if ((currentUser.friends || []).includes(uid)) {
                 btnConn.innerHTML = `<i data-feather="user-minus"></i> <span>Disconnect</span>`;
                 btnConn.className = "btn btn-sm btn-outline btn-danger"; // Red Outline
                 btnConn.onclick = () => removeFriend(uid);
            } else {
                 btnConn.innerHTML = `<i data-feather="user-plus"></i> <span>Connect</span>`;
                 btnConn.className = "btn btn-sm btn-primary"; // Solid Blue
                 btnConn.onclick = () => addFriend(uid);
            }
            
            // LOGIC: Chat
            btnMsg.onclick = () => startChat(uid);
        }
        // If Admin, actionBtns stays hidden.
    }
    feather.replace();
}
function adminNukeUser(targetUid) {
    if (!currentUser.isSuperAdmin) return;
    customConfirm("Delete this user account?", async () => {
        try {
            await db.collection('users').doc(targetUid).delete();
            showToast("User Annihilated 💀", "error");
            
            // REFRESH UI
            router('home');
            renderSuggestions(); // <--- Add this to remove them from list
        } catch (e) {
            console.error(e);
            showToast("Error: " + e.message, "error");
        }
    });
}
let pendingMuteTarget = null;

function openMuteModal(uid) {
    pendingMuteTarget = uid;
    document.getElementById('mute-reason').value = "";
    openModal('mute-modal');
}

async function confirmMute(hours) {
    if (!pendingMuteTarget) return;

    const now = new Date();
    // Calculate future date
    const liftDate = new Date(now.getTime() + (hours * 60 * 60 * 1000));
    
    try {
        await db.collection('users').doc(pendingMuteTarget).update({
            suspendedUntil: firebase.firestore.Timestamp.fromDate(liftDate),
            suspensionReason: document.getElementById('mute-reason').value || "Policy Violation"
        });
        
        showToast(`User muted for ${hours} hours`);
        closeModal('mute-modal');
        updateSidebar(pendingMuteTarget); // Refresh buttons
    } catch (e) {
        showToast("Error muting user", "error");
    }
}async function confirmMute(hours) {
    if (!pendingMuteTarget) return;
    const now = new Date();
    const liftDate = new Date(now.getTime() + (hours * 60 * 60 * 1000));
    
    try {
        await db.collection('users').doc(pendingMuteTarget).update({
            suspendedUntil: firebase.firestore.Timestamp.fromDate(liftDate),
            suspensionReason: document.getElementById('mute-reason').value || "Policy Violation"
        });
        showToast(`User muted for ${hours} hours`);
        closeModal('mute-modal');
        
        // REFRESH UI
        updateSidebar(pendingMuteTarget); 
        renderSuggestions(); // <--- Add this to update the list icon
        
    } catch (e) {
        showToast("Error muting user", "error");
    }
}

async function liftSuspension(uid) {
    try {
        await db.collection('users').doc(uid).update({
            suspendedUntil: firebase.firestore.FieldValue.delete(),
            suspensionReason: firebase.firestore.FieldValue.delete()
        });
        showToast("Suspension Lifted");
        
        // REFRESH UI
        updateSidebar(uid);
        renderSuggestions(); // <--- Add this to update the list icon
        
    } catch (e) {
        showToast("Error lifting suspension", "error");
    }
}
// Function for the Suspended User to contact Admin
async function contactAdminForAppeal() {
    // 1. Try to find the main "admin" username first
    let adminId = null;
    
    try {
        // Search for specific username 'admin'
        let snap = await db.collection('users').where('username', '==', 'admin').limit(1).get();
        
        if (!snap.empty) {
            adminId = snap.docs[0].id;
        } else {
            // Fallback: Search for ANY user marked as isSuperAdmin
            snap = await db.collection('users').where('isSuperAdmin', '==', true).limit(1).get();
            if (!snap.empty) {
                adminId = snap.docs[0].id;
            }
        }

        if (adminId) {
            // 2. Open the Chat Window
            // We force the chat window to be ABOVE the suspended overlay (z-index fix)
            const chatWin = document.getElementById('chat-window');
            chatWin.style.zIndex = "9999"; 
            
            startChat(adminId);
            
            // Optional: Friendly visual cue
            showToast("Opening chat with Admin...");
        } else {
            // This only happens if the Admin account literally hasn't been created in Firestore yet
            showToast("System: Admin channel not initialized yet.");
        }

    } catch (e) {
        console.error("Error finding admin:", e);
        // Even if error, try to fail gracefully
    }
}
function toggleSidebarEdit(enable) {
    const card = document.getElementById('sidebar-card');
    const nameEl = document.getElementById('side-name');
    const accountEl = document.getElementById('side-account');
    const actionBtns = document.getElementById('side-actions'); // The button slot on the right
     const roleEl = document.getElementById('side-role');
    
    if (enable) {
        // --- ENTER EDIT MODE ---
        card.classList.add('editing');
        
        // 1. Swap Top Icons (Pen -> Save/Cancel)
        document.getElementById('sb-edit-pen').classList.add('hidden');
        document.getElementById('sb-save-cancel').classList.remove('hidden');
        
        // 2. Show Cover Photo Controls (Overlay)
        document.getElementById('sb-cover-actions').classList.remove('hidden');

        // 3. INJECT AVATAR CONTROLS INTO THE BUTTON SLOT
        actionBtns.classList.remove('hidden');
        actionBtns.innerHTML = `
            <button class="btn btn-avatar-upload" onclick="triggerUpload('avatar')" title="Change Avatar">
                <i data-feather="camera"></i>
            </button>
            <button class="btn btn-avatar-delete" onclick="removeAvatar()" title="Remove Avatar">
                <i data-feather="trash-2"></i>
            </button>
        `;
        feather.replace();  // Render new icons

        // 4. Enable Text Editing
        nameEl.contentEditable = "true"; 
        accountEl.contentEditable = "true";
        roleEl.contentEditable = "true"; 
        nameEl.focus();
        
        // 5. Load Temp Data for Dragging/Zooming
        tempProfileData = { ...currentUser }; 
        window.currentY = currentUser.coverPosY || 50;
        currentZoom = currentUser.coverZoom || 100;
        const zoomSlider = document.getElementById('cover-zoom');
        if(zoomSlider) zoomSlider.value = currentZoom;

    } else {
        // --- EXIT EDIT MODE ---
        card.classList.remove('editing');
        
        // 1. Swap Top Icons Back
        document.getElementById('sb-edit-pen').classList.remove('hidden');
        document.getElementById('sb-save-cancel').classList.add('hidden');
        document.getElementById('sb-cover-actions').classList.add('hidden');
        
        // 2. Disable Text Editing
        nameEl.contentEditable = "false"; 
        accountEl.contentEditable = "false";
        roleEl.contentEditable = "false"; 
        
        // 3. Reset Sidebar (This clears the buttons and hides the container for 'Me')
        updateSidebar(); 
    }
}
async function saveSidebarChanges() {
    tempProfileData.displayName = document.getElementById('side-name').innerText;
    tempProfileData.account = document.getElementById('side-account').innerText;
    tempProfileData.role = document.getElementById('side-role').innerText;
    tempProfileData.coverPosY = window.currentY;
    tempProfileData.coverZoom = currentZoom;
    await db.collection('users').doc(currentUser.id).update(tempProfileData);
    currentUser = { ...currentUser, ...tempProfileData };
    showToast("Profile Saved");
    toggleSidebarEdit(false);
}
function removeCover() { document.getElementById('side-cover').style.backgroundImage = 'none'; tempProfileData.cover = ''; }
function removeAvatar() { document.getElementById('side-avatar').src = DEFAULT_AVATAR; tempProfileData.avatar = DEFAULT_AVATAR; }
function startDragCover(e) { e.preventDefault(); window.isDragging = true; window.startY = e.clientY; document.getElementById('side-cover').style.cursor = 'grabbing'; }
function updateCoverZoom(val) { currentZoom = val; document.getElementById('side-cover').style.backgroundSize = `${val}%`; tempProfileData.coverZoom = val; }
async function createPost() {
    // FIX: Define postInput so it can be used later to clear the box
    const postInput = document.getElementById('new-post-text'); 
    
    // 1. Get visible text
    let content = postInput.value.trim();
    
    // 2. RE-ATTACH THE HIDDEN LINK (If one exists)
    // We add it to the end so the Feed Renderer picks it up
    if (currentPreviewUrl) {
        content += "" + currentPreviewUrl;
    }

    // 3. Validation
    if(!content && postAttachments.length === 0) return;

    showToast("Posting...");

    // ... (Rest of your Size Check logic) ...
    const totalSize = JSON.stringify(postAttachments).length;
    if (totalSize > 950000) { showToast("Total size too big!", "error"); return; }

    const newPost = {
        authorId: currentUser.id,
        content: content, // This now contains Text + Hidden Link
        attachments: postAttachments, 
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        reactions: {}
    };

    try {
        const customId = `${currentUser.username}_${Date.now()}`;
        await db.collection('posts').doc(customId).set(newPost);
        
        // NOW THIS WORKS because postInput is defined above
        postInput.value = '';
        postInput.style.height = 'auto';
        
        // RESET EVERYTHING
        document.getElementById('new-post-text').value = '';
        document.getElementById('attachment-preview').innerHTML = '';
        document.getElementById('attachment-preview').classList.add('hidden');
        postAttachments = [];
        
        // Clear the hidden link logic
        hideLinkPreview(); 
        
        showToast("Vibe Posted!");
    } catch (e) {
        console.error(e);
        showToast("Error posting.", "error");
    }
}
/* --- IMGBB UPLOAD (The "TMI" Fix) --- */
const IMGBB_API_KEY = '67e7a695efab5ecf8c5983e264b260a5'; // Get from api.imgbb.com

async function handlePostFiles(files) {
    if (!files || files.length === 0) return;
    
    showToast("Uploading to cloud...", "success");
    const previewBox = document.getElementById('link-preview-area');
    previewBox.classList.remove('hidden');
    previewBox.innerHTML = `<div style="padding:10px; color:gray; font-size:12px;">Processing image...</div>`;

    const file = files[0];

    try {
        const formData = new FormData();
        formData.append("image", file);

        // ImgBB Upload Endpoint
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            const newLink = data.data.url; // ImgBB gives a direct URL

            // Trigger "Genius Mode" Input
            const textarea = document.getElementById('new-post-text');
            textarea.value = newLink; 
            handlePostInput(textarea); 

            showToast("Image attached via ImgBB!");
        } else {
            throw new Error("ImgBB Upload failed");
        }

    } catch (e) {
        console.error(e);
        showToast("Upload failed.", "error");
        previewBox.classList.add('hidden');
    }
}
function removeAttachment(name, btnEl) {
    postAttachments = postAttachments.filter(x => x.name !== name);
    btnEl.parentElement.remove();
    if(postAttachments.length === 0) document.getElementById('attachment-preview').classList.add('hidden');
}

/* --- FEED & REACTS (RESTORED NAMES) --- */
let feedUserCache = {}; 

function listenToFeed() {
    db.collection('posts').orderBy('timestamp', 'desc').limit(50).onSnapshot(async (snapshot) => {
        const container = document.getElementById('feed-container'); 
        container.innerHTML = '';
        
        // 1. SEPARATE PINNED VS NORMAL
        const pinnedDocs = [];
        const normalDocs = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            
            if (data.isPinnedGlobal) {
                pinnedDocs.push(data);
            } else {
                normalDocs.push(data);
            }
        });

        // 2. COMBINE (Pinned First)
        const sortedPosts = [...pinnedDocs, ...normalDocs];

        // 3. RENDER
        for (const p of sortedPosts) {
            let u = { displayName: 'Unknown', avatar: DEFAULT_AVATAR, id: p.authorId };
            
            if (currentUser.id === p.authorId) {
                u = currentUser; // Use local data for me
            } else {
                // --- OPTIMIZATION STARTS HERE ---
                // Check if we already have this user in memory
                if (feedUserCache[p.authorId]) {
                    u = feedUserCache[p.authorId];
                } else {
                    // If not, fetch from DB and save to cache
                    try {
                        const userDoc = await db.collection('users').doc(p.authorId).get();
                        if (userDoc.exists) {
                            u = userDoc.data();
                            feedUserCache[p.authorId] = u; // Store it!
                        }
                    } catch(e) { console.error(e); }
                }
                // --- OPTIMIZATION ENDS HERE ---
            }

            // Skip Muted
            if (isUserMuted(u) && !currentUser.isSuperAdmin) continue;

            // Render
            container.appendChild(createPostEl(p, u, false, false));
        }
        feather.replace();
    });
}

function goToProfileAndFocus(authorId, postId) {
    updateSidebar(authorId);
    router('profile');
    loadProfileFeed(authorId, postId); // This one handles the scroll
}
function createPostEl(p, u, withCheckbox, isProfileView = false) {
    // --- 1. DEFINE ICONS & LABELS ---
    const svgStyle = 'width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
    
    // NEW: Mapping internal names to Display Names
    const REACT_LABELS = {
        'like': 'LIKED!',
        'love': 'LOVE IT!',
        'joy':  'HAHAHAHA',  // <--- HERE IS THE CHANGE
        'sad':  'SO SAD :(',
        'mad':  'F!!!!!!',
        'fire': 'VIBING IT!'
    };

    const ICONS = {
        like: `<svg ${svgStyle} viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>`,
        love: `<svg ${svgStyle} class="color-love" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`,
        joy:  `<svg ${svgStyle} class="color-joy" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><path d="M9 9l.01 0"/><path d="M15 9l.01 0"/><path d="M7 8l2 2"/><path d="M9 8l-2 2"/><path d="M15 8l2 2"/><path d="M17 8l-2 2"/></svg>`,
        sad:  `<svg ${svgStyle} class="color-sad" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M16 16s-1.5-2-4-2-4 2-4 2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>`,
        mad:  `<svg ${svgStyle} class="color-mad" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M16 16s-1.5-2-4-2-4 2-4 2"></path><path d="M7.5 8l2.5 2.5"/><path d="M16.5 8l-2.5 2.5"/></svg>`,
        fire: `<svg ${svgStyle} class="color-fire" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`
    };

    // --- 2. PREPARE DATA ---
    const rawComments = p.comments || [];
    const commentCount = rawComments.length;

    const commentBtn = `
        <button class="react-btn" onclick="toggleCommentSection('${p.id}')" title="Comments">
            <i data-feather="message-square" style="width:18px"></i>
            <span style="font-size:12px; font-weight:600; margin-left:4px;">${commentCount > 0 ? commentCount : ''}</span>
        </button>
    `;

    rawComments.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const rootComments = rawComments.filter(c => !c.parentId);
    const replyMap = {};
    rawComments.forEach(c => {
        if(c.parentId) {
            if(!replyMap[c.parentId]) replyMap[c.parentId] = [];
            replyMap[c.parentId].push(c);
        }
    });

    // --- 3. RENDER ROW HELPER (UPDATED) ---
     const renderCommentRow = (c, isReply) => {
        const isOwner = currentUser.id === c.userId;
        const rowClass = isReply ? "comment-row reply-row" : "comment-row";
        const bubbleClass = isReply ? "comment-bubble reply-bubble" : "comment-bubble";
        
        let reactions = c.reactions || {};
        const myReact = reactions[currentUser.id]; 
        const reactCount = Object.keys(reactions).length;

        // [FIX 1]: Use the Map instead of just capitalizing
        let btnLabel = myReact ? (REACT_LABELS[myReact] || "Like") : "Like";

        const actions = isOwner ? `
            <div class="comment-actions">
                <button class="c-action-btn danger" onclick="deleteComment('${p.id}', '${c.cid}', '${c.timestamp}')" title="Delete">
                    <i data-feather="trash-2" style="width:10px; height:10px;"></i>
                </button>
            </div>` : ''; 
        
        const safeName = c.displayName.replace(/'/g, "\\'");

        // [FIX 2]: Ensure Tooltip says "Haha"
        return `
            <div class="${rowClass}" id="comment-row-${c.cid}">
                <img src="${c.avatar || DEFAULT_AVATAR}" class="${isReply ? 'avatar-reply' : 'avatar-xs'}">
                
                <div style="flex:1; min-width:0;">
                    <div class="${bubbleClass}">
                        <strong>${formatShortName(c.displayName)}</strong> 
                        <span id="comment-text-${c.cid}">${formatPostContent(c.text, false, c.userId)}</span>
                        ${actions}
                    </div>
                    
                    <div class="comment-footer">
                        <div class="comment-react-wrapper">
                            <button class="c-footer-btn ${myReact || ''}" onclick="reactToComment('${p.id}', '${c.cid}', 'like')">
                                ${btnLabel} ${reactCount > 0 ? `(${reactCount})` : ''}
                            </button>
                            <div class="comment-react-menu">
                                <div class="icon-opt" onclick="event.stopPropagation(); reactToComment('${p.id}', '${c.cid}', 'like')" title="Like">${ICONS['like']}</div>
                                <div class="icon-opt color-love" onclick="event.stopPropagation(); reactToComment('${p.id}', '${c.cid}', 'love')" title="Love">${ICONS['love']}</div>
                                <div class="icon-opt color-joy" onclick="event.stopPropagation(); reactToComment('${p.id}', '${c.cid}', 'joy')" title="Haha">${ICONS['joy']}</div>
                                <div class="icon-opt color-sad" onclick="event.stopPropagation(); reactToComment('${p.id}', '${c.cid}', 'sad')" title="Sad">${ICONS['sad']}</div>
                                <div class="icon-opt color-mad" onclick="event.stopPropagation(); reactToComment('${p.id}', '${c.cid}', 'mad')" title="Angry">${ICONS['mad']}</div>
                                <div class="icon-opt color-fire" onclick="event.stopPropagation(); reactToComment('${p.id}', '${c.cid}', 'fire')" title="Vibe">${ICONS['fire']}</div>
                            </div>
                        </div>
                        
                        <button class="c-footer-btn" onclick="triggerReply('${p.id}', '${isReply ? c.parentId : c.cid}', '${safeName}')">Reply</button>
                        <span>${timeAgo(new Date(c.timestamp))}</span>
                    </div>
                </div>
            </div>
        `;
    };

    // ... (Middle logic for Input Area etc remains the same) ...
    // ... (Just paste the middle part from your existing code) ...
    
    // RECONSTRUCTING THE REST FOR CONTEXT (Keep your middle code):
    let commentHTML = `<div id="comments-${p.id}" class="comment-section hidden">`;
    if (rootComments.length === 0) {
        commentHTML += `<div style="padding:10px; text-align:center; color:var(--text-muted); font-size:11px;">No comments yet.</div>`;
    } else {
        rootComments.forEach(root => {
            commentHTML += renderCommentRow(root, false);
            if (replyMap[root.cid]) {
                replyMap[root.cid].forEach(child => commentHTML += renderCommentRow(child, true));
            }
        });
    }
    
    // Check Global State (activeReplies must be defined in script.js)
    const activeReply = (typeof activeReplies !== 'undefined') ? activeReplies[p.id] : null;
    const replyClass = activeReply ? '' : 'hidden'; 
    const replyName = activeReply ? `Replying to <span>${activeReply.name}</span>` : 'Replying to...';

    commentHTML += `
        <div id="reply-indicator-${p.id}" class="reply-indicator ${replyClass}">
            <span id="reply-target-${p.id}">${replyName}</span>
            <button onclick="cancelReply('${p.id}')"><i data-feather="x" style="width:12px"></i></button>
        </div>
        <div id="preview-comment-${p.id}" class="comment-preview-area hidden"></div>
        <div class="comment-input-wrapper" id="wrap-comm-${p.id}"
             ondragover="event.preventDefault(); this.classList.add('drag-active');" 
             ondragleave="event.preventDefault(); this.classList.remove('drag-active');"
             ondrop="event.preventDefault();">
             <input type="file" id="file-comment-${p.id}" hidden accept="image/*" onchange="handleCommentFileSelect(this, '${p.id}')">
            <input type="text" id="input-comment-${p.id}" 
                   placeholder="Write a comment... (Paste/Drop images)" 
                   autocomplete="off" 
                   onkeydown="handleCommentKey(event, '${p.id}')">
            <button onclick="triggerCommentUpload('${p.id}')" style="color:var(--text-muted); margin-right:5px;" title="Attach Image">
                <i data-feather="image" style="width:14px"></i>
            </button>
            <button onclick="submitComment('${p.id}')"><i data-feather="send" style="width:14px"></i></button>
        </div>
        <script>setTimeout(() => setupCommentDrag(document.getElementById('wrap-comm-${p.id}'), document.getElementById('input-comment-${p.id}')), 500);</script>
    </div>`;

    // --- 4. MAIN CARD RENDER (UPDATED REACTION MENU) ---
    const d = document.createElement('div'); 
    d.className = 'card post-card';
    d.id = `post-card-${p.id}`; 
    // ... (Previous logic for pins/buttons) ...

    let isPinnedHere = false;
    let pinBadgeHTML = '';
    if (isProfileView) {
        if (p.isPinnedProfile) { isPinnedHere = true; pinBadgeHTML = `<div class="pinned-badge"><i data-feather="anchor" style="width:12px"></i> Pinned Post</div>`; }
    } else {
        if (p.isPinnedGlobal) { isPinnedHere = true; pinBadgeHTML = `<div class="pinned-badge"><i data-feather="globe" style="width:12px"></i> Admin Pinned</div>`; }
    }
    if (isPinnedHere) d.classList.add('pinned-post');
    const isAuthor = currentUser.id === p.authorId;
    const isAdmin = currentUser.isSuperAdmin;
    let buttonsHTML = '';
    if (isAuthor) buttonsHTML += `<button class="icon-btn btn-pin ${p.isPinnedProfile ? 'active' : ''}" onclick="togglePin('${p.id}', 'profile')" title="Pin"><i data-feather="anchor" style="width:14px"></i></button>`;
    if (isAdmin) buttonsHTML += `<button class="icon-btn btn-pin ${p.isPinnedGlobal ? 'active' : ''}" style="${p.isPinnedGlobal ? 'color:var(--primary)' : ''}" onclick="togglePin('${p.id}', 'global')" title="Pin Global"><i data-feather="globe" style="width:14px"></i></button>`;
    if (isAuthor) {
        buttonsHTML += `
            <button id="btn-edit-${p.id}" class="icon-btn" onclick="togglePostEdit('${p.id}', true)"><i data-feather="edit-2" style="width:14px"></i></button>
            <div id="btn-group-save-${p.id}" class="hidden" style="display:flex; gap:2px;">
                <button class="icon-btn" style="color:var(--danger)" onclick="togglePostEdit('${p.id}', false)"><i data-feather="x" style="width:14px"></i></button>
                <button class="icon-btn" style="color:var(--success)" onclick="savePostEdit('${p.id}')"><i data-feather="check" style="width:14px"></i></button>
            </div>
        `;
    }
    if (isAuthor || isAdmin) buttonsHTML += `<button id="btn-del-${p.id}" class="icon-btn" style="${isAdmin && !isAuthor ? 'color:red;' : ''}" onclick="deletePost('${p.id}')"><i data-feather="trash-2" style="width:14px"></i></button>`;

    let attachHTML = '';
    if (p.attachments && p.attachments.length > 0) {
        attachHTML = `<div class="attachment-grid">`;
        p.attachments.forEach(a => {
            if (a.type === 'img') {
                const clickAction = isProfileView ? `openLightbox('${a.data}')` : `goToProfileAndFocus('${p.authorId}', '${p.id}')`;
                attachHTML += `<div class="attach-item" style="cursor:pointer" onclick="event.stopPropagation(); ${clickAction}"><img src="${a.data}"></div>`;
            } else {
                attachHTML += `<div class="attach-item"><div class="attach-file"><i data-feather="file"></i><span>${a.name}</span></div></div>`;
            }
        });
        attachHTML += `</div>`;
    }

    const reacts = p.reactions || {};
    const count = Object.keys(reacts).length;
    const myReactEntry = reacts[currentUser.id];
    let myReactType = myReactEntry ? (typeof myReactEntry === 'string' ? myReactEntry : myReactEntry.emoji) : null;
    const getIcon = (type) => ICONS[type] || ICONS['like'];
    const iconDisplay = myReactType ? getIcon(myReactType) : ICONS['like'];
    const contentHTML = formatPostContent(p.content, isProfileView, p.authorId, p.id);

    // [FIX 3]: Ensure main post menu also says "Haha"
    d.innerHTML = `
        ${pinBadgeHTML}
        
        <div class="post-header">
            <div style="display:flex; gap:10px; align-items:center;">
                <img src="${u.avatar || DEFAULT_AVATAR}" class="avatar-sm" style="cursor:pointer;" onclick="viewProfile('${u.id}')">
                <div class="post-meta">
                    <div onclick="viewProfile('${u.id}')" style="font-weight:700; cursor:pointer" title="${u.displayName}">${formatShortName(u.displayName)}</div>
                    <span>${p.timestamp ? timeAgo(p.timestamp.toDate()) : 'Just now'} ${p.isEdited ? '<span style="font-size:10px; opacity:0.6">(edited)</span>' : ''}</span>
                </div>
            </div>
            <div style="display:flex; gap:5px; align-items:center;">${buttonsHTML}</div>
        </div>
        
        <div id="post-content-${p.id}" class="post-content">${contentHTML}</div>
        ${attachHTML}
        
        <div class="reaction-area">
            <div class="react-wrapper">
                <div class="like-group" style="position: relative; display: flex; align-items: center;">
                    <button class="react-btn ${myReactType ? 'active' : ''}" onclick="react('${p.id}', 'like')">${iconDisplay}</button>
                    <div class="react-menu">
                        <div class="icon-opt" onclick="event.stopPropagation(); react('${p.id}','like')" title="Like">${ICONS['like']}</div>
                        <div class="icon-opt color-love" onclick="event.stopPropagation(); react('${p.id}','love')" title="Love">${ICONS['love']}</div>
                        <div class="icon-opt color-joy" onclick="event.stopPropagation(); react('${p.id}','joy')" title="Haha">${ICONS['joy']}</div>
                        <div class="icon-opt color-sad" onclick="event.stopPropagation(); react('${p.id}','sad')" title="Sad">${ICONS['sad']}</div>
                        <div class="icon-opt color-mad" onclick="event.stopPropagation(); react('${p.id}','mad')" title="Angry">${ICONS['mad']}</div>
                        <div class="icon-opt color-fire" onclick="event.stopPropagation(); react('${p.id}','fire')" title="Vibe">${ICONS['fire']}</div>
                    </div>
                </div>
                ${commentBtn}
            </div>
            ${count > 0 ? `<div class="react-count-link" onclick="openReactionList('${p.id}')">${count} <div class="simple-tooltip">${count} reacted</div></div>` : ''}
        </div>

        ${commentHTML}
    `;
    
    // Attach listeners manually
    const inputEl = d.querySelector(`#input-comment-${p.id}`);
    const wrapEl = d.querySelector(`#wrap-comm-${p.id}`);
    if (inputEl && wrapEl) {
        setupCommentDrag(wrapEl, inputEl);
    }

    return d;
}


// 3. INIT EDIT (Turn Text into Input)
function initEditComment(postId, commentId) {
    const textSpan = document.getElementById(`comment-text-${commentId}`);
    const currentText = textSpan.innerText; // Get raw text
    
    // Replace span with input
    textSpan.innerHTML = `
        <input type="text" id="edit-input-${commentId}" class="mini-input" value="${currentText}" 
               onkeydown="handleEditKey(event, '${postId}', '${commentId}')">
        <div style="font-size:9px; color:var(--text-muted); margin-top:2px;">Press Enter to Save, Esc to Cancel</div>
    `;
    
    const input = document.getElementById(`edit-input-${commentId}`);
    input.focus();
}

// 4. HANDLE EDIT KEYPRESS
function handleEditKey(e, postId, commentId) {
    if (e.key === 'Escape') {
        // Cancel: Just reload the post/comments (simplest way to revert UI)
        // Or manually set innerHTML back. But for now, user can just refresh.
        showToast("Edit cancelled");
        return; 
    }
    if (e.key === 'Enter') {
        saveEditedComment(postId, commentId);
    }
}

// 5. SAVE EDIT (Update)
async function saveEditedComment(postId, commentId) {
    const input = document.getElementById(`edit-input-${commentId}`);
    const newText = input.value.trim();
    if(!newText) return showToast("Comment cannot be empty", "error");

    try {
        const docRef = db.collection('posts').doc(postId);
        const doc = await docRef.get();
        if(!doc.exists) return;

        let comments = doc.data().comments || [];
        
        // Find and Update the specific object in the array
        comments = comments.map(c => {
            if (c.cid === commentId) {
                return { ...c, text: newText }; // Update text
            }
            return c;
        });

        await docRef.update({ comments: comments });
        showToast("Comment updated");
    } catch (e) {
        showToast("Error updating", "error");
    }
}
function toggleReplyBox(commentId) {
    const box = document.getElementById(`reply-box-${commentId}`);
    if (box) {
        box.classList.toggle('hidden');
        if (!box.classList.contains('hidden')) {
            const input = document.getElementById(`input-reply-${commentId}`);
            if(input) input.focus();
        }
    }
}

// 2. HANDLE REPLY KEY
function handleReplyKey(e, postId, parentId) {
    if (e.key === 'Enter') submitReply(postId, parentId);
}

// 3. SUBMIT REPLY (Same as Comment, but with parentId)
async function submitReply(postId, parentId) {
    const input = document.getElementById(`input-reply-${parentId}`);
    const text = input.value.trim();
    if (!text) return;

    const newReply = {
        cid: generateId(),
        parentId: parentId, // <--- THE KEY LINK
        userId: currentUser.id,
        displayName: currentUser.displayName,
        avatar: currentUser.avatar,
        text: text,
        timestamp: new Date().toISOString(),
        likes: [] // Init empty likes
    };

    try {
        await db.collection('posts').doc(postId).update({
            comments: firebase.firestore.FieldValue.arrayUnion(newReply)
        });
        input.value = '';
        toggleReplyBox(parentId); // Hide box after sending
        showToast("Reply sent");
    } catch (e) {
        console.error(e);
        showToast("Error replying", "error");
    }
}


// 1. Toggle Visibility of Comment Section
function toggleCommentSection(postId) {
    const el = document.getElementById(`comments-${postId}`);
    if (el) {
        el.classList.toggle('hidden');
        // Auto focus input when opened
        if (!el.classList.contains('hidden')) {
            const input = document.getElementById(`input-comment-${postId}`);
            if(input) input.focus();
        }
    }
}

// 2. Handle Enter Key
function handleCommentKey(e, postId) {
    if (e.key === 'Enter') submitComment(postId);
}


let originalPostTexts = {}; 

function togglePostEdit(pid, enable) {
    const contentEl = document.getElementById(`post-content-${pid}`);
    const btnEdit = document.getElementById(`btn-edit-${pid}`);
    const btnDel = document.getElementById(`btn-del-${pid}`);
    const groupSave = document.getElementById(`btn-group-save-${pid}`);
    
    if (!contentEl) return;

    if (enable) {
        // --- START EDITING ---
        // 1. Save original HTML (to revert if canceled)
        originalPostTexts[pid] = contentEl.innerHTML;
        
        // 2. Set text to raw for editing (strips links temporarily)
        contentEl.innerText = contentEl.innerText; 
        
        // 3. Make Editable & Style
        contentEl.contentEditable = "true";
        contentEl.focus();
        contentEl.classList.add('editing-post'); // Adds dashed border/bg
        
        // 4. Swap Icons
        if(btnEdit) btnEdit.classList.add('hidden'); // Hide Pen
        if(btnDel) btnDel.classList.add('hidden');   // Hide Trash
        if(groupSave) groupSave.classList.remove('hidden'); // Show Check & X
        
    } else {
        // --- CANCEL EDITING ---
        // 1. Restore original HTML
        if (originalPostTexts[pid] !== undefined) {
            contentEl.innerHTML = originalPostTexts[pid];
        }
        
        // 2. Lock & Unstyle
        contentEl.contentEditable = "false";
        contentEl.classList.remove('editing-post');
        
        // 3. Swap Icons Back
        if(btnEdit) btnEdit.classList.remove('hidden'); // Show Pen
        if(btnDel) btnDel.classList.remove('hidden');   // Show Trash
        if(groupSave) groupSave.classList.add('hidden'); // Hide Check & X
    }
}

async function savePostEdit(pid) {
    const contentEl = document.getElementById(`post-content-${pid}`);
    const newText = contentEl.innerText.trim(); 
    
    if (!newText) return showToast("Post cannot be empty", "error");

    try {
        await db.collection('posts').doc(pid).update({
            content: newText,
            isEdited: true
        });
        showToast("Post updated");
        // We don't need to manually toggle back; the realtime listener 
        // will refresh the card with the new content instantly.
    } catch (e) {
        console.error(e);
        showToast("Error updating", "error");
    }
}
async function react(pid, type) {
    const postRef = db.collection('posts').doc(pid);
    const doc = await postRef.get();
    if (doc.exists) {
        const reacts = doc.data().reactions || {};
        
        // Check existing
        const currentData = reacts[currentUser.id];
        const currentType = (typeof currentData === 'string') ? currentData : (currentData?.emoji);

        if (currentType === type) {
            delete reacts[currentUser.id]; // Toggle off
        } else {
            // Save Name & Type
            reacts[currentUser.id] = { 
                emoji: type, // 'like', 'love', 'fire', 'laugh'
                name: currentUser.displayName 
            };
        }
        await postRef.update({ reactions: reacts });
    }
}
function deletePost(pid) {
    customConfirm("Delete this vibe permanently?", async () => {
        await db.collection('posts').doc(pid).delete();
        showToast("Deleted");
    });
}
/* --- REACTION SPOTLIGHT MODAL --- */

async function openReactionList(postId) {
    // 1. Show Loading state
    openModal('reaction-modal');
    const listContainer = document.getElementById('reaction-list-content');
    listContainer.innerHTML = '<div style="padding:20px; text-align:center; color:gray">Loading vibes...</div>';

    try {
        // 2. Fetch Post Data
        const doc = await db.collection('posts').doc(postId).get();
        if (!doc.exists) return;

        const reactions = doc.data().reactions || {};
        const userIds = Object.keys(reactions);

        if (userIds.length === 0) {
            listContainer.innerHTML = '<div style="padding:20px; text-align:center;">No reactions yet.</div>';
            return;
        }

        listContainer.innerHTML = ''; // Clear loading

        // 3. Process Each Reaction
        // We use map to process them all, but we also need to fetch Avatars if not stored
        // To keep it fast, we'll try to use stored data if you have it, or just generic placeholders if complex
        
        for (const uid of userIds) {
            const r = reactions[uid];
            
            // Normalize data (handle old string format vs new object format)
            const type = (typeof r === 'string') ? r : r.emoji;
            const name = (typeof r === 'string') ? 'User' : (r.name || 'User');
            
            // Map text types to Emojis for display
            const emojiMap = {
                'like': '👍', 'love': '❤️', 'joy': '😂', 
                'sad': '😢', 'mad': '😡', 'fire': '🔥'
            };
            const displayEmoji = emojiMap[type] || type || '👍';

            // We need to fetch the avatar for the modal to look good
            // (Optional: You could store avatar in the reaction object to save this read)
            let avatarSrc = DEFAULT_AVATAR;
            try {
                const uDoc = await db.collection('users').doc(uid).get();
                if(uDoc.exists) avatarSrc = uDoc.data().avatar || DEFAULT_AVATAR;
            } catch(e) { console.log('Error fetching avatar', e); }

            // 4. Render Row
            const row = document.createElement('div');
            row.className = 'reaction-row';
            row.innerHTML = `
                <div class="react-user-left">
                    <img src="${avatarSrc}" class="avatar-sm" style="cursor:pointer" onclick="closeModal('reaction-modal'); viewProfile('${uid}')">
                    <div style="font-weight:600; font-size:13px; cursor:pointer" onclick="closeModal('reaction-modal'); viewProfile('${uid}')">${name}</div>
                </div>
                <div class="react-emoji-display">${displayEmoji}</div>
            `;
            listContainer.appendChild(row);
        }

    } catch (err) {
        console.error(err);
        listContainer.innerHTML = '<div style="padding:10px; color:red">Error loading list.</div>';
    }
}
/* --- NETWORK & SEARCH (FIXED) --- */
// FIX: listenToNetwork is now defined
function listenToNetwork() {
    // Real-time listener on MY user profile to detect friend list changes
    db.collection('users').doc(currentUser.id).onSnapshot(doc => {
        if (!doc.exists) return;
        
        // Update local state
        currentUser = doc.data(); 
        currentUser.id = doc.id;
        
        // If I am currently looking at the Network Page, refresh the grid immediately
        if (document.querySelector('[data-target="network"]').classList.contains('active')) {
            renderNetwork();
        }
        
        // Also update the sidebar count immediately
        const countEl = document.getElementById('side-friends-count');
        if (countEl) countEl.innerText = (currentUser.friends || []).length;
    });
}
function toggleAdminMonitor() {
    if (!currentUser.isSuperAdmin) return;
    
    // Toggle the class on the body
    document.body.classList.toggle('admin-monitor-mode');
    
    // Refresh Feather Icons (in case layout shift breaks svg sizing)
    setTimeout(() => feather.replace(), 100);
    
    const isMonitor = document.body.classList.contains('admin-monitor-mode');
    showToast(isMonitor ? "Monitor Mode: ON" : "Monitor Mode: OFF");
}
async function renderNetwork() {
    const page = document.getElementById('page-network');
    
    // 1. Force Monitor Mode CSS (for the 7-grid layout)
    document.body.classList.add('admin-monitor-mode');
    
    // 2. Create the Layout Structure (Two BIG CARDS)
    page.innerHTML = `
        <div class="network-header">
            <h2>Network Hub</h2>
        </div>

        <!-- PANEL 1: CONNECTED (Big Card) -->
        <div class="big-panel-card">
            <h3><i data-feather="users" style="width:14px"></i> Connected Vibes</h3>
            <div id="connected-grid" class="monitor-grid">
                <div style="grid-column:1/-1; text-align:center; color:gray; font-size:11px;">Loading connections...</div>
            </div>
        </div>

        <!-- PANEL 2: DIRECTORY (Big Card) -->
        <div class="big-panel-card">
            <h3><i data-feather="globe" style="width:14px"></i> Global Directory</h3>
            <div id="directory-grid" class="monitor-grid">
                <div style="grid-column:1/-1; text-align:center; color:gray; font-size:11px;">Loading directory...</div>
            </div>
        </div>
    `;

    // 3. Render Connected Panel (Panel 1)
    const connGrid = document.getElementById('connected-grid');
    connGrid.innerHTML = '';
    
    const friendsList = currentUser.friends || [];
    
    if (friendsList.length === 0) {
        connGrid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:20px; color:gray;">No active connections yet.</div>';
    } else {
        for (const fid of friendsList) {
            try {
                const doc = await db.collection('users').doc(fid).get();
                if (doc.exists) {
                    const u = doc.data();
                    if (!u.isDeactivated) {
                        connGrid.appendChild(createNetworkCard(u, true)); 
                    }
                } else {
                    // --- SELF HEALING FIX ---
                    // If doc doesn't exist, remove it immediately from DB
                    db.collection('users').doc(currentUser.id).update({
                        friends: firebase.firestore.FieldValue.arrayRemove(fid)
                    });
                }
            } catch (e) { console.error(e); }
        }
    }

    // 4. Render Directory Panel (Panel 2) - Excludes friends
    renderDirectoryPanel(friendsList);
    feather.replace();
}

// Separate function for Real-time Directory to avoid mess
let dirUnsubscribe = null;
function renderDirectoryPanel(excludeIds) {
    const dirGrid = document.getElementById('directory-grid');
    
    if (dirUnsubscribe) { dirUnsubscribe(); dirUnsubscribe = null; }

    dirUnsubscribe = db.collection('users').limit(100).onSnapshot(snap => {
        dirGrid.innerHTML = '';
        
        snap.forEach(doc => {
            const u = doc.data();
            u.id = doc.id;

            // FILTERS:
            if (u.id === currentUser.id) return; // Not me
            if (u.isDeactivated) return; // Not deactivated
            if (excludeIds.includes(u.id)) return; // NOT in Connected Panel (Prevents Duplicate)

            // Pass false for "isConnected"
            dirGrid.appendChild(createNetworkCard(u, false));
        });

        if (dirGrid.children.length === 0) {
            dirGrid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:20px; color:gray;">No new users found.</div>';
        }
        feather.replace();
    });
}

function createNetworkCard(u, isConnected) {
    const d = document.createElement('div');
    d.className = 'suggestion-item'; 
    const avatarSrc = u.avatar || DEFAULT_AVATAR;
    
    let btns = '';
    
    // --- 1. ADMIN VIEW (Keep the Grid) ---
    if (currentUser.isSuperAdmin) {
         const isMuted = isUserMuted(u);
         const isMod = u.isModerator === true;
         const muteClass = isMuted ? 'active-mute' : '';
         const modStyle = isMod ? 'background:var(--primary); color:white; border-color:var(--primary);' : '';
         
         btns = `
            <div class="admin-action-grid">
                <button class="mini-circle-btn primary" title="Chat" onclick="startChat('${u.id}')"><i data-feather="message-circle"></i></button>
                <button class="mini-circle-btn ${muteClass}" title="Mute" onclick="${isMuted ? `liftSuspension('${u.id}')` : `openMuteModal('${u.id}')`}"><i data-feather="${isMuted ? 'mic' : 'mic-off'}"></i></button>
                <button class="mini-circle-btn" style="${modStyle}" title="Mod" onclick="toggleModerator('${u.id}', ${!isMod})"><i data-feather="${isMod ? 'shield-off' : 'shield'}"></i></button>
                <button class="mini-circle-btn danger" title="Delete" onclick="adminNukeUser('${u.id}')"><i data-feather="trash-2"></i></button>
            </div>`;
    } 
    // --- 2. NORMAL USER VIEW (Use New Flex Class) ---
    else {
        const icon = isConnected ? 'user-minus' : 'user-plus';
        const color = isConnected ? 'danger' : 'success';
        const func = isConnected ? `removeFriend('${u.id}')` : `addFriend('${u.id}')`;
        const title = isConnected ? "Disconnect" : "Connect";
        
        // Use the new class 'network-user-actions'
        btns = `
            <div class="network-user-actions">
                <button class="mini-circle-btn primary" title="Chat" onclick="startChat('${u.id}')"><i data-feather="message-circle"></i></button>
                <button class="mini-circle-btn ${color}" title="${title}" onclick="${func}"><i data-feather="${icon}"></i></button>
            </div>
        `;
    }

    d.innerHTML = `
        <img src="${avatarSrc}" class="avatar-sm" onclick="viewProfile('${u.id}')">
        <div>
            <div style="font-weight:800; font-size:12px; cursor:pointer;" onclick="viewProfile('${u.id}')" title="${u.displayName}">
                ${formatShortName(u.displayName)}
            </div>
            <div style="font-size:9px; color:var(--text-muted); margin-top:4px; background:rgba(0,0,0,0.05); padding:2px 6px; border-radius:4px; display:inline-block;" title="${u.account || u.username}">
                ${formatShortAccount(u.account || u.username)}
            </div>
        </div>
        ${btns}
    `;
    return d;
}
function addFriend(targetId) {
    const btn = event.target.closest('button');
    if(btn && btn.closest('.suggestion-item')) btn.closest('.suggestion-item').style.display = 'none';

    db.collection('users').doc(currentUser.id).update({ friends: firebase.firestore.FieldValue.arrayUnion(targetId) });
    db.collection('users').doc(targetId).update({ friends: firebase.firestore.FieldValue.arrayUnion(currentUser.id) });
    showToast("Connected!");
    if(document.querySelector(`[onclick="viewProfile('${targetId}')"]`)) updateSidebar(targetId);
}

function removeFriend(targetId) {
    customConfirm("Disconnect from this user?", () => {
        db.collection('users').doc(currentUser.id).update({ friends: firebase.firestore.FieldValue.arrayRemove(targetId) });
        db.collection('users').doc(targetId).update({ friends: firebase.firestore.FieldValue.arrayRemove(currentUser.id) });
        showToast("Disconnected");
        updateSidebar(targetId);
    });
}

let suggestionsUnsubscribe = null; // Store the listener to prevent duplicates

function renderSuggestions() {
    const l = document.getElementById('suggestions-list'); 
    
    // TWEAK: Hide Directory Box on Mobile
    if (l) {
        const card = l.closest('.card');
        if (card) {
            // If screen is less than 768px, hide it
            if (window.innerWidth <= 768) card.style.display = 'none';
            else card.style.display = 'block';
        }
    }

    if (suggestionsUnsubscribe) { suggestionsUnsubscribe(); suggestionsUnsubscribe = null; }
    l.innerHTML = '<div style="padding:10px;text-align:center;color:gray;">Loading...</div>';
    
    suggestionsUnsubscribe = db.collection('users').limit(100).onSnapshot(snap => {
         l.innerHTML = ''; 
         snap.forEach(doc => {
     const u = doc.data(); 
     u.id = doc.id;

     // Ghost User Check
     if (!u.displayName || u.displayName.trim() === "" || u.username === "undefined") {
         db.collection('users').doc(u.id).delete();
         return; 
     }

     if (currentUser && u.id === currentUser.id) return;
     if (u.isDeactivated) return;

     const avatarSrc = u.avatar || DEFAULT_AVATAR;
     const d = document.createElement('div'); 
     d.className = 'suggestion-item';
     
     let actionBtns = '';

     // --- 1. ADMIN VIEW (Restore the 4 Buttons) ---
     if(currentUser.isSuperAdmin) {
         const isMuted = isUserMuted(u);
         const isMod = u.isModerator === true;
         const muteClass = isMuted ? 'active-mute' : '';
         const modStyle = isMod ? 'background:var(--primary); color:white; border-color:var(--primary);' : '';

         actionBtns = `
            <div class="admin-action-grid">
                <button class="mini-circle-btn primary" title="Chat" onclick="startChat('${u.id}')"><i data-feather="message-circle"></i></button>
                <button class="mini-circle-btn ${muteClass}" title="Mute" onclick="${isMuted ? `liftSuspension('${u.id}')` : `openMuteModal('${u.id}')`}"><i data-feather="${isMuted ? 'mic' : 'mic-off'}"></i></button>
                <button class="mini-circle-btn" style="${modStyle}" title="Mod" onclick="toggleModerator('${u.id}', ${!isMod})"><i data-feather="${isMod ? 'shield-off' : 'shield'}"></i></button>
                <button class="mini-circle-btn danger" title="Delete" onclick="adminNukeUser('${u.id}')"><i data-feather="trash-2"></i></button>
            </div>`;
     } 
     // --- 2. NORMAL VIEW (Flex Layout) ---
     else {
         const isFriend = (currentUser.friends || []).includes(u.id);
         actionBtns = `
            <div style="display:flex; justify-content:center; gap:8px; margin-top:5px;">
                <button class="mini-circle-btn primary" onclick="startChat('${u.id}')"><i data-feather="message-circle"></i></button>
                <button class="mini-circle-btn ${isFriend?'danger':'success'}" onclick="${isFriend?`removeFriend('${u.id}')`:`addFriend('${u.id}')`}"><i data-feather="${isFriend?'user-minus':'user-plus'}"></i></button>
            </div>`;
     }

     // Use formatShortName/formatShortAccount here too
     d.innerHTML = `
        <img src="${avatarSrc}" class="avatar-sm" onclick="viewProfile('${u.id}')">
        <div style="width:100%; text-align:center;">
            <div style="font-weight:bold; font-size:11px; cursor:pointer" title="${u.displayName}">${formatShortName(u.displayName)}</div>
            <div style="font-size:9px; color:var(--text-muted)" title="${u.account || u.username}">${formatShortAccount(u.account || u.username)}</div>
        </div>
        ${actionBtns}
     `;
     l.appendChild(d);
});
feather.replace();
    });
}
async function toggleModerator(targetUid, makeMod) {
    if (!currentUser.isSuperAdmin) return; 

    const action = makeMod ? "Promote to Moderator" : "Demote to User";
    
    // We pass 'false' to renderSuggestions() if it takes args, or just call it
    // But since customConfirm is async callback based:
    customConfirm(`Are you sure you want to ${action}?`, async () => {
        try {
            await db.collection('users').doc(targetUid).update({
                isModerator: makeMod
            });
            
            showToast(makeMod ? "User Promoted! 🛡️" : "User Demoted.");
            
            // REFRESH BOTH VIEWS
            updateSidebar(targetUid); // If you are looking at their profile
            renderSuggestions();      // If you are looking at the directory
            
        } catch (e) {
            console.error(e);
            showToast("Error updating role", "error");
        }
    });
}
async function handleGlobalSearch(query) {
    const box = document.getElementById('search-results');
    const inputField = document.querySelector('.search-container input'); 

    // 1. Hide if empty
    if (!query || query.trim() === "") {
        if(box) {
            box.classList.add('hidden');
            box.innerHTML = '';
        }
        return;
    }

    if (!box) return;

    // 2. Show Loading
    box.classList.remove('hidden');
    box.innerHTML = '<div style="padding:15px; text-align:center; color:gray; font-size:12px;">Searching...</div>';

    try {
        // 3. Search Query -> SWITCHED TO 'displayName'
        // Note: This is Case Sensitive. "John" will find "John", but "john" might not.
        const snapshot = await db.collection('users')
            .where('displayName', '>=', query)
            .where('displayName', '<=', query + '\uf8ff')
            .limit(20)
            .get();

        box.innerHTML = ''; 

        if (snapshot.empty) {
            box.innerHTML = '<div style="padding:15px; text-align:center; font-size:12px; color:gray">No users found</div>';
            return;
        }

        // 4. Render Results
        snapshot.forEach(doc => {
            const u = doc.data();
            u.id = doc.id;

            if (u.isDeactivated) return;

            const avatarSrc = u.avatar || DEFAULT_AVATAR;
            
            // Check relationships
            const isMe = (currentUser && currentUser.id === u.id);
            const isFriend = (currentUser && currentUser.friends && currentUser.friends.includes(u.id));
            const isMuted = isUserMuted(u);
            // Visual Badges
            let badge = '';
            let visualClass = '';
            if (isMuted) {
        // PRIORITY BADGE: Overrides "Connected"
        badge = '<span class="badge-muted">MUTED</span>';
        visualClass = 'muted-visual'; // Applies Greyscale
    } else if (isMe) {
        badge = '<span style="font-size:10px; background:var(--primary); color:white; padding:2px 6px; border-radius:4px; font-weight:bold;">YOU</span>';
    } else if (isFriend) {
        badge = '<span style="font-size:10px; color:var(--success); border:1px solid var(--success); padding:1px 5px; border-radius:4px;">Connected</span>';
    }

    const div = document.createElement('div');
    div.className = 'drop-item';
    
    // Apply visual greyscale to the whole row content if muted
    div.innerHTML = `
        <img src="${avatarSrc}" class="avatar-sm ${visualClass}" style="margin-right:10px;">
        
        <div style="flex-grow: 1; min-width: 0; ${isMuted ? 'opacity: 0.6;' : ''}">
            <div style="font-weight:700; font-size:14px; color:var(--text-main); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                ${u.displayName || 'Unnamed Vibe'}
            </div>
            <div style="font-size:11px; color:var(--text-muted); display:flex; gap:5px; align-items:center;">
                <span>@${u.username}</span>
            </div>
        </div>
        
        <div style="margin-left:10px;">${badge}</div>
    `;

            div.onclick = () => {
                viewProfile(u.id);
                box.classList.add('hidden'); 
                if (inputField) inputField.value = ''; 
            };
            
            box.appendChild(div);
        });

    } catch (e) {
        console.error("Search Error:", e);
        box.innerHTML = '<div style="padding:10px; color:red; font-size:12px;">Error searching</div>';
    }
}
window.addEventListener('click', (e) => {
    const searchContainer = document.querySelector('.search-container');
    const results = document.getElementById('search-results');
    
    // If click is OUTSIDE the search container, hide results
    if (searchContainer && !searchContainer.contains(e.target)) {
        if(results) results.classList.add('hidden');
    }
});
/* --- PROFILE --- */
async function viewProfile(uid) {
    await updateSidebar(uid);
    router('profile');
    loadProfileFeed(uid);
}

async function loadProfileFeed(uid, focusPostId = null) {
    const cont = document.getElementById('profile-feed-container'); 
    
    if (profileFeedUnsubscribe) { profileFeedUnsubscribe(); profileFeedUnsubscribe = null; }

    cont.innerHTML = '<div style="padding:20px;text-align:center">Loading vibes...</div>';
    
    // Fetch User Data first (Optimization)
    let profileUser = null;
    if (uid === currentUser.id) profileUser = currentUser;
    else {
        const doc = await db.collection('users').doc(uid).get();
        profileUser = doc.exists ? doc.data() : { displayName:'User', avatar:DEFAULT_AVATAR };
        profileUser.id = uid;
    }

    profileFeedUnsubscribe = db.collection('posts')
        .where('authorId', '==', uid)
        .orderBy('timestamp', 'desc')
        .onSnapshot(snap => {
            cont.innerHTML = ''; 
            
            // 1. SEPARATE PINNED VS NORMAL
            const pinnedDocs = [];
            const normalDocs = [];

            snap.forEach(doc => {
                const p = doc.data();
                p.id = doc.id;
                
                // For Profile Feed, we look for 'isPinnedProfile'
                if (p.isPinnedProfile) {
                    pinnedDocs.push(p);
                } else {
                    normalDocs.push(p);
                }
            });

            // 2. COMBINE
            const sortedPosts = [...pinnedDocs, ...normalDocs];

            if (sortedPosts.length === 0) {
                cont.innerHTML = '<div style="padding:20px;text-align:center">No vibes yet.</div>'; 
                return;
            }

            // 3. RENDER
            sortedPosts.forEach(p => {
                // Pass true for isProfileView
                const el = createPostEl(p, profileUser, true, true); 
                
                if (focusPostId && p.id === focusPostId) {
                    el.style.border = "2px solid var(--primary)";
                    el.id = `post-${p.id}`; 
                }
                
                cont.appendChild(el);
            });

            // Focus Logic
            if (focusPostId) {
                setTimeout(() => {
                    const targetEl = document.getElementById(`post-${focusPostId}`);
                    if (targetEl) {
                        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        setTimeout(() => targetEl.style.border = "none", 2000);
                    }
                    focusPostId = null; 
                }, 800);
            }
            
            feather.replace();
        });
}
async function startChat(targetUid) {
    if (targetUid === currentUser.id) return;
    
    const doc = await db.collection('users').doc(targetUid).get();
    if (!doc.exists) return;
    const targetUser = doc.data(); 
    targetUser.id = targetUid;
    
    addToDock(targetUser); 
    activeChatTargetId = targetUid; 
    activeChatTargetUsername = targetUser.username; // Capture Username
    updateDockVisuals();

    const chatWindow = document.getElementById('chat-window');
    chatWindow.innerHTML = `
        <div class="chat-header" onclick="closeChat()">
            <div class="chat-user-info">
                <img id="chat-header-img" src="${targetUser.avatar || DEFAULT_AVATAR}">
                <div class="chat-status"><span id="chat-header-name" title="${targetUser.displayName}">
    ${formatShortName(targetUser.displayName)}
</span></div>            </div>
            <div class="chat-controls">
                <button class="icon-btn-tiny" onclick="event.stopPropagation(); toggleChatEdit(true)"><i data-feather="edit-2" style="width:14px"></i></button>
                <button class="icon-btn-tiny" onclick="event.stopPropagation(); closeChat()"><i data-feather="x" style="width:16px"></i></button>
            </div>
        </div>
        <div id="chat-body" class="chat-body"></div>
        <div id="chat-footer-area" class="dock-input-area">${getChatInputHTML()}</div>
    `;

    const dockItem = document.getElementById(`dock-${targetUid}`);
    if (window.innerWidth > 768 && dockItem) positionChatWindow(dockItem);
    else { chatWindow.style.top = ''; chatWindow.style.left = ''; chatWindow.style.right = ''; chatWindow.style.bottom = ''; }

    chatWindow.classList.remove('hidden');
    chatWindow.style.visibility = "visible";
    
    // Pass Username to subscriber
    subscribeToChat(targetUid, targetUser.username); 
    setupChatMediaListeners(); // Enable ImgBB Drag/Paste
    feather.replace();
    setTimeout(() => { const input = document.getElementById('chat-input'); if(input) input.focus(); }, 100);
}


function getChatInputHTML() {
    return `
        <input type="file" id="chat-file-input" hidden accept="image/*" onchange="handleChatFileSelect(this)">
        <div style="display:flex; width:100%; align-items:center; gap:5px;">
            <input type="text" id="chat-input" class="dock-input" placeholder="Type a message..." autocomplete="off" onkeypress="handleChatKey(event)">
            <button class="icon-btn-tiny" onclick="triggerChatUpload()" title="Send Image" style="color:var(--text-muted);">
                <i data-feather="image" style="width:18px; height:18px;"></i>
            </button>
            <button class="send-dock-btn" onclick="sendMessage()"><i data-feather="arrow-up"></i></button>
        </div>
    `;
}
function positionChatWindow(headEl) {
    const win = document.getElementById('chat-window');
    const headRect = headEl.getBoundingClientRect();
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    
    // 1. Reset ALL positioning styles to avoid conflicts
    win.style.top = ''; 
    win.style.bottom = ''; 
    win.style.left = ''; 
    win.style.right = '';
    
    // Clear old animation classes
    win.classList.remove('pop-ul', 'pop-ur', 'pop-dl', 'pop-dr');

    // --- HORIZONTAL LOGIC (Left vs Right) ---
    const isRightSide = headRect.left > (screenW / 2);
    
    if (isRightSide) {
        // Bubble on Right -> Expand LEFT
        const spaceFromRight = screenW - headRect.left + 15; // 15px gap
        win.style.right = spaceFromRight + 'px';
    } else {
        // Bubble on Left -> Expand RIGHT
        const spaceFromLeft = headRect.right + 15;
        win.style.left = spaceFromLeft + 'px';
    }

    // --- VERTICAL LOGIC (Top vs Bottom) ---
    const isTopHalf = headRect.top < (screenH / 2);

    if (isTopHalf) {
        // Bubble in Top Half -> Expand DOWNWARDS
        // Align Top of window with Top of bubble
        let topPos = headRect.top;
        
        // Safety: Don't let it go off-screen if bubble is SUPER high
        if (topPos < 10) topPos = 10; 
        
        win.style.top = topPos + 'px';

        // Set Animation Origin
        if (isRightSide) win.classList.add('pop-dl'); // Down-Left
        else win.classList.add('pop-dr'); // Down-Right

    } else {
        // Bubble in Bottom Half -> Expand UPWARDS
        // Align Bottom of window with Bottom of bubble
        let bottomPos = screenH - headRect.bottom;
        
        // Safety: Don't let it go off-screen if bubble is SUPER low
        if (bottomPos < 10) bottomPos = 10;

        win.style.bottom = bottomPos + 'px';

        // Set Animation Origin
        if (isRightSide) win.classList.add('pop-ul'); // Up-Left
        else win.classList.add('pop-ur'); // Up-Right
    }
}


// Helper to snap back to layout
function returnToDock(el) {
    const dock = document.getElementById('chat-dock');
    
    // 1. Animate towards the dock position (Optional polish)
    // For now, we just snap it back to ensure responsiveness works immediately
    
    // 2. Clear Inline Styles (Removes the fixed/left/top issues)
    el.style.position = '';
    el.style.left = '';
    el.style.top = '';
    el.style.width = '';
    el.style.height = '';
    el.style.zIndex = '';
    
    // 3. Put back in container
    // Use prepend to keep newest on top/bottom depending on your CSS
    dock.appendChild(el); 
}
async function deactivateAccount() {
    customConfirm("Deactivate your account? You will be hidden until you log back in.", async () => {
        try {
            // Set flag in database
            await db.collection('users').doc(currentUser.id).update({
                isDeactivated: true
            });
            
            showToast("Account Deactivated");
            setTimeout(() => {
                auth.signOut();
                location.reload();
            }, 1000);
        } catch (e) {
            showToast("Error: " + e.message, "error");
        }
    });
}

function toggleAccordion(bodyId, iconId) {
    const body = document.getElementById(bodyId);
    const icon = document.getElementById(iconId);
    
    body.classList.toggle('hidden');
    icon.classList.toggle('rotate-180');
}

// 2. Toggles between Input Field and Delete Buttons
function toggleChatEdit(enable) {
    const footer = document.getElementById('chat-footer-area');
    
    if (enable) {
        footer.innerHTML = `
            <div class="chat-edit-bar">
                <button class="btn-chat-action btn-cancel" onclick="toggleChatEdit(false)">
                    <i data-feather="x" style="width:14px"></i> Cancel
                </button>
                <button class="btn-chat-action btn-delete" onclick="deleteChatHistory()">
                    <i data-feather="trash-2" style="width:14px"></i> Delete All
                </button>
            </div>
        `;
    } else {
        footer.innerHTML = getChatInputHTML();
    }
    feather.replace(); // Render the new icons
}
/* Updated Delete Function in script.js */
// Helper to generate consistent Chat IDs (e.g., "chat_alex_zack")
function getChatDocId(username1, username2) {
    if(!username1 || !username2) {
        console.error("Missing usernames for chat ID:", username1, username2);
        return "error_chat_id";
    }
    const sortedNames = [username1, username2].sort();
    return `chat_${sortedNames[0]}_${sortedNames[1]}`;
}
function triggerChatUpload() {
    document.getElementById('chat-file-input').click();
}

// 3. Handle File Selection
function handleChatFileSelect(input) {
    if (input.files && input.files[0]) processChatImage(input.files[0]);
}

// 4. Process Image (Upload to ImgBB)
async function processChatImage(file) {
    if (!file.type.startsWith('image/')) return showToast("Images only", "error");
    if (file.size > 32 * 1024 * 1024) return showToast("File too large", "error");

    const inputField = document.getElementById('chat-input');
    const originalPlaceholder = inputField.placeholder;
    inputField.value = '';
    inputField.placeholder = "Uploading... ☁️";
    inputField.disabled = true;

    try {
        const formData = new FormData();
        formData.append("image", file);
        // Using the API Key you provided earlier
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData });
        const data = await response.json();

        if (data.success) {
            inputField.value = data.data.url;
            inputField.focus();
        } else { throw new Error("Upload Failed"); }
    } catch (e) {
        showToast("Upload failed", "error");
    } finally {
        inputField.placeholder = originalPlaceholder;
        inputField.disabled = false;
        document.getElementById('chat-file-input').value = '';
    }
}

// 5. Setup Listeners (Paste & Drag)
function setupChatMediaListeners() {
    const win = document.getElementById('chat-window');
    const inp = document.getElementById('chat-input');

    // Paste
    inp.addEventListener('paste', (e) => {
        if (e.clipboardData.files.length > 0) {
            e.preventDefault();
            processChatImage(e.clipboardData.files[0]);
        }
    });

    // Drag & Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
        win.addEventListener(evt, (e) => { e.preventDefault(); e.stopPropagation(); });
    });

    win.addEventListener('dragover', () => win.classList.add('drag-active-chat'));
    win.addEventListener('dragleave', () => win.classList.remove('drag-active-chat'));
    win.addEventListener('drop', (e) => {
        win.classList.remove('drag-active-chat');
        if (e.dataTransfer.files.length > 0) processChatImage(e.dataTransfer.files[0]);
    });
}
function deleteChatHistory() {
    if (!activeChatTargetId || !activeChatTargetUsername) return;
    customConfirm("Delete conversation?", async () => {
        const chatId = getChatDocId(currentUser.username, activeChatTargetUsername);
        const ref = db.collection('chats').doc(chatId).collection('messages');
        const snap = await ref.get();
        const batch = db.batch();
        snap.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        showToast("Cleared");
        toggleChatEdit(false);
    });
}
// 4. Helper for Enter Key (Since we re-inject HTML, we need inline attribute)
function handleChatKey(e) {
    if (e.key === 'Enter') sendMessage();
}
function subscribeToChat(targetUid, targetUsername) {
    if(activeChatListener) activeChatListener();
    
    // Safety Fallback
    if(!targetUsername && activeChatTargetUsername) targetUsername = activeChatTargetUsername;

    const chatId = getChatDocId(currentUser.username, targetUsername);
    
    activeChatListener = db.collection('chats').doc(chatId).collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot(snapshot => {
            const box = document.getElementById('chat-body'); 
            box.innerHTML = '';
            
            snapshot.forEach(doc => {
                const msg = doc.data(); 
                const isMe = msg.sender === currentUser.id;
                
                const div = document.createElement('div'); 
                div.className = `d-msg-row ${isMe ? 'out' : 'in'}`;
                
                let timeStr = msg.timestamp ? msg.timestamp.toDate().toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute:'2-digit'}) : '';

                let contentHTML = escapeHtml(msg.text); 

                if (isImageUrl(msg.text)) {
                    // --- FIX: UPDATED ONCLICK TO USE LIGHTBOX ---
                    contentHTML = `
                        <img src="${msg.text}" class="chat-media-img" 
                             onclick="openLightbox('${msg.text}')" 
                             onerror="this.style.display='none';">
                    `;
                } else if (isValidUrl(msg.text)) {
                    contentHTML = `<a href="${msg.text}" target="_blank" class="chat-link">${msg.text}</a>`;
                }

                div.innerHTML = `<div class="d-bubble">${contentHTML}<div class="d-meta">${timeStr}</div></div>`;
                box.appendChild(div);
                
                if(!isMe && !msg.read) doc.ref.update({ read: true });
            });
            box.scrollTop = box.scrollHeight;
        });
}

// --- HELPER FUNCTIONS (Add these at the bottom of script.js) ---

function isImageUrl(url) {
    // Check if string starts with http/https AND ends with an image extension
    // Also handles query params like image.jpg?width=200
    return (url.match(/^https?:\/\/.*\/.*\.(png|gif|webp|jpeg|jpg|svg|bmp|ico)($|\?)/i) != null);
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

function escapeHtml(text) {
    // Prevents HTML injection attacks while still allowing our specific tags later
    if (!text) return text;
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
function formatPostContent(text, isProfileView = false, authorId = null, postId = null) {
    if (!text) return '';

    let safeText = escapeHtml(text);
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    return safeText.replace(urlRegex, (url) => {
        if (isImageUrl(url)) {
            // Logic: If Profile View -> Lightbox. If Global -> Go To Post.
            if (isProfileView) {
                return `<br><img src="${url}" class="post-img-embed" onclick="event.stopPropagation(); openLightbox('${url}')">`;
            } else {
                return `<br><img src="${url}" class="post-img-embed" onclick="event.stopPropagation(); goToProfileAndFocus('${authorId}', '${postId}')">`;
            }
        } 
        else {
            return `<a href="${url}" target="_blank" class="post-link" onclick="event.stopPropagation()">${url}</a>`;
        }
    });
}
async function sendMessage() {
    const input = document.getElementById('chat-input'); const text = input.value.trim();
    if (!text || !activeChatTargetId || !activeChatTargetUsername) return;
    
    const chatId = getChatDocId(currentUser.username, activeChatTargetUsername);
    const participants = [currentUser.id, activeChatTargetId].sort();

    await db.collection('chats').doc(chatId).collection('messages').add({ 
        sender: currentUser.id, text: text, timestamp: firebase.firestore.FieldValue.serverTimestamp(), read: false 
    });
    
    await db.collection('chats').doc(chatId).set({ 
        participants: participants, lastSender: currentUser.id, timestamp: firebase.firestore.FieldValue.serverTimestamp() 
    }, { merge: true });
    
    input.value = '';
}
/* --- IN-APP NOTIFICATION SYSTEM --- */
function showInAppNotification(user, text) {
    const stack = document.getElementById('notification-stack');
    
    // Create Element
    const card = document.createElement('div');
    card.className = 'notify-card';
    
    // HTML Structure (Messenger Style)
    card.innerHTML = `
        <img src="${user.avatar || DEFAULT_AVATAR}" class="notify-img">
        <div class="notify-content">
            <span class="notify-name">${user.displayName}</span>
            <span class="notify-text">${text}</span>
        </div>
    `;

    // Click: Open Chat
    card.onclick = () => {
        startChat(user.id); // Open the chat window
        removeNotification(card); // Remove popup immediately
    };

    // Swipe/Auto-Dismiss Logic
    
    // 1. Append to Stack (Newest on top? or Bottom?)
    // "Messenger" puts newest at TOP, pushing others down.
    // If you want "Append Behind", use appendChild. 
    // Usually notifications stack top-down.
    stack.prepend(card); 

    // 2. Audio Cue (Optional - remove if annoying)
    // const audio = new Audio('assets/pop.mp3'); // You'd need a file
    // audio.play().catch(e => {}); 

    // 3. Auto Remove after 4 seconds
    setTimeout(() => {
        removeNotification(card);
    }, 4000);
}

function removeNotification(card) {
    // Visual Fade Out first
    card.classList.add('fading-out');
    
    // Then remove from DOM after animation
    setTimeout(() => {
        if (card.parentNode) card.parentNode.removeChild(card);
    }, 300); // Matches CSS transition time
}
function listenToDock() {
    db.collection('chats').where('participants', 'array-contains', currentUser.id)
      .onSnapshot(snapshot => {
          snapshot.docs.forEach(async doc => {
              const data = doc.data();
              const otherId = data.participants.find(id => id !== currentUser.id);

              // If I am NOT the sender
              if (data.lastSender !== currentUser.id) {
                   
                   // 1. Get Real Count
                   const msgs = await db.collection('chats').doc(doc.id).collection('messages')
                       .where('sender', '==', otherId)
                       .where('read', '==', false)
                       .get();
                   
                   const currentCount = msgs.size;

                   // --- NEW NOTIFICATION LOGIC ---
                   // If count INCREASED and I'm not looking at it
                   if (currentCount > (unreadTracker[otherId] || 0) && activeChatTargetId !== otherId) {
                       
                       // Fetch user details for the popup
                       const uDoc = await db.collection('users').doc(otherId).get();
                       if (uDoc.exists) {
                           const u = uDoc.data();
                           // Trigger the Blue App Style Popup
                           showInAppNotification(u, "Sent a new vibe"); 
                       }
                   }
                   
                   // Update tracker
                   unreadTracker[otherId] = currentCount;
                   // -----------------------------

                   // 2. Dock Handling (Existing Logic)
                   if (dockedUsers.has(otherId)) {
                       bumpDockItem(otherId);
                   } else if (currentCount > 0) {
                       const uDoc = await db.collection('users').doc(otherId).get();
                       if(uDoc.exists) { 
                           const u = uDoc.data(); u.id = otherId; 
                           addToDock(u); 
                       }
                   }

                   // 3. Update Badge
                   if (activeChatTargetId !== otherId && currentCount > 0) {
                       updateDockBadge(otherId, currentCount);
                   }
              }
          });
      });
}
/* Inside script.js, update the addToDock function's onclick logic */

/* --- DOCKING SYSTEM UPDATES --- */
/* --- CHAT HEAD PHYSICS & TRASH --- */
function setupDockDrag(el, uid) {
    let timer = null;           
    let isDragging = false;     
    let startX, startY;         
    let initialX, initialY;     
    
    const LONG_PRESS_MS = 500;  // Reduced to 0.5s (2s feels broken/too long)
                                // Feel free to set back to 2000 if you really want 2s.
    const DRIFT_TOLERANCE = 10; 

    const getTrash = () => document.getElementById('chat-trash');

    const startHandler = (e) => {
        if (e.type === 'mousedown' && e.button !== 0) return;

        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

        initialX = clientX;
        initialY = clientY;
        
        const rect = el.getBoundingClientRect();
        startX = clientX - rect.left;
        startY = clientY - rect.top;

        isDragging = false; 

        // START TIMER
        timer = setTimeout(() => {
            isDragging = true;
            if (navigator.vibrate) navigator.vibrate(50);
            
            if (activeChatTargetId === uid) closeChat();

            if (el.parentNode.id === 'chat-dock') {
                document.body.appendChild(el);
                el.style.position = 'fixed';
                el.style.left = rect.left + 'px';
                el.style.top = rect.top + 'px';
            }
            
            el.classList.add('dragging');
            el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.2)' }], { duration: 200 });
            
            // NOTE: We do NOT show trash here anymore.
            // It only shows in moveHandler if you get close.

        }, LONG_PRESS_MS);

        if (e.type === 'touchstart') {
            document.ontouchmove = moveHandler; document.ontouchend = endHandler;
        } else {
            document.onmousemove = moveHandler; document.onmouseup = endHandler;
        }
    };

    const moveHandler = (e) => {
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

        // A. WAITING PHASE
        if (!isDragging) {
            const dist = Math.hypot(clientX - initialX, clientY - initialY);
            if (dist > DRIFT_TOLERANCE) {
                clearTimeout(timer);
                timer = null;
            }
            return; 
        }

        // B. DRAG PHASE
        e.preventDefault(); 
        el.style.left = (clientX - startX) + 'px';
        el.style.top = (clientY - startY) + 'px';

        // --- SMART TRASH LOGIC ---
        const trash = getTrash();
        if (trash) {
            // Calculate distance to the "Ideal Trash Center" (Bottom Middle of Screen)
            const trashCenterX = window.innerWidth / 2;
            const trashCenterY = window.innerHeight - 60; // Roughly where trash sits

            const distToTrash = Math.hypot(clientX - trashCenterX, clientY - trashCenterY);

            // 1. VISIBILITY ZONE (The "Trigger Area")
            // Only show trash if we are within 250px of the bottom center
            if (distToTrash < 250) {
                trash.classList.add('visible');
            } else {
                trash.classList.remove('visible');
            }

            // 2. ACTIVE ZONE (The "Drop Area")
            // Glow red only if we are very close
            if (distToTrash < 60) {
                trash.classList.add('active');
            } else {
                trash.classList.remove('active');
            }
        }
    };

    const endHandler = (e) => {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }

        document.onmousemove = null; document.onmouseup = null;
        document.ontouchmove = null; document.ontouchend = null;

        // CASE 1: TAP
        if (!isDragging) {
            if(e.cancelable) e.preventDefault();
            if (activeChatTargetId === uid && !document.getElementById('chat-window').classList.contains('hidden')) {
                closeChat();
            } else {
                startChat(uid);
            }
            return;
        }

        // CASE 2: DRAG END
        isDragging = false;
        el.classList.remove('dragging');
        
        const trash = getTrash();
        
        // Check deletion BEFORE hiding trash
        if (trash && trash.classList.contains('active')) {
            trash.classList.remove('visible');
            trash.classList.remove('active');
            removeFromDock(uid);
            showToast("Chat closed");
            return;
        }

        // Hide Trash
        if (trash) {
            trash.classList.remove('visible');
            trash.classList.remove('active');
        }

        // Snap to Edge
        const screenW = window.innerWidth;
        const eRect = el.getBoundingClientRect();
        const targetX = (eRect.left > screenW / 2) ? (screenW - 70) : 20;

        el.animate([{ left: el.style.left }, { left: targetX + 'px' }], { duration: 200, easing: 'ease-out' })
          .onfinish = () => { el.style.left = targetX + 'px'; };
    };

    el.addEventListener('mousedown', startHandler);
    el.addEventListener('touchstart', startHandler, { passive: false });
}

function addToDock(user) {
    // 1. If exists, just highlight
    if (dockedUsers.has(user.id)) {
        const existing = document.getElementById(`dock-${user.id}`);
        if(existing) existing.animate([{ transform: 'scale(1.2)' }, { transform: 'scale(1)' }], { duration: 200 });
        return;
    }

    dockedUsers.add(user.id);
    const avatarSrc = user.avatar || DEFAULT_AVATAR;
    
    // 2. Create Bubble
    const el = document.createElement('div'); 
    el.className = 'dock-item'; 
    el.id = `dock-${user.id}`;
    el.oncontextmenu = (e) => { e.preventDefault(); return false; };

     el.innerHTML = `
        <img src="${avatarSrc}" class="dock-img">
        <div class="dock-badge"></div>
        <div class="dock-remove" 
             onclick="handleDockRemove(event, '${user.id}')"
             onmousedown="event.stopPropagation()"
             ontouchstart="event.stopPropagation()">
            <i data-feather="x" style="width:10px; height:10px; top: 15px; right: 15px;"></i>
        </div>
    `;
    // 3. ATTACH PHYSICS (Handles Clicks AND Drags)
    setupDockDrag(el, user.id);

    // 4. Initial Placement
    const dock = document.getElementById('chat-dock');
    if (window.innerWidth <= 768) dock.prepend(el);
    else dock.appendChild(el);

    // 5. Render the new icon
    feather.replace();
}
function handleDockRemove(e, uid) {
    // 1. Stop the event from bubbling up to the Chat Head
    if (e) {
        e.preventDefault();
        e.stopPropagation();
        // For standard clicks
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    }
    
    // 2. Perform the removal
    removeFromDock(uid);
}


function bumpDockItem(uid) {
    const dock = document.getElementById('chat-dock');
    const el = document.getElementById(`dock-${uid}`);
    if (!el) return;

    // Remove first to reset position
    // (Note: append/prepend moves it automatically, but explicit is safer for logic)
    
    if (window.innerWidth <= 768) {
        // Mobile: Move to Top
        dock.prepend(el);
    } else {
        // Desktop: Move to End (Bottom/Top depending on your CSS, but keeps original behavior)
        dock.appendChild(el);
    }
}
function removeFromDock(uid) { dockedUsers.delete(uid); document.getElementById(`dock-${uid}`).remove(); if (activeChatTargetId === uid) closeChat(); }
function updateDockVisuals() {
    document.querySelectorAll('.dock-item').forEach(el => el.classList.remove('active'));
    if (activeChatTargetId) { const el = document.getElementById(`dock-${activeChatTargetId}`); if(el) { el.classList.add('active'); el.classList.remove('unread'); } }
}
function updateDockBadge(uid, count) {
    const el = document.getElementById(`dock-${uid}`);
    if (el) {
        el.classList.add('unread');
        // Display the actual number instead of "!" or "1"
        el.querySelector('.dock-badge').innerText = count > 99 ? '99+' : count;
    }
}
function closeChat() {
    const win = document.getElementById('chat-window');
    win.classList.add('hidden');
    win.style.removeProperty('visibility'); 
    activeChatTargetId = null; 
    activeChatTargetUsername = null; // Reset
    if(activeChatListener) activeChatListener(); 
    updateDockVisuals();
    document.getElementById('chat-input').blur();
}

/* --- VIBE STATION --- */
let ytPlayer; let currentTrackId = null;
window.onYouTubeIframeAPIReady = function() {
    // Get the exact origin (e.g., http://127.0.0.1:5500)
    const origin = window.location.origin;

    ytPlayer = new YT.Player('yt-iframe', {
        height: '100%',
        width: '100%',
        videoId: 'jfKfPfyJRdk', 
        playerVars: {
            'autoplay': 1,
            'controls': 1,
            'rel': 0,
            'fs': 1,
            'enablejsapi': 1, // Crucial for JS control
            'origin': origin  // Crucial for security handshake
        },
        events: {
            'onStateChange': onPlayerStateChange,
            'onError': onPlayerError
        }
    });
};

// THE BOUNCER: Detects unavailable videos and kicks them out
function onPlayerError(event) {
    console.warn("Video Unavailable (Error " + event.data + "). Skipping...");
    
    // Error Codes:
    // 100 = Video not found/deleted
    // 101 = Embedded playback forbidden by owner
    // 150 = Same as 101
    
    if ([100, 101, 150].includes(event.data)) {
        showToast("Track unavailable. Skipping...", "error");
        
        // Wait 1s then try next track
        setTimeout(() => {
            playNextTrack(); // Your existing function to find the next song
        }, 1000);
    }
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        // load next track
        currentTrackIndex++;
        if (currentTrackIndex >= vibeTracks[currentCat].tracks.length) {
            currentTrackIndex = 0; // loop
        }
        ytPlayer.loadVideoById(vibeTracks[currentCat].tracks[currentTrackIndex].id);
    }
}
let activeQueue = [];       // Holds the list of songs currently on screen
let activeQueueIndex = 0;   // Which one are we playing?

/* --- UPDATED PLAY FUNCTION --- */
function playLofi(id) {
    currentTrackId = id;
    
    // 1. Update Index based on the current Queue
    activeQueueIndex = activeQueue.findIndex(t => t.id === id);

    // 2. Visuals (Player)
    document.getElementById('yt-player-wrapper').classList.remove('hidden');
    
    // 3. Visuals (Icon)
    const icon = document.getElementById('player-icon');
    if (icon) {
        icon.setAttribute('data-feather', 'chevron-up');
        feather.replace();
    }
    
    // 4. Load Video
    if (ytPlayer && ytPlayer.loadVideoById && typeof ytPlayer.loadVideoById === 'function') {
        ytPlayer.loadVideoById(id);
    } else {
        // FALLBACK: If API isn't ready, force the iframe SRC with the origin
        const origin = window.location.origin;
        document.getElementById('yt-iframe').src = 
            `https://www.youtube.com/embed/${id}?autoplay=1&enablejsapi=1&origin=${origin}`;
    }
}

/* --- UPDATED NEXT TRACK LOGIC --- */
function playNextTrack() {
    if (activeQueue.length === 0) return;

    // 1. Move to next index
    activeQueueIndex++;

    // 2. Loop back to start if at the end
    if (activeQueueIndex >= activeQueue.length) {
        activeQueueIndex = 0;
    }

    // 3. Play
    const nextTrack = activeQueue[activeQueueIndex];
    if (nextTrack) {
        console.log("Skipping to:", nextTrack.title);
        playLofi(nextTrack.id);
        
        // Update visual highlight in the list
        document.querySelectorAll('.bulletin-item').forEach(x => x.style.color = '');
        // (Optional: logic to find the specific DOM element to highlight would go here)
    }
}
function togglePlayer() {
    const w = document.getElementById('yt-player-wrapper'); w.classList.toggle('hidden');
    const i = w.classList.contains('hidden') ? 'chevron-down' : 'chevron-up';
    document.getElementById('player-icon').setAttribute('data-feather',i); feather.replace();
}
function renderVibeStation() {
    document.getElementById('vibe-search-input').value = '';
    document.getElementById('vibe-reset-btn').classList.add('hidden');
    
    const list = document.getElementById('vibe-playlist');
    if (!list) return;
    list.innerHTML = '';
    activeQueue = [];

    vibeTracks.forEach(cat => {
        const h = document.createElement('div');
        h.style.cssText="font-size:10px;font-weight:800;text-transform:uppercase;color:var(--primary);margin:10px 0 4px 0;letter-spacing:1px;";
        h.innerText=cat.cat; 
        list.appendChild(h);

        cat.tracks.forEach(t => {
            activeQueue.push(t); 

            const i = document.createElement('div'); 
            i.className='bulletin-item';
            
            // --- UPDATED HTML ---
            i.innerHTML=`
                <span>${t.title}</span> 
                <div class="vibe-item-actions">
                    <i data-feather="play-circle" style="width:12px"></i>
                    <button class="btn-vibe-remove" title="Remove" onclick="removeFromVibeList('${t.id}', this, event)">
                        <i data-feather="x" style="width:12px;"></i>
                    </button>
                </div>
            `;
            i.style.cssText="display:flex;justify-content:space-between;padding:6px 0;font-size:12px;cursor:pointer;color:var(--text-muted);border-bottom:1px solid var(--border)";
            
            i.onclick=()=>{ 
                playLofi(t.id); 
                document.querySelectorAll('.bulletin-item').forEach(x=>x.style.fontWeight='normal'); 
                i.style.fontWeight='bold'; 
            };
            list.appendChild(i);
        });
    });
    feather.replace();
}
/* --- REMOVE TRACK LOGIC --- */
function removeFromVibeList(id, btnElement, event) {
    // 1. STOP the click from bubbling up to the row (Prevents playing the song)
    event.stopPropagation();

    // 2. Remove from visual list
    const row = btnElement.closest('.bulletin-item');
    row.style.opacity = '0';
    setTimeout(() => row.remove(), 200); // Smooth fade out

    // 3. Remove from Active Queue (So auto-play doesn't pick it)
    activeQueue = activeQueue.filter(track => track.id !== id);
    
    // Optional: If the song being removed is currently playing, maybe skip to next?
    if (currentTrackId === id) {
        playNextTrack();
    }
}
/* --- UTILS --- */
function router(p) {
    // 1. Reset Views
    document.querySelectorAll('.view-section').forEach(e => e.classList.add('hidden'));
    
    // 2. Reset Nav Buttons
    document.querySelectorAll('.nav-btn, .mob-btn').forEach(b => b.classList.remove('active'));
    
    // 3. CLEANUP: Remove Admin Monitor Mode (Reset layout for other pages)
    document.body.classList.remove('admin-monitor-mode');

    // 4. Mobile Column Management (Reset)
    const colCenter = document.querySelector('.col-center');
    const colLeft = document.querySelector('.col-left');
    const colRight = document.querySelector('.col-right');
    
    if(colCenter) colCenter.classList.remove('hidden-on-mobile');
    if(colLeft) colLeft.classList.remove('mobile-active');
    if(colRight) colRight.classList.remove('mobile-active');

    // 5. Route Logic
    if (p === 'home') {
        document.getElementById('page-home').classList.remove('hidden');
        activateNav('home');
        updateSidebar(currentUser.id);
    }
    
    if (p === 'network') {
        document.getElementById('page-network').classList.remove('hidden');
        activateNav('network');
        renderNetwork(); // This will handle the mode switching
    }
    
    if (p === 'profile') {
        document.getElementById('page-profile').classList.remove('hidden');
        if(window.innerWidth <= 768) {
            document.querySelector('.col-left').classList.add('mobile-active');
        }
    }

    if (p === 'vibes') {
        colCenter.classList.add('hidden-on-mobile');
        colRight.classList.add('mobile-active');
        activateNav('vibes');
    }
}

// Helper to highlight both Desktop and Mobile buttons
function activateNav(target) {
    document.querySelectorAll(`[data-target="${target}"]`).forEach(b => b.classList.add('active'));
}

function customConfirm(msg, callback) {
    document.getElementById('confirm-msg').innerText = msg;
    const btn = document.getElementById('confirm-btn-yes');
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.onclick = () => { callback(); closeModal('confirm-modal'); };
    openModal('confirm-modal');
}
async function handleLogin() {
    const u = document.getElementById('login-user').value.trim();
    const p = document.getElementById('login-pass').value;
    
    if(!u || !p) return showToast("Fill all fields", "error");
    
    try { 
        const email = u.includes('@') ? u : `${u}@vibehub.app`;
        
        await auth.signInWithEmailAndPassword(email, p); 
        closeModal('login-modal'); 
        showToast("Welcome back!"); 
    }
    catch (e) { 
        console.error(e);
        showToast("Invalid credentials", "error"); 
    }
}
function checkLastUser() {
    const stored = localStorage.getItem('vibe_last_user');
    
    // Only switch to quick view if data exists AND we are currently logged out
    if (stored && !auth.currentUser) {
        const u = JSON.parse(stored);
        
        // Populate UI
        document.getElementById('quick-avatar').src = u.avatar;
        document.getElementById('quick-name').innerText = u.displayName;
        document.getElementById('quick-username').innerText = '@' + u.username;
        
        // Switch View
        toggleLoginMode('quick');
    } else {
        toggleLoginMode('standard');
    }
}

// 2. Toggle between Views
function toggleLoginMode(mode) {
    const quickView = document.getElementById('login-quick-view');
    const stdView = document.getElementById('login-standard-view');
    const backBtn = document.getElementById('btn-back-quick');
    const hasStored = localStorage.getItem('vibe_last_user');

    if (mode === 'quick' && hasStored) {
        quickView.classList.remove('hidden');
        stdView.classList.add('hidden');
        // Auto-focus password
        setTimeout(() => document.getElementById('quick-pass').focus(), 100);
    } else {
        quickView.classList.add('hidden');
        stdView.classList.remove('hidden');
        
        // Show "Back to last user" link only if we have one stored
        if (hasStored) backBtn.classList.remove('hidden');
        else backBtn.classList.add('hidden');
    }
}

// 3. Handle the "Continue" Button click
async function handleQuickLogin() {
    const stored = localStorage.getItem('vibe_last_user');
    if (!stored) return toggleLoginMode('standard');

    const u = JSON.parse(stored);
    const pass = document.getElementById('quick-pass').value;

    if (!pass) return showToast("Enter access code", "error");

    // Reconstruct the email using the stored LOGIN ID
    const email = `${u.username}@vibehub.app`;

    try {
        await auth.signInWithEmailAndPassword(email, pass);
        closeModal('login-modal');
        document.getElementById('quick-pass').value = ''; 
        showToast(`Welcome back, ${u.displayName}!`);
    } catch (e) {
        console.error(e);
        showToast("Invalid code", "error");
    }
}
async function handleRegister() {
    // 1. Get values
    const u = document.getElementById('reg-user').value.trim();    // Used for LOGIN only
    const p = document.getElementById('reg-pass').value;
    const name = document.getElementById('reg-name').value;
    const account = document.getElementById('reg-account').value.trim(); // <--- GET THE ACCOUNT INPUT
    const role = document.getElementById('reg-role').value.trim();

    if(!u || !p || !name || !role|| !account) return showToast("Fill all fields", "error");

    try {
        const cred = await auth.createUserWithEmailAndPassword(`${u}@vibehub.app`, p);
        const newUser = { 
            id: cred.user.uid, 
            username: u,
            displayName: name,
            account: account, 
            role: role,
            avatar: DEFAULT_AVATAR, 
            cover: '', 
            friends: [], 
            coverPosY: 50, 
            coverZoom: 100 
        };
        
        await db.collection('users').doc(cred.user.uid).set(newUser);
        closeModal('register-modal'); 
        showToast("Identity Created!");
    } catch (e) { 
        showToast(e.message, "error"); 
    }
}
async function handleLogout() { await auth.signOut(); location.reload(); }
function switchModal(closeId, openId) { document.getElementById(closeId).classList.add('hidden'); document.getElementById(openId).classList.remove('hidden'); }
function openModal(id) {
    const modal = document.getElementById(id);
    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');

    // --- FIX: FOCUS FIRST INPUT AUTOMATICALLY ---
    // Try to find the first input field to focus on
    const firstInput = modal.querySelector('input, button');
    if (firstInput) {
        // Small delay ensures the modal is fully rendered/visible before focusing
        setTimeout(() => firstInput.focus(), 50);
    }
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
    
    // Only unfreeze if no other modals are open
    if (document.querySelectorAll('.modal-overlay:not(.hidden)').length === 0) {
        document.body.classList.remove('modal-open');
    }
}
function safeCSV(str) {
    return (str || "").toString().replace(/,/g, " ").trim();
}

// 1. Export Attendance
function exportAttendanceCSV() {
    if (!fetchedRecords || fetchedRecords.length === 0) {
        return showToast("No report generated yet.", "error");
    }

    // Get Identity Info
    const name = safeCSV(currentUser.displayName);
    const account = safeCSV(currentUser.username); // This is the Account ID
    const role = safeCSV(currentUser.role || "");

    // A. CSV Headers (Added Name, Account, Role)
    let csv = "Name,Account,Role,Date,Day,Shift,Biologs,Late (Mins),Hours\n";

    // B. Map Data
    fetchedRecords.forEach(rec => {
        const safeShift = safeCSV(rec.shift); 
        const safeBio = safeCSV(rec.biologs);
        
        // Prepend identity info to every row
        csv += `${name},${account},${role},${rec.date},${rec.day},${safeShift},${safeBio},${rec.late},${rec.hours.toFixed(2)}\n`;
    });

    // C. Download
    downloadCSV(csv, `Attendance_${name}_${document.getElementById('att-start-date').value}.csv`);
}
function downloadCSV(csvContent, fileName) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast("Exporting CSV...");
}
// 2. Export Break Logs
function exportBreakLogsCSV() {
    const rows = document.querySelectorAll('#break-hist-body tr');
    if (rows.length === 0 || rows[0].innerText.includes("Loading") || rows[0].innerText.includes("No records")) {
        return showToast("No data to export.", "error");
    }

    // Get Identity Info
    const name = safeCSV(currentUser.displayName);
    const account = safeCSV(currentUser.username);
    const role = safeCSV(currentUser.role || "Member");

    // A. CSV Headers (Added Name, Account, Role)
    let csv = "Name,Account,Role,Date,Break 1,Status,Lunch,Status,Break 2,Status,Personal,Status\n";

    // B. Scrape Rows
    rows.forEach(row => {
        const cols = row.querySelectorAll('td');
        if (cols.length < 8) return; 

        // Helper to clean table text (removes newlines)
        const clean = (text) => text.replace(/(\r\n|\n|\r)/gm, " ").trim();

        const date = clean(cols[0].innerText);
        const b1 = clean(cols[1].innerText);
        const b1s = clean(cols[2].innerText);
        const ln = clean(cols[3].innerText);
        const lns = clean(cols[4].innerText);
        const b2 = clean(cols[5].innerText);
        const b2s = clean(cols[6].innerText);
        const pb = clean(cols[7].innerText);
        const pbs = clean(cols[8].innerText);

        // Prepend identity info to every row
        csv += `${name},${account},${role},${date},${b1},${b1s},${ln},${lns},${b2},${b2s},"${pb}","${pbs}"\n`;
    });

    // C. Download
    const month = document.getElementById('break-hist-month').value || 'Report';
    downloadCSV(csv, `BreakLogs_${name}_${month}.csv`);
}
function showToast(msg, type='success') { const t = document.createElement('div'); t.className = `toast ${type}`; t.innerText = msg; document.getElementById('toast-container').appendChild(t); setTimeout(() => t.remove(), 3000); }
function toggleDropdown(id) { document.getElementById(id).classList.toggle('hidden'); }
function openLightbox(src) { document.getElementById('lightbox').classList.remove('hidden'); document.getElementById('lightbox-img').src = src; }
function triggerUpload(t) { document.getElementById('upload-'+t).click(); }
function toggleUpdateCode() {
    // 1. Close the dropdown menu
    document.getElementById('settings-menu').classList.add('hidden');
    
    // 2. Open the custom modal
    document.getElementById('upd-current-pass').value = '';
    document.getElementById('upd-new-pass').value = '';
    openModal('update-pass-modal');
}
/* --- OPTIMISTIC UI: STRIP & STORE --- */
let currentPreviewUrl = null;

function handlePostInput(textarea) {
    textarea.style.height = 'auto'; 
    textarea.style.height = textarea.scrollHeight + 'px';

    const text = textarea.value;
    const previewBox = document.getElementById('link-preview-area');
    
    // Regex: Finds the first image URL
    const match = text.match(/(https?:\/\/[^\s]+?\.(?:png|jpg|jpeg|gif|webp|svg))/i);

    if (match && match[0]) {
        const url = match[0];

        // If it's a NEW link
        if (url !== currentPreviewUrl) {
            currentPreviewUrl = url; 
            
            // Remove URL from text
            const cleanText = text.replace(url, '').trim();
            textarea.value = cleanText; 

            // Show Preview
            previewBox.innerHTML = `
                <div class="lp-content">
                    <span class="lp-label">Link Preview</span>
                    <img src="${url}" class="lp-img" onerror="this.src='assets/icon.png'">
                </div>
                <button class="lp-remove" onclick="removeLinkFromText()"><i data-feather="x" style="width:14px"></i></button>
            `;
            previewBox.classList.remove('hidden');
            feather.replace();
        }
    }
}
function hideLinkPreview() {
    const previewBox = document.getElementById('link-preview-area');
    previewBox.classList.add('hidden');
    previewBox.innerHTML = '';
    currentPreviewUrl = null; // Forget the link
}

function removeLinkFromText() {
    // Just call hide, because the text is already gone from the textarea
    hideLinkPreview();
}
async function handleUpdatePassword() {
    const currentPass = document.getElementById('upd-current-pass').value;
    const newPass = document.getElementById('upd-new-pass').value;

    if (!currentPass || !newPass) {
        return showToast("Please fill all fields", "error");
    }

    if (newPass.length < 6) {
        return showToast("New code must be 6+ chars", "error");
    }

    showToast("Verifying...", "success");

    const user = auth.currentUser;
    // Firebase requires "Re-authentication" before changing sensitive data
    const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPass);

    try {
        // 1. Verify Current Code
        await user.reauthenticateWithCredential(credential);
        
        // 2. Update to New Code
        await user.updatePassword(newPass);
        
        closeModal('update-pass-modal');
        showToast("Access Code Updated Successfully!");
    } catch (error) {
        console.error(error);
        if (error.code === 'auth/wrong-password') {
            showToast("Current Access Code is wrong", "error");
        } else {
            showToast(error.message, "error");
        }
    }
}
function toggleTheme() { const n = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; document.body.setAttribute('data-theme', n); localStorage.setItem('vibe_theme', n); }
function deleteAccount() {
    // Clear previous input
    document.getElementById('del-acc-input').value = '';
    openModal('delete-account-modal');
}

// 2. EXECUTE: Performed when clicking the red button in the modal
async function executeDeleteAccount() {
    const inputVal = document.getElementById('del-acc-input').value.trim();

    // SAFETY CHECK: Match Username
    if (inputVal !== currentUser.username) {
        showToast("Username mismatch. Check spelling.", "error");
        return;
    }

    // UI Updates
    closeModal('delete-account-modal');
    showToast("Processing deletion... This may take time.");

    try {
        const uid = currentUser.id;
        const batch = db.batch();

        // 1. Delete all my POSTS
        const postsSnap = await db.collection('posts').where('authorId', '==', uid).get();
        postsSnap.forEach(doc => batch.delete(doc.ref));

        // 2. Remove me from friends' lists
        if (currentUser.friends && currentUser.friends.length > 0) {
            for (const fid of currentUser.friends) {
                const fRef = db.collection('users').doc(fid);
                batch.update(fRef, { friends: firebase.firestore.FieldValue.arrayRemove(uid) });
            }
        }

        // 3. Delete my User Doc
        const userRef = db.collection('users').doc(uid);
        batch.delete(userRef);

        // 4. Commit Firestore Changes
        await batch.commit();

        // 5. Delete Auth Account
        await auth.currentUser.delete();

        showToast("Account Deleted.");
        location.reload();

    } catch (e) {
        console.error(e);
        showToast("Error: " + e.message, "error");
    }
}
function timeAgo(date) { const s = Math.floor((new Date()-date)/1000); if(s>31536000)return Math.floor(s/31536000)+"y"; if(s>86400)return Math.floor(s/86400)+"d"; if(s>3600)return Math.floor(s/3600)+"h"; if(s>60)return Math.floor(s/60)+"m"; return s+"s"; }
document.getElementById('chat-input').addEventListener('keypress', function (e) { if (e.key === 'Enter') sendMessage(); });
/* =========================================
   CLOUD-SYNCED BREAK TOOL (FULL VERSION)
   ========================================= */
/* --- CLICK OUTSIDE TO CLOSE UTILITY PANEL --- */
/* --- GLOBAL CLICK OUTSIDE LISTENER (Handles Both Panels) --- */
document.addEventListener('click', (e) => {
    
    // --- 1. LEFT UTILITY PANEL ---
    const leftPanel = document.getElementById('utility-panel');
    const leftTrigger = document.querySelector('.left-trigger'); 

    // Check if Left Panel is Open
    if (leftPanel && leftPanel.classList.contains('active')) {
        const isClickInside = leftPanel.contains(e.target);
        const isClickOnTrigger = leftTrigger && leftTrigger.contains(e.target);

        // If clicked outside panel AND outside the trigger -> Close it
        if (!isClickInside && !isClickOnTrigger) {
            leftPanel.classList.remove('active');
        }
    }

    // --- 2. RIGHT TOOLS DOCK ---
    const rightDock = document.getElementById('mini-tools-dock');
    const rightTrigger = document.querySelector('.right-trigger');

    // Check if Right Dock is Open
    if (rightDock && rightDock.classList.contains('active')) {
        const isClickInside = rightDock.contains(e.target);
        const isClickOnTrigger = rightTrigger && rightTrigger.contains(e.target);

        // If clicked outside dock AND outside the trigger -> Close it
        if (!isClickInside && !isClickOnTrigger) {
            rightDock.classList.remove('active');
        }
    }
});
function toggleUtilityPanel() {
    const leftPanel = document.getElementById('utility-panel');
    const rightDock = document.getElementById('mini-tools-dock');
    
    // [MOBILE ONLY CHECK]
    // If screen is small, close the other panel first
    if (window.innerWidth <= 768) {
        if (rightDock && rightDock.classList.contains('active')) {
            rightDock.classList.remove('active');
        }
    }

    // Toggle Left
    if (leftPanel) {
        leftPanel.classList.toggle('active');
    }
}

function toggleToolsDock() {
    const rightDock = document.getElementById('mini-tools-dock');
    const leftPanel = document.getElementById('utility-panel');

    // [MOBILE ONLY CHECK]
    // If screen is small, close the other panel first
    if (window.innerWidth <= 768) {
        if (leftPanel && leftPanel.classList.contains('active')) {
            leftPanel.classList.remove('active');
        }
    }

    // Toggle Right
    if (rightDock) {
        rightDock.classList.toggle('active');
    }
}
// Global State
let btState = {
    bank: 600,
    running: false,
    startTime: null,
    limit: 0,
    type: null,
    interval: null,
    isLoggedIn: false,
    logs: [],
    usedBreaks: [], // <--- NEW: Tracks used tokens ['break1', 'lunch']
    warned: false
};

// Audio Context
let btAudioCtx = null;
let btOscillator = null;
let activeAudio = null;
let beepInterval = null;
let currentTestType = null;
// --- 1. FIRESTORE LISTENER ---
function listenToBreakData() {
    if (!currentUser) return;
    
    db.collection('users').doc(currentUser.id).onSnapshot(doc => {
        if (!doc.exists) return;
        const data = doc.data().breakTool || {};

        // 1. SYNC TEXT INPUTS
        if (document.activeElement.id !== 'panel-company') 
            document.getElementById('panel-company').value = data.company || '';
        if (document.activeElement.id !== 'bt-role') 
            document.getElementById('bt-role').value = data.role || '';
        if (document.activeElement.id !== 'bt-account') 
            document.getElementById('bt-account').value = data.account || '';
        
        // 2. SYNC SHIFT & REST DAYS
        document.getElementById('bt-shift-start').value = data.shiftStart || '';
        document.getElementById('bt-shift-end').value = data.shiftEnd || '';
        document.getElementById('bt-rd-1').value = (data.rd1 !== undefined) ? data.rd1 : '0'; 
        document.getElementById('bt-rd-2').value = (data.rd2 !== undefined) ? data.rd2 : '6'; 

        // --- 3. SYNC STATE & DAILY RESET CHECK ---
        const todayKey = formatDateKey(new Date());
        const lastSavedDate = data.lastDate || todayKey;

        // If the date saved in DB is different from today -> RESET
        if (lastSavedDate !== todayKey) {
            console.log("New Day Detected: Resetting Break Tool");
            btState.bank = 600;      // Reset PB
            btState.usedBreaks = []; // Clear buttons
            btState.logs = [];       // Clear logs
            btState.isLoggedIn = false; // Force logout
            
            // Save this new state immediately so it doesn't loop
            saveBreakData(null);
        } else {
            // Normal Load
            btState.bank = (data.bank !== undefined) ? data.bank : 600;
            btState.isLoggedIn = data.isLoggedIn || false;
            btState.logs = data.logs || []; 
            btState.usedBreaks = data.usedBreaks || [];
        }

        updateBreakButtons();
        updateBankDisplay();
        updateLoginBtn();
        renderBtLogs();

        // 5. SYNC TIMER
        if (data.activeBreak && data.activeBreak.isRunning) {
            syncRunningBreak(data.activeBreak);
            const tool = document.getElementById('tool-break');
            if(tool.classList.contains('hidden')) toggleMiniTool('break');
        } else {
            if (btState.running) stopLocalTimer();
        }
    });
}

function updateBreakButtons() {
    const breaks = [
        { id: 'break1', label: 'First Break', time: '15m' },
        { id: 'lunch',  label: 'Lunch Break', time: '1h' },
        { id: 'break2', label: 'Second Break',time: '15m' }
    ];
    
    // HIERARCHY STATE CHECK
    const isLoggedIn = btState.isLoggedIn;
    const used = btState.usedBreaks;
    const isRunning = btState.running; // Check if timer is running

    // 1. Loop through Standard Breaks
    breaks.forEach(b => {
        const btn = document.getElementById(`btn-${b.id}`);
        if(btn) {
            btn.className = "btn btn-sm btn-outline bt-flex-btn";
            const isDone = used.includes(b.id);
            
            // DEFAULT: Disable everything
            let isDisabled = true;
            let badgeText = b.time;

            // HIERARCHY LOGIC
            if (!isLoggedIn) {
                // Not Clocked In -> All Disabled
                isDisabled = true;
            } 
            else if (isRunning) {
                // Timer Running -> All Disabled (Cannot start new break while on one)
                isDisabled = true;
            }
            else if (isDone) {
                // Already Taken -> Disabled
                isDisabled = true;
                badgeText = "DONE";
                btn.classList.add('btn-disabled'); // Add visual gray style
            } 
            else {
                // STRICT SEQUENCE:
                if (b.id === 'break1') {
                    // B1: Enabled if Logged In
                    isDisabled = false; 
                } 
                else if (b.id === 'lunch') {
                    // Lunch: Enabled ONLY if B1 is Done
                    isDisabled = !used.includes('break1'); 
                } 
                else if (b.id === 'break2') {
                    // B2: Enabled ONLY if Lunch is Done
                    isDisabled = !used.includes('lunch'); 
                }
            }

            btn.disabled = isDisabled;
            if (isDisabled && !isDone) btn.style.opacity = '0.5'; // Dim untaken but locked breaks
            else btn.style.opacity = '1';

            btn.innerHTML = `<span>${b.label}</span><span class="bt-time-badge">${badgeText}</span>`;
        }
    });

    // 2. Personal Break (Allowed anytime IF Clocked In & Not Currently on Break)
    const btnPB = document.getElementById('btn-personal');
    if(btnPB) {
        const m = Math.floor(btState.bank / 60);
        btnPB.innerHTML = `<span>Personal Break</span><span class="bt-time-badge">${m}m</span>`;
        
        // PB Logic: Must be Logged In, Not Running Timer, Bank > 0
        if (isLoggedIn && !isRunning && btState.bank > 0) {
            btnPB.disabled = false;
            btnPB.style.opacity = '1';
        } else {
            btnPB.disabled = true;
            btnPB.style.opacity = '0.5';
        }
    }
    
    // 3. Update Clock Out Button (Cannot Clock Out if on Break)
    updateClockUI(); 
}
// --- 2. SAVE TO FIRESTORE ---
async function saveBreakData(activeBreakObj = null) {
    if (!currentUser) return;

    const payload = {
        // Identity
        company: document.getElementById('panel-company').value,
        role: document.getElementById('bt-role').value,
        account: document.getElementById('bt-account').value,
        
        // Shift Config
        shiftStart: document.getElementById('bt-shift-start').value,
        shiftEnd: document.getElementById('bt-shift-end').value,
        rd1: document.getElementById('bt-rd-1').value, 
        rd2: document.getElementById('bt-rd-2').value, 
        
        // State
        bank: btState.bank,
        isLoggedIn: btState.isLoggedIn,
        logs: btState.logs,
        usedBreaks: btState.usedBreaks,
        // Timer Status
        activeBreak: activeBreakObj,
        
        // NEW: Save Today's Date
        lastDate: formatDateKey(new Date()) 
    };

    await db.collection('users').doc(currentUser.id).update({
        breakTool: payload
    });
}


let debounceTimer;
function debouncedSave() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => saveBreakData(btState.running ? getCurrentBreakSnapshot() : null), 1000);
}

function toggleBtLogin() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', {hour12:false, hour:'2-digit', minute:'2-digit'});
    
    // --- 1. CLOCK IN ---
    if (!btState.isLoggedIn) {
        btState.isLoggedIn = true;
        
        // Add "SHIFT" start entry (Active)
        addLogEntry("SHIFT", "--", "OK", now, null);
        
        // Update DB (Attendance Collection)
        const dateKey = getLogicalDateKey();
        if (currentUser) {
            db.collection('users').doc(currentUser.id)
              .collection('attendance').doc(dateKey)
              .set({
                  date: dateKey,
                  actualLogin: timeStr,
                  status: 'Active'
              }, { merge: true });
        }

        // UI Updates
        updateLoginBtn(); 
        saveBreakData(btState.running ? getCurrentBreakSnapshot() : null);
        showToast("Clocked IN");
    } 
    // --- 2. CLOCK OUT ---
    else {
        // We still use your customConfirm, but inside we call the shared helper
        customConfirm("End shift and Clock Out? This will clear the daily logs.", async () => {
            await performLogout("Manual"); 
        });
    }
}

// Helper to toggle button states
function updateClockUI() {
    const btnIn = document.getElementById('btn-clock-in-new');
    const btnOut = document.getElementById('btn-clock-out-new');
    
    // If buttons haven't been injected yet, skip
    if(!btnIn || !btnOut) return; 

    if (btState.isLoggedIn) {
        // CLOCK IN is Disabled
        btnIn.disabled = true; 
        btnIn.classList.add('btn-disabled');
        
        // CLOCK OUT: Only Enabled if NOT running a break
        if (btState.running) {
            btnOut.disabled = true;
            btnOut.classList.add('btn-disabled');
            btnOut.innerText = "On Break...";
        } else {
            btnOut.disabled = false;
            btnOut.classList.remove('btn-disabled');
            btnOut.innerText = "Clock OUT";
        }
    } else {
        // Not Logged In
        btnIn.disabled = false; 
        btnIn.classList.remove('btn-disabled');
        
        btnOut.disabled = true; 
        btnOut.classList.add('btn-disabled');
        btnOut.innerText = "Clock OUT";
    }
}

function toggleAcAlarmMenu() {
    const menu = document.getElementById('ac-alarm-menu');
    const wasHidden = menu.classList.contains('hidden');
    
    // Close other menus first (like the Break Tool menu)
    document.querySelectorAll('.alarm-menu').forEach(el => el.classList.add('hidden'));

    if (wasHidden) {
        menu.classList.remove('hidden');
        // Highlight current selection
        const current = localStorage.getItem('vibe_alarm_type') || 'beep';
        highlightSelectedAlarm(current);
    }
}
function updateLoginBtn() {
    const btn = document.getElementById('bt-login-btn');
    if (!btn) return;
    
    if (btState.isLoggedIn) {
        btn.innerText = "Clock OUT";
        btn.classList.add('active'); // Styling for active state
    } else {
        btn.innerText = "Clock IN";
        btn.classList.remove('active');
    }
}

function updateBankDisplay() {
    const m = Math.floor(btState.bank / 60);
    const s = btState.bank % 60;
    const el = document.getElementById('bt-bank-display');
    if(el) el.innerText = `Personal Break: ${m}m ${s}s`;
}

// --- 4. TIMER LOGIC ---
function getCurrentBreakSnapshot() {
    return {
        isRunning: true,
        type: btState.type,
        limit: btState.limit,
        startTime: btState.startTime
    };
}

function startBreak(type, mins) {
    // 1. GLOBAL CHECKS
    if (btState.running) return showToast("Finish current break first!", "error");
    if (!btState.isLoggedIn) return showToast("You must Clock IN first!", "error");
    if (btState.usedBreaks.includes(type)) return showToast("Already taken!", "error");

    // 2. STRICT SEQUENCE CHECKS
    if (type === 'lunch' && !btState.usedBreaks.includes('break1')) {
        return showToast("Strict Mode: Take First Break before Lunch.", "error");
    }
    if (type === 'break2' && !btState.usedBreaks.includes('lunch')) {
        return showToast("Strict Mode: Take Lunch before Second Break.", "error");
    }
    
    // 3. PB BANK CHECK
    if (type === 'personal' && btState.bank <= 0) return showToast("Personal Bank Empty!", "error");
    
    // --- PROCEED ---
    if (type !== 'personal') {
        btState.usedBreaks.push(type);
    }

    initAudio(); 
    btState.type = type;
    btState.limit = (type === 'personal') ? btState.bank : (mins * 60);
    btState.startTime = new Date();
    btState.running = true;

    // Start Timer
    btState.interval = setInterval(breakTick, 1000);
    breakTick();
    
    // UI Updates
    toggleControlsUI(true);
    updateBreakButtons(); // This will disable other buttons
    
    // Start Time Display
    const startTimeStr = btState.startTime.toLocaleTimeString('en-US', {hour12:false, hour:'2-digit', minute:'2-digit'});
    let startDisplay = document.getElementById('bt-start-display');
    if (!startDisplay) {
        startDisplay = document.createElement('div');
        startDisplay.id = 'bt-start-display';
        startDisplay.className = 'bt-start-time-display';
        document.getElementById('bt-timer').after(startDisplay);
    }
    startDisplay.innerText = `Started at: ${startTimeStr}`;
    startDisplay.classList.remove('hidden');

    document.getElementById('bt-alarm-toggle').classList.remove('hidden'); 
    saveBreakData(getCurrentBreakSnapshot());
}
function syncRunningBreak(remoteBreak) {
    if (btState.running) return;
    btState.type = remoteBreak.type;
    btState.limit = remoteBreak.limit;
    btState.startTime = remoteBreak.startTime.toDate ? remoteBreak.startTime.toDate() : new Date(remoteBreak.startTime);
    btState.running = true;

    btState.interval = setInterval(breakTick, 1000);
    breakTick();
    toggleControlsUI(true);
}
function breakTick() {
    const now = new Date();
    const elapsed = Math.floor((now - btState.startTime) / 1000);
    const remaining = btState.limit - elapsed;
    
    let displaySeconds;
    let isOvertime = false;

    if (remaining >= 0) {
        displaySeconds = remaining;
        isOvertime = false;
    } else {
        displaySeconds = Math.abs(remaining);
        isOvertime = true;
    }

    const txt = `${Math.floor(displaySeconds/60).toString().padStart(2,'0')}:${(displaySeconds%60).toString().padStart(2,'0')}`;
    
    // Update Main Timer
    document.getElementById('bt-timer').innerText = txt;
    
    // === UPDATE MINI WIDGET (New) ===
    updateMiniWidget(txt, isOvertime);
    // ================================

    // ... (Keep your existing Time Remaining Widget logic here) ...
    let remEl = document.getElementById('bt-time-remaining');
    // ... (Logic from previous step) ...
    if(!remEl) { /* create logic */ } 
    if(isOvertime) remEl.innerText = "OVERTIME"; // etc...

    // ... (Keep your existing Overtime/Alarm logic here) ...
    const box = document.getElementById('bt-timer-box');
    const status = document.getElementById('bt-status');
    
    if (isOvertime) {
        if (!box.classList.contains('overtime')) {
            box.classList.add('overtime');
            status.innerText = "OVER LIMIT";
            status.className = "bt-status-over";
            playAlarm(); 
            sendSystemNotification("Overtime Alert", "You have exceeded your break limit!");
        }
    } else {
        box.classList.remove('overtime');
        if (status.className !== "bt-status-active") status.className = "bt-status-active"; 
    }
}
function stopBreak() {
    try { stopAlarm(true); } catch(e) {}
    
    // 1. Capture Times
    const endTime = new Date();
    const startTime = btState.startTime; // Get saved start time
    
    const elapsed = Math.floor((endTime - startTime) / 1000);
    const exceeded = elapsed - btState.limit;
    
    let exceedStr = "--";
    let status = "OK"; 
    
    if (exceeded > 0) {
        status = "OVER";
        const m = Math.floor(exceeded / 60);
        const s = exceeded % 60;
        exceedStr = `+${m}m ${s}s`;
    }
    
    if (btState.type === 'personal') {
        btState.bank = (exceeded > 0) ? 0 : (btState.limit - elapsed);
    }

    // 2. Pass BOTH times to the log
    addLogEntry(btState.type, exceedStr, status, startTime, endTime);

    stopLocalTimer();
    saveBreakData(null); 
}
async function cleanGhostFriends() {
    if (!currentUser || !currentUser.friends || currentUser.friends.length === 0) return;

    let hasChanges = false;
    const validFriends = [];
    const checkPromises = [];

    // 1. Check every friend ID to see if the user doc still exists
    currentUser.friends.forEach(fid => {
        const promise = db.collection('users').doc(fid).get()
            .then(doc => {
                if (doc.exists) {
                    validFriends.push(fid);
                } else {
                    console.log(`Removing ghost user: ${fid}`);
                    hasChanges = true;
                }
            })
            .catch(e => {
                // If error (offline etc), keep the friend to be safe
                validFriends.push(fid); 
            });
        checkPromises.push(promise);
    });

    await Promise.all(checkPromises);

    // 2. If we found ghosts, update the database
    if (hasChanges) {
        try {
            await db.collection('users').doc(currentUser.id).update({
                friends: validFriends
            });
            // The listenToNetwork() function will automatically catch this update 
            // and refresh the Sidebar Count and Network Grid.
            console.log("Friend list cleaned.");
        } catch (e) {
            console.error("Error cleaning friends list:", e);
        }
    }
}

function stopLocalTimer() {
    clearInterval(btState.interval);
    btState.running = false;
    document.getElementById('bt-timer').innerText = "00:00";
    document.getElementById('bt-timer-box').classList.remove('overtime');
    
    const startDisplay = document.getElementById('bt-start-display');
    if (startDisplay) startDisplay.classList.add('hidden');
    
    const widget = document.getElementById('bt-mini-widget');
    if (widget) widget.classList.add('hidden');

    const stat = document.getElementById('bt-status');
    stat.innerText = "READY";
    stat.className = "bt-status-ready";
    
    toggleControlsUI(false);
    updateBankDisplay();
    
    // RE-EVALUATE HIERARCHY (This unlocks the next button)
    updateBreakButtons(); 
}

function toggleControlsUI(isRunning) {
    const controls = document.querySelector('.bt-controls');
    const stopBtn = document.getElementById('bt-stop-btn');
    const stat = document.getElementById('bt-status');

    if(isRunning) {
        controls.classList.add('hidden');
        stopBtn.classList.remove('hidden');
        if(stat.innerText === "READY") {
            stat.innerText = btState.type ? btState.type.toUpperCase() : "ACTIVE";
            stat.className = "bt-status-active";
        }
    } else {
        controls.classList.remove('hidden');
        stopBtn.classList.add('hidden');
    }
}
function addLogEntry(type, excess, status, startObj = null, endObj = null) {
    const now = new Date();
    const fmt = (d) => d ? d.toLocaleTimeString('en-US', {hour12:false, hour:'2-digit', minute:'2-digit'}) : "--";
    const logType = type ? type.toUpperCase() : 'UNKNOWN';

    // MERGE LOGIC: If this is "SHIFT" (Clock Out), update the existing row
    if (logType === "SHIFT" && endObj) {
        const shiftRow = btState.logs.find(l => l.type === "SHIFT");
        if (shiftRow) {
            shiftRow.endStr = fmt(endObj);
            // We update the local array, but we DO NOT push a new "break" to DB
            // because Shift times are stored in 'actualLogin/Logout' fields.
            renderBtLogs();
            return; 
        }
    }

    const startStr = fmt(startObj || now);
    const endStr = endObj ? fmt(endObj) : (logType === "SHIFT" ? "Active" : "--");

    const newLog = {
        timestamp: now,
        startStr: startStr,
        endStr: endStr,
        type: logType,
        excess: excess,
        status: status
    };

    // Add to Visual Log
    btState.logs.unshift(newLog);
    if(btState.logs.length > 50) btState.logs = btState.logs.slice(0, 50);
    renderBtLogs();

    // FIRESTORE UPDATE
    // We only push BREAKS to the 'breaks' array. 
    // SHIFT start/end is handled by toggleBtLogin directly into fields.
    if (logType !== "SHIFT" && currentUser) {
        const dateKey = getLogicalDateKey(); 
        db.collection('users').doc(currentUser.id)
          .collection('attendance').doc(dateKey)
          .set({
              breaks: firebase.firestore.FieldValue.arrayUnion(newLog),
              date: dateKey
          }, { merge: true })
          .catch(e => console.error(e));
    }
}
function renderBtLogs() {
    const list = document.getElementById('bt-log-list');
    if(!list) return;
    list.innerHTML = '';
    
    btState.logs.forEach(log => {
        const row = document.createElement('div');
        
        let rowClass = 'bt-log-row';
        if (log.status === 'LATE' || log.status === 'OVER' || log.status === 'EARLY') rowClass += ' bad';
        else rowClass += ' good';

        row.className = rowClass;
        
        // Render 5 Columns
        // Handle backwards compatibility if old logs don't have startStr/endStr
        const s = log.startStr || log.time || "--";
        const e = log.endStr || "--";

        row.innerHTML = `
            <span>${s}</span>
            <span>${e}</span>
            <span>${log.type}</span>
            <span>${log.excess}</span>
            <span class="status-cell">${log.status}</span>
        `;
        
        list.appendChild(row);
    });
}

function copyBtReport() {
    let txt = `BREAK REPORT - ${new Date().toLocaleDateString()}\n`;
    txt += `Name: ${currentUser.displayName}\n`;
    txt += `Company: ${document.getElementById('panel-company').value}\n`;
    txt += `----------------------\n`;
    
    btState.logs.forEach(log => {
        txt += `${log.time} | ${log.type} | Exceed: ${log.excess}\n`;
    });
    
    navigator.clipboard.writeText(txt).then(() => showToast("Report Copied!"));
}

function resetBtLogs() {
    customConfirm("⚠ DELETE LOGS?\nThis will permanently delete the Attendance & Break history for this shift from the database.", async () => {
        
        // 1. Get the Key (e.g., '2025-12-27')
        const dateKey = getLogicalDateKey();

        // 2. Delete from Firestore
        if (currentUser) {
            try {
                await db.collection('users').doc(currentUser.id)
                    .collection('attendance').doc(dateKey)
                    .delete();
                showToast("Database record deleted.");
            } catch (e) {
                console.error(e);
                showToast("Error deleting from DB", "error");
            }
        }

        // 3. Reset Local State
        btState.logs = [];
        btState.bank = 600; // Reset PB to 10m
        btState.usedBreaks = []; // Unlock buttons
        btState.isLoggedIn = false; // Log out
        
        // 4. Update UI
        renderBtLogs();
        updateBankDisplay();
        updateBreakButtons();
        updateLoginBtn();
        
        // 5. Save the "Empty" state to the User Doc
        saveBreakData(null);
    });
}
btState.restDays = [0, 6]; // Default Sun(0), Sat(6)

// --- REST DAY LOGIC ---
function toggleRestDay(dayIndex) {
    const btn = document.querySelector(`.day-btn[data-day="${dayIndex}"]`);
    
    // Toggle Visuals
    if (btState.restDays.includes(dayIndex)) {
        // Remove
        btState.restDays = btState.restDays.filter(d => d !== dayIndex);
        btn.classList.remove('active');
    } else {
        // Add
        btState.restDays.push(dayIndex);
        btn.classList.add('active');
    }
    
    // Save to Cloud
    saveBreakData(btState.running ? getCurrentBreakSnapshot() : null);
}

function renderRestDayButtons() {
    // Reset all
    document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
    
    // Apply Active class based on state
    btState.restDays.forEach(dayIndex => {
        const btn = document.querySelector(`.day-btn[data-day="${dayIndex}"]`);
        if(btn) btn.classList.add('active');
    });
}

function initAudio() {
    if (!btAudioCtx) {
        btAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}
function playAlarm() {
    // Visuals
    const icon = document.getElementById('bt-alarm-toggle');
    if(icon) icon.classList.add('active');

    // 1. Oscillator Beep
    if (alarmType === 'beep') {
        if (!btAudioCtx) initAudio();
        if (btAudioCtx.state === 'suspended') btAudioCtx.resume();
        btOscillator = btAudioCtx.createOscillator();
        const gain = btAudioCtx.createGain();
        btOscillator.type = 'square'; 
        btOscillator.frequency.setValueAtTime(800, btAudioCtx.currentTime);
        btOscillator.connect(gain);
        gain.connect(btAudioCtx.destination);
        btOscillator.start();
        const now = btAudioCtx.currentTime;
        gain.gain.setValueAtTime(1, now);
        gain.gain.setValueAtTime(0, now + 0.2);
        gain.gain.setValueAtTime(1, now + 0.4);
    } 
    // 2. MP3 Sounds
    else {
        let src = '';
        if (alarmType === 'rooster') src = 'assets/rooster.mp3';
        else if (alarmType === 'school') src = 'assets/school.mp3';
        else if (alarmType === 'cuckoo') src = 'assets/cuckoo.mp3';
        else if (alarmType === 'elise') src = 'assets/fur-elise.mp3';
        else if (alarmType.startsWith('slot')) src = `assets/${alarmType}.mp3`;
        
        if(src) {
            const audio = new Audio(src);
            audio.play();
        }
    }
}

function stopAlarm() {
    if (btOscillator) {
        btOscillator.stop();
        btOscillator.disconnect();
        btOscillator = null;
    }
}

// Realtime Clock (HH:MM:SS)
setInterval(() => {
    const now = new Date();
    const el = document.getElementById('bt-realtime');
    if(el) el.innerText = now.toLocaleTimeString('en-US', {hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit'});
}, 1000);
function formatDateKey(date) {
    return date.toISOString().split('T')[0]; // Returns "2025-12-26"
}
/* --- ATTENDANCE REPORT LOGIC --- */

function openAttendanceModal() {
    // 1. Reset to Standard by default (or load from localStorage if you prefer preference persistence)
    document.querySelector('input[name="attPeriodType"][value="standard"]').checked = true;
    
    toggleAttDateInputs(); 
    openModal('attendance-summary-modal');
    generateAttendanceReport();
    feather.replace();
}

function toggleAttDateInputs() {
    const type = document.querySelector('input[name="attPeriodType"]:checked').value;
    const cycleWrap = document.getElementById('att-cycle-wrapper');
    
    if (type === 'irregular') {
        // Show Cycle Dropdown
        cycleWrap.classList.remove('hidden');
        populateIrregularCycles(); // Fill dropdown
    } else {
        // Standard Mode: Hide dropdown, Auto-set Standard Dates
        cycleWrap.classList.add('hidden');
        setStandardDates();
    }
}
function setStandardDates() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();

    let start, end;

    if (day <= 15) {
        start = new Date(year, month, 1);
        end = new Date(year, month, 15);
    } else {
        start = new Date(year, month, 16);
        end = new Date(year, month + 1, 0); // Last day of month
    }

    setInputs(start, end);
}
function populateIrregularCycles() {
    const select = document.getElementById('att-cycle-select');
    select.innerHTML = ""; // Clear
    
    const now = new Date();
    // Generate current cycle + previous 3 cycles
    // We iterate "backwards" through potential cutoffs
    
    let cycles = [];
    
    // We'll generate a few months back/forward to find relevant ranges
    for (let i = -2; i <= 1; i++) {
        let y = now.getFullYear();
        let m = now.getMonth() + i;
        
        // Cycle A: 11th to 25th of Month M
        let startA = new Date(y, m, 11);
        let endA = new Date(y, m, 25);
        cycles.push({ start: startA, end: endA });

        // Cycle B: 26th of Month M to 10th of Month M+1
        let startB = new Date(y, m, 26);
        let endB = new Date(y, m + 1, 10);
        cycles.push({ start: startB, end: endB });
    }

    // Sort by date descending (Newest first)
    cycles.sort((a, b) => b.start - a.start);

    // Create Options
    cycles.forEach(c => {
        const sStr = formatDateKey(c.start);
        const eStr = formatDateKey(c.end);
        const label = `${c.start.toLocaleDateString('en-US', {month:'short', day:'numeric'})} - ${c.end.toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})}`;
        
        const opt = document.createElement('option');
        opt.value = `${sStr}|${eStr}`;
        opt.innerText = label;
        
        // Select if "Now" falls inside this cycle
        if (now >= c.start && now <= c.end) opt.selected = true;
        
        select.appendChild(opt);
    });

    // Apply the selection immediately
    applyCycleDates();
}

// 3. APPLY DROPDOWN SELECTION
function applyCycleDates() {
    const val = document.getElementById('att-cycle-select').value;
    if (!val) return;
    
    const [startStr, endStr] = val.split('|');
    document.getElementById('att-start-date').value = startStr;
    document.getElementById('att-end-date').value = endStr;
    
    // Update Label
    document.getElementById('lbl-smart-range').innerText = "Selected Cycle";
}

// Helper
function setInputs(start, end) {
    document.getElementById('att-start-date').value = formatDateKey(start);
    document.getElementById('att-end-date').value = formatDateKey(end);
    
    const label = `${start.toLocaleDateString('en-US', {month:'short', day:'numeric'})} - ${end.toLocaleDateString('en-US', {month:'short', day:'numeric'})}`;
    document.getElementById('lbl-smart-range').innerText = label;
}

function toggleAttDateInputs() {
    const radio = document.querySelector('input[name="attPeriodType"]:checked');
    const cycleWrap = document.getElementById('att-cycle-wrapper');
    
    // Safety check to prevent the "null" error
    if (!radio || !cycleWrap) return;

    if (radio.value === 'irregular') {
        // Show Dropdown
        cycleWrap.classList.remove('hidden');
        populateIrregularCycles(); 
    } else {
        // Standard: Hide Dropdown, Auto-calc dates
        cycleWrap.classList.add('hidden');
        setStandardDates();
    }
}
let alarmType = localStorage.getItem('vibe_alarm_type') || 'beep'; 

function toggleAlarmMenu() {
    const menu = document.getElementById('bt-alarm-menu');
    const wasHidden = menu.classList.contains('hidden');
    
    // 1. Toggle Visibility
    menu.classList.toggle('hidden');

    // 2. IF we just opened it (it was hidden, now we are showing it)
    if (wasHidden) {
        // Retrieve the saved setting
        const savedType = localStorage.getItem('vibe_alarm_type') || 'beep';
        
        // Force the highlight immediately
        highlightSelectedAlarm(savedType);
    }
}

function setAlarmType(type) {
    // 1. Save Preference
    alarmType = type;
    localStorage.setItem('vibe_alarm_type', type);
    
    // 2. Update Label (Updates BOTH tools now)
    updateAlarmLabel(type);
    
    // 3. Update the List Highlighting (Visuals)
    highlightSelectedAlarm(type);
    
    showToast(`Alarm set to: ${type.toUpperCase()}`);

    // 4. Close Menus (Both Break Tool and Alarm Tool menus)
    setTimeout(() => {
        document.querySelectorAll('.alarm-menu').forEach(el => el.classList.add('hidden'));
    }, 500);
}
function triggerBeep() {
    if (!btAudioCtx) return;
    const osc = btAudioCtx.createOscillator();
    const gain = btAudioCtx.createGain();

    osc.type = 'square'; // Nasty, loud wave type
    osc.frequency.setValueAtTime(850, btAudioCtx.currentTime); // High pitch
    
    osc.connect(gain);
    gain.connect(btAudioCtx.destination);

    osc.start();
    
    // Fade out quickly (0.2 seconds duration)
    const now = btAudioCtx.currentTime;
    gain.gain.setValueAtTime(1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    
    osc.stop(now + 0.5);
}

function playAlarm() {
    // Visuals: Pulse Red
    const icon = document.getElementById('bt-alarm-toggle');
    if(icon) icon.classList.add('active');

    // Stop previous sounds (but keep visual if we are just switching tracks)
    stopAudioOnly();

    // A. BEEP (Generated)
    if (alarmType === 'beep') {
        if (!btAudioCtx) initAudio();
        if (btAudioCtx.state === 'suspended') btAudioCtx.resume();
        
        triggerSmoothBeep(); // Play 1st immediately
        beepInterval = setInterval(triggerSmoothBeep, 1200); // Loop every 1.2s
    } 
    // B. MP3 (File)
    else {
        let filename = '';
        switch(alarmType) {
            case 'rooster': filename = 'rooster.mp3'; break;
            case 'school':  filename = 'school.mp3'; break;
            case 'cuckoo':  filename = 'cuckoo.mp3'; break;
            case 'elise':   filename = 'fur-elise.mp3'; break;
            default:        filename = `${alarmType}.mp3`; break; 
        }

        activeAudio = new Audio(`assets/${filename}`);
        
        // --- THE FIX: FORCE LOOPING ---
        activeAudio.loop = true; 
        // ------------------------------

        activeAudio.play().catch(e => {
            console.error("Audio Error:", e);
            showToast(`Missing: assets/${filename}`, "error");
        });
    }
}
function triggerSmoothBeep() {
    if (!btAudioCtx) return;
    const osc = btAudioCtx.createOscillator();
    const gain = btAudioCtx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(850, btAudioCtx.currentTime);
    osc.connect(gain);
    gain.connect(btAudioCtx.destination);
    
    const now = btAudioCtx.currentTime;
    osc.start(now);
    
    // Envelope: Fade In -> Sustain -> Fade Out
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + 0.05);
    gain.gain.setValueAtTime(1, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    
    osc.stop(now + 0.8);
}
function stopAudioOnly() {
    if (beepInterval) { clearInterval(beepInterval); beepInterval = null; }
    if (activeAudio) { activeAudio.pause(); activeAudio.currentTime = 0; activeAudio = null; }
}

// 4. Stop Alarm
function stopAlarm() {
    stopAudioOnly();
    
    // Reset UI
    const icon = document.getElementById('bt-alarm-toggle');
    if(icon) icon.classList.remove('active');
    document.getElementById('bt-timer-box').classList.remove('overtime');
    
    // Reset Test Buttons
    resetTestButtons();
    currentTestType = null;
}
function resetTestButtons() {
    document.querySelectorAll('.test-btn').forEach(btn => {
        btn.innerText = "Test";
        btn.classList.add('hidden'); // Hide all
    });
    document.querySelectorAll('.alarm-opt-row').forEach(row => {
        row.classList.remove('active-test-row');
    });
}

function testSound(type, btn) {
    // PREVENT BUBBLING (So it doesn't trigger the "Set Alarm" click on the row)
    if(window.event) window.event.stopPropagation();

    // CASE 1: STOP (If clicking the same button while it's playing)
    if (currentTestType === type) {
        stopAlarm();
        return;
    }

    // CASE 2: START (Or Switch)
    // First, stop whatever was playing
    stopAlarm();

    // Set Tracking
    currentTestType = type;

    // Update UI for THIS button
    btn.innerText = "Stop";
    btn.classList.remove('hidden');
    btn.closest('.alarm-opt-row').classList.add('active-test-row'); // Lock visibility

    // Swap Preference Temporarily to Play
    const originalPref = alarmType;
    alarmType = type;
    playAlarm();
    alarmType = originalPref; // Restore user preference immediately (test continues running)
}


let fetchedRecords = []; // Store for detailed view

async function generateAttendanceReport() {
    const startStr = document.getElementById('att-start-date').value;
    const endStr = document.getElementById('att-end-date').value;
    
    // Config Data
    const sStart = document.getElementById('bt-shift-start').value || "00:00";
    const sEnd = document.getElementById('bt-shift-end').value || "00:00";
    const displayShift = `${tConvert(sStart)}-${tConvert(sEnd)}`;

    // Rest Days
    const rd1 = parseInt(document.getElementById('bt-rd-1').value || '0');
    const rd2 = parseInt(document.getElementById('bt-rd-2').value || '6');
    const restDaysArr = [rd1, rd2]; 

    const tbody = document.getElementById('att-summary-body');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">Loading data...</td></tr>';

    try {
        const snap = await db.collection('users').doc(currentUser.id)
            .collection('attendance')
            .where(firebase.firestore.FieldPath.documentId(), '>=', startStr)
            .where(firebase.firestore.FieldPath.documentId(), '<=', endStr)
            .get();

        const recordMap = {};
        snap.forEach(doc => recordMap[doc.id] = doc.data());

        // Date Setup
        let currentDate = new Date(startStr);
        const endDate = new Date(endStr);
        const now = new Date();
        const todayKey = formatDateKey(now);
        const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayKey = formatDateKey(yesterday);
        
        // Stats
        let daysPresent = 0, daysAbsent = 0, totalLate = 0, totalHours = 0;
        fetchedRecords = []; 

        while (currentDate <= endDate) {
            const dateKey = formatDateKey(currentDate);
            const dayOfWeek = currentDate.getDay(); 
            const isRestDay = restDaysArr.includes(dayOfWeek);
            const record = recordMap[dateKey];

            // Default
            let status = "", shiftSched = displayShift, biologs = "NO LOGS", late = 0, hrs = 0;

            if (record) {
                // --- VISUAL FIX START ---
                let logoutDisplay = '--';
                
                if (record.actualLogout) {
                    logoutDisplay = tConvert(record.actualLogout);
                    status = "Present";
                } else if (record.actualLogin) {
                    // Logic: Only show "Active" for Today or Yesterday
                    if (dateKey === todayKey || dateKey === yesterdayKey) {
                        logoutDisplay = "Active";
                        status = "Active";
                    } else {
                        // Anything older is forced to look closed
                        logoutDisplay = `${tConvert(sEnd)}*`; 
                        status = "Auto-End";
                    }
                }
                // --- VISUAL FIX END ---

                daysPresent++;
                late = record.lateMinutes || 0;
                totalLate += late;
                biologs = `${tConvert(record.actualLogin)} - ${logoutDisplay}`;
                
                if(isRestDay) shiftSched = "REST DAY (Worked)";
                if (status === "Present" || status === "Auto-End") hrs = 9.0;
                totalHours += hrs;

            } else {
                if (isRestDay) { status = "REST DAY"; shiftSched = "REST DAY"; } 
                else { status = "ABSENT"; daysAbsent++; }
            }

            fetchedRecords.push({
                date: dateKey,
                day: currentDate.toLocaleDateString('en-US', {weekday:'short'}),
                shift: shiftSched,
                biologs: biologs,
                late: late,
                hours: hrs
            });

            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Summary Row
        tbody.innerHTML = '';
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="font-weight:bold; color:var(--primary)">${currentUser.displayName}</td>
            <td>${daysPresent}</td>
            <td class="${daysAbsent > 0 ? 'text-danger' : ''}">${daysAbsent}</td>
            <td class="${totalLate > 0 ? 'text-danger' : ''}">${totalLate}</td>
            <td>0</td>
            <td style="font-weight:bold">${totalHours.toFixed(2)}</td>
        `;
        row.onclick = () => openDetailModal(startStr, endStr);
        tbody.appendChild(row);

    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red">Error loading report</td></tr>';
    }
}

function tConvert(time) {
    if (!time) return "--";
    
    // Check if input is empty or invalid
    if (!time.includes(':')) return time;

    // Split "14:30:00" or "9:05"
    let [h, m] = time.split(':');
    
    // Ensure 2 digits (e.g., "9" becomes "09")
    // Returns "14:30"
    return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
}

function openDetailModal(start, end) {
    document.getElementById('att-detail-title').innerText = `Detailed Attendance (${start} to ${end})`;
    
    const tbody = document.getElementById('att-detail-body');
    tbody.innerHTML = '';

    // --- FIX: Use 'date' instead of 'id' ---
    fetchedRecords.sort((a, b) => a.date.localeCompare(b.date));

    fetchedRecords.forEach(rec => {
        const tr = document.createElement('tr');
        
        let rowClass = "";
        // Optional styling for clarity
        if(rec.shift === "REST DAY") rowClass = "text-muted"; 
        if(rec.biologs === "NO LOGS" && rec.shift !== "REST DAY") rowClass = "text-danger";

        // Render Row
        tr.innerHTML = `
            <td class="${rowClass}">${rec.date}</td>
            <td class="${rowClass}">${rec.day}</td>
            <td class="${rowClass}" style="font-weight:700;">${rec.shift}</td>
            <td class="${rowClass}" style="font-weight:600">${rec.biologs}</td>
            <td class="${rec.late > 0 ? 'text-danger' : ''}">${rec.late > 0 ? rec.late : 0}</td>
            <td>${rec.hours ? rec.hours.toFixed(2) : '0.00'}</td>
        `;
        tbody.appendChild(tr);
    });

    closeModal('attendance-summary-modal');
    openModal('attendance-detail-modal');
}
function copyAttendanceDetail() {
    if (!fetchedRecords || fetchedRecords.length === 0) {
        return showToast("No data to copy", "error");
    }

    // 1. Header Info
    let txt = `ATTENDANCE REPORT\n`;
    txt += `Name: ${currentUser.displayName}\n`;
    txt += `${document.getElementById('att-detail-title').innerText}\n\n`;
    
    // 2. Column Headers (Tab Separated for Excel)
    txt += `Date\tDay\tShift Schedule\tBiologs\tLate\tTotal Hours\n`;
    
    // 3. Rows
    fetchedRecords.forEach(rec => {
        // Clean up text to ensure no accidental newlines break the copy
        const shift = rec.shift.replace(/\n/g, ' ');
        const bio = rec.biologs.replace(/\n/g, ' ');

        txt += `${rec.date}\t${rec.day}\t${rec.shiftType}\t${shift}\t${bio}\t${rec.late}\t${rec.hours.toFixed(2)}\n`;
    });

    // 4. Copy to Clipboard
    navigator.clipboard.writeText(txt).then(() => {
        showToast("Copied! Paste into Excel/Sheets.");
    }).catch(err => {
        console.error('Failed to copy: ', err);
        showToast("Failed to copy", "error");
    });
}
/* --- MINI TOOLS LOGIC --- */

// Load Saved Notes
const savedNotes = localStorage.getItem('vibe_notes');
if(savedNotes) document.getElementById('mt-notepad-area').value = savedNotes;

// Global Z-Index Counter (starts high to float above everything)
let activeToolZIndex = 5000; 

function toggleMiniTool(id) {
    const tool = document.getElementById(`tool-${id}`);
    if (!tool) return;

    // 1. Toggle the Main Window
    const isClosing = !tool.classList.contains('hidden');
    tool.classList.toggle('hidden');

    // 2. SPECIAL HANDLING FOR BREAK TOOL
    if (id === 'break') {
        const widget = document.getElementById('bt-mini-widget');
        
        if (isClosing) {
            // We just CLOSED the window. 
            // If timer is running, SHOW widget.
            if (btState.running) {
                if (widget) widget.classList.remove('hidden');
                else updateMiniWidget(document.getElementById('bt-timer').innerText, false); // Init if missing
            }
        } else {
            // We just OPENED the window.
            // Always HIDE widget.
            if (widget) widget.classList.add('hidden');
            
            // Bring to front logic (existing)
            bringToolToFront(tool);
            
            // Center on mobile if opening
            if(window.innerWidth <= 768) {
                tool.style.left = '50%';
                tool.style.top = '50%';
                tool.style.transform = 'translate(-50%, -50%)';
            }
        }
    } else {
        // Normal behavior for other tools
        if (!tool.classList.contains('hidden')) bringToolToFront(tool);
    }
    
    feather.replace();
}

function bringToolToFront(el) {
    activeToolZIndex++;
    el.style.zIndex = activeToolZIndex;
}

function calcInput(val) {
    document.getElementById('calc-display').value += val;
}

function calcEval() {
    try {
        const d = document.getElementById('calc-display');
        d.value = eval(d.value); // Simple eval for Calculator
    } catch(e) {
        document.getElementById('calc-display').value = "Error";
    }
}
function openBreakHistoryModal() {
    // Set default month to current
    const now = new Date();
    const y = now.getFullYear();
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    document.getElementById('break-hist-month').value = `${y}-${m}`;
    
    openModal('break-history-modal');
    loadBreakHistory();
}

async function loadBreakHistory() {
    const monthInput = document.getElementById('break-hist-month').value;
    if (!monthInput) return;

    const tbody = document.getElementById('break-hist-body');
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px; color:gray;">Loading records...</td></tr>';
    const startKey = `${monthInput}-01`; const endKey = `${monthInput}-31`;

    try {
        const snap = await db.collection('users').doc(currentUser.id)
            .collection('attendance')
            .where(firebase.firestore.FieldPath.documentId(), '>=', startKey)
            .where(firebase.firestore.FieldPath.documentId(), '<=', endKey)
            .get();

        tbody.innerHTML = '';
        if (snap.empty) { tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">No records.</td></tr>'; return; }

        const docs = snap.docs.sort((a,b) => a.id.localeCompare(b.id));

        docs.forEach(doc => {
            const data = doc.data();
            const dateStr = doc.id;
            const logs = data.breaks || [];

            let b1T = "--", b1S = "";
            let lnT = "--", lnS = "";
            let b2T = "--", b2S = "";
            let pbTimes = [], pbStats = [];

            const getStatHTML = (log) => {
                const isBad = (log.status !== 'OK' && log.status !== 'ON TIME');
                return `<span style="color:${isBad ? 'var(--danger)' : 'var(--success)'}; font-weight:700; font-size:10px;">${isBad ? (log.excess || 'OVER') : 'OK'}</span>`;
            };

            logs.forEach(log => {
                // FIXED: Normalize Type (remove spaces, uppercase)
                const t = (log.type || "").toUpperCase().replace(/\s/g, ''); 
                
                const timeStr = `<span style="font-size:11px;">${log.startStr}-${log.endStr}</span>`;
                const stat = getStatHTML(log);

                // Broader Matching
                if (t.includes('BREAK1') || t.includes('FIRST')) { b1T = timeStr; b1S = stat; }
                else if (t.includes('LUNCH')) { lnT = timeStr; lnS = stat; }
                else if (t.includes('BREAK2') || t.includes('SECOND')) { b2T = timeStr; b2S = stat; }
                else if (t.includes('PERSONAL')) { pbTimes.push(timeStr); pbStats.push(stat); }
            });

            const pbT = pbTimes.length ? pbTimes.join('<br>') : "--";
            const pbS = pbStats.length ? pbStats.join('<br>') : "";

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight:600;">${dateStr}</td>
                <td>${b1T}</td> <td>${b1S}</td>
                <td>${lnT}</td> <td>${lnS}</td>
                <td>${b2T}</td> <td>${b2S}</td>
                <td>${pbT}</td> <td>${pbS}</td>
                <td style="text-align:center;"><button class="icon-btn-tiny danger" onclick="deleteAttendanceRecord('${dateStr}')"><i data-feather="trash-2" style="width:12px;"></i></button></td>
            `;
            tbody.appendChild(tr);
        });
        feather.replace();
    } catch (e) { console.error(e); }
}
function deleteAttendanceRecord(dateKey) {
    if (!confirm(`PERMANENTLY DELETE record for ${dateKey}?\nThis cannot be undone.`)) return;

    db.collection('users').doc(currentUser.id)
        .collection('attendance').doc(dateKey)
        .delete()
        .then(() => {
            showToast("Record Deleted");
            loadBreakHistory(); // Refresh the table
            
            // If deleting the CURRENT day, also clear the local view
            const todayKey = getLogicalDateKey();
            if (dateKey === todayKey) {
                btState.logs = [];
                btState.bank = 600;
                btState.usedBreaks = [];
                btState.isLoggedIn = false;
                renderBtLogs();
                updateBankDisplay();
                updateLoginBtn();
                saveBreakData(null); // Clear local "Active" state
            }
        })
        .catch(e => showToast("Error: " + e.message, "error"));
}
function getLogicalDateKey() {
    const now = new Date();
    const startInput = document.getElementById('bt-shift-start');
    
    // Default to today if input is missing
    if (!startInput || !startInput.value) return formatDateKey(now);

    // Parse Input (e.g., "20:00")
    const [sH, sM] = startInput.value.split(':').map(Number);
    let shiftStart = new Date(now);
    shiftStart.setHours(sH, sM, 0, 0);

    // NIGHT SHIFT CHECK:
    // If "Shift Start" is > 12 hours in the future (e.g., Now is 4AM, Start is 8PM),
    // it means the shift actually started YESTERDAY.
    const diff = shiftStart - now;
    if (diff > 12 * 60 * 60 * 1000) {
        shiftStart.setDate(shiftStart.getDate() - 1);
    }

    return formatDateKey(shiftStart); // Returns YYYY-MM-DD
}

function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Helper for YYYY-MM-DD
function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
const YOUTUBE_API_KEY = 'AIzaSyBZLvS2lYhXJMC-i3dpRf2J3iS-XCFwbG4';
function handleMusicKey(e) {
    if (e.key === 'Enter') searchVibeMusic();
}

async function searchVibeMusic() {
    const query = document.getElementById('vibe-search-input').value.trim();
    if (!query) return;

    const list = document.getElementById('vibe-playlist');
    list.innerHTML = '<div style="padding:10px; text-align:center; color:gray;">Searching vibes...</div>';

    try {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&q=${query}&type=video&videoEmbeddable=true&videoCategoryId=10&regionCode=PH&key=${YOUTUBE_API_KEY}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.items && data.items.length > 0) {
            renderSearchResults(data.items);
            document.getElementById('vibe-reset-btn').classList.remove('hidden'); // Show "Back" button
        } else {
            list.innerHTML = '<div style="padding:10px; text-align:center;">No playable tracks found.</div>';
        }

    } catch (e) {
        console.error(e);
        list.innerHTML = '<div style="padding:10px; text-align:center; color:var(--danger)">Error: Check API Key</div>';
    }
}

function renderSearchResults(items) {
    const list = document.getElementById('vibe-playlist');
    list.innerHTML = ''; 
    activeQueue = []; 

    const h = document.createElement('div');
    h.style.cssText = "font-size:10px; font-weight:800; color:var(--primary); margin:10px 0; letter-spacing:1px;";
    h.innerText = "SEARCH RESULTS";
    list.appendChild(h);

    items.forEach(item => {
        const title = item.snippet.title;
        const videoId = item.id.videoId;
        
        // Add to Queue
        activeQueue.push({ title: title, id: videoId });

        // Decode Title
        const txt = document.createElement('textarea');
        txt.innerHTML = title;
        const cleanTitle = txt.value;

        const i = document.createElement('div');
        i.className = 'bulletin-item';
        
        // --- UPDATED HTML STRUCTURE ---
        i.innerHTML = `
            <div style="overflow:hidden; margin-right:8px;">
                <div style="font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${cleanTitle}</div>
                <div style="font-size:9px; color:var(--text-muted)">${item.snippet.channelTitle}</div>
            </div>
            
            <div class="vibe-item-actions">
                <i data-feather="play-circle" style="width:14px;"></i>
                <button class="btn-vibe-remove" title="Remove" onclick="removeFromVibeList('${videoId}', this, event)">
                    <i data-feather="x" style="width:12px;"></i>
                </button>
            </div>
        `;
        i.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border); cursor:pointer;";
        
        // Play Logic
        i.onclick = () => {
            playLofi(videoId);
            document.querySelectorAll('.bulletin-item').forEach(x => x.style.color = '');
            i.style.color = 'var(--primary)';
        };
        list.appendChild(i);
    });
    feather.replace();
}
async function fetchAndRenderNotes() {
    const container = document.getElementById('saved-notes-container');
    container.innerHTML = ''; // Clear previous content
    
    if (!currentUser) {
        container.innerHTML = '<div style="padding:10px; color:gray; text-align:center;">Sign in to save notes.</div>';
        return;
    }

    try {
        const notesQuery = await db.collection('users').doc(currentUser.id).collection('notes')
            .orderBy('timestamp', 'desc') // Order by most recent
            .limit(50) // Limit to prevent excessive reads
            .get();

        if (notesQuery.empty) {
            container.innerHTML = '<div style="padding:10px; color:gray; text-align:center;">No saved notes.</div>';
            return;
        }

        notesQuery.forEach(doc => {
            const note = doc.data();
            const noteId = doc.id; // Needed for deletion

            const div = document.createElement('div');
            div.className = 'saved-note-item';
            // Truncate long notes for display
            const displaySnippet = note.text.length > 80 ? note.text.substring(0, 80) + '...' : note.text;
            div.innerHTML = `
                <div style="flex-grow:1; cursor:pointer;" onclick="loadNoteIntoEditor('${noteId}', this)">${escapeHtml(displaySnippet)}</div>
                <div style="font-size:10px; color:var(--text-muted); white-space:nowrap;">${note.date ? new Date(note.timestamp.toDate()).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</div>
                <button class="icon-btn-tiny danger" title="Delete" onclick="deleteNote('${noteId}', event)"><i data-feather="trash-2" style="width:12px;"></i></button>
            `;
            container.appendChild(div);
        });
        feather.replace();

    } catch (error) {
        console.error("Error fetching notes:", error);
        container.innerHTML = '<div style="padding:10px; color:red; text-align:center;">Error loading notes.</div>';
    }
}

// Load a specific note back into the editor
function loadNoteIntoEditor(noteId, element) {
    // Find the full text content (might need to adjust if you store it differently)
    // For simplicity, we'll re-fetch if needed, or access it if available
    // Let's assume 'element' has parent nodes that contain the note data.
    // A simpler approach is to store the full text in a data attribute on the div.

    // **Simplest approach:** Re-fetch the note data by ID to get the full text
    db.collection('users').doc(currentUser.id).collection('notes').doc(noteId).get()
        .then(doc => {
            if (doc.exists) {
                const note = doc.data();
                document.getElementById('mt-notepad-area').value = note.text;
                // Optionally store the ID so we know it's an edit vs new save
                document.getElementById('mt-notepad-area').dataset.editingNoteId = noteId; 
                toggleNoteList(); // Close the list view
            }
        }).catch(e => console.error("Error loading note for edit:", e));
}

// Delete a specific note
async function deleteNote(noteId, event) {
    event.stopPropagation(); // Prevent opening the note editor
    if (!currentUser) return;

    customConfirm("Delete this note permanently?", async () => {
        try {
            await db.collection('users').doc(currentUser.id).collection('notes').doc(noteId).delete();
            showToast("Note deleted");
            fetchAndRenderNotes(); // Refresh the list
        } catch (error) {
            console.error("Error deleting note:", error);
            showToast("Could not delete note", "error");
        }
    });
}


// Copy note to clipboard
function copyNote() {
    const text = document.getElementById('mt-notepad-area').value.trim();
    if(!text) return;
    navigator.clipboard.writeText(text).then(() => showToast("Note copied!"));
}

// Clear editor and reset edit mode
function clearNote() {
    document.getElementById('mt-notepad-area').value = '';
    document.getElementById('mt-notepad-area').removeAttribute('data-editing-note-id'); // Clear edit mode
    // Don't clear localStorage if you still want current session saved
    // localStorage.setItem('vibe_notes', ''); 
}

// Save or Update note
async function saveNote() {
    const editor = document.getElementById('mt-notepad-area');
    const text = editor.value.trim();
    if(!text) return;

    const noteId = editor.dataset.editingNoteId;
    const noteData = { text: text, timestamp: new Date(), date: new Date().toLocaleString() };

    if (noteId) {
        await db.collection('users').doc(currentUser.id).collection('notes').doc(noteId).update(noteData);
    } else {
        await db.collection('users').doc(currentUser.id).collection('notes').add(noteData);
    }

    showToast("Note saved");
    editor.value = '';
    editor.removeAttribute('data-editing-note-id');
    
    // Refresh list if open
    if (!document.getElementById('mt-note-list').classList.contains('hidden')) {
        fetchAndRenderNotes(); 
    }
}

// View List (toggle)
let isNoteSelectMode = false;
let selectedNoteIds = new Set();

// 1. Toggle List View (Updated Header)
function toggleNoteList() {
    const list = document.getElementById('mt-note-list');
    list.classList.toggle('hidden');
    
    if (!list.classList.contains('hidden')) {
        isNoteSelectMode = false;
        selectedNoteIds.clear();
        updateNoteHeaderUI();
        fetchAndRenderNotes();
    }
}

// 2. Header UI (Inject Buttons)
function updateNoteHeaderUI() {
    let header = document.getElementById('mt-note-header-actions'); 
    // Create header if missing
    if (!header) {
        const titleRow = document.querySelector('#mt-note-list h4');
        if(titleRow) {
             titleRow.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; width:100%"><span>Saved Notes</span><div id="mt-note-header-actions" style="display:flex; gap:5px;"></div></div>`;
             header = document.getElementById('mt-note-header-actions');
        }
    }
    if (!header) return;

    if (isNoteSelectMode) {
        header.innerHTML = `
            <button class="icon-btn-tiny danger" onclick="deleteSelectedNotes()">Delete (${selectedNoteIds.size})</button>
            <button class="icon-btn-tiny" onclick="toggleNoteSelectMode()">Cancel</button>
        `;
    } else {
        // TWEAK: Added New Note (+) Button
        header.innerHTML = `
            <button class="icon-btn-tiny" title="New Note" onclick="handleNewNote()"><i data-feather="plus-square" style="width:14px"></i></button>
            <button class="icon-btn-tiny" title="Select" onclick="toggleNoteSelectMode()"><i data-feather="check-square" style="width:14px"></i></button>
            <button class="icon-btn-tiny" title="Close" onclick="toggleNoteList()"><i data-feather="x" style="width:14px"></i></button>
        `;
        feather.replace();
    }
}

// NEW: Handle New Note Click
async function handleNewNote() {
    const editor = document.getElementById('mt-notepad-area');
    const editingId = editor.dataset.editingNoteId;
    
    // Auto save if editing
    if (editingId && editor.value.trim() !== "") {
        await saveNote(); 
        showToast("Previous note saved");
    }
    
    // Clear Editor
    editor.value = '';
    editor.removeAttribute('data-editing-note-id');
    editor.focus();
    // Close list view
    document.getElementById('mt-note-list').classList.add('hidden');
}

// 3. Toggle Mode
function toggleNoteSelectMode() {
    isNoteSelectMode = !isNoteSelectMode;
    selectedNoteIds.clear();
    const container = document.getElementById('saved-notes-container');
    
    if (isNoteSelectMode) container.classList.add('notes-select-mode');
    else {
        container.classList.remove('notes-select-mode');
        document.querySelectorAll('.note-checkbox').forEach(cb => cb.checked = false);
    }
    updateNoteHeaderUI();
}

// 4. Render (Clears HTML to fix duplicates)
async function fetchAndRenderNotes() {
    const container = document.getElementById('saved-notes-container');
    container.innerHTML = ''; // FIX: Clears previous list
    
    if (!currentUser) return;

    try {
        const snap = await db.collection('users').doc(currentUser.id).collection('notes')
            .orderBy('timestamp', 'desc').limit(50).get();

        if (snap.empty) {
            container.innerHTML = '<div style="padding:10px; color:gray; text-align:center;">No saved notes.</div>';
            return;
        }

        snap.forEach(doc => {
            const note = doc.data();
            const noteId = doc.id;
            const snippet = note.text.length > 80 ? note.text.substring(0, 80) + '...' : note.text;
            
            const div = document.createElement('div');
            div.className = 'saved-note-item';
            div.style.display = 'flex';
            div.style.alignItems = 'center';

            div.innerHTML = `
                <input type="checkbox" class="note-checkbox" onchange="handleNoteSelection('${noteId}', this)">
                <div style="flex-grow:1; cursor:pointer; overflow:hidden;" onclick="handleNoteClick('${noteId}', this)">
                    <div>${escapeHtml(snippet)}</div>
                    <div style="font-size:10px; color:var(--text-muted);">${note.date || ''}</div>
                </div>
                <button class="icon-btn-tiny danger" onclick="deleteNote('${noteId}', event)">
                    <i data-feather="trash-2" style="width:12px;"></i>
                </button>
            `;
            container.appendChild(div);
        });
        
        if (isNoteSelectMode) container.classList.add('notes-select-mode');
        feather.replace();
    } catch (e) { console.error(e); }
}

// 5. Handle Click
function handleNoteClick(id, el) {
    if (isNoteSelectMode) {
        const cb = el.parentElement.querySelector('.note-checkbox');
        cb.checked = !cb.checked;
        handleNoteSelection(id, cb);
    } else {
        loadNoteIntoEditor(id);
    }
}

function handleNoteSelection(id, checkbox) {
    if (checkbox.checked) selectedNoteIds.add(id);
    else selectedNoteIds.delete(id);
    updateNoteHeaderUI();
}

async function deleteSelectedNotes() {
    if (selectedNoteIds.size === 0) return;
    customConfirm(`Delete ${selectedNoteIds.size} notes?`, async () => {
        const batch = db.batch();
        selectedNoteIds.forEach(id => {
            const ref = db.collection('users').doc(currentUser.id).collection('notes').doc(id);
            batch.delete(ref);
        });
        await batch.commit();
        showToast("Notes deleted");
        toggleNoteSelectMode(); 
        fetchAndRenderNotes(); 
    });
}

window.contactAdminForAppeal = contactAdminForAppeal;
async function togglePin(pid, type) {
    // Type can be 'profile' or 'global'
    try {
        const docRef = db.collection('posts').doc(pid);
        const doc = await docRef.get();
        if (!doc.exists) return;

        const data = doc.data();
        let updateData = {};
        let message = "";

        if (type === 'profile') {
            const currentState = data.isPinnedProfile || false;
            updateData = { isPinnedProfile: !currentState };
            message = currentState ? "Unpinned from Profile" : "Pinned to Profile";
        } 
        else if (type === 'global') {
            const currentState = data.isPinnedGlobal || false;
            updateData = { isPinnedGlobal: !currentState };
            message = currentState ? "Unpinned from Global Feed" : "Pinned to Global Feed";
        }

        await docRef.update(updateData);
        showToast(message);
        
    } catch (e) {
        console.error(e);
        showToast("Error updating pin", "error");
    }
}
function updateMiniWidget(timeText, isOvertime) {
    let widget = document.getElementById('bt-mini-widget');
    
    if (!widget) {
        widget = document.createElement('div');
        widget.id = 'bt-mini-widget';
        widget.className = 'hidden';
        if (!widget.style.top) {
    widget.style.top = '100px'; 
    widget.style.right = '20px';
}
        
        // 1. SETUP DRAG (Uses your existing drag physics)
        setupToolDrag(widget, widget); 

        // 2. SMART CLICK LISTENER (Fixes the "Open while dragging" issue)
        let startX = 0;
        let startY = 0;
        let isDragging = false;

        // A. TOUCH START (Mobile)
        widget.addEventListener('touchstart', (e) => {
            const t = e.touches[0];
            startX = t.clientX;
            startY = t.clientY;
            isDragging = false;
        }, { passive: true });

        // B. TOUCH END (Mobile)
        widget.addEventListener('touchend', (e) => {
            const t = e.changedTouches[0];
            const dist = Math.hypot(t.clientX - startX, t.clientY - startY);
            
            // If moved less than 5px, it's a TAP. Otherwise, it's a DRAG.
            if (dist < 5) {
                // PREVENT PROPAGATION here to stop any underlying elements
                if(e.cancelable) e.preventDefault();
                toggleMiniTool('break');
            }
        });

        // C. MOUSE EVENTS (Desktop)
        widget.addEventListener('mousedown', (e) => {
            startX = e.clientX;
            startY = e.clientY;
        });
        
        widget.addEventListener('mouseup', (e) => {
            const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
            if (dist < 5) {
                toggleMiniTool('break');
            }
        });

        widget.innerHTML = `<div id="bt-widget-icon"><i data-feather="clock" style="width:16px"></i></div><span id="bt-widget-time">00:00</span>`;
        document.body.appendChild(widget);
        const screenWidth = window.innerWidth;
    // Approximate width of widget is 100px-150px. 
    // We set a starting left position to center it.
    widget.style.left = (screenWidth / 2 - 60) + 'px'; 
    widget.style.bottom = '30px';
    widget.style.top = ''; // Ensure top isn't set, so bottom works
        feather.replace();
    }

    // UPDATE CONTENT
    const timeEl = document.getElementById('bt-widget-time');
    if(timeEl) timeEl.innerText = timeText;

    if (isOvertime) {
        widget.classList.add('widget-overtime');
        const icon = document.getElementById('bt-widget-icon');
        if(icon) icon.innerHTML = '<i data-feather="alert-circle" style="width:16px; color:var(--danger)"></i>';
        feather.replace();
    } else {
        widget.classList.remove('widget-overtime');
        const icon = document.getElementById('bt-widget-icon');
        if(icon && icon.innerHTML.includes('alert')) {
             icon.innerHTML = '<i data-feather="clock" style="width:16px"></i>';
             feather.replace();
        }
    }
}

// UPDATE updateNoteHeaderUI (Adds New Note Button)
function updateNoteHeaderUI() {
    let header = document.getElementById('mt-note-header-actions'); 
    if (!header) {
        // Inject Header if missing
        const titleRow = document.querySelector('#mt-note-list h4');
        if(titleRow) {
             titleRow.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; width:100%"><span>Saved Notes</span><div id="mt-note-header-actions" style="display:flex; gap:5px;"></div></div>`;
             header = document.getElementById('mt-note-header-actions');
        }
    }
    if (!header) return;

    if (isNoteSelectMode) {
        header.innerHTML = `
            <button class="icon-btn-tiny danger" onclick="deleteSelectedNotes()">Delete (${selectedNoteIds.size})</button>
            <button class="icon-btn-tiny" onclick="toggleNoteSelectMode()">Cancel</button>
        `;
    } else {
        // TWEAK: Added 'New Note' button
        header.innerHTML = `
            <button class="icon-btn-tiny" title="New Note" onclick="handleNewNote()"><i data-feather="plus-square" style="width:14px"></i></button>
            <button class="icon-btn-tiny" title="Select" onclick="toggleNoteSelectMode()"><i data-feather="check-square" style="width:14px"></i></button>
            <button class="icon-btn-tiny" title="Close" onclick="toggleNoteList()"><i data-feather="x" style="width:14px"></i></button>
        `;
        feather.replace();
    }
}
function formatShortName(name) {
    if (!name) return "User";
    const parts = name.trim().split(/\s+/); // Split by spaces
    // If more than 2 words, take First + Last. Else return full.
    if (parts.length > 2) {
        return `${parts[0]} ${parts[parts.length - 1]}`;
    }
    return name;
}
function formatShortAccount(text) {
    if (!text) return "";
    
    // Set this to 12 to ensure "kurufootwear.com" becomes "kurufootwe..."
    const maxLength = 13; 
    
    if (text.length > maxLength) {
        return text.substring(0, maxLength) + "...";
    }
    return text;
}
async function addComment(postId, text) {
    if (!text.trim()) return;
    
    // Create the comment object
    const newComment = {
        userId: currentUser.id,
        displayName: currentUser.displayName,
        avatar: currentUser.avatar,
        text: text,
        timestamp: new Date().toISOString() // Use string for arrays
    };

    try {
        await db.collection('posts').doc(postId).update({
            // arrayUnion adds it to the list inside the document
            comments: firebase.firestore.FieldValue.arrayUnion(newComment)
        });
        showToast("Comment added!");
    } catch (e) {
        console.error(e);
        showToast("Error adding comment", "error");
    }
}
function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

// 2. TRIGGER FILE INPUT (Clicking the Icon)
function triggerCommentUpload(postId) {
    const fileInput = document.getElementById(`file-comment-${postId}`);
    if(fileInput) fileInput.click();
}

// 3. HANDLE FILE SELECTION (From Icon)
function handleCommentFileSelect(inputElement, postId) {
    if (inputElement.files && inputElement.files[0]) {
        // Find the main text input to store data
        const textInput = document.getElementById(`input-comment-${postId}`);
        uploadCommentImage(inputElement.files[0], textInput);
    }
}

// 4. UPLOAD IMAGE (Handles both Paste/Drop AND File Input)
async function uploadCommentImage(file, inputElement) {
    if (!file.type.startsWith('image/')) return showToast("Images only", "error");

    // UI Feedback: Show user something is happening
    const originalPlaceholder = inputElement.placeholder;
    inputElement.placeholder = "Uploading image... ☁️";
    inputElement.disabled = true;

    try {
        const formData = new FormData();
        formData.append("image", file);
        
        // ImgBB Upload
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { 
            method: "POST", body: formData 
        });
        const data = await response.json();

        if (data.success) {
            const url = data.data.url;
            
            // 1. Store URL in dataset (Critical for submitComment)
            inputElement.dataset.attachment = url;
            
            // 2. Show Visual Preview
            // Extract the Post ID from the input ID (e.g. "input-comment-123" -> "123")
            const postId = inputElement.id.replace('input-comment-', '');
            const previewBox = document.getElementById(`preview-comment-${postId}`);
            
            if (previewBox) {
                previewBox.innerHTML = `
                    <div class="comment-preview-item">
                        <img src="${url}">
                        <button class="btn-preview-remove" onclick="removeCommentAttachment('${postId}')">
                            <i data-feather="x" style="width:14px"></i>
                        </button>
                    </div>
                `;
                previewBox.classList.remove('hidden');
                feather.replace();
            }
            inputElement.focus();
        } 
    } catch (e) {
        console.error(e);
        showToast("Upload failed", "error");
    } finally {
        inputElement.disabled = false;
        inputElement.placeholder = originalPlaceholder;
    }
}

// 5. REMOVE ATTACHMENT
function removeCommentAttachment(postId) {
    const input = document.getElementById(`input-comment-${postId}`);
    const previewBox = document.getElementById(`preview-comment-${postId}`);
    const fileInput = document.getElementById(`file-comment-${postId}`);
    
    if(input) input.removeAttribute('data-attachment');
    if(fileInput) fileInput.value = ''; // Reset file input so you can select same file again
    if(previewBox) {
        previewBox.innerHTML = '';
        previewBox.classList.add('hidden');
    }
}

// 6. SUBMIT COMMENT (Combines Text + Attachment)
async function submitComment(postId) {
    const input = document.getElementById(`input-comment-${postId}`);
    const previewBox = document.getElementById(`preview-comment-${postId}`);
    
    let text = input.value.trim();
    const imageUrl = input.dataset.attachment || null;
    
    // 1. CHECK GLOBAL STATE FOR PARENT ID (Critical for indentation)
    const replyState = activeReplies[postId];
    const parentId = replyState ? replyState.id : null;

    if (!text && !imageUrl) return;

    // 2. Append Image URL to text if exists
    if (imageUrl) text = text + " " + imageUrl;

    // 3. Create the robust object
    const newComment = {
        cid: generateId(),
        parentId: parentId, // <--- Links the reply to the parent
        userId: currentUser.id,
        displayName: currentUser.displayName,
        avatar: currentUser.avatar,
        text: text,
        timestamp: new Date().toISOString(),
        likes: [],      // Legacy support
        reactions: {}   // New reaction system support
    };

    try {
        await db.collection('posts').doc(postId).update({
            comments: firebase.firestore.FieldValue.arrayUnion(newComment)
        });
        
        // 4. Cleanup & Reset UI
        input.value = '';
        removeCommentAttachment(postId); // Clears preview & dataset
        cancelReply(postId);             // Hides "Replying to..." indicator
        
        showToast(parentId ? "Reply sent" : "Comment posted");
    } catch (e) {
        console.error(e);
        showToast("Error posting", "error");
    }
}

// 7. DELETE COMMENT (FIXED FOR LEGACY)
async function deleteComment(postId, commentId, timestamp) {
    customConfirm("Delete this comment?", async () => {
        try {
            const docRef = db.collection('posts').doc(postId);
            const doc = await docRef.get();
            if (!doc.exists) return;

            let comments = doc.data().comments || [];
            
            comments = comments.filter(c => {
                // 1. Normal Delete: Match unique ID
                if (c.cid && c.cid === commentId) return false;
                
                // 2. Legacy Delete: Match Timestamp AND User (Backups for old data)
                if (!c.cid && c.timestamp === timestamp && c.userId === currentUser.id) return false;
                
                // 3. Cascade Reply Delete: Remove children where parentId matches this ID
                // (This naturally does nothing if we are deleting a Reply, which is fine)
                if (c.parentId && c.parentId === commentId) return false;

                return true; // Keep everything else
            });

            await docRef.update({ comments: comments });
            showToast("Deleted");
        } catch (e) {
            console.error(e);
            showToast("Error deleting", "error");
        }
    });
}

// 8. LIKE COMMENT LOGIC
async function toggleCommentLike(postId, commentId) {
    try {
        const docRef = db.collection('posts').doc(postId);
        const doc = await docRef.get();
        if(!doc.exists) return;

        let comments = doc.data().comments || [];
        comments = comments.map(c => {
            if(c.cid === commentId) {
                let likes = c.likes || [];
                if(likes.includes(currentUser.id)) likes = likes.filter(id => id !== currentUser.id);
                else likes.push(currentUser.id);
                return { ...c, likes: likes };
            }
            return c;
        });

        await docRef.update({ comments: comments });
    } catch(e) { console.error(e); }
}

// 9. SETUP DRAG & PASTE
function setupCommentDrag(wrapper, input) {
    if (!wrapper || !input) return;

    // A. Handle PASTE (Ctrl+V images)
    input.addEventListener('paste', (e) => {
        if (e.clipboardData && e.clipboardData.files.length > 0) {
            e.preventDefault();
            uploadCommentImage(e.clipboardData.files[0], input);
        }
    });

    // B. Handle DRAG ENTER/LEAVE (Visuals)
    wrapper.addEventListener('dragover', (e) => {
        e.preventDefault(); e.stopPropagation();
        wrapper.classList.add('drag-active');
    });
    
    wrapper.addEventListener('dragleave', (e) => {
        e.preventDefault(); e.stopPropagation();
        wrapper.classList.remove('drag-active');
    });
    
    // C. Handle DROP (The actual upload)
    wrapper.addEventListener('drop', (e) => {
        e.preventDefault(); e.stopPropagation();
        wrapper.classList.remove('drag-active');
        if (e.dataTransfer.files.length > 0) {
            uploadCommentImage(e.dataTransfer.files[0], input);
        }
    });
}
async function reactToComment(postId, commentId, type) {
    try {
        const docRef = db.collection('posts').doc(postId);
        const doc = await docRef.get();
        if(!doc.exists) return;

        let comments = doc.data().comments || [];
        
        // Find and update the specific comment
        comments = comments.map(c => {
            if (c.cid === commentId) {
                // 1. Prepare Reactions Object (Handle Legacy Array data)
                let reactions = c.reactions || {}; 
                
                // If legacy 'likes' array exists, merge it in as 'like' type
                if (c.likes && Array.isArray(c.likes)) {
                    c.likes.forEach(uid => {
                        if (!reactions[uid]) reactions[uid] = 'like';
                    });
                    delete c.likes; // Clean up legacy field
                }

                // 2. Toggle Logic
                if (reactions[currentUser.id] === type) {
                    // Clicking same emoji = Remove (Toggle Off)
                    delete reactions[currentUser.id];
                } else {
                    // Clicking new emoji = Set/Update
                    reactions[currentUser.id] = type;
                }

                return { ...c, reactions: reactions };
            }
            return c;
        });

        // Save back to Firestore
        await docRef.update({ comments: comments });
        // No toast needed for likes (snappy feel)
    } catch(e) { 
        console.error(e); 
        showToast("Error reacting", "error");
    }
}
// 1. GLOBAL STATE (Persists even if HTML re-renders)
let activeReplies = {}; // Format: { postId: { id: 'commentId', name: 'User' } }

// 2. TRIGGER REPLY (Save to Global & Update UI)
function triggerReply(postId, commentId, username) {
    // 1. Set the Global State
    activeReplies[postId] = { 
        id: commentId, 
        name: username 
    };
    
    // 2. Update the UI (Show "Replying to John...")
    updateReplyUI(postId);
    
    // 3. Focus the input immediately
    const input = document.getElementById(`input-comment-${postId}`);
    if (input) input.focus();
}

function cancelReply(postId) {
    // 1. Clear the State
    if (activeReplies[postId]) {
        delete activeReplies[postId];
    }
    
    // 2. Update UI (Hide "Replying to...")
    updateReplyUI(postId);
}

// 3. CANCEL REPLY
function cancelReply(postId) {
    // Clear state
    delete activeReplies[postId];
    
    // Update UI
    updateReplyUI(postId);
}

// 4. UI UPDATER (Runs on Click AND on Render)
function updateReplyUI(postId) {
    const indicator = document.getElementById(`reply-indicator-${postId}`);
    const textSpan = document.getElementById(`reply-target-${postId}`);
    const input = document.getElementById(`input-comment-${postId}`);
    
    if (!indicator || !input) return;

    const state = activeReplies[postId];

    if (state) {
        // Active Mode
        textSpan.innerHTML = `Replying to <span>${state.name}</span>`;
        indicator.classList.remove('hidden');
        input.placeholder = `Reply to ${state.name}...`;
        input.focus();
    } else {
        // Normal Mode
        indicator.classList.add('hidden');
        input.placeholder = "Write a comment... (Paste/Drop images)";
    }
}
/* =========================================
   ADMIN REPORTING LOGIC
   ========================================= */

// 1. Show the button if user is Admin (Call this in window.onload or initApp)
function checkAdminAccess() {
    if (currentUser && currentUser.isSuperAdmin) {
        const btn = document.getElementById('admin-report-btn');
        if (btn) btn.classList.remove('hidden');
    }
}

// 2. Open Modal and Load User List
async function openAdminReportModal() {
    if (!currentUser.isSuperAdmin) return showToast("Access Denied", "error");
    
    openModal('admin-report-modal');
    
    // Set Default Dates (Current Month)
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    document.getElementById('admin-start-date').value = formatDateKey(firstDay);
    document.getElementById('admin-end-date').value = formatDateKey(lastDay);

    // Populate Users Dropdown
    const select = document.getElementById('admin-user-select');
    select.innerHTML = '<option value="">Loading...</option>';
    
    try {
        const snap = await db.collection('users').orderBy('displayName').get();
        select.innerHTML = '<option value="" disabled selected>Select a User</option>';
        
        snap.forEach(doc => {
            const u = doc.data();
            // Don't show deactivated users if you prefer
            const opt = document.createElement('option');
            opt.value = doc.id;
            opt.innerText = `${u.displayName} (@${u.username})`;
            select.appendChild(opt);
        });
    } catch (e) {
        console.error(e);
        showToast("Error loading users", "error");
    }
}
async function generateAdminReport() {
    const targetUid = document.getElementById('admin-user-select').value;
    const startStr = document.getElementById('admin-start-date').value;
    const endStr = document.getElementById('admin-end-date').value;
    const tbody = document.getElementById('admin-report-body');

    if (!targetUid) return showToast("Please select a user", "error");
    if (!startStr || !endStr) return showToast("Select date range", "error");

    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;">Fetching data...</td></tr>';

    try {
        // 1. Fetch User Settings (Shift End Time)
        const userDoc = await db.collection('users').doc(targetUid).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        const userShiftEnd = (userData.breakTool && userData.breakTool.shiftEnd) ? userData.breakTool.shiftEnd : "00:00";

        // 2. Fetch Logs
        const snap = await db.collection('users').doc(targetUid)
            .collection('attendance')
            .where(firebase.firestore.FieldPath.documentId(), '>=', startStr)
            .where(firebase.firestore.FieldPath.documentId(), '<=', endStr)
            .get();

        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;">No records found.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        
        // 3. Date Logic
        const now = new Date();
        const todayKey = formatDateKey(now);
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayKey = formatDateKey(yesterday);

        const docs = snap.docs.sort((a,b) => a.id.localeCompare(b.id));

        docs.forEach(doc => {
            const data = doc.data();
            const date = doc.id;
            
            // --- STATUS LOGIC ---
            let logoutDisplay = '--';
            let status = data.status || 'Present';
            
            if (data.actualLogout) {
                logoutDisplay = tConvert(data.actualLogout);
            } else if (data.actualLogin) {
                // If Today OR Yesterday -> Active
                if (date === todayKey || date === yesterdayKey) {
                    logoutDisplay = 'Active';
                    status = 'Active';
                } else {
                    // Older -> Auto-End
                    logoutDisplay = `${tConvert(userShiftEnd)}*`; 
                    status = 'Auto-End';
                }
            }

            const login = data.actualLogin ? tConvert(data.actualLogin) : '--';
            
            // Break Math
            const breaks = data.breaks || [];
            let breakSummary = [];
            let totalOverMinutes = 0;

            breaks.forEach(b => {
                if(b.type.includes('BREAK1')) breakSummary.push("B1");
                else if(b.type.includes('LUNCH')) breakSummary.push("LN");
                else if(b.type.includes('BREAK2')) breakSummary.push("B2");
                else if(b.type.includes('PERSONAL')) breakSummary.push("PB");

                if (b.excess && b.excess.startsWith('+')) {
                    const match = b.excess.match(/\+(\d+)m/);
                    if (match && match[1]) totalOverMinutes += parseInt(match[1]);
                }
            });
            
            const breakText = breakSummary.length > 0 ? breakSummary.join(', ') : "None";
            
            // Styling
            const late = data.lateMinutes || 0;
            const lateClass = late > 0 ? 'text-danger' : 'text-success';
            const obClass = totalOverMinutes > 0 ? 'text-danger' : 'text-success';
            const obText = totalOverMinutes > 0 ? `+${totalOverMinutes} m` : "0";

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight:600;">${date}</td>
                <td>Standard</td>
                <td style="text-align:left; padding-left:10px;">${login} - ${logoutDisplay}</td>
                <td style="text-align:left; padding-left:10px;">${breakText}</td>
                <td class="${lateClass}" style="font-weight:700;">${late} m</td>
                <td class="${obClass}" style="font-weight:700;">${obText}</td>
                <td>${status}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (e) {
        console.error(e);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">Error: ${e.message}</td></tr>`;
    }
}

function checkAutoClockOut() {
    // Only check if logged in and hasn't already said YES to overtime
    if (!btState.isLoggedIn || hasConfirmedOvertime) return;

    const shiftEndVal = document.getElementById('bt-shift-end').value;
    if (!shiftEndVal) return; // No shift end set

    const now = new Date();
    const [h, m] = shiftEndVal.split(':').map(Number);
    
    // Create Date Object for Shift End (Today)
    let shiftEndDate = new Date();
    shiftEndDate.setHours(h, m, 0, 0);

    // Handle Night Shift logic (If Shift End is tomorrow morning, e.g., 5 AM)
    // If 'now' is 6AM and shift end was 5AM, diff is 1 hour.
    // If 'now' is 11PM and shift end is 5AM (tomorrow), shiftEndDate is in the past, need to add day.
    // Heuristic: If shiftEndDate is > 12 hours ago, it implies it's actually tomorrow's 5AM relative to a start time.
    // SIMPLIFIED LOGIC: We just check if NOW is > ShiftEnd + 60 mins.
    
    // Calculate 1 Hour Threshold
    const oneHourAfter = new Date(shiftEndDate.getTime() + (60 * 60 * 1000));
    
    // Calculate 1 Hour + 1 Minute (Window to trigger)
    const windowEnd = new Date(oneHourAfter.getTime() + (60 * 1000)); 

    // Trigger ONLY if we passed the mark within the last minute 
    // (Prevents loop if user reloads page 2 hours later, unless we want to force immediately)
    // Let's force immediately if it's past the hour mark.
    
    if (now >= oneHourAfter) {
        // Double check: Is it correct date? 
        // We use the 'getLogicalDateKey' logic to ensure we are talking about the active shift.
        triggerOvertimePrompt();
    }
}

// 2. Trigger Modal
function triggerOvertimePrompt() {
    // Stop checking repeatedly
    hasConfirmedOvertime = true; // Temporary lock to prevent double modals
    
    const modal = document.getElementById('ot-check-modal');
    modal.classList.remove('hidden');
    
    let seconds = 10;
    document.getElementById('ot-countdown').innerText = seconds;
    
    // Play Alarm Sound for urgency
    playAlarm(); 

    if (otCountdownTimer) clearInterval(otCountdownTimer);
    
    otCountdownTimer = setInterval(() => {
        seconds--;
        document.getElementById('ot-countdown').innerText = seconds;
        
        if (seconds <= 0) {
            clearInterval(otCountdownTimer);
            forceClockOut();
        }
    }, 1000);
}

// 3. User clicked "YES, I'm Working"
function confirmOvertime() {
    clearInterval(otCountdownTimer);
    stopAlarm();
    document.getElementById('ot-check-modal').classList.add('hidden');
    
    hasConfirmedOvertime = true; // Permanently ignore for this session
    showToast("Overtime Confirmed. Carry on!");
}

// 4. User clicked "NO" or Time ran out
function forceClockOut() {
    clearInterval(otCountdownTimer);
    stopAlarm();
    document.getElementById('ot-check-modal').classList.add('hidden');
    
    // Trigger the existing Logout function
    // Pass a flag or handle UI immediately
    showToast("System: Force Clock Out Initiated...", "error");
    
    // Simulate the logout click logic
    if (btState.isLoggedIn) {
        // We bypass the confirm dialog of toggleBtLogin by manually calling the inner logic
        performLogout("System Force Out");
    }
}
// 5. Refactored Logout Logic (To allow direct calling)
async function performLogout(reason = "Manual") {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', {hour12:false, hour:'2-digit', minute:'2-digit'});
    const dateKey = getLogicalDateKey();

    // A. Update DB first (Save Logout Time)
    if (currentUser) {
        await db.collection('users').doc(currentUser.id)
          .collection('attendance').doc(dateKey)
          .set({
              actualLogout: timeStr,
              status: 'Completed',
              logoutReason: reason // Added this to track if it was Forced
          }, { merge: true });
    }

    // B. Visually complete the row (Restored from your original code)
    addLogEntry("SHIFT", "--", "OK", null, now);

    // C. RESET EVERYTHING (The "Clear" Logic)
    btState.isLoggedIn = false;
    btState.logs = [];       // Wipe the table visuals
    btState.usedBreaks = []; // Unlock all break buttons
    
    // --- PB RESET FIXED HERE ---
    btState.bank = 600;      // Reset PB to 10m (600s) for tomorrow
    
    // Reset Overtime Flag (For the force timer)
    hasConfirmedOvertime = false;

    // D. UI Reset
    renderBtLogs();          // Clear the HTML table
    updateLoginBtn();        // Button goes back to "Clock IN"
    updateBreakButtons();    // Enable buttons
    updateBankDisplay();     // Show fresh 10m bank

    // E. Save the "Empty" state to User Profile
    saveBreakData(null);
    
    showToast(`Shift Ended (${reason}). Logs Cleared.`);
}

async function cleanupStaleSessions() {
    if (!currentUser) return;

    // 1. Get Dates
    const now = new Date();
    const todayKey = formatDateKey(now);
    
    // Calculate Yesterday (Safe buffer for Night Shifts)
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = formatDateKey(yesterday);

    // 2. Get User Shift End (Fallback to 00:00 if missing)
    const shiftEndInput = document.getElementById('bt-shift-end');
    const forceTime = (shiftEndInput && shiftEndInput.value) ? shiftEndInput.value : "00:00";

    try {
        const ref = db.collection('users').doc(currentUser.id).collection('attendance');
        // Find ANY record that claims to be "Active"
        const snapshot = await ref.where('status', '==', 'Active').get();

        if (snapshot.empty) return;

        const batch = db.batch();
        let fixCount = 0;

        snapshot.forEach(doc => {
            const dateKey = doc.id;

            // 3. THE RULE:
            // If the record is NOT Today AND NOT Yesterday -> It is dead. Close it.
            if (dateKey !== todayKey && dateKey !== yesterdayKey) {
                
                console.log(`Closing Stale Session: ${dateKey}`);
                
                batch.update(doc.ref, {
                    status: 'Completed',
                    actualLogout: forceTime,
                    logoutReason: 'Auto-Fixed (Stale)'
                });
                
                fixCount++;
            }
        });

        if (fixCount > 0) {
            await batch.commit();
            console.log(`Cleaned ${fixCount} records.`);
            showToast(`System: Closed ${fixCount} old sessions.`);
            
            // Refresh the report immediately if it's open
            if(document.getElementById('attendance-summary-modal') && !document.getElementById('attendance-summary-modal').classList.contains('hidden')) {
                generateAttendanceReport();
            }
        }

    } catch (e) {
        console.error("Cleanup Error:", e);
    }
}
