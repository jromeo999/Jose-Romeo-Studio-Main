// =================================================================
// JOSE ROMEO | STUDIO HUB | SYSTEM KERNEL V2.2 (UNCUT)
// =================================================================
// DESCRIPTION: 
// This script manages the Viewer Experience (Catalog, Cinema Mode)
// and the Admin Dashboard (Queue Management, Announcements).
// "Broadcast Mode" has been removed in favor of User-Choice (VOD).
// =================================================================

// --- API CONFIGURATION ---
const TMDB_API_KEY = "03e74dd0c7a7b5dbcab4e368de13c601"; 

// --- FIREBASE CONFIGURATION ---
// (Ensure these matches your project settings exactly)
const firebaseConfig = {
    apiKey: "AIzaSyAh5mUXUb62E_73ZL9-YmlNaY3lWO8q0lg",
    authDomain: "paldo-afd47.firebaseapp.com",
    projectId: "paldo-afd47",
    storageBucket: "paldo-afd47.firebasestorage.app",
    messagingSenderId: "230237748512",
    appId: "1:230237748512:web:7ecc7520b28f442378ab45",
    measurementId: "G-616ZRK18B5"
};

// Initialize Backend Services
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// =================================================================
// DOM ELEMENT REFERENCES (MAPPED)
// =================================================================
const el = {
    // --- TOP LEVEL VIEWS ---
    viewViewer: document.getElementById('view-viewer'),
    viewAdmin: document.getElementById('view-admin'),
    
    // --- VIEWER INTERFACE ---
    // Screens
    landing: document.getElementById('landing-page'),
    catalogPanel: document.getElementById('catalog-panel'),
    cinemaView: document.getElementById('cinema-view'),
    
    // Navigation Buttons
    btnShowCatalog: document.getElementById('btn-show-catalog'),
    btnCloseCatalog: document.getElementById('close-catalog'),
    btnReturnLobby: document.getElementById('btn-return-lobby'),
    searchInput: document.getElementById('catalog-search'),
    collectionSelect: document.getElementById('collection-select'),
    newCollectionInput: document.getElementById('new-collection'),
    
    // Cinema Controls
    btnStart: document.getElementById('btn-start-projection'),
    mainFrame: document.getElementById('main-player'),
    placeholder: document.getElementById('stream-placeholder'),
    introOverlay: document.getElementById('intro-overlay'),
    glow: document.getElementById('ambient-glow'),
    
    // Dynamic Content Areas
    catalogGrid: document.getElementById('catalog-grid'),
    banner: document.getElementById('announcement-banner'),
    bannerText: document.getElementById('announce-text'),
    
    // --- ADMIN INTERFACE ---
    // Input Fields
    inputType: document.getElementById('src-type'),
    inputId: document.getElementById('media-id'),
    inputAnnounce: document.getElementById('announce-input'),
    
    // Action Buttons
    btnPreview: document.getElementById('btn-preview'),
    btnQueue: document.getElementById('btn-add-queue'),
    btnAnnounce: document.getElementById('btn-announce'), 
    btnClearAll: document.getElementById('btn-clear-all'),
    btnManageCol: document.getElementById('btn-manage-collections'),
    colModal: document.getElementById('collection-modal'),
    managerList: document.getElementById('manager-list'),
    newPresetInput: document.getElementById('new-preset-input'),
    btnSavePreset: document.getElementById('btn-save-preset'),

    
    // Monitor & Lists
    monitorFrame: document.getElementById('admin-monitor-frame'),
    queueList: document.getElementById('queue-list'),
    queueCount: document.getElementById('queue-count'),
    
    // --- AUTHENTICATION ---
    btnTrig: document.getElementById('btn-login-trigger'),
    modal: document.getElementById('login-modal'),
    form: document.getElementById('login-form'),
    btnClose: document.getElementById('close-login'),
    btnLogout: document.getElementById('btn-logout'), 
    
    // --- UTILITIES & METADATA ---
    clock: document.getElementById('clock'),
    toast: document.getElementById('toast'),
    metaDisplay: document.getElementById('meta-display'),
    metaTitle: document.getElementById('meta-title'),
    metaYear: document.getElementById('meta-year'),
    metaPoster: document.getElementById('meta-poster')
};

// =================================================================
// GLOBAL STATE VARIABLES
// =================================================================
let currentMeta = null;        // Holds the fetched movie data (Title, Poster) before adding to queue
let currentPreviewUrl = "";    // Holds the URL currently being tested in the Admin Monitor
let isCinemaActive = false;    // Tracks if the viewer is currently watching a movie
let globalQueue = [];

// =================================================================
// SYSTEM INITIALIZATION
// =================================================================
function init() {
    console.log("SYSTEM: Booting Studio Hub V2.2...");
    
    // 1. Setup UI Navigation (Clicks/Transitions)
    setupNavigationLogic();
    
    // 2. Setup Security (Login/Logout)
    setupAuthentication();
    
    // 3. Connect to Database (Realtime Sync)
    setupDatabaseSync();
    
    // 4. Enable Admin Tools
    setupAdminDashboard();
    
    // 5. Start Utilities
    startSystemClock();
    setupSearchLogic();
    setupWatchMode(); 
    setupMergeLogic();
}

// =================================================================
// 1. VIEWER NAVIGATION LOGIC
// =================================================================
function setupNavigationLogic() {
    
    // ACTION: Open Catalog from Landing
    el.btnShowCatalog.addEventListener('click', () => {
        console.log("NAV: Opening Catalog");
        el.landing.classList.add('hidden');
        el.catalogPanel.classList.remove('hidden-panel');
        el.cinemaView.classList.add('hidden');
    });

    // ACTION: Close Catalog (Return to Landing)
    // TRIGGER: Clicking the Top-Left Title ("J-Hub")
    const headerTitle = document.querySelector('.catalog-header-modern .header-left');
    
    if(headerTitle) {
        headerTitle.addEventListener('click', () => {
            console.log("NAV: Exiting Catalog");
            el.catalogPanel.classList.add('hidden-panel');
            el.landing.classList.remove('hidden');
        });
    }

    // ACTION: Exit Cinema (Return to Catalog)
    el.btnReturnLobby.addEventListener('click', () => {
        console.log("NAV: Exiting Cinema Mode");
        
        // 1. Kill the Stream (Stops Audio/Bandwidth)
        el.mainFrame.src = "";
        
        // 2. Reset State
        isCinemaActive = false;
        
        // 3. Perform Transition
        el.cinemaView.classList.add('hidden');
        el.catalogPanel.classList.remove('hidden-panel');
    });
}
function setupSearchLogic() {
    el.searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        
        // Filter the global queue
        const filtered = globalQueue.filter(item => {
            const title = (item.title || "").toLowerCase();
            const col = (item.collection || "").toLowerCase();
            return title.includes(term) || col.includes(term);
        });

        renderCatalogGrid(filtered);
    });
}
// =================================================================
// 2. DATABASE SYNCHRONIZATION (The "Pulse")
// =================================================================
function setupDatabaseSync() {
    db.collection("config").doc("stream").onSnapshot((doc) => {
        if (!doc.exists) return;
        const data = doc.data() || {};
        const queueData = data.queue || [];

        // 1. Update Global Variable
        globalQueue = queueData;

        // 2. Render Viewer
        renderCatalogGrid(queueData);

        // 3. Render Admin & Update Dropdown
        if (!el.viewAdmin.classList.contains('hidden')) {
            renderAdminQueueList(queueData);
            updateAdminDropdown(queueData); // NEW HELPER
        }
        
        // ... keep announcement logic ...
        if (data.announcement) {
            el.bannerText.innerText = data.announcement;
            el.banner.classList.remove('hidden');
        } else {
            el.banner.classList.add('hidden');
        }
    });
}
async function updateAdminDropdown(queueList) {
    // 1. Get Used Collections
    const used = [...new Set(queueList.map(i => i.collection).filter(Boolean))];
    
    // 2. Get Preset Collections
    let presets = [];
    try {
        const doc = await db.collection("config").doc("options").get();
        if(doc.exists) presets = doc.data().presets || [];
    } catch(e) {}

    // 3. Merge & Sort
    const all = [...new Set([...used, ...presets])].sort();
    
    // 4. Render
    const current = el.collectionSelect.value;
    el.collectionSelect.innerHTML = `<option value="">-- Solo Feature --</option>`;
    
    all.forEach(name => {
        el.collectionSelect.innerHTML += `<option value="${name}">${name}</option>`;
    });

    if(all.includes(current)) el.collectionSelect.value = current;
}
/**
 * Renders the Public Catalog (Minimalist Mode: No Accordions)
 */
function renderCatalogGrid(movieList) {
    el.catalogGrid.innerHTML = "";
    
    if (!movieList || movieList.length === 0) {
        el.catalogGrid.innerHTML = `<div class="loading-text">ARCHIVE EMPTY</div>`;
        return;
    }

    // 1. Sort Data
    const groups = {};
    const singles = [];

    movieList.forEach(m => {
        if(m.collection) {
            if(!groups[m.collection]) groups[m.collection] = [];
            groups[m.collection].push(m);
        } else {
            singles.push(m);
        }
    });
    // This is likely your biggest group, so it sits on top.
    if(singles.length > 0) {
        const section = document.createElement('div');
        section.className = 'series-section solo-wrapper'; // Special Wrapper Class

        // Header
        const header = document.createElement('div');
        header.className = 'series-header';
        header.innerHTML = `
            <div class="series-title">MAIN ARCHIVE</div>
            <div class="series-count">${singles.length} TITLES</div>
        `;

        // Grid (Note the 'solo-grid-mode' class)
        const grid = document.createElement('div');
        grid.className = 'series-grid solo-grid-mode'; 

        // Reverse to show newest added at top
        [...singles].reverse().forEach(item => grid.appendChild(createCard(item)));

        section.appendChild(header);
        section.appendChild(grid);
        el.catalogGrid.appendChild(section);
    }

    // 3. RENDER SERIES (Sorted by Count: High -> Low)
    // Convert object to array: [{name: "Harry Potter", items: [...]}, ...]
    const sortedGroups = Object.keys(groups).map(name => {
        return { name: name, items: groups[name] };
    }).sort((a, b) => {
        // Sort Logic: Highest Count first
        return b.items.length - a.items.length; 
    });

    // Loop through the sorted groups
    sortedGroups.forEach(group => {
        // Sort movies inside the group by year
        const sortedItems = group.items.sort((a,b) => (a.year || "0") - (b.year || "0"));
        
        const section = document.createElement('div');
        const isShort = sortedItems.length < 5;
        section.className = isShort ? 'series-section short-collection' : 'series-section'; 

        const header = document.createElement('div');
        header.className = 'series-header';
        header.innerHTML = `<div class="series-title">${group.name}</div>`;

        const grid = document.createElement('div');
        grid.className = 'series-grid'; // Standard Horizontal Scroll

        sortedItems.forEach(item => grid.appendChild(createCard(item)));

        section.appendChild(header);
        section.appendChild(grid);
        el.catalogGrid.appendChild(section);
    });

    // Setup the Background Observer for Mobile
    setupScrollObserver();
}

// Helper to keep code clean
function createCard(item) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    const yearDisplay = item.year ? `(${item.year})` : "";
    const posterUrl = item.poster || '';
    
    card.innerHTML = `
        <img src="${posterUrl}" loading="lazy">
        <div class="movie-overlay"><i class="fas fa-play"></i></div>
        <div class="movie-title-tag">${item.title} <span style="font-size:0.7em; color:#999">${yearDisplay}</span></div>
    `;
    
    // --- HOVER EFFECT LOGIC ---
    const bgLayer = document.getElementById('dynamic-bg');

    // 1. Mouse Enter: Change BG to Movie Poster
    card.addEventListener('mouseenter', () => {
        if(bgLayer && posterUrl) {
            bgLayer.style.backgroundImage = `url('${posterUrl}')`;
            bgLayer.classList.add('active');
        }
    });

    // 2. Mouse Leave: Fade back to Black
    card.addEventListener('mouseleave', () => {
        if(bgLayer) {
            bgLayer.classList.remove('active');
            // Optional: After fade out, remove image to be clean (timeout matches CSS transition)
            setTimeout(() => {
                if(!bgLayer.classList.contains('active')) {
                    bgLayer.style.backgroundImage = 'none';
                }
            }, 500);
        }
    });

    // Click Logic (Keep existing)
    card.addEventListener('click', () => {
        playMovieLocally(item); 
    });
    
    return card;
}

let pendingAction = null; // Stores the function to run if "YES" is clicked

function showSystemDialog(message, actionCallback) {
    const dialog = document.getElementById('system-dialog');
    const msgEl = document.getElementById('dialog-msg');
    
    // Set Text
    msgEl.innerText = message;
    
    // Store the action
    pendingAction = actionCallback;
    
    // Show Modal
    dialog.classList.remove('hidden');
}

// SETUP DIALOG LISTENERS (Run this once on init)
document.getElementById('btn-dialog-cancel').addEventListener('click', () => {
    document.getElementById('system-dialog').classList.add('hidden');
    pendingAction = null; // Clear action
});

document.getElementById('btn-dialog-confirm').addEventListener('click', () => {
    document.getElementById('system-dialog').classList.add('hidden');
    if (pendingAction) pendingAction(); // Run the stored function
    pendingAction = null;
});
function playMovieLocally(movie) {
    if (!movie || !movie.url) {
        showToast("ERROR: Corrupt Source");
        return;
    }

    console.log("VOD: Loading ->", movie.title);

    // 1. UI Switch
    el.catalogPanel.classList.add('hidden-panel');
    el.landing.classList.add('hidden');
    el.cinemaView.classList.remove('hidden');
    
    // NOTE: We removed the .top-controls logic here because we deleted them from HTML.
    
    isCinemaActive = true;

    // 2. Load Video
    const finalUrl = movie.url.includes('?') ? `${movie.url}&autoplay=1` : `${movie.url}?autoplay=1`;
    el.mainFrame.src = finalUrl;
    el.mainFrame.classList.remove('click-blocked');

    // 3. Update Text Info (Under Screen)
    const titleEl = document.getElementById('np-title');
    const metaEl = document.getElementById('np-meta');
    if(titleEl) titleEl.innerText = movie.title;
    if(metaEl) metaEl.innerText = `${movie.year || 'Unknown'} • ${movie.collection || 'Solo Feature'}`;

    // 4. GENERATE SIDEBAR (Multi-Row Logic)
    const sidebar = document.getElementById('related-grid');
    if(sidebar) {
        sidebar.innerHTML = ""; // Clear old content
        
        // Helper: Renders a Section with Header + Horizontal Grid
        const renderSection = (title, list) => {
            if(!list || list.length === 0) return;

            // 1. Container
            const section = document.createElement('div');
            section.className = 'sidebar-section';

            // 2. Header
            const header = document.createElement('div');
            header.className = 'sidebar-header';
            header.innerHTML = `<span>${title}</span>`;

            // 3. Grid
            const grid = document.createElement('div');
            grid.className = 'sidebar-grid'; 

            // 4. Cards
            list.forEach(m => {
                const card = document.createElement('div');
                const isActive = m.url === movie.url ? 'active' : '';
                card.className = `sidebar-card ${isActive}`;
                
                card.innerHTML = `
                    <img src="${m.poster || ''}" loading="lazy">
                    <div class="sidebar-meta">
                        <div class="s-title">${m.title}</div>
                        <div class="s-year">${m.year || ''}</div>
                    </div>
                `;
                
                card.addEventListener('click', () => playMovieLocally(m));
                grid.appendChild(card);
            });

            section.appendChild(header);
            section.appendChild(grid);
            sidebar.appendChild(section);
        };

        // --- ROW 1: CONTEXTUAL ---
        let contextList = [];
        let contextTitle = "RECOMMENDED";
        
        if (movie.collection) {
            contextTitle = `MORE IN: ${movie.collection.toUpperCase()}`;
            contextList = globalQueue.filter(m => m.collection === movie.collection);
            contextList.sort((a,b) => (a.year || 0) - (b.year || 0));
        } else {
            contextTitle = "SIMILAR FEATURES";
            contextList = globalQueue.filter(m => !m.collection && m.url !== movie.url).slice(0, 10);
        }
        renderSection(contextTitle, contextList);

        // --- ROW 2: NEW ARRIVALS ---
        const newList = [...globalQueue].reverse().filter(m => m.url !== movie.url).slice(0, 15);
        renderSection("RECENTLY ADDED", newList);
    }

    // 5. Visuals
    el.placeholder.classList.remove('hidden'); 
    el.glow.style.opacity = "0.6"; 
    setTimeout(() => {
        setupScrollObserver(); 
        el.placeholder.classList.add('hidden');
    }, 2500);
}

/**
 * Handles the user interaction required to unmute audio/video
 * and re-applies the security layer to prevent popups.
 */


// =================================================================
// 4. ADMIN DASHBOARD LOGIC
// =================================================================
function setupAdminDashboard() {

    // --- HELPER: GENERATE VIDSRC URL ---
    const constructStreamUrl = () => {
        const type = el.inputType.value; // 'imdb' or 'tmdb'
        const id = el.inputId.value.trim();

        if (!id) {
            showToast("ERROR: Media ID is empty");
            return null;
        }

        // VidSrc-Embed.ru Logic
        if (type === 'tmdb') {
            return `https://vidsrc-embed.ru/embed/movie?tmdb=${id}&imdb=&autoplay=1`;
        } else {
            return `https://vidsrc-embed.ru/embed/movie?imdb=${id}&tmdb=&autoplay=1`;
        }
    };

    // --- BUTTON: PREVIEW (Test Signal) ---
    el.btnPreview.addEventListener('click', async () => {
        const url = constructStreamUrl();
        if (!url) return;
        
        console.log("ADMIN: Previewing Signal ->", url);

        // 1. Set Monitor Source
        el.monitorFrame.src = url;
        currentPreviewUrl = url;
        
        // 2. Fetch Metadata for Validation
        const type = el.inputType.value;
        const id = el.inputId.value.trim();
        
        // Show Loading State
        el.metaDisplay.classList.remove('hidden');
        el.metaTitle.innerText = "DECODING METADATA...";
        el.metaYear.innerText = "";
        el.metaPoster.src = ""; // Clear old image
        
        // Execute Fetch
        const meta = await fetchMovieMetadata(type, id);
        
        if (meta) {
            el.metaTitle.innerText = meta.title;
            el.metaYear.innerText = meta.year;
            el.metaPoster.src = meta.poster;
            currentMeta = meta; // Cache for Queue
            showToast("SIGNAL ACQUIRED");
        } else {
            el.metaTitle.innerText = "UNKNOWN SIGNAL";
            currentMeta = null;
            showToast("WARNING: No Metadata Found");
        }
    });

    // --- BUTTON: ADD TO QUEUE (Catalog) ---
    el.btnQueue.addEventListener('click', async () => {
        const url = constructStreamUrl();
        if (!url) return;

        if (!currentMeta) {
            const type = el.inputType.value;
            const id = el.inputId.value.trim();
            showToast("Fetching Metadata...");
            currentMeta = await fetchMovieMetadata(type, id);
        }

        // *** NEW: GET COLLECTION NAME ***
        // Priority: 1. Manual Type, 2. Dropdown Select, 3. Null
        const manualGroup = el.newCollectionInput.value.trim();
        const dropGroup = el.collectionSelect.value;
        const finalCollection = manualGroup || dropGroup || null;

        const movieEntry = {
            url: url,
            title: currentMeta ? currentMeta.title : "Mystery Feature",
            poster: currentMeta ? currentMeta.poster : "",
            
            // SAVE THE YEAR (Important for sorting inside groups)
            year: currentMeta ? currentMeta.year : "0000",
            
            // SAVE THE COLLECTION
            collection: finalCollection,
            
            addedAt: Date.now()
        };

        db.collection("config").doc("stream").update({
            queue: firebase.firestore.FieldValue.arrayUnion(movieEntry)
        }).then(() => {
            showToast("SUCCESS: Added to Catalog");
            el.inputId.value = "";
            el.newCollectionInput.value = ""; // Clear input
            el.collectionSelect.value = "";   // Reset drop
            el.metaDisplay.classList.add('hidden');
            currentMeta = null;
        }).catch(err => {
            console.error(err);
            showToast("DB ERROR: Write Failed");
        });
    });

    // --- BUTTON: ANNOUNCE ---
    el.btnAnnounce.addEventListener('click', () => {
        const msg = el.inputAnnounce.value;
        if (!msg) {
            showToast("ERROR: Message empty");
            return;
        }
        
        // Send to DB
        db.collection("config").doc("stream").update({ announcement: msg });
        el.inputAnnounce.value = "";
        showToast("ANNOUNCEMENT SENT");
        
        // Auto-Clear after 10 seconds
        setTimeout(() => {
            db.collection("config").doc("stream").update({ announcement: "" });
        }, 10000);
    });
    el.btnClearAll.addEventListener('click', () => {
    const queueSize = parseInt(el.queueCount.innerText.replace(/\D/g,'')) || 0;
    if(queueSize === 0) return showToast("Catalog is already empty.");

    showSystemDialog("WARNING: NUCLEAR OPTION.\nThis will wipe the entire catalog.\n\nProceed?", () => {
        db.collection("config").doc("stream").update({ queue: [] })
            .then(() => showToast("CATALOG WIPED CLEAN"))
            .catch(err => console.error(err));
    });
    });
 setupMergeLogic();
}

/**
 * Renders the Admin-side list of active movies
 * Includes controls to delete items.
 */
/**
 * Renders the Visual Admin Archive (Series vs Solos)
 */
/**
 * Renders the Visual Admin Archive with Accordions
 */
function renderAdminQueueList(list) {
    const container = document.getElementById('admin-catalog-container');
    container.innerHTML = ""; // Clear old data

    if (!list || list.length === 0) {
        container.innerHTML = `<div style="text-align:center; color:#555; margin-top:50px;"><h3>ARCHIVE EMPTY</h3><p>Use the System Deck to add media.</p></div>`;
        return;
    }

    // 1. Sort Data
    const groups = {};
    const singles = [];

    list.forEach(m => {
        if(typeof m === 'string') { singles.push({title:"Legacy Item", url:m, poster:""}); return; }
        if(m.collection) {
            if(!groups[m.collection]) groups[m.collection] = [];
            groups[m.collection].push(m);
        } else {
            singles.push(m);
        }
    });

    // 2. RENDER COLLECTIONS (As Accordions)
    Object.keys(groups).sort().forEach(groupName => {
        const sortedItems = groups[groupName].sort((a,b) => (a.year || "0") - (b.year || "0"));
        
        // A. Create Wrapper
        const section = document.createElement('div');
        section.className = 'admin-group-section'; // Default: Expanded
        
        // Optional: Uncomment next line to start them all COLLAPSED by default
        // section.classList.add('collapsed'); 

        // B. Create Header
        const header = document.createElement('div');
        header.className = 'admin-group-header';
        header.innerHTML = `
            <div class="admin-group-title">
                <i class="fas fa-folder"></i> ${groupName}
            </div>
            <div class="admin-group-count">
                ${sortedItems.length} FILES <i class="fas fa-chevron-down" style="margin-left:10px;"></i>
            </div>
        `;
        
        // C. Toggle Logic
        header.addEventListener('click', () => {
            section.classList.toggle('collapsed');
        });

        // D. Create Grid
        const grid = document.createElement('div');
        grid.className = 'admin-grid';
        sortedItems.forEach(item => grid.appendChild(createAdminCard(item)));

        // E. Assemble
        section.appendChild(header);
        section.appendChild(grid);
        container.appendChild(section);
    });

    // 3. RENDER SOLOS (As one big folder at the bottom)
    if(singles.length > 0) {
        const section = document.createElement('div');
        section.className = 'admin-group-section';
        
        const header = document.createElement('div');
        header.className = 'admin-group-header';
        header.innerHTML = `
            <div class="admin-group-title" style="color:var(--gold);">
                <i class="fas fa-film"></i> SOLO ARCHIVE
            </div>
            <div class="admin-group-count">
                ${singles.length} FILES <i class="fas fa-chevron-down" style="margin-left:10px;"></i>
            </div>
        `;

        header.addEventListener('click', () => {
            section.classList.toggle('collapsed');
        });

        const grid = document.createElement('div');
        grid.className = 'admin-grid';
        [...singles].reverse().forEach(item => grid.appendChild(createAdminCard(item)));

        section.appendChild(header);
        section.appendChild(grid);
        container.appendChild(section);
    }
}

/**
 * Helper: Creates a Poster Card with Delete Button for Admin
 */
function createAdminCard(item) {
    const div = document.createElement('div');
    div.className = 'admin-card';
    const poster = item.poster || "https://via.placeholder.com/150x225?text=No+Img";
    const url = item.url || item;

    div.innerHTML = `
        <img src="${poster}" loading="lazy">
        <div class="admin-card-overlay">
            <button class="btn-admin-del" onclick="window.adminRemoveItem('${url}')" title="Delete from Archive">
                <i class="fas fa-trash"></i>
            </button>
        </div>
        <div class="admin-card-title">${item.title || "Unknown"}</div>
    `;
    return div;
}

/**
 * Global function for Admin deletion (assigned to window for onclick access)
 */
window.adminRemoveItem = (targetUrl) => {
    showSystemDialog("Delete this film from the archive? This cannot be undone.", () => {
        db.collection("config").doc("stream").get().then(doc => {
            const currentQueue = doc.data().queue || [];
            const newQueue = currentQueue.filter(item => {
                const itemUrl = item.url || item;
                return itemUrl !== targetUrl;
            });
            db.collection("config").doc("stream").update({ queue: newQueue })
                .then(() => showToast("ITEM DELETED"));
        });
    });
};

// =================================================================
// 5. AUTHENTICATION & SECURITY
// =================================================================
function setupAuthentication() {
    
    // --- OPEN LOGIN MODAL ---
    // TRIGGER: Clicking "System Status" text on Landing Page
    const landingStatus = document.querySelector('.landing-content .system-status');
    
    if(landingStatus) {
        landingStatus.addEventListener('click', () => {
            console.log("AUTH: Opening Login Modal");
            el.modal.classList.remove('hidden');
        });
    }

    // --- CLOSE LOGIN MODAL ---
    el.btnClose.addEventListener('click', () => el.modal.classList.add('hidden'));

    // --- SUBMIT LOGIN FORM ---
    el.form.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('admin-email').value;
        const pass = document.getElementById('admin-pass').value;
        
        showToast("AUTHENTICATING...");

        auth.signInWithEmailAndPassword(email, pass)
            .then(() => {
                el.modal.classList.add('hidden');
                showToast("ACCESS GRANTED");
            })
            .catch(err => {
                showToast("ERROR: " + err.message);
            });
    });

    // --- LOGOUT LOGIC ---
    const handleLogout = () => {
        showSystemDialog("Disconnect from System Deck?", () => {
            auth.signOut().then(() => showToast("SYSTEM DISCONNECTED"));
        });
    };

    // Attach to Mobile Button (Top Icon)
    const btnMobile = document.getElementById('btn-logout-mobile');
    if (btnMobile) btnMobile.addEventListener('click', handleLogout);

    // Attach to Desktop Button (Bottom Footer)
    const btnDesktop = document.getElementById('btn-logout-desktop');
    if (btnDesktop) btnDesktop.addEventListener('click', handleLogout);

    // --- AUTH STATE MONITOR ---
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log("AUTH: Admin Logged In");
            el.viewViewer.classList.add('hidden');
            el.viewAdmin.classList.remove('hidden');
            
            // Optimization: Stop the local player
            el.mainFrame.src = ""; 

            // Render Admin Data immediately
            if (typeof globalQueue !== 'undefined' && globalQueue.length > 0) {
                renderAdminQueueList(globalQueue);
                updateAdminDropdown(globalQueue);
            }

        } else {
            console.log("AUTH: Guest Mode Active");
            el.viewAdmin.classList.add('hidden');
            el.viewViewer.classList.remove('hidden');
        }
    });
}

// =================================================================
// 6. UTILITY FUNCTIONS
// =================================================================

/**
 * Fetches Movie Metadata from TMDB API
 * Supports ID lookup or IMDB External ID lookup
 */
async function fetchMovieMetadata(type, id) {
    if (!TMDB_API_KEY) {
        console.error("API: Missing TMDB Key");
        return null;
    }

    let endpoint = "";
    
    // Construct Endpoint
    if (type === 'tmdb') {
        endpoint = `https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}`;
    } else {
        endpoint = `https://api.themoviedb.org/3/find/${id}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
    }

    try {
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        
        const json = await response.json();
        let movieObj = null;

        // Parse Response based on Endpoint Type
        if (type === 'tmdb') {
            movieObj = json;
        } else {
            // The 'find' endpoint returns arrays
            if (json.movie_results && json.movie_results.length > 0) {
                movieObj = json.movie_results[0];
            }
        }

        if (movieObj) {
            return {
                title: movieObj.title,
                year: movieObj.release_date ? movieObj.release_date.split('-')[0] : "N/A",
                poster: movieObj.poster_path 
                    ? `https://image.tmdb.org/t/p/w400${movieObj.poster_path}` 
                    : "https://via.placeholder.com/150x225?text=No+Data"
            };
        }
    } catch (error) {
        console.error("META: Fetch failed", error);
        showToast("API ERROR: Check Console");
    }
    return null;
}

/**
 * Updates the digital clock on the dashboard
 */
function startSystemClock() {
    setInterval(() => {
        const now = new Date();
        el.clock.innerText = now.toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
    }, 1000);
}

function showToast(message) {
    el.toast.innerText = message;
    el.toast.classList.remove('hidden');
    
    // Clear any existing timer so they don't conflict
    if (window.toastTimer) clearTimeout(window.toastTimer);
    
    // Hide after 3 seconds
    window.toastTimer = setTimeout(() => {
        el.toast.classList.add('hidden');
    }, 1000);
}
// --- COLLECTION MANAGER LOGIC ---

// 1. Open Modal & Load Data
el.btnManageCol.addEventListener('click', () => {
    el.colModal.classList.remove('hidden');
    renderManagerList();
});

// 2. Add Collection "In Advance" (Preset)
el.btnSavePreset.addEventListener('click', () => {
    const name = el.newPresetInput.value.trim();
    if(!name) return;

    // Save to special 'options' document
    db.collection("config").doc("options").set({
        presets: firebase.firestore.FieldValue.arrayUnion(name)
    }, { merge: true }).then(() => {
        el.newPresetInput.value = "";
        renderManagerList(); // Refresh list
        showToast("Series Created");
    });
});

// 3. Render the List (Used + Presets)
async function renderManagerList() {
    el.managerList.innerHTML = "Loading...";
    
    // Get Used Collections from Queue
    const streamDoc = await db.collection("config").doc("stream").get();
    const queue = streamDoc.data().queue || [];
    const used = [...new Set(queue.map(m => m.collection).filter(Boolean))];

    // Get Presets from Options
    const optDoc = await db.collection("config").doc("options").get();
    const presets = optDoc.exists ? (optDoc.data().presets || []) : [];

    // Combine Unique
    const all = [...new Set([...used, ...presets])].sort();

    el.managerList.innerHTML = "";
    all.forEach(name => {
        const div = document.createElement('div');
        div.className = 'manager-item';
        div.innerHTML = `
            <span>${name}</span>
            <div>
                <i class="fas fa-edit btn-edit-col" onclick="renameCollection('${name}')"></i>
                <i class="fas fa-trash btn-del-col" onclick="deletePreset('${name}')"></i>
            </div>
        `;
        el.managerList.appendChild(div);
    });
}

// 4. RENAME FUNCTION (The Heavy Lifter)
window.renameCollection = (oldName) => {
    const dialog = document.getElementById('system-dialog');
    const msgEl = document.getElementById('dialog-msg');
    const inputEl = document.getElementById('dialog-input');
    const btnConfirm = document.getElementById('btn-dialog-confirm');
    const btnCancel = document.getElementById('btn-dialog-cancel');

    // 1. Setup Dialog UI
    msgEl.innerText = `Enter new name for "${oldName}":`;
    inputEl.value = oldName;
    inputEl.classList.remove('hidden'); // Show the input
    dialog.classList.remove('hidden');  // Show the modal
    inputEl.focus();

    // 2. Define Clean-up Helper
    const closeDialog = () => {
        dialog.classList.add('hidden');
        inputEl.classList.add('hidden'); // Hide input again
        inputEl.value = "";
        // Remove listeners to prevent stacking
        btnConfirm.onclick = null;
        btnCancel.onclick = null;
    };

    // 3. Handle Cancel
    btnCancel.onclick = () => {
        closeDialog();
        // Restore default Cancel behavior for other alerts
        btnCancel.addEventListener('click', () => {
            document.getElementById('system-dialog').classList.add('hidden');
            if (typeof pendingAction !== 'undefined') pendingAction = null; 
        });
    };

    // 4. Handle Confirm
    btnConfirm.onclick = async () => {
        const newName = inputEl.value.trim();
        
        if (!newName || newName === oldName) {
            closeDialog();
            return;
        }

        closeDialog(); // Close UI immediately
        showToast("Renaming... please wait.");

        // --- DATABASE LOGIC ---
        const docRef = db.collection("config").doc("stream");
        
        try {
            await db.runTransaction(async (t) => {
                const doc = await t.get(docRef);
                const queue = doc.data().queue || [];
                
                let changed = false;
                const newQueue = queue.map(movie => {
                    if(movie.collection === oldName) {
                        movie.collection = newName;
                        changed = true;
                    }
                    return movie;
                });

                if(changed) t.update(docRef, { queue: newQueue });
            });

            // Update Presets
            db.collection("config").doc("options").update({
                presets: firebase.firestore.FieldValue.arrayRemove(oldName)
            });
            db.collection("config").doc("options").update({
                presets: firebase.firestore.FieldValue.arrayUnion(newName)
            });

            showToast("Update Complete");
            renderManagerList(); // Refresh UI

        } catch (error) {
            console.error(error);
            showToast("ERROR: Rename Failed");
        }
        
        // Restore default Confirm behavior
        btnConfirm.addEventListener('click', () => {
            document.getElementById('system-dialog').classList.add('hidden');
            if (typeof pendingAction !== 'undefined' && pendingAction) pendingAction();
            pendingAction = null;
        });
    };
};

// 5. DELETE PRESET
window.deletePreset = (name) => {
    showSystemDialog(`Delete the Series Tag "${name}"? (Movies will remain in catalog)`, () => {
        db.collection("config").doc("options").update({
            presets: firebase.firestore.FieldValue.arrayRemove(name)
        }).then(() => renderManagerList());
    });
};
// ==========================================
// === FEATURE: REQUEST UPLINK LOGIC ===
// ==========================================

// 1. Elements
const panel = document.getElementById('request-panel');
const btnOpen = document.getElementById('btn-open-request');
const btnClose = document.getElementById('btn-close-request');
const btnSubmit = document.getElementById('btn-submit-req');
const inputReq = document.getElementById('req-input');

// 2. Open Panel
if(btnOpen) {
    btnOpen.addEventListener('click', () => {
        panel.classList.add('active');
    });
}

// 3. Close Panel
if(btnClose) {
    btnClose.addEventListener('click', () => {
        panel.classList.remove('active');
    });
}

// 4. Submit Request
if(btnSubmit) {
    btnSubmit.addEventListener('click', () => {
        const title = inputReq.value.trim();
        
        if(!title) {
            showToast("ERROR: INPUT EMPTY");
            return;
        }

        // Visual Feedback
        btnSubmit.innerText = "TRANSMITTING...";
        
        // Save to Firestore (New 'requests' collection)
        db.collection("requests").add({
            title: title,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'pending' // For future admin use
        })
        .then(() => {
            showToast("SIGNAL RECEIVED");
            inputReq.value = ""; // Clear input
            btnSubmit.innerText = "TRANSMIT"; // Reset button
            
            // Auto Close after 1s
            setTimeout(() => {
                panel.classList.remove('active');
            }, 1000);
        })
        .catch((error) => {
            console.error("Error writing document: ", error);
            showToast("TRANSMISSION FAILED");
            btnSubmit.innerText = "RETRY";
        });
    });
}
// ==========================================
// === ADMIN FEATURE: REQUEST INBOX LOGIC ===
// ==========================================

const reqModal = document.getElementById('requests-modal');
const reqList = document.getElementById('requests-list');
const btnViewReq = document.getElementById('btn-view-requests');
const btnCloseReq = document.getElementById('close-requests');
const reqBadge = document.getElementById('req-badge');

// 1. Open/Close Modal
if(btnViewReq) {
    btnViewReq.addEventListener('click', () => {
        reqModal.classList.remove('hidden');
    });
}
if(btnCloseReq) {
    btnCloseReq.addEventListener('click', () => {
        reqModal.classList.add('hidden');
    });
}

// 2. REAL-TIME LISTENER (Runs automatically)
// Checks for new requests in the 'requests' collection
db.collection("requests").orderBy("timestamp", "desc").onSnapshot((snapshot) => {
    
    // A. Update Sidebar Badge count
    const count = snapshot.size;
    if(reqBadge) {
        if(count > 0) {
            reqBadge.style.display = 'inline-block';
            reqBadge.innerText = count;
        } else {
            reqBadge.style.display = 'none';
        }
    }

    // B. Render the List inside Modal
    if(!reqList) return;
    reqList.innerHTML = ""; // Clear current list

    if (count === 0) {
        reqList.innerHTML = `<li style="padding:20px; text-align:center; color:#444;">NO ACTIVE SIGNALS</li>`;
        return;
    }

    snapshot.forEach((doc) => {
        const data = doc.data();
        const time = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleDateString() : 'Unknown';
        
        const li = document.createElement('li');
        li.className = 'req-item';
         li.innerHTML = `
            <div class="req-info">
                <span class="req-title">${data.title}</span>
                <span class="req-date">REQ: ${time}</span>
            </div>
            <button class="btn-fulfill" onclick="fulfillRequest('${doc.id}', '${data.title}')" title="Mark Complete">
                <i class="fas fa-check"></i> DONE
            </button>
        `;
        reqList.appendChild(li);
        reqList.appendChild(li);
    });
});

// 3. FULFILL ACTION (Delete request)
window.fulfillRequest = (docId, title) => {
    if(!confirm(`Mark "${title}" as fulfilled and remove from log?`)) return;

    db.collection("requests").doc(docId).delete().then(() => {
        showToast("SIGNAL CLEARED");
    }).catch((err) => {
        console.error(err);
        showToast("ERROR DELETING");
    });
};
function setupWatchMode() {
    const btnWatch = document.getElementById('btn-watch-mode');
    
    // Toggle Logic
    if(btnWatch) {
        btnWatch.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent immediate close
            document.body.classList.toggle('watch-mode');
            
            if(document.body.classList.contains('watch-mode')) {
                showToast("PRESS ESC TO EXIT");
            }
        });
    }

    // Exit Logic (ESC Key)
    document.addEventListener('keydown', (e) => {
        if(e.key === "Escape") document.body.classList.remove('watch-mode');
    });

    // Exit Logic (Click Anywhere)
    const cinemaView = document.getElementById('cinema-view');
    if(cinemaView) {
        cinemaView.addEventListener('click', (e) => {
            // Only if mode is active
            if(document.body.classList.contains('watch-mode')) {
                // If user clicks the container (black space) or the wrapper (padding)
                // This ensures clicking the Video (iframe) doesn't exit mode
                document.body.classList.remove('watch-mode');
            }
        });
    }
}
function setupScrollObserver() {
    // 1. Only run on Mobile/Tablet
    if (window.innerWidth > 1024) return;

    // 2. Define the "Trigger Zone"
    // This setup fires when a row enters the top 30% of the screen
    const observerOptions = {
        root: null, 
        rootMargin: '-10% 0px -70% 0px', // Active area is near the top
        threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // The Section that just scrolled into view
                const section = entry.target;
                
                // Find the FIRST image in this section
                const firstPoster = section.querySelector('img');
                
                if (firstPoster && firstPoster.src) {
                    const bgLayer = document.getElementById('dynamic-bg');
                    if(bgLayer) {
                        // Update the background
                        bgLayer.style.backgroundImage = `url('${firstPoster.src}')`;
                        bgLayer.classList.add('active');
                    }
                }
            }
        });
    }, observerOptions);

    // 3. Attach to all Series Rows (Catalog + Cinema Sidebar)
    const rows = document.querySelectorAll('.series-section, .sidebar-section');
    rows.forEach(row => observer.observe(row));
}
function setupMergeLogic() {
    const btnOpen = document.getElementById('btn-open-merge');
    const modal = document.getElementById('merge-modal');
    const listContainer = document.getElementById('merge-list');
    const btnConfirm = document.getElementById('btn-confirm-merge');
    const btnCancel = document.getElementById('btn-cancel-merge');
    const inputName = document.getElementById('merge-new-name');

    // 1. OPEN MODAL & RENDER LIST
    if(btnOpen) {
        btnOpen.addEventListener('click', () => {
            modal.classList.remove('hidden');
            renderMergeList();
        });
    }

    // 2. RENDER CHECKBOX LIST
    function renderMergeList() {
        listContainer.innerHTML = "";
        
        // A. Analyze Data
        const counts = {};
        globalQueue.forEach(m => {
            if(m.collection) { // Only count items that are already in a collection
                counts[m.collection] = (counts[m.collection] || 0) + 1;
            }
        });

        // B. Sort Alphabetically
        const sortedNames = Object.keys(counts).sort();

        if(sortedNames.length === 0) {
            listContainer.innerHTML = "<div style='padding:20px; color:#666;'>No Collections Found.</div>";
            return;
        }

        // C. Create Checkboxes
        sortedNames.forEach(name => {
            const row = document.createElement('label');
            row.className = 'merge-item';
            
            row.innerHTML = `
                <input type="checkbox" value="${name}" class="merge-checkbox">
                <span class="merge-label">${name}</span>
                <span class="merge-count">${counts[name]} items</span>
            `;
            listContainer.appendChild(row);
        });
    }

    // 3. EXECUTE MERGE
    if(btnConfirm) {
        btnConfirm.addEventListener('click', () => {
            const newName = inputName.value.trim().toUpperCase(); // Force Uppercase for style
            
            // Validation
            if(!newName) return showToast("ERROR: Enter a New Name");
            
            // Get Selected Old Names
            const checkboxes = document.querySelectorAll('.merge-checkbox:checked');
            const targets = Array.from(checkboxes).map(cb => cb.value);

            if(targets.length < 2) return showToast("Select at least 2 to merge.");

            showSystemDialog(`Merge ${targets.length} collections into "${newName}"?`, () => {
                performMerge(targets, newName);
            });
        });
    }

    // 4. DATABASE UPDATE
    function performMerge(targetNames, finalName) {
        showToast("FUSING COLLECTIONS...");

        // A. Modify Local Data first (Deep Copy)
        const newQueue = globalQueue.map(movie => {
            // If this movie belongs to one of the selected groups...
            if (targetNames.includes(movie.collection)) {
                // ...Change its tag to the new name
                return { ...movie, collection: finalName };
            }
            return movie;
        });

        // B. Save to Firebase
        db.collection("config").doc("stream").update({ queue: newQueue })
        .then(() => {
            showToast("FUSION COMPLETE");
            modal.classList.add('hidden');
            inputName.value = "";
            
            // Also update the Presets List (Optional but clean)
            // Remove old names from presets, add new one
            db.collection("config").doc("options").update({
                presets: firebase.firestore.FieldValue.arrayRemove(...targetNames)
            });
            db.collection("config").doc("options").update({
                presets: firebase.firestore.FieldValue.arrayUnion(finalName)
            });
        })
        .catch(err => {
            console.error(err);
            showToast("ERROR: Merge Failed");
        });
    }

    // 5. CANCEL
    if(btnCancel) {
        btnCancel.addEventListener('click', () => modal.classList.add('hidden'));
    }
}
// =================================================================
// SYSTEM START
// =================================================================
init();
