import Chart from 'https://esm.sh/chart.js/auto';
// =======================================================
// 1. FIREBASE SETUP & IMPORTS
// =======================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, getDocs, getDoc, 
    query, where, updateDoc, doc, onSnapshot, deleteDoc, 
    serverTimestamp, orderBy, setDoc, writeBatch, arrayUnion, arrayRemove, deleteField  
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


// Your Config
const firebaseConfig = {
  apiKey: "AIzaSyB-ehP7zxodGx6kbBy8Zv2O75Ym43_T9Yg",
  authDomain: "eod-tracker-f11cd.firebaseapp.com",
  projectId: "eod-tracker-f11cd",
  storageBucket: "eod-tracker-f11cd.firebasestorage.app",
  messagingSenderId: "553087942162",
  appId: "1:553087942162:web:967d4e171454156693a2cb",
  measurementId: "G-01P9R6L20G"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Global State
let currentUser = null;
let currentAdminTab = 'deposits';
let rawLogsCache = [];
let unsubscribeLogs = null;
let editingLogId = null; 
let movingAgentUid = null;
let companyLogoCache = "logo.png";
let cachedAccountList = [];
let activeManagerAccount = 'All'; // New: Manager Sidebar Filter
let draftFields = []; 
let editingRoleId = null;
let currentRoleLayout = [];
let globalRoleCache = {};
let managerCache = null;

// =======================================================
// INITIALIZATION
// =======================================================
const DEFAULT_USERS = [
    { uid: 'user_1', name: 'Agent Alpha', role: 'csr', code: '1111', img: null, accountId: 'DecksDirect' },
    { uid: 'user_2', name: 'Agent Bravo', role: 'csr', code: '2222', img: null, accountId: 'DIY' },
    { uid: 'user_3', name: 'Data Specialist', role: 'data_entry', code: '3333', img: null, accountId: 'DecksDirect' },
    { uid: 'user_99', name: 'Manager',    role: 'manager', code: '9999', img: null, accountId: 'Admin' }
];

async function seedUsersIfNeeded() {
    for (const user of DEFAULT_USERS) {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef); 

        if (!userSnap.exists()) {
            await setDoc(userRef, user);
        } else {
            // FIX: Do NOT force 'General'. Leave blank if missing.
            if (!userSnap.data().accountId) {
                await updateDoc(userRef, { accountId: '' }); 
            }
        }
    }
}
seedUsersIfNeeded();
// Load Settings on Start
async function loadCompanySettings() {
    try {
        const docRef = doc(db, "settings", "general");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().logo) {
            companyLogoCache = docSnap.data().logo;
            const headerLogo = document.getElementById('header-company-logo');
            if(headerLogo) headerLogo.src = companyLogoCache;
            
            const mgrLogo = document.getElementById('mgr-company-logo');
            if(mgrLogo) mgrLogo.src = companyLogoCache;
            
            const loginLogo = document.querySelector('.brand-logo');
            if(loginLogo) loginLogo.src = companyLogoCache;
        }
    } catch(e) { console.log("No custom settings yet"); }
}

document.addEventListener('DOMContentLoaded', () => {
    initYearDropdown();
    initWorkdayDropdown();
    loadCompanySettings();
    
    // Shift Date Logic
    const now = new Date();
    const currentShiftDate = getShiftDate(now); 
    filterState.month = currentShiftDate.getMonth();
    filterState.year = currentShiftDate.getFullYear();
    
    // Start Clock
    startClock();

    // Check Session
    const savedUser = localStorage.getItem('firebase_session_user');
    if (savedUser) {
        let tempUser = JSON.parse(savedUser);
        const userRef = doc(db, "users", tempUser.uid);
        
        // REAL-TIME LISTENER
        onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                // 1. User is active -> Update state & UI
                currentUser = { ...docSnap.data(), uid: docSnap.id };
                localStorage.setItem('firebase_session_user', JSON.stringify(currentUser));
                initDashboard();
                document.getElementById('login-modal').classList.add('hidden');
            } else {
                // 2. User was DELETED -> Trigger Lockout
                localStorage.removeItem('firebase_session_user');
                currentUser = null;

                // Hide everything immediately
                document.getElementById('dashboard').classList.add('hidden');
                document.getElementById('manager-layout').classList.add('hidden');
                
                // Show Logout Message
                window.showModal(
                    "Access Terminated", 
                    "Your account has been removed from the system by an administrator.", 
                    false, 
                    () => location.reload() // Reload page on click
                );
            }
        });
    }
});

// =======================================================
// LOGIN / LOGOUT
// =======================================================

window.login = async function(e) {
    if(e) e.preventDefault();
    const codeInput = document.getElementById('access-code');
    const code = codeInput.value;

    const q = query(collection(db, "users"), where("code", "==", code));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        currentUser = { ...userDoc.data(), uid: userDoc.id };
        localStorage.setItem('firebase_session_user', JSON.stringify(currentUser));
        
        document.getElementById('login-modal').classList.add('hidden');
        codeInput.value = '';
        initDashboard();
    } else {
        document.getElementById('error-msg').style.display = 'block';
        codeInput.value = '';
    }
}
document.getElementById('login-form').addEventListener('submit', window.login);

window.logout = function() {
    window.showModal("Logout", "Are you sure?", true, () => {
        // 1. Clear Session Storage
        localStorage.removeItem('firebase_session_user');
        
        // 2. Stop Listening to Firebase
        if (unsubscribeLogs) unsubscribeLogs(); 

        // 3. VISUAL CLEAR (Safely)
        // Clear standard table (if it exists)
        const tableBody = document.getElementById('report-body');
        if (tableBody) tableBody.innerHTML = '';

        // Clear Manager Grid (New ID)
        const accContainer = document.getElementById('accounts-container');
        if (accContainer) accContainer.innerHTML = '';

        // Clear Manager Grid (Old ID - just in case)
        const oldGrid = document.getElementById('agent-grid');
        if (oldGrid) oldGrid.innerHTML = '';

        // Clear counters
        const counter = document.getElementById('counter-val');
        if (counter) counter.innerText = '0';
        
        // 4. Reset Memory State
        rawLogsCache = [];
        currentUser = null;

        // 5. Reload to return to login screen
        location.reload();
    });
}

// =======================================================
// DASHBOARD LOGIC (ROUTING)
// =======================================================

async function initDashboard() {
    // 1. UI Reset
    document.getElementById('counter-val').innerText = "0";
    if (currentUser.accountId) {
            try {
                // We reuse the settings/account_assets doc
                const logoSnap = await getDoc(doc(db, "settings", "account_assets"));
                if (logoSnap.exists()) {
                    const logos = logoSnap.data();
                    const myLogo = logos[currentUser.accountId];
                    const logoEl = document.getElementById('agent-account-logo');
                    
                    if (logoEl && myLogo) {
                        logoEl.src = myLogo;
                        logoEl.classList.remove('hidden');
                    } else if (logoEl) {
                        logoEl.classList.add('hidden'); // Ensure hidden if no logo found
                    }
                }
            } catch(e) { console.log("Error fetching account logo", e); }
        }
    try {
        const snap = await getDocs(collection(db, "roles"));
        snap.forEach(doc => { globalRoleCache[doc.id] = doc.data().layout; });
    } catch(e) { console.log("Role cache failed"); }

    // Avatar Logic (Agent)
    const imgEl = document.getElementById('current-user-img');
    const iconEl = document.getElementById('default-user-icon');
    if (currentUser.img) { imgEl.src = currentUser.img; imgEl.classList.remove('hidden'); iconEl.classList.add('hidden'); }
    else { imgEl.classList.add('hidden'); iconEl.classList.remove('hidden'); }

    // 2. Hide All Views
    ['form-csr', 'form-data-entry', 'form-custom', 'manager-layout', 'dashboard'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.add('hidden');
    });

    // 3. Routing
     if (currentUser.role === 'manager') {
        // --- MANAGER VIEW ---
        document.getElementById('manager-layout').classList.remove('hidden');
        
        // Populate Sidebar
        renderSidebarAccounts();
        populateManagerDropdowns();
        
        // --- FIX: Update Sidebar Profile ---
        // Ensure we default to "Manager" if name is missing/null
        document.getElementById('mgr-user-display').innerText = currentUser.name || "Manager";
        
        const mgrImg = document.getElementById('mgr-user-img');
        const mgrDef = document.getElementById('mgr-default-icon');
        
        if(currentUser.img) {
            mgrImg.src = currentUser.img; 
            mgrImg.classList.remove('hidden'); 
            mgrDef.classList.add('hidden');
        } else {
            mgrImg.classList.add('hidden'); 
            mgrDef.classList.remove('hidden');
        }

    } else {
        // --- AGENT VIEW (Standard) ---
        document.getElementById('dashboard').classList.remove('hidden'); 
        document.getElementById('user-display').innerText = currentUser.name;
        
        document.getElementById('standard-view').classList.remove('hidden');
        document.getElementById('live-counter').classList.remove('hidden');

        // --- UPDATED: DEFAULT TO TODAY (Not Whole Month) ---
        const now = new Date();
        const shift = getShiftDate(now);

        // Set Filter State to Specific Day
        filterState.year = shift.getFullYear();
        filterState.month = shift.getMonth();
        filterState.day = shift.getDate(); // <--- This forces the "Flat View" for today

        // Ensure Dropdown Context is still "This Month" (since Today is in This Month)
        const periodSelect = document.getElementById('quick-period');
        if(periodSelect) periodSelect.value = 'this_month';

        // Trigger Render
        updateLogFilter(); 


        // Role Specific Form Logic
        if (currentUser.role === 'csr') {
            document.getElementById('role-badge').innerText = "CSR";
            document.getElementById('form-csr').classList.remove('hidden');
            currentRoleLayout = null; 
            setupStandardTableHeaders();
        } 
        else if (currentUser.role === 'data_entry') {
            document.getElementById('role-badge').innerText = "DATA ENTRY SPECIALIST";
            document.getElementById('form-data-entry').classList.remove('hidden');
            document.getElementById('admin-view-deposits').classList.remove('hidden');
            document.getElementById('admin-view-tasks').classList.remove('hidden');
            currentRoleLayout = null; 
            setupStandardTableHeaders();
        } 
        else {
            try {
                // Load Custom Role
                const roleDoc = await getDoc(doc(db, "roles", currentUser.role));
                if (roleDoc.exists()) {
                    const roleData = roleDoc.data();
                    currentRoleLayout = roleData.layout;
                    document.getElementById('role-badge').innerText = roleData.name.toUpperCase();
                    renderCustomDashForm(currentRoleLayout, roleData.name);
                    document.getElementById('form-custom').classList.remove('hidden');
                    setupDynamicTableHeaders(currentRoleLayout);
                } else {
                    document.getElementById('role-badge').innerText = "UNKNOWN";
                }
            } catch(e) { console.error("Role Error:", e); }
        }
    }
    setupLogListener();
}

// =======================================================
// MANAGER SIDEBAR LOGIC
// =======================================================

async function renderSidebarAccounts() {
    const listContainer = document.getElementById('sidebar-account-list');
    const mobileSelect = document.getElementById('mobile-account-select');

    // Clear both
    listContainer.innerHTML = '';
    if (mobileSelect) mobileSelect.innerHTML = '';

    // 1. "All Accounts" Option
    // Desktop Item
    const allBtn = document.createElement('div');
    allBtn.className = `nav-item ${activeManagerAccount === 'All' ? 'active' : ''}`;
    allBtn.onclick = () => filterManagerView('All');
    allBtn.innerHTML = `<span>All Accounts</span> <i class="fa-solid fa-layer-group"></i>`;
    listContainer.appendChild(allBtn);

    // Mobile Option
    if (mobileSelect) {
        const opt = document.createElement('option');
        opt.value = 'All';
        opt.innerText = 'All Accounts';
        if (activeManagerAccount === 'All') opt.selected = true;
        mobileSelect.appendChild(opt);
    }

    // 2. Get Unique Accounts
    const accounts = await getAllActiveAccounts();

    // 3. Render List
    accounts.forEach(acc => {
        // Desktop Item
        const item = document.createElement('div');
        item.className = `nav-item ${activeManagerAccount === acc ? 'active' : ''}`;
        item.onclick = () => filterManagerView(acc);
        item.innerHTML = `<span>${acc}</span> <i class="fa-solid fa-chevron-right" style="font-size:0.7em"></i>`;
        listContainer.appendChild(item);

        // Mobile Option
        if (mobileSelect) {
            const opt = document.createElement('option');
            opt.value = acc;
            opt.innerText = acc;
            if (activeManagerAccount === acc) opt.selected = true;
            mobileSelect.appendChild(opt);
        }
    });
}


window.filterManagerView = function(accountName) {
    // 1. Update State
    activeManagerAccount = accountName;
    
    // 2. Update Desktop Sidebar Visuals
    const items = document.querySelectorAll('#sidebar-account-list .nav-item');
    items.forEach(i => {
        i.classList.remove('active');
        if(i.innerText.includes(accountName)) i.classList.add('active');
    });

    // 3. Update Mobile Dropdown Visuals (Sync)
    const mobileSelect = document.getElementById('mobile-account-select');
    if (mobileSelect) mobileSelect.value = accountName;

    // 4. Trigger Re-render
    updateLogFilter();
}



async function renderManagerGrid(allMonthLogs, isLiveView) {
    const container = document.getElementById('accounts-container');
    const topBarLeft = document.getElementById('mgr-topbar-left');

    // =========================================================
    // 1. CACHING LAYER
    // =========================================================
    if (!managerCache) {
        if(container.innerHTML === '') {
            container.innerHTML = '<div style="padding:50px; text-align:center; color:var(--primary);"><i class="fa-solid fa-circle-notch fa-spin fa-2x"></i></div>';
        }
        try {
            const [agentsSnap, rolesSnap, logosSnap, accSnap] = await Promise.all([
                getDocs(query(collection(db, "users"), where("role", "!=", "manager"))),
                getDocs(collection(db, "roles")),
                getDoc(doc(db, "settings", "account_assets")),
                getDoc(doc(db, "settings", "account_list"))
            ]);
            const agents = [];
            agentsSnap.forEach(doc => agents.push({ ...doc.data(), uid: doc.id }));
            const roleMap = {};
            rolesSnap.forEach(doc => { roleMap[doc.id] = { name: doc.data().name, layout: doc.data().layout }; });
            const logos = logosSnap.exists() ? logosSnap.data() : {};
            if (accSnap.exists()) cachedAccountList = accSnap.data().names;
            managerCache = { agents, roleMap, logos };
        } catch (e) { console.error("Error loading manager data:", e); return; }
    }

    const { agents, roleMap, logos: accountLogos } = managerCache;

    // =========================================================
    // 2. PREPARE DATA
    // =========================================================
    container.innerHTML = '';

    const uniqueAccounts = new Set(cachedAccountList || []);
    agents.forEach(a => { if (a.accountId) uniqueAccounts.add(a.accountId); });
    let sortedAccounts = Array.from(uniqueAccounts).sort();

    const isSingleView = (activeManagerAccount !== 'All');
    const counterContainer = document.querySelector('.mgr-counter');
    const counterValue = document.getElementById('mgr-counter-val');

    if (isSingleView) {
        // 1. Use 'activeManagerAccount' directly to get the right agents
        const accAgents = agents.filter(a => a.accountId === activeManagerAccount);
        
        // 2. Create list of IDs for this account
        const accAgentIds = accAgents.map(a => a.uid);

        // 3. Filter the time-based logs (allMonthLogs) to just these agents
        const accLogs = allMonthLogs.filter(l => accAgentIds.includes(l.agentUid));
        
        // 4. Update and Show
        if (counterValue) counterValue.innerText = accLogs.length;
        if (counterContainer) counterContainer.classList.remove('hidden');
    } else {
        // 5. ALL ACCOUNTS MODE -> HIDE COUNTER
        if (counterContainer) counterContainer.classList.add('hidden');
    }
    // Filter if Single View
    if (isSingleView) {
        sortedAccounts = sortedAccounts.filter(acc => acc === activeManagerAccount);
    }

    if (sortedAccounts.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted); border:2px dashed var(--border); border-radius:24px;"><h3>No Accounts Found</h3></div>`;
        // Reset Topbar if empty
        topBarLeft.innerHTML = `<h2 style="margin:0;"><i class="fa-solid fa-layer-group"></i> All Accounts</h2>`;
        return;
    }

    // =========================================================
    // 3. UPDATE TOP BAR (HEADER LOGIC)
    // =========================================================
     if (isSingleView) {
        // --- SINGLE MODE: Move Controls to Top Bar ---
        const accName = sortedAccounts[0];
        const accAgents = agents.filter(a => a.accountId === accName);
        const logoSrc = accountLogos[accName] ? accountLogos[accName] : 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        
        // Inject Dynamic Controls into Top Bar (NEW STRUCTURE)
        topBarLeft.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <!-- Logo -->
                <div class="account-logo-wrapper" onclick="triggerAccountLogoUpload('${accName}')" title="Change Logo" style="width:32px; height:32px;">
                    <img src="${logoSrc}" class="account-logo-img">
                    <div class="logo-upload-overlay"><i class="fa-solid fa-camera" style="font-size:0.8rem"></i></div>
                </div>
                
                <!-- NEW: Hoverable Name & Controls Wrapper -->
                <div class="account-header-info" style="display:flex; align-items:center; gap:10px;">
                    
                    <!-- Display Name -->
                    <div id="mgr-account-display" style="font-size:1.2rem; font-weight:800; color:var(--primary); border-bottom:1px solid transparent; padding-bottom:2px;">
                        ${accName}
                    </div>

                    <!-- Controls (Hidden until hover) -->
                    <div class="account-controls" style="display:flex; gap:5px;">
                         <!-- Default: Pen & Trash -->
                         <div id="acc-ctrl-default" style="display:flex; gap:5px;">
                            <button class="icon-btn" onclick="startAccountEdit()" title="Rename"><i class="fa-solid fa-pen"></i></button>
                            <button class="icon-btn remove-btn" onclick="deleteAccountGroup('${accName}')" title="Delete Group"><i class="fa-solid fa-trash"></i></button>
                         </div>
                         <!-- Edit: Check & X -->
                         <div id="acc-ctrl-edit" class="hidden" style="display:flex; gap:5px;">
                             <button class="icon-btn" onclick="saveAccountEdit('${accName}')" style="color:#10b981;"><i class="fa-solid fa-check"></i></button>
                             <button class="icon-btn" onclick="cancelAccountEdit('${accName}')" style="color:#ef4444;"><i class="fa-solid fa-xmark"></i></button>
                         </div>
                    </div>
                </div>
            </div>

            <div style="width:1px; height:20px; background:var(--border); margin:0 5px;"></div>

            <!-- Trends & Count -->
            <button class="btn-mini-action" onclick="openTrendsPanel('${accName}')" title="View Trends" style="width:auto; padding:0 10px; gap:5px; color:var(--primary); border-color:var(--primary);">
                <i class="fa-solid fa-chart-column"></i> Trends
            </button>
            
            <span class="badge" style="background:#f1f5f9; color:#64748b; border:1px solid #e2e8f0;">${accAgents.length} Agents</span>
        `;
    } else {
        // --- ALL MODE: Standard Title ---
        topBarLeft.innerHTML = `
            <h2 style="font-size:1.2rem; font-weight:800; color:var(--primary);margin:0;"><i class="fa-solid fa-layer-group"></i> All Accounts</h2>
            <div style="display:flex; gap:5px; border-left:1px solid var(--border); padding-left:15px;">
                
            </div>
        `;
    }

    // =========================================================
    // 4. RENDER GRID SECTIONS
    // =========================================================
    sortedAccounts.forEach(accountName => {
        const accountAgents = agents.filter(a => a.accountId === accountName);
        
        // Create Section Container
        const section = document.createElement('div');
        section.className = 'account-section';

        // --- CONDITIONAL HEADER RENDERING ---
        if (!isSingleView) {
            // In "All View", we need headers to distinguish groups
            const logoSrc = accountLogos[accountName] ? accountLogos[accountName] : 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            
            section.innerHTML = `
                <div class="account-header">
                    <div style="display:flex; align-items:center;">
                        <div class="account-logo-wrapper" onclick="triggerAccountLogoUpload('${accountName}')" title="Change Logo">
                            <img src="${logoSrc}" class="account-logo-img">
                            <div class="logo-upload-overlay"><i class="fa-solid fa-camera"></i></div>
                        </div>
                        
                        <!-- NEW: Static Title (No weird background, no editing here) -->
                        <div onclick="filterManagerView('${accountName}')" style="font-size: 1.1rem; font-weight: 800; color: var(--primary); margin-right:10px; cursor:pointer;">
                            ${accountName}
                        </div>

                        <button class="btn-delete-account" onclick="deleteAccountGroup('${accountName}')" title="Delete Group"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                    
                    <button class="btn-mini-action" onclick="openTrendsPanel('${accountName}')" title="View Trends" style="margin-left:auto; margin-right:10px; width:auto; padding:0 10px; gap:5px;">
                         <i class="fa-solid fa-chart-column"></i>
                    </button>
                    <span class="badge" style="margin-left:0;">${accountAgents.length} Agents</span>
                </div>
            `;
        }
        // In "Single View", we skip innerHTML and just append the track below
        
        // --- RENDER AGENT TRACK ---
        const track = document.createElement('div');
        track.className = 'account-scroll-track';
        // Add subtle padding if single view to separate from top bar
        if(isSingleView) track.style.paddingTop = "10px"; 

        if (accountAgents.length === 0) {
            // UPDATED: Cleaner, centered, clickable card
            track.innerHTML = `
                <div class="add-agent-placeholder" onclick="openCreateAgentModal()">
                    <div class="placeholder-content">
                        <div class="icon-circle">
                            <i class="fa-solid fa-user-plus"></i>
                        </div>
                        <h3>Add Member</h3>
                        <p>This group is empty.</p>
                        <span class="btn-fake-add">Create Agent</span>
                    </div>
                </div>`;
        } else {
            accountAgents.forEach(agent => {
                const agentMonthLogs = allMonthLogs.filter(l => l.agentUid === agent.uid);
                const shiftLogs = agentMonthLogs.filter(l => isSameShift(l.jsDate, new Date()));
                const logsDisplay = isLiveView ? shiftLogs : agentMonthLogs;
                const avatarHtml = agent.img 
                    ? `<img src="${agent.img}" class="agent-card-img">`
                    : `<div class="agent-card-img default-avatar"><i class="fa-solid fa-user"></i></div>`;
                let roleLabel = "SPECIALIST";
                let agentLayout = null;

                if (agent.role === 'csr') roleLabel = "CSR"; 
                else if (agent.role === 'data_entry') roleLabel = "DATA ENTRY SPECIALIST"; 
                else if (roleMap[agent.role]) { 
                    roleLabel = roleMap[agent.role].name.toUpperCase(); 
                    agentLayout = roleMap[agent.role].layout;
                }

                let cardControlsHtml = '';
                if (!isLiveView) {
                    cardControlsHtml = `
                        <div style="display:flex; gap:4px; margin-right:8px;">
                            
                        </div>`;
                }

                const card = document.createElement('div');
                card.className = 'agent-card';
                card.innerHTML = `
                    <div class="agent-card-header">
                        <div style="display:flex; gap:12px; align-items:center;">
                            ${avatarHtml}
                            <div class="agent-info">
                                <h4>${agent.name}</h4>
                                <span class="badge">${roleLabel}</span>
                            </div>
                        </div>
                        
                        <div style="display:flex; align-items:center; gap:5px;">
                            ${cardControlsHtml}
                            
                            <!-- NEW: SEPARATOR + PULSING COUNT -->
                            <div class="count-separator">
                                <div class="pulse-val" style="font-size:1.1rem; font-weight:800; color:var(--primary);">
                                    ${logsDisplay.length}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style="padding: 8px 15px; background:#f8f9fa; display:flex; justify-content:left; gap: 5px; border-bottom:1px solid var(--border);">
    <!-- NEW: Edit Role Button -->
    <button class="btn-move-account" onclick="openEditAgentModal('${agent.uid}', '${agent.name}', '${agent.role}')" title="Edit Role">
        <i class="fa-solid fa-user-pen"></i> Edit
    </button>
    
    <button class="btn-move-account" onclick="openMoveAgentModal('${agent.uid}', '${agent.name}')" title="Move to another group">
        <i class="fa-solid fa-arrow-right-from-bracket"></i> Move
    </button>
    
    <button class="btn-delete-agent" onclick="deleteAgent('${agent.uid}', '${agent.name}')" title="Delete Agent">
        <i class="fa-solid fa-trash"></i>
    </button>
</div>
                `;

                const bodyDiv = document.createElement('div');
                bodyDiv.className = 'agent-card-body';
                
                if (logsDisplay.length === 0) {
                     bodyDiv.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:0.75rem;">No logs found</div>`;
                } else {
                    const renderItem = (l) => createMiniLogItem(l, agentLayout); 
                    
                    if (isLiveView) {
                        logsDisplay.forEach(l => bodyDiv.appendChild(renderItem(l)));
                    } else {
                        const groups = {};
                        logsDisplay.forEach(log => {
                            const d = getShiftDate(log.jsDate);
                            const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
                            if(!groups[dateStr]) groups[dateStr] = [];
                            groups[dateStr].push(log);
                        });
                        const sortedDates = Object.keys(groups).sort((a,b) => new Date(b) - new Date(a));
                        sortedDates.forEach(dateStr => {
                            const groupHeader = document.createElement('div');
                            groupHeader.className = 'accordion-header';
                            groupHeader.innerHTML = `<span>${dateStr} <span style="opacity:0.6; font-size:0.7em;">(${groups[dateStr].length})</span></span> <i class="fa-solid fa-chevron-down"></i>`;
                            const groupBody = document.createElement('div');
                            groupBody.className = 'accordion-body';
                            groups[dateStr].forEach(l => groupBody.appendChild(renderItem(l)));
                            groupHeader.onclick = () => { groupHeader.classList.toggle('active'); groupBody.classList.toggle('open'); };
                            bodyDiv.appendChild(groupHeader);
                            bodyDiv.appendChild(groupBody);
                        });
                    }
                }
                card.appendChild(bodyDiv);
                track.appendChild(card);
            });
        }
        section.appendChild(track);
        container.appendChild(section);
    });
}
window.startAccountEdit = function() {
    const parent = document.querySelector('.account-header-info');
    const el = document.getElementById('mgr-account-display');
    const defCtrl = document.getElementById('acc-ctrl-default');
    const editCtrl = document.getElementById('acc-ctrl-edit');

    // 1. UI Toggle
    defCtrl.classList.add('hidden');
    editCtrl.classList.remove('hidden');
    if(parent) parent.classList.add('editing');

    // 2. Make Editable
    el.contentEditable = "true";
    el.focus();

    // 3. Select All
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
}

window.cancelAccountEdit = function(oldName) {
    const parent = document.querySelector('.account-header-info');
    const el = document.getElementById('mgr-account-display');
    const defCtrl = document.getElementById('acc-ctrl-default');
    const editCtrl = document.getElementById('acc-ctrl-edit');

    // 1. Revert Text
    el.innerText = oldName;

    // 2. UI Revert
    el.contentEditable = "false";
    defCtrl.classList.remove('hidden');
    editCtrl.classList.add('hidden');
    if(parent) parent.classList.remove('editing');
}

window.saveAccountEdit = async function(oldName) {
    const parent = document.querySelector('.account-header-info');
    const el = document.getElementById('mgr-account-display');
    const newName = el.innerText.trim();

    // 1. Validation
    if (!newName || newName === oldName) {
        cancelAccountEdit(oldName);
        return;
    }

    try {
        // 2. Database Updates
        // A. Update List
        await setDoc(doc(db,"settings","account_list"), {names: arrayRemove(oldName)}, {merge:true});
        await setDoc(doc(db,"settings","account_list"), {names: arrayUnion(newName)}, {merge:true});
        
        // B. Update Users
        const q = query(collection(db,"users"), where("accountId","==",oldName));
        const s = await getDocs(q); 
        const b = writeBatch(db); 
        s.forEach(d => b.update(doc(db,"users",d.id), {accountId: newName})); 
        await b.commit();

        // 3. Clear Cache & Update State
        managerCache = null;
        activeManagerAccount = newName; // Switch to new name immediately

        // 4. Refresh UI
        // We use filterManagerView to reload the grid and sidebar selection
        renderSidebarAccounts(); 
        filterManagerView(newName); 

        // 5. Success UI Cleanup (Not strictly needed since grid re-renders, but good practice)
        el.contentEditable = "false";
        if(parent) parent.classList.remove('editing');

    } catch(e) {
        console.error("Error renaming account:", e);
        window.showModal("Error", "Could not rename account", false);
        cancelAccountEdit(oldName);
    }
}



function createMiniLogItem(l, layout) {
    const el = document.createElement('div');
    let safeDetails = l.details ? l.details.replace(/"/g, '&quot;') : '-';
    let displayType = l.type;

    if (layout && l.dynamicData) {
        const parts = [];
        layout.forEach((field, index) => {
            const val = l.dynamicData[field.id];
            if (val) {
                if (index === 0) displayType = val;
                else parts.push(val);
            }
        });
        if (parts.length > 0) safeDetails = parts.join(" | ").replace(/"/g, '&quot;');
    }
    if (displayType && displayType.length > 8) displayType = displayType.substring(0,8);

    el.className = 'mini-log-item';
    el.setAttribute('data-id', l.id); 
    el.setAttribute('data-agent', l.agent);
    el.setAttribute('data-time', l.time);
    el.setAttribute('onclick', 'viewLog(this)');

    el.innerHTML = `<span class="mini-time">${formatTime24(l.jsDate)}</span><span class="mini-type">${displayType || '-'}</span><span class="mini-details">${safeDetails}</span>`;
    return el;
}

// =======================================================
// FILTERS, DATES & CLOCK
// =======================================================

// 1. STATE VARIABLES
let filterState = {
    month: new Date().getMonth(), 
    year: new Date().getFullYear(),
    day: 'all'
};
const MONTH_NAMES = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

// 2. SETUP DROPDOWNS
function initYearDropdown() { /* Keeps Agent Dropdown Logic */ }

function populateManagerDropdowns() {
    // YEAR
    const yearMenu = document.getElementById('mgr-menu-year');
    if(!yearMenu) return;
    yearMenu.innerHTML = ''; 
    const currentYear = new Date().getFullYear();
    const allDiv = document.createElement('div');
    allDiv.className = 'dropdown-item';
    allDiv.innerText = "ALL YEARS";
    allDiv.onclick = () => { setYear('all'); toggleManagerYearMenu(); };
    yearMenu.appendChild(allDiv);

    for (let y = currentYear + 1; y >= currentYear - 2; y--) {
        const div = document.createElement('div');
        div.className = 'dropdown-item';
        div.innerText = y;
        div.onclick = () => { setYear(y); toggleManagerYearMenu(); };
        yearMenu.appendChild(div);
    }

    // MONTH
    const monthMenu = document.getElementById('mgr-menu-month');
    monthMenu.innerHTML = '';
    MONTH_NAMES.forEach((m, idx) => {
        const div = document.createElement('div');
        div.className = 'dropdown-item';
        div.innerText = m;
        div.onclick = () => { setMonth(idx, m); toggleManagerMonthMenu(); };
        monthMenu.appendChild(div);
    });
    const allM = document.createElement('div');
    allM.className = 'dropdown-item';
    allM.innerText = "ALL MONTHS";
    allM.onclick = () => { setMonth('all', 'ALL MONTHS'); toggleManagerMonthMenu(); };
    monthMenu.appendChild(allM);
}

window.toggleManagerMonthMenu = function() {
    document.getElementById('mgr-menu-year').classList.add('hidden');
    document.getElementById('mgr-menu-month').classList.toggle('hidden');
}
window.toggleManagerYearMenu = function() {
    document.getElementById('mgr-menu-month').classList.add('hidden');
    document.getElementById('mgr-menu-year').classList.toggle('hidden');
}

window.setMonth = function(monthIndex, name) {
    filterState.month = monthIndex;
    filterState.day = 'all'; 
    
    // Update Sidebar Text
    const mgrDisplay = document.getElementById('mgr-display-month');
    if(mgrDisplay) mgrDisplay.innerText = name;

    // Standard Dashboard text
    const agDisplay = document.getElementById('display-month');
    if(agDisplay) agDisplay.innerText = name;
    
    updateLogFilter();
    initWorkdayDropdown(); 
}

window.setYear = function(year) {
    filterState.year = year;
    const mgrDisplay = document.getElementById('mgr-display-year');
    if(mgrDisplay) mgrDisplay.innerText = year;
    updateLogFilter();
    initWorkdayDropdown();
}

window.initWorkdayDropdown = function() {
    const mgrSelect = document.getElementById('mgr-day-filter');
    const agSelect = document.getElementById('day-filter-select');
    
    const year = filterState.year === 'all' ? new Date().getFullYear() : filterState.year;
    const month = filterState.month === 'all' ? new Date().getMonth() : filterState.month;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const fillSelect = (selectEl) => {
        if(!selectEl) return;
        selectEl.innerHTML = '<option value="all">WHOLE MONTH</option>';
        for (let d = 1; d <= daysInMonth; d++) {
             const option = document.createElement('option');
             option.value = d;
             option.innerText = `${d}`; 
             if(filterState.day == d) option.selected = true;
             selectEl.appendChild(option);
        }
    };
    fillSelect(mgrSelect);
    fillSelect(agSelect);
}

window.setDayFilter = function(val) {
    filterState.day = val;
    updateLogFilter();
}
let depositDays = 1; // Default to 1 day

window.adjustDays = function(delta) {
    depositDays += delta;
    if (depositDays < 1) depositDays = 1; // Cannot be less than 1
    document.getElementById('dep-days-val').innerText = depositDays;
}
// 3. CORE FILTERING
window.updateLogFilter = function() {
    if (!rawLogsCache) return;
    const selMonth = filterState.month;
    const selYear = filterState.year;
    const selDay = filterState.day; 
    const now = new Date();

    const monthlyLogs = rawLogsCache.filter(log => {
        if (!log.jsDate) return false;
        const d = getShiftDate(log.jsDate); 
        if (selYear !== 'all' && d.getFullYear() !== selYear) return false;
        if (selYear !== 'all' && selMonth !== 'all' && d.getMonth() !== selMonth) return false;
        if (selDay !== 'all' && d.getDate() != selDay) return false;
        return true;
    });

    const isToday = (selDay == now.getDate()) && (selMonth == now.getMonth()) && (selYear == now.getFullYear());
    const isLiveView = (selDay !== 'all') && isToday;

     if (currentUser.role === 'manager') {
        renderManagerGrid(monthlyLogs, isLiveView);
    } else {
        const viewLogs = monthlyLogs; 
        document.getElementById('counter-val').innerText = viewLogs.length; 
        
        if (currentUser.role === 'data_entry') {
            // FIX: No more tabs. Show ALL 'deposit' AND 'task' entries together.
             const combinedLogs = viewLogs.filter(l => 
                l.subType === 'deposit' || l.subType === 'task'
            );
            renderTable(combinedLogs);
        } else {
            // For CSR or other roles, just show their logs
            renderTable(viewLogs);
        }
    }
    const tPanel = document.getElementById('trends-panel');
    if (tPanel && tPanel.classList.contains('active')) {
        
        // 1. Sync State (Master -> Trends)
        if (filterState.year !== 'all') {
            trendState.year = parseInt(filterState.year);
        } else {
            trendState.year = new Date().getFullYear();
        }
        trendState.month = filterState.month; // Works because both use 'all' or 0-11 index

        // 2. Sync Visual Labels inside the Trends Panel
        // (So the dropdowns inside the panel match what you clicked outside)
        const lblYear = document.getElementById('trend-lbl-year');
        const lblMonth = document.getElementById('trend-lbl-month');
        
        if (lblYear) lblYear.innerText = trendState.year;
        
        if (lblMonth) {
            // Need to handle the 'all' text conversion
            const monthText = (trendState.month === 'all') ? "Whole Year" : MONTH_NAMES_FULL[trendState.month];
            lblMonth.innerText = monthText;
        }

        // 3. Redraw Charts Instantly
        renderTrendCharts();
    }
}

// 4. CLOCK
function startClock() {
    function update() {
        const now = new Date();
        
        // 1. Format Date (e.g., "JAN 06")
        const dateOptions = { month: 'short', day: '2-digit' };
        const dateString = now.toLocaleDateString('en-US', dateOptions); 
        
        // 2. Format Time (e.g., "02:10 AM")
        const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
        const timeString = now.toLocaleTimeString('en-US', timeOptions);

        // 3. Update AGENT View
        const agDate = document.getElementById('clock-date');
        const agTime = document.getElementById('clock-time');
        if(agDate) agDate.innerText = dateString;
        if(agTime) agTime.innerText = timeString;

        // 4. Update MANAGER View (New additions)
        const mgrDate = document.getElementById('mgr-clock-date');
        const mgrTime = document.getElementById('mgr-clock-time');
        if(mgrDate) mgrDate.innerText = dateString; 
        if(mgrTime) mgrTime.innerText = timeString;
    }
    
    update(); // Run once immediately
    setInterval(update, 1000); // Run every second
}

// =======================================================
// DATA LOGGING & CRUD
// =======================================================

async function setupLogListener() {
    const logsRef = collection(db, "logs");
    let q;
    if (currentUser.role === 'manager') q = query(logsRef, orderBy("timestamp", "desc"));
    else q = query(logsRef, where("agentUid", "==", currentUser.uid), orderBy("timestamp", "desc"));

    unsubscribeLogs = onSnapshot(q, (snapshot) => {
        const logs = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            data.id = doc.id; 
            data.jsDate = data.timestamp ? data.timestamp.toDate() : new Date(); 
            logs.push(data);
        });
        rawLogsCache = logs;
        updateLogFilter();
    });
}

// ... (KEEP ALL YOUR EXISTING SUBMIT FUNCTIONS: submitCSREntry, submitDataEntryTask, submitDeposits, addLog) ...
// For brevity, I am compressing them, but you should copy them from your previous version or just ensure they are here.
// They haven't changed.
window.submitCSREntry = async function() {
    const type = document.getElementById('chat-type-select').value;
    const ref = document.getElementById('chat-ref').value;
    const details = document.getElementById('chat-details').value;
    
    if(!ref && !details) return window.showModal("Error", "Missing details", false);

    const logData = {
        type: type,
        ref: ref || "-",
        details: details || "-",
        subType: 'chat'
    };

    if (editingLogId) {
        // UPDATE EXISTING
        const logRef = doc(db, "logs", editingLogId);
        await updateDoc(logRef, logData);
        window.showModal("Success", "Entry Updated", false);
        cancelEditing(); // Reset UI
    } else {
        // CREATE NEW
        await addLog(logData);
    }
    
    // Clear inputs (cancelEditing handles this, but good to keep safe)
    document.getElementById('chat-ref').value = '';
    document.getElementById('chat-details').value = '';
}
window.submitDataEntryTask = async function() {
    // Get value from hidden input (which is updated by our new buttons)
    const type = document.getElementById('admin-task-select').value;
    const ref = document.getElementById('admin-task-ref').value;
    const details = document.getElementById('admin-task-details').value;
    
    if(!ref && !details) return window.showModal("Error", "Missing details", false);

    const logData = {
        type: type,
        ref: ref || "-",
        details: details || "-",
        // We set everything here to 'task' because you have a separate Deposits tab
        subType: 'task' 
    };

    if (editingLogId) {
        const logRef = doc(db, "logs", editingLogId);
        await updateDoc(logRef, logData);
        window.showModal("Success", "Entry Updated", false);
        cancelEditing();
    } else {
        await addLog(logData);
    }
    
    // Clear text fields but KEEP the category selection active for rapid entry
    document.getElementById('admin-task-ref').value = '';
    document.getElementById('admin-task-details').value = '';
    document.getElementById('admin-task-ref').focus(); // Move focus back to Ref for speed
}
window.quickResetMonth = function(wrapperId, callbackName) {
    // 1. Force value to 'this_month'
    selectCustomOption(wrapperId, 'this_month', 'THIS MONTH', callbackName);
    
    // 2. Visual feedback (Quick flash of the button)
    const btn = document.querySelector(`#${wrapperId} .dd-text-btn`);
    if(btn) {
        btn.style.backgroundColor = '#dbeafe'; // Flash blue
        setTimeout(() => btn.style.backgroundColor = '', 200);
    }
}
window.submitDeposits = async function() {
    const gateways = ['paypal', 'braintree', 'affirm'];
    let batch = [];
    
    // Get the day count text
    const dayText = depositDays > 1 ? `(${depositDays} Days)` : ""; 

    gateways.forEach(gw => {
        const row = document.getElementById(`row-${gw}`);
        const ddBtn = row.querySelector('.toggle-group[data-brand="dd"] .toggle-btn.active-done'); // Check specifically for active class
        const diyBtn = row.querySelector('.toggle-group[data-brand="diy"] .toggle-btn.active-done'); 
        
        // Check logic: Only if at least one side is marked DONE
        // (Or if you want to log "None" explicitly, adjust accordingly. 
        // Assuming we only log if work was done).
        const ddStat = ddBtn ? "Done" : (row.querySelector('.toggle-group[data-brand="dd"] .toggle-btn.active-no') ? "None" : "-");
        const diyStat = diyBtn ? "Done" : (row.querySelector('.toggle-group[data-brand="diy"] .toggle-btn.active-no') ? "None" : "-");

        // Submit if at least one button was clicked in this row
        if (ddStat !== '-' || diyStat !== '-') {
            batch.push({
                type: "Deposit",
                ref: gw.charAt(0).toUpperCase() + gw.slice(1),
                // Add the Day Count to the details string
                details: `${dayText} DD: ${ddStat} | DIY: ${diyStat}`.trim(), 
                subType: 'deposit'
            });
        }
    });

    if (batch.length === 0) return window.showModal("Error", "Please mark at least one gateway.", false);

    // Send to Firebase
    batch.forEach(async (log) => await addLog(log));
    
    // Reset UI
    document.querySelectorAll('.toggle-btn').forEach(b => {
        b.classList.remove('active-done'); 
        b.classList.remove('active-no'); 
        b.removeAttribute('data-active');
    });
    
    // Reset Day Counter back to 1
    depositDays = 1;
    document.getElementById('dep-days-val').innerText = "1";

    window.showModal("Success", "Deposits Saved", false);
}

// Core Add Function
async function addLog(data) {
    try {
        const now = new Date(); // Capture time once
        await addDoc(collection(db, "logs"), {
            ...data,
            agent: currentUser.name,
            agentUid: currentUser.uid,
            timestamp: serverTimestamp(),
            date: now.toLocaleDateString(),
            // FORCE 24H HERE:
            time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) 
        });
    } catch (e) {
        console.error("Error adding log: ", e);
        window.showModal("Error", "Could not save to cloud.", false);
    }
}

// =======================================================
// DYNAMIC FORMS & TABLES
// =======================================================

window.renderCustomDashForm = function(layout, roleName) {
    currentRoleLayout = layout; 
    const container = document.getElementById('form-custom');
    const title = document.getElementById('custom-form-title');
    const body = container.querySelector('.card-body');
    title.innerText = roleName + " Log";
    body.innerHTML = '';
    layout.forEach(field => {
        const wrapper = document.createElement('div');
        wrapper.className = 'form-group';
        const label = document.createElement('label');
        label.innerText = field.label;
        wrapper.appendChild(label);
        if (field.type === 'text') {
            const input = document.createElement('input'); input.type = 'text'; input.className = 'custom-input dynamic-field';
            input.dataset.id = field.id; input.dataset.label = field.label; input.placeholder = `Enter ${field.label}...`; wrapper.appendChild(input);
        } else if (field.type === 'select') {
            const select = document.createElement('select'); select.className = 'custom-select dynamic-field';
            select.dataset.id = field.id; select.dataset.label = field.label;
            const opts = field.options ? field.options.split(',') : [];
            opts.forEach(o => { const clean = o.trim(); if(clean) { const option = document.createElement('option'); option.value = clean; option.innerText = clean; select.appendChild(option); } });
            wrapper.appendChild(select);
        } else if (field.type === 'textarea') {
            const txt = document.createElement('textarea'); txt.className = 'custom-textarea dynamic-field';
            txt.dataset.id = field.id; txt.dataset.label = field.label; txt.placeholder = `Enter ${field.label}...`; wrapper.appendChild(txt);
        }
        body.appendChild(wrapper);
    });
    const btn = document.createElement('button');
    btn.className = 'btn btn-submit';
    btn.onclick = submitCustomDynamicEntry; 
    btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> LOG ENTRY';
    body.appendChild(btn);
}

window.submitCustomDynamicEntry = async function() {
    const dynamicData = {};
    const inputs = document.querySelectorAll('.dynamic-field');
    let previewDetails = [];
    let smartType = "Log"; let firstValueSet = false;
    inputs.forEach(input => {
        const val = input.value.trim();
        if(val) {
            dynamicData[input.dataset.id] = val;
            previewDetails.push(`${input.dataset.label}: ${val}`);
            if (!firstValueSet) { smartType = val.length > 15 ? val.substring(0, 12) + "..." : val; firstValueSet = true; }
        }
    });
    if (Object.keys(dynamicData).length === 0) return window.showModal("Error", "Form is empty", false);
    const logData = { subType: 'custom_dynamic', dynamicData: dynamicData, type: smartType, ref: "-", details: previewDetails.join(" | ") };
    if (editingLogId) { await updateDoc(doc(db, "logs", editingLogId), logData); cancelEditing(); window.showModal("Success", "Updated", false); } 
    else { await addLog(logData); inputs.forEach(i => i.value = ''); }
}

function renderTable(logs) {
    const tbody = document.getElementById('report-body'); 
    const controls = document.getElementById('agent-expand-controls');
    tbody.innerHTML = ''; 
    if(!logs || logs.length === 0) { 
        const cols = currentRoleLayout ? (currentRoleLayout.length + 2) : 5;
        tbody.innerHTML = `<tr><td colspan="${cols}" style="text-align:center;padding:30px;color:var(--text-muted);">No logs found.</td></tr>`; 
        if(controls) controls.classList.add('hidden');
        return; 
    }
    const isGroupedView = (filterState.day === 'all');
    if (isGroupedView) {
        if(controls) { controls.classList.remove('hidden'); controls.style.display = 'flex'; } 
        const groups = {};
        logs.forEach(row => {
            let displayDate = row.date || "-";
            if (row.jsDate) { const shiftDate = getShiftDate(row.jsDate); displayDate = shiftDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }); }
            if (!groups[displayDate]) groups[displayDate] = [];
            groups[displayDate].push(row);
        });
        Object.keys(groups).sort((a,b) => new Date(b) - new Date(a)).forEach((dateStr, index) => {
            const groupLogs = groups[dateStr];
            const groupId = `group-${index}`;
            const cols = currentRoleLayout ? (currentRoleLayout.length + 2) : 5;
            const trHeader = document.createElement('tr');
            trHeader.className = 'group-header-row';
            trHeader.setAttribute('onclick', `toggleGroup('${groupId}', this)`);
            trHeader.innerHTML = `<td colspan="${cols}" class="group-header-cell"><div class="group-header-content"><span><i class="fa-solid fa-chevron-down"></i> ${dateStr}</span><span style="opacity:0.6; font-size:0.8em;">${groupLogs.length} Entries</span></div></td>`;
            tbody.appendChild(trHeader);
            groupLogs.forEach(row => { const tr = createRow(row); tr.classList.add('log-row', 'hidden-row'); tr.setAttribute('data-group', groupId); tbody.appendChild(tr); });
        });
    } else {
        if(controls) controls.classList.add('hidden'); 
        logs.forEach(row => tbody.appendChild(createRow(row)));
    }
}

function createRow(row) {
    let displayDate = row.date || "-";
    if (row.jsDate) { const shiftDate = getShiftDate(row.jsDate); displayDate = shiftDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }); }
    const tr = document.createElement('tr');
    tr.setAttribute('data-id', row.id);
    tr.setAttribute('onclick', 'handleRowClick(this)');
    
    // 1. DYNAMIC ROLE ROW
    if (currentRoleLayout) {
        let html = `<td style="text-align: left !important;">${displayDate}</td>
                    <td style="text-align: left !important;">${formatTime24(row.jsDate)}</td>`; // <--- UPDATED
        currentRoleLayout.forEach(field => { 
            const val = (row.dynamicData && row.dynamicData[field.id]) ? row.dynamicData[field.id] : "-"; 
            html += `<td style="text-align: left !important;">${val}</td>`; 
        });
        tr.innerHTML = html;
    } 
    // 2. STANDARD ROLE ROW
    else {
        let displayType = row.type;
        if (displayType === "Custom Log") { 
            const parts = (row.details || "").split(" | "); 
            if(parts.length > 0 && parts[0].includes(": ")) displayType = parts[0].split(": ")[1]; 
        }
        tr.innerHTML = `<td>${displayDate}</td>
                        <td>${formatTime24(row.jsDate)}</td> <!-- UPDATED -->
                        <td>${displayType}</td>
                        <td>${row.ref || "-"}</td>
                        <td style="text-align: left !important;">${(row.details || "-").replace(/"/g, '&quot;')}</td>`;
    }
    return tr;
}
window.handleRowClick = function(elem) {
    // 1. MANAGER: Always show View Modal (Read Only)
    if (currentUser.role === 'manager') {
        viewLog(elem); 
        return;
    }

    // 2. GET ID
    const id = elem.getAttribute('data-id');
    if (!id || id === "undefined") {
        console.error("Row has no ID. Cannot edit.");
        return;
    }

    // 3. FIND FULL DATA IN CACHE
    const logData = rawLogsCache.find(l => l.id === id);
    if (!logData) {
        console.error("Log data not found in cache.");
        return;
    }

    // 4. START EDITING
    startEditing(logData.id, logData.type, logData.ref, logData.details, logData.subType, logData);
}
function startEditing(id, type, ref, details, subType, fullLogData) {
    editingLogId = id; 

    // A. CSR LOGIC
    if (currentUser.role === 'csr') {
        document.getElementById('chat-type-select').value = type;
        document.getElementById('chat-ref').value = ref;
        document.getElementById('chat-details').value = details;
        updateSubmitButton('form-csr', true);
    } 
    // B. DATA ENTRY LOGIC
    else if (currentUser.role === 'data_entry') {
        document.getElementById('admin-task-select').value = type;
        document.getElementById('admin-task-ref').value = ref;
        document.getElementById('admin-task-details').value = details;
        updateSubmitButton('admin-view-tasks', true);
    }
    // C. CUSTOM DYNAMIC ROLE LOGIC
    else if (currentRoleLayout) {
        // 1. Get the dynamic data map (handle legacy logs that might be empty)
        const dData = fullLogData.dynamicData || {};

        // 2. Find all inputs currently on screen
        const inputs = document.querySelectorAll('.dynamic-field');

        // 3. Fill them
        inputs.forEach(input => {
            const fieldId = input.dataset.id;
            if (dData[fieldId]) {
                input.value = dData[fieldId];
            } else {
                input.value = ''; // Clear if this specific log has no data for this field
            }
        });

        // 4. Update Button State
        updateSubmitButton('form-custom', true);
    }
}

window.cancelEditing = function() {
    editingLogId = null;
    
    // Clear CSR
    const chatRef = document.getElementById('chat-ref');
    if(chatRef) chatRef.value = '';
    const chatDet = document.getElementById('chat-details');
    if(chatDet) chatDet.value = '';

    // Clear Admin
    const adminRef = document.getElementById('admin-task-ref');
    if(adminRef) adminRef.value = '';
    const adminDet = document.getElementById('admin-task-details');
    if(adminDet) adminDet.value = '';

    // Clear Custom Dynamic Fields
    const dynamicInputs = document.querySelectorAll('.dynamic-field');
    dynamicInputs.forEach(i => i.value = '');

    // Reset Buttons
    updateSubmitButton('form-csr', false);
    updateSubmitButton('admin-view-tasks', false);
    updateSubmitButton('form-custom', false);
}

// Helper to toggle button text/color
// Helper to toggle button text/color
function updateSubmitButton(containerId, isEditing) {
    const container = document.getElementById(containerId);
    if (!container) return; 

    let btn = container.querySelector('.btn-submit'); 
    if (!btn) return;

    let wrapper = container.querySelector('.action-wrapper');

    if (isEditing) {
        // --- ENTER EDIT MODE ---
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.className = 'action-wrapper';
            
            if(btn.parentNode) {
                btn.parentNode.insertBefore(wrapper, btn);
                wrapper.appendChild(btn); // Move Submit into wrapper
                
                // 1. CANCEL BUTTON
                const cancelBtn = document.createElement('button');
                cancelBtn.className = 'btn-cancel-edit';
                cancelBtn.innerHTML = '<i class="fa-solid fa-ban"></i> CANCEL';
                cancelBtn.onclick = cancelEditing; 
                wrapper.appendChild(cancelBtn);

                // 2. DELETE BUTTON (New)
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn-delete-entry';
                deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i> DELETE';
                deleteBtn.onclick = deleteCurrentLog; // Calls new function
                wrapper.appendChild(deleteBtn);
            }
        }

        // Style the Submit Button as "Update"
        btn.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> UPDATE`;
        btn.classList.add('btn-update-mode'); 
        // Adjust width to share space (Submit gets 50%, others share rest)
        
    } else {
        // --- REVERT TO NORMAL MODE ---
        if (wrapper) {
            if(wrapper.parentNode) {
                wrapper.parentNode.insertBefore(btn, wrapper);
                wrapper.remove(); // Removes Cancel & Delete buttons
            }
        }

        btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> LOG ENTRY`;
        btn.classList.remove('btn-update-mode');
        btn.style = ""; 
    }
}
window.deleteCurrentLog = async function() {
    if (!editingLogId) return;

    // Ask for confirmation
    window.showModal(
        "Delete Entry", 
        "Are you sure you want to delete this log? This cannot be undone.", 
        true, 
        async () => {
            try {
                // Delete from Firestore
                await deleteDoc(doc(db, "logs", editingLogId));
                
                // Clean up UI
                cancelEditing();
                window.showModal("Success", "Entry Deleted", false);
            } catch (e) {
                console.error("Delete failed: ", e);
                window.showModal("Error", "Could not delete entry.", false);
            }
        }
    );
}
// =======================================================
// MODAL & UTIL
// =======================================================

window.openRoleBuilder = async function() {
    // 1. Show Modal
    document.getElementById('role-builder-modal').classList.remove('hidden');

    // Hide Delete Button initially
    const deleteBtn = document.getElementById('btn-delete-role');
    if(deleteBtn) deleteBtn.style.display = 'none';

    // 2. Reset State
    draftFields = []; 
    editingRoleId = null;
    document.getElementById('builder-role-name').value = '';
    document.getElementById('builder-fields-container').innerHTML = '';
    renderBuilderPreview();

    // 3. Setup Dropdown UI (Loading State)
    const label = document.getElementById('builder-load-label');
    const optionsContainer = document.getElementById('builder-load-options');
    
    label.innerText = "Loading roles...";
    optionsContainer.innerHTML = ''; // Clear old

    try {
        // 4. Fetch Roles
        const snap = await getDocs(collection(db, "roles"));
        
        // 5. Populate "Create New" Option
        label.innerText = "-- Create New Role --"; // Default text
        
        // Add "Create New" as first option
        const newOpt = document.createElement('div');
        newOpt.className = 'custom-dd-option selected';
        newOpt.innerText = "-- Create New Role --";
        newOpt.onclick = () => {
            selectCustomOption('dd-builder-load', '', '-- Create New Role --');
            loadRoleIntoBuilder("");
        };
        optionsContainer.appendChild(newOpt);

        // 6. Populate Existing Roles
        snap.forEach(doc => { 
            const roleName = doc.data().name;
            const roleId = doc.id;
            
            const opt = document.createElement('div');
            opt.className = 'custom-dd-option';
            opt.innerText = roleName;
            
            // CRITICAL ADDITION: Add ID so we can find it to delete later
            opt.setAttribute('data-val', roleId); 
            
            opt.onclick = () => {
                selectCustomOption('dd-builder-load', roleId, roleName);
                loadRoleIntoBuilder(roleId);
            };
            optionsContainer.appendChild(opt); 
        });

    } catch(e) {
        console.error("Error loading roles:", e);
        label.innerText = "Error loading list";
    }
}

window.loadRoleIntoBuilder = async function(roleId) {
    const deleteBtn = document.getElementById('btn-delete-role');
    
    if (!roleId) { 
        // --- SWITCH TO "CREATE NEW" MODE ---
        editingRoleId = null; 
        document.getElementById('builder-role-name').value = ''; 
        draftFields = []; 
        document.getElementById('builder-fields-container').innerHTML = ''; 
        renderBuilderPreview(); 
        
        // HIDE DELETE BUTTON
        if(deleteBtn) deleteBtn.style.display = 'none';
        return; 
    }

    // --- SWITCH TO "EDIT" MODE ---
    editingRoleId = roleId;
    
    // SHOW DELETE BUTTON
    if(deleteBtn) deleteBtn.style.display = 'block';

    try {
        const docSnap = await getDoc(doc(db, "roles", roleId));
        if (docSnap.exists()) { 
            const data = docSnap.data(); 
            document.getElementById('builder-role-name').value = data.name; 
            draftFields = data.layout || []; 
            
            const container = document.getElementById('builder-fields-container'); 
            container.innerHTML = ''; 
            draftFields.forEach(f => renderBuilderConfigRow(f)); 
            renderBuilderPreview(); 
        }
    } catch(e) { console.error(e); }
}
window.addBuilderField = function(type) {
    const field = { id: Date.now(), type: type, label: (type === 'text') ? 'Reference / ID' : (type === 'select' ? 'Status' : 'Notes'), options: (type === 'select') ? 'Pending, Approved, Denied' : '' };
    draftFields.push(field); renderBuilderConfigRow(field); renderBuilderPreview();
}
function renderBuilderConfigRow(field) {
    const container = document.getElementById('builder-fields-container');
    const div = document.createElement('div');
    div.className = 'form-group';
    div.style.background = 'rgba(255,255,255,0.05)';
    div.style.padding = '10px';
    div.style.borderRadius = '8px';
    div.dataset.id = field.id;

    // Header with Delete
    let html = `
        <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
            <span style="font-size:0.7rem; color:var(--primary); font-weight:bold; text-transform:uppercase;">${field.type}</span>
            <button onclick="removeBuilderField(${field.id})" style="background:none; border:none; color:#ff5555; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
        </div>
        
        <label>Label Name</label>
        <input type="text" class="custom-input" value="${field.label}" onkeyup="updateFieldData(${field.id}, 'label', this.value)">
    `;

    // If Dropdown, add Options Input
    if (field.type === 'select') {
        html += `
            <label style="margin-top:8px;">Dropdown Options (Comma Separated)</label>
            <input type="text" class="custom-input" value="${field.options}" onkeyup="updateFieldData(${field.id}, 'options', this.value)">
        `;
    }

    div.innerHTML = html;
    container.appendChild(div);
}

// 4. Update Data on Typing
window.updateFieldData = function(id, key, value) {
    const field = draftFields.find(f => f.id === id);
    if (field) {
        field[key] = value;
        renderBuilderPreview(); // LIVE UPDATE
    }
}

// 5. Remove Field
window.removeBuilderField = function(id) {
    draftFields = draftFields.filter(f => f.id !== id);
    
    // Re-render the whole list to keep it clean (simple way)
    document.getElementById('builder-fields-container').innerHTML = '';
    draftFields.forEach(f => renderBuilderConfigRow(f));
    renderBuilderPreview();
}

// 6. RENDER PREVIEW (Right Side)
function renderBuilderPreview() {
    const container = document.getElementById('preview-body');
    container.innerHTML = ''; 

    draftFields.forEach(f => {
        const wrapper = document.createElement('div');
        wrapper.className = 'form-group';

        // Label
        const lbl = document.createElement('label');
        lbl.innerText = f.label || 'Untitled Field';
        wrapper.appendChild(lbl);

        // A. TEXT INPUT
        if (f.type === 'text') {
            const input = document.createElement('input');
            input.className = 'custom-input';
            input.placeholder = `Enter ${f.label}...`;
            wrapper.appendChild(input);
        } 
        
        // B. PREMIUM DROPDOWN (Preview Mode)
        else if (f.type === 'select') {
            // Create unique ID for this preview element so toggling works
            const ddId = `preview-dd-${f.id}`;
            const placeholderText = `Select ${f.label || 'Option'}...`;

            // Build Options HTML
            let optionsHtml = '';
            if (f.options) {
                const opts = f.options.split(',').map(s => s.trim());
                opts.forEach(o => {
                    if(o) {
                        // We use a dummy select function for preview since it doesn't need to save data
                        optionsHtml += `<div class="custom-dd-option" onclick="selectCustomOption('${ddId}', '${o}', '${o}')">${o}</div>`;
                    }
                });
            }

            // Construct the Wrapper
            const ddWrapper = document.createElement('div');
            ddWrapper.id = ddId;
            ddWrapper.className = 'custom-dd-wrapper';
            ddWrapper.innerHTML = `
                <input type="hidden" value="">
                <div class="custom-dd-trigger" onclick="toggleCustomDropdown('${ddId}')">
                    <span>${placeholderText}</span>
                    <i class="fa-solid fa-chevron-down"></i>
                </div>
                <div class="custom-dd-options" style="position:absolute; z-index:1000;">
                    ${optionsHtml}
                </div>
            `;
            wrapper.appendChild(ddWrapper);
        }
        
        // C. TEXTAREA
        else if (f.type === 'textarea') {
            const txt = document.createElement('textarea');
            txt.className = 'custom-textarea';
            txt.placeholder = `Enter ${f.label}...`;
            txt.style.height = '60px';
            wrapper.appendChild(txt);
        }

        container.appendChild(wrapper);
    });

    // Fake Submit Button (Visual Only)
    const btn = document.createElement('div');
    btn.className = 'btn btn-submit';
    btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> LOG ENTRY (PREVIEW)';
    btn.style.marginTop = '15px';
    btn.style.opacity = '0.7';
    container.appendChild(btn);
}
window.saveNewRole = async function() {
    const name = document.getElementById('builder-role-name').value.trim();
    if (!name) return window.showModal("Error", "Please enter a Role Name", false);
    if (draftFields.length === 0) return window.showModal("Error", "Add at least one field", false);

    try {
        const roleData = {
            name: name,
            layout: draftFields,
            updatedAt: serverTimestamp()
        };

        if (editingRoleId) {
            // --- UPDATE MODE ---
            await updateDoc(doc(db, "roles", editingRoleId), roleData);
            window.showModal("Success", `Role "${name}" updated!`, false);
        } else {
            // --- CREATE MODE ---
            roleData.createdAt = serverTimestamp();
            await addDoc(collection(db, "roles"), roleData);
            window.showModal("Success", `Role "${name}" created!`, false);
        }

        closeRoleBuilder();
        
        // Refresh dashboard if user is currently viewing this role
        if(currentUser.role === editingRoleId) location.reload();

    } catch(e) {
        console.error(e);
        window.showModal("Error", "Database error.", false);
    }
}
window.closeRoleBuilder = function() { document.getElementById('role-builder-modal').classList.add('hidden'); }

// ... (KEEP all other modal open/close functions: openCreateAccountModal, openCreateAgentModal, etc.) ...
// Just copying the key ones for context
window.openCreateAccountModal = function() {
    document.getElementById('new-account-name').value = '';
    document.getElementById('create-account-modal').classList.remove('hidden');
}
window.closeCreateAccountModal = function() { document.getElementById('create-account-modal').classList.add('hidden'); }
window.submitNewAccount = async function() {
    // 1. Get the name input
    const inputEl = document.getElementById('new-account-name');
    
    // Safety Check
    if (!inputEl) return;

    const name = inputEl.value.trim();
    if(!name) return window.showModal("Error", "Please enter an Account Name", false);

    try {
        const docRef = doc(db, "settings", "account_list");
        
        // 2. Add to Firestore
        await setDoc(docRef, {
            names: arrayUnion(name)
        }, { merge: true });

        // --- INSTANT UI UPDATES ---

        // 3. Update Local Cache
        if (!cachedAccountList.includes(name)) {
            cachedAccountList.push(name);
            cachedAccountList.sort(); // Keep it alphabetical
        }

        // 4. Clear Manager Cache (forces grid to recognize the new group)
        managerCache = null;

        // 5. Refresh UI Elements
        renderSidebarAccounts(); // Updates Sidebar
        updateLogFilter();       // Updates Main Grid (Shows the new empty column)

        // 6. Cleanup
        inputEl.value = ''; // Clear input
        closeCreateAccountModal();
        window.showModal("Success", "Account Group Created", false);

    } catch(e) {
        console.error("Error creating account:", e);
        window.showModal("Error", "Failed to save to database", false);
    }
}
window.openCreateAgentModal = async function() {
    // 1. Show Modal
    document.getElementById('create-agent-modal').classList.remove('hidden');

    // 2. Reset Inputs
    document.getElementById('new-agent-name').value = '';
    document.getElementById('new-agent-code').value = '';
    
    // Reset Hidden Dropdown Values
    document.getElementById('new-agent-account').value = '';
    document.getElementById('new-agent-role').value = '';

    // 3. UI Loading State
    const accLabel = document.getElementById('label-new-agent-acc');
    const roleLabel = document.getElementById('label-new-agent-role');
    const accContainer = document.getElementById('opts-new-agent-acc');
    const roleContainer = document.getElementById('opts-new-agent-role');

    accLabel.innerText = "Loading accounts...";
    roleLabel.innerText = "Loading roles...";
    accContainer.innerHTML = '';
    roleContainer.innerHTML = '';

    try {
        // 4. Fetch Data
        const [uniqueAccounts, rolesSnap] = await Promise.all([
            getAllActiveAccounts(),
            getDocs(collection(db, "roles"))
        ]);

        // 5. Populate ACCOUNTS
        accLabel.innerText = "Select an Account...";
        
        if (uniqueAccounts.length === 0) {
             const empty = document.createElement('div');
             empty.className = 'custom-dd-option';
             empty.innerText = "No accounts found";
             accContainer.appendChild(empty);
        } else {
            uniqueAccounts.forEach(acc => {
                const opt = document.createElement('div');
                opt.className = 'custom-dd-option';
                opt.innerText = acc;
                opt.onclick = () => selectCustomOption('dd-new-agent-acc', acc, acc);
                accContainer.appendChild(opt);
            });
        }

        // 6. Populate ROLES
        roleLabel.innerText = "Select a Role...";

        // Helper to add role option
        const addRoleOpt = (val, txt) => {
            const opt = document.createElement('div');
            opt.className = 'custom-dd-option';
            opt.innerText = txt;
            opt.onclick = () => selectCustomOption('dd-new-agent-role', val, txt);
            roleContainer.appendChild(opt);
        };

        // Add Default Roles
        addRoleOpt('csr', 'Standard CSR (Default)');
        addRoleOpt('data_entry', 'Data Entry Specialist (Default)');

        // Separator (Visual Only)
        const sep = document.createElement('div');
        sep.style.borderTop = '1px dashed #cbd5e0'; 
        sep.style.margin = '5px 0';
        roleContainer.appendChild(sep);

        // Add Custom Roles
        if (rolesSnap.empty) {
            const empty = document.createElement('div');
            empty.className = 'custom-dd-option';
            empty.style.color = '#94a3b8';
            empty.style.fontStyle = 'italic';
            empty.innerText = "No custom roles";
            roleContainer.appendChild(empty);
        } else {
            rolesSnap.forEach(doc => {
                addRoleOpt(doc.id, doc.data().name);
            });
        }

    } catch (e) {
        console.error("Error fetching modal data:", e);
        accLabel.innerText = "Error loading data";
        roleLabel.innerText = "Error loading data";
    }
}

window.submitNewAgent = async function() {
    const name = document.getElementById('new-agent-name').value.trim();
    const account = document.getElementById('new-agent-account').value;
    const roleValue = document.getElementById('new-agent-role').value; // This is now 'csr', 'data_entry', or a Firestore ID
    const code = document.getElementById('new-agent-code').value.trim();

    if (!name || !account || !roleValue || code.length !== 4) {
        return window.showModal("Error", "Please fill all fields. Code must be 4 digits.", false);
    }

    try {
        // Unique Code Check
        const q = query(collection(db, "users"), where("code", "==", code));
        const snap = await getDocs(q);
        if(!snap.empty) return window.showModal("Error", "Access Code is already in use.", false);

        // Create User Object
        const newUser = {
            name: name,
            role: roleValue, // <--- We just save the ID here
            code: code,
            accountId: account,
            img: null,
            createdAt: serverTimestamp()
        };

        // Save to Firebase
        await addDoc(collection(db, "users"), newUser);
        managerCache = null;
        closeCreateAgentModal();
        updateLogFilter(); 
        window.showModal("Success", "Team Member Added!", false);
    } catch(e) {
        console.error(e);
        window.showModal("Error", "Database error", false);
    }
}

// =======================================================
// HELPERS
// =======================================================
async function getAllActiveAccounts() {
    await fetchAccountList();
    const allAccounts = new Set(cachedAccountList || []);
    const q = query(collection(db, "users"));
    const snapshot = await getDocs(q);
    snapshot.forEach(doc => { if (doc.data().accountId) allAccounts.add(doc.data().accountId); });
    return Array.from(allAccounts).sort();
}
async function fetchAccountList() {
    try { const docSnap = await getDoc(doc(db, "settings", "account_list")); if (docSnap.exists()) cachedAccountList = docSnap.data().names; } catch (e) { cachedAccountList = []; }
}
const SHIFT_CUTOFF_HOUR = 6;
function getShiftDate(dateObj) { const d = new Date(dateObj); if (d.getHours() < SHIFT_CUTOFF_HOUR) d.setDate(d.getDate() - 1); d.setHours(0, 0, 0, 0); return d; }
function isSameShift(d1, d2) { return getShiftDate(d1).getTime() === getShiftDate(d2).getTime(); }
function setupStandardTableHeaders() { document.querySelector('.data-table thead').innerHTML = `<tr><th width="10%">Date</th><th width="10%">Time</th><th width="15%">Type</th><th width="20%">Ref</th><th width="45%" style="text-align: center;">Details</th></tr>`; }
function setupDynamicTableHeaders(layout) { let html = `<tr><th width="10%">Date</th><th width="10%">Time</th>`; layout.forEach(field => html += `<th>${field.label}</th>`); html += `</tr>`; document.querySelector('.data-table thead').innerHTML = html; }
window.showModal = function(title, msg, isConf, cb) { 
    document.getElementById('modal-title').innerText = title; document.getElementById('modal-msg').innerText = msg;
    const confirmBtn = document.getElementById('btn-modal-confirm');
    const cancelBtn = document.getElementById('btn-modal-cancel');
    cancelBtn.style.display = isConf ? "inline-block" : "none";
    const newBtn = confirmBtn.cloneNode(true); confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
    newBtn.onclick = () => { if(cb) cb(); closeModal(); };
    document.getElementById('custom-modal').classList.remove('hidden'); 
}
window.closeModal = function() { document.getElementById('custom-modal').classList.add('hidden'); }

// Upload Handlers
window.triggerCompanyLogoUpload = () => document.getElementById('company-logo-upload').click();
window.handleCompanyLogoUpload = (i) => handleImg(i, async(b64) => {
    // 1. INSTANT UI UPDATE (Don't wait for database)
    const headerLogo = document.getElementById('header-company-logo');
    const mgrLogo = document.getElementById('mgr-company-logo');
    const loginLogo = document.querySelector('.brand-logo'); // For login screen

    if (headerLogo) headerLogo.src = b64;
    if (mgrLogo) mgrLogo.src = b64;
    if (loginLogo) loginLogo.src = b64;
    
    // Update local cache so it persists if we navigate around
    companyLogoCache = b64; 

    // 2. SAVE TO FIREBASE (Background)
    try {
        await setDoc(doc(db, "settings", "general"), {logo: b64}, {merge: true});
    } catch(e) {
        console.error("Save failed:", e);
        window.showModal("Error", "Image shown but failed to save to cloud.", false);
    }
});
window.triggerAccountLogoUpload = (acc) => { window.accLogoTarget=acc; document.getElementById('account-logo-upload').click(); };
window.handleAccountLogoUpload = (i) => handleImg(i, async(b64) => {
    if (window.accLogoTarget) {
        // 1. Save to DB
        await setDoc(doc(db, "settings", "account_assets"), {
            [window.accLogoTarget]: b64
        }, {merge: true});

        // 2. Force Grid Refresh (This makes it appear instantly)
        // We clear the cache to ensure the new logo is pulled on re-render
        if(managerCache) managerCache.logos[window.accLogoTarget] = b64; 
        updateLogFilter(); 
    }
});
window.triggerAvatarUpload = () => document.getElementById('avatar-upload').click();
window.handleAvatarUpload = (i) => handleImg(i, async(b64) => { await updateDoc(doc(db, "users", currentUser.uid), {img:b64}); currentUser.img=b64; initDashboard(); });
function handleImg(input, cb) {
    if (input.files && input.files[0]) {
        const r = new FileReader();
        r.onload = (e) => {
            const i = new Image();
            i.src = e.target.result;
            i.onload = () => {
                const c = document.createElement('canvas');
                const x = c.getContext('2d');
                const M = 300; 
                let w = i.width, h = i.height;
                if (w > M) { h *= M / w; w = M; }
                c.width = w; c.height = h;
                x.drawImage(i, 0, 0, w, h);
                
                // FIX: Use 'image/png' to preserve transparency!
                cb(c.toDataURL('image/png')); 
            };
        };
        r.readAsDataURL(input.files[0]);
        input.value = ''; // Reset input to allow re-uploading same file
    }
}
window.removeAvatar = function() {
    if (!currentUser.img) return; // Nothing to remove

    // Use Custom Modal instead of native confirm()
    window.showModal(
        "Remove Photo",
        "Are you sure you want to remove your profile photo?",
        true, // Show Cancel button
        async () => {
            try {
                // 1. Update Firestore (Set img to null)
                await updateDoc(doc(db, "users", currentUser.uid), { img: null });
                
                // 2. Update Local State
                currentUser.img = null;

                // 3. Update UI (Manager Side)
                const mgrImg = document.getElementById('mgr-user-img');
                const mgrDef = document.getElementById('mgr-default-icon');
                if (mgrImg) {
                    mgrImg.src = '';
                    mgrImg.classList.add('hidden');
                }
                if (mgrDef) mgrDef.classList.remove('hidden');

                // 4. Update UI (Agent Side)
                const agImg = document.getElementById('current-user-img');
                const agDef = document.getElementById('default-user-icon');
                if (agImg) {
                    agImg.src = '';
                    agImg.classList.add('hidden');
                }
                if (agDef) agDef.classList.remove('hidden');
                
                // 5. Success Feedback
                window.showModal("Success", "Photo removed successfully.", false);

            } catch(e) {
                console.error("Error removing photo:", e);
                window.showModal("Error", "Could not remove photo.", false);
            }
        }
    );
}

window.startNameEdit = function(mode) {
    const isMgr = mode === 'mgr';
    const nameId = isMgr ? 'mgr-user-display' : 'user-display';
    const defCtrl = isMgr ? 'mgr-ctrl-default' : 'agent-ctrl-default';
    const editCtrl = isMgr ? 'mgr-ctrl-edit' : 'agent-ctrl-edit';
    
    // PARENT CONTAINER (For keeping controls visible)
    const parent = isMgr 
        ? document.querySelector('.sidebar-profile') 
        : document.querySelector('.user-profile');

    const el = document.getElementById(nameId);
    
    // 1. UI Changes
    document.getElementById(defCtrl).classList.add('hidden');
    document.getElementById(editCtrl).classList.remove('hidden');
    document.getElementById(editCtrl).style.display = 'flex';
    
    // ADD CLASS TO KEEP CONTROLS VISIBLE
    if(parent) parent.classList.add('editing');

    // 2. Make Editable
    el.contentEditable = "true";
    el.focus();
    el.style.borderBottom = "2px solid var(--primary)";
    el.style.paddingBottom = "2px";

    // 3. Select All Text
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
}

window.cancelNameEdit = function(mode) {
    const isMgr = mode === 'mgr';
    const nameId = isMgr ? 'mgr-user-display' : 'user-display';
    const defCtrl = isMgr ? 'mgr-ctrl-default' : 'agent-ctrl-default';
    const editCtrl = isMgr ? 'mgr-ctrl-edit' : 'agent-ctrl-edit';

    // PARENT CONTAINER
    const parent = isMgr 
        ? document.querySelector('.sidebar-profile') 
        : document.querySelector('.user-profile');

    const el = document.getElementById(nameId);

    // 1. Revert Text & UI
    el.innerText = currentUser.name;
    el.contentEditable = "false";
    el.style.borderBottom = "none";
    el.style.paddingBottom = "0";
    
    document.getElementById(editCtrl).classList.add('hidden');
    document.getElementById(defCtrl).classList.remove('hidden');

    // REMOVE CLASS
    if(parent) parent.classList.remove('editing');
}

window.saveNameEdit = async function(mode) {
    const isMgr = mode === 'mgr';
    const nameId = isMgr ? 'mgr-user-display' : 'user-display';
    const defCtrl = isMgr ? 'mgr-ctrl-default' : 'agent-ctrl-default';
    const editCtrl = isMgr ? 'mgr-ctrl-edit' : 'agent-ctrl-edit';

    // PARENT CONTAINER
    const parent = isMgr 
        ? document.querySelector('.sidebar-profile') 
        : document.querySelector('.user-profile');

    const el = document.getElementById(nameId);
    const newName = el.innerText.trim();

    if (!newName) {
        window.showModal("Error", "Name cannot be empty", false);
        return;
    }

    try {
        await updateDoc(doc(db, "users", currentUser.uid), { name: newName });
        currentUser.name = newName;
        
        const otherId = isMgr ? 'user-display' : 'mgr-user-display';
        const otherEl = document.getElementById(otherId);
        if(otherEl) otherEl.innerText = newName;

        el.contentEditable = "false";
        el.style.borderBottom = "none";
        el.style.paddingBottom = "0";

        document.getElementById(editCtrl).classList.add('hidden');
        document.getElementById(defCtrl).classList.remove('hidden');

        // REMOVE CLASS
        if(parent) parent.classList.remove('editing');

    } catch(e) {
        console.error("Name update failed", e);
        window.showModal("Error", "Could not save name", false);
        cancelNameEdit(mode);
    }
}
window.openCodeModal = () => document.getElementById('change-code-modal').classList.remove('hidden');
window.closeCodeModal = () => document.getElementById('change-code-modal').classList.add('hidden');
window.saveNewCode = async () => { await updateDoc(doc(db,"users",currentUser.uid),{code:document.getElementById('new-access-code').value}); closeCodeModal(); }
window.viewLog = async function(element) {
    // 1. GET DATA INSTANTLY
    const id = element.getAttribute('data-id');
    const agentName = element.getAttribute('data-agent');
    
    // Find log in memory (fast)
    const logData = rawLogsCache.find(l => l.id === id);
    if (!logData) return;

    // 2. OPEN MODAL IMMEDIATELY
    const modal = document.getElementById('log-details-modal');
    modal.classList.remove('hidden');

    // 3. FILL BASIC HEADER INFO
    document.getElementById('modal-view-agent').innerText = logData.agent || agentName;
    document.getElementById('modal-view-time').innerText = formatTime24(logData.jsDate)

    const stdContainer = document.getElementById('modal-standard-content');
    const dynContainer = document.getElementById('modal-dynamic-content');

    // 4. DETERMINE VIEW TYPE
    if (logData.subType === 'custom_dynamic' && logData.dynamicData) {
        // --- DYNAMIC VIEW ---
        stdContainer.classList.add('hidden');
        dynContainer.classList.remove('hidden');
        
        // Loader
        dynContainer.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted);"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading layout...</div>';

        // 5. LOOK UP LAYOUT
        let layout = null;
        
        // Priority 1: Current User Role Layout
        if (currentUser.uid === logData.agentUid && currentRoleLayout) {
            layout = currentRoleLayout;
        } 
        // Priority 2: Manager Cache
        else if (managerCache) {
            const cachedAgent = managerCache.agents.find(a => a.uid === logData.agentUid);
            if (cachedAgent && managerCache.roleMap[cachedAgent.role]) {
                layout = managerCache.roleMap[cachedAgent.role].layout;
            }
        }

        // Priority 3: Fetch (Fallback)
        if (!layout) {
            try {
                const userSnap = await getDoc(doc(db, "users", logData.agentUid));
                if (userSnap.exists()) {
                    const roleId = userSnap.data().role;
                    if (globalRoleCache[roleId]) {
                        layout = globalRoleCache[roleId];
                    } else {
                        const rDoc = await getDoc(doc(db, "roles", roleId));
                        if(rDoc.exists()) layout = rDoc.data().layout;
                    }
                }
            } catch(e) { console.log("Layout fetch error", e); }
        }

        // 6. RENDER FIELDS
        dynContainer.innerHTML = ''; // Clear loader

        if (layout) {
            layout.forEach(field => {
                const val = logData.dynamicData[field.id] || "-";
                const wrapper = document.createElement('div');
                wrapper.className = 'form-group';
                
                // --- FIX: CHECK FIELD TYPE ---
                let inputHtml = '';
                if (field.type === 'textarea') {
                    // Render as a tall box if it's a textarea
                    inputHtml = `<textarea class="custom-textarea" readonly style="height:120px;">${val}</textarea>`;
                } else {
                    // Render as standard input for text/select
                    inputHtml = `<input class="custom-input" value="${val}" readonly>`;
                }

                wrapper.innerHTML = `
                    <label>${field.label}</label>
                    ${inputHtml}
                `;
                dynContainer.appendChild(wrapper);
            });
        } else {
            // Fallback for legacy logs without layout
            const parts = (logData.details || "").split(" | ");
            parts.forEach(part => {
                const [label, val] = part.split(": ");
                const wrapper = document.createElement('div');
                wrapper.className = 'form-group';
                wrapper.innerHTML = `<label>${label || 'Field'}</label><input class="custom-input" value="${val || ''}" readonly>`;
                dynContainer.appendChild(wrapper);
            });
        }

    } else {
        // --- STANDARD VIEW ---
        dynContainer.classList.add('hidden');
        stdContainer.classList.remove('hidden');
        document.getElementById('modal-view-type').value = logData.type || "-";
        document.getElementById('modal-view-ref').value = logData.ref || "-";
        document.getElementById('modal-view-details').value = logData.details || "-";
    }
}

window.closeLogDetails = () => document.getElementById('log-details-modal').classList.add('hidden');
window.jumpToToday = () => { filterState.day = new Date().getDate(); document.getElementById('quick-period').value = 'this_month'; applyQuickFilter('this_month'); }
window.applyQuickFilter = function(mode) {
    const now = new Date();
    // Use shift logic to determine "Today"
    const shiftNow = getShiftDate(now); 

    if (mode === 'this_month') {
        filterState.month = shiftNow.getMonth();
        filterState.year = shiftNow.getFullYear();
    } 
    else if (mode === 'prev_month') {
        // Handle January rollback
        let m = shiftNow.getMonth() - 1;
        let y = shiftNow.getFullYear();
        if (m < 0) { m = 11; y--; }
        
        filterState.month = m;
        filterState.year = y;
    } 
    else if (mode === 'this_year') {
        filterState.month = 'all';
        filterState.year = shiftNow.getFullYear();
    } 
    else if (mode === 'prev_year') {
        filterState.month = 'all';
        filterState.year = shiftNow.getFullYear() - 1;
    }

    // CRITICAL: Force 'all' days to trigger Accordion View in renderTable
    filterState.day = 'all'; 

    // Refresh
    updateLogFilter();
}
window.applyManagerQuickFilter = function(mode) {
    const now = new Date();
    const shiftNow = getShiftDate(now); 
    
    // 1. Calculate New State
    if (mode === 'this_month') {
        filterState.month = shiftNow.getMonth();
        filterState.year = shiftNow.getFullYear();
    } 
    else if (mode === 'prev_month') {
        let m = shiftNow.getMonth() - 1;
        let y = shiftNow.getFullYear();
        if (m < 0) { m = 11; y--; }
        filterState.month = m;
        filterState.year = y;
    } 
    else if (mode === 'this_year') {
        filterState.month = 'all';
        filterState.year = shiftNow.getFullYear();
    } 
    else if (mode === 'prev_year') {
        filterState.month = 'all';
        filterState.year = shiftNow.getFullYear() - 1;
    }

    // Always reset 'Day' to all in this mode
    filterState.day = 'all';

    // 2. SYNC SIDEBAR TEXT (Important!)
    const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
    
    const mgrMonthDisp = document.getElementById('mgr-display-month');
    const mgrYearDisp = document.getElementById('mgr-display-year');

    if (mgrMonthDisp) {
        // If filter is 'all', show 'ALL MONTHS', else show Name
        mgrMonthDisp.innerText = (filterState.month === 'all') ? "ALL MONTHS" : monthNames[filterState.month];
    }
    if (mgrYearDisp) {
        mgrYearDisp.innerText = filterState.year;
    }

    // 3. Refresh Grid
    updateLogFilter();
}
window.setDepositStatus = function(btn, status) {
    const group = btn.parentElement;
    const isAlreadyActive = btn.getAttribute('data-active') === 'true';
    group.querySelectorAll('.toggle-btn').forEach(s => { s.classList.remove('active-done'); s.classList.remove('active-no'); s.removeAttribute('data-active'); s.removeAttribute('data-val'); });
    if (!isAlreadyActive) { btn.setAttribute('data-active', 'true'); btn.setAttribute('data-val', status); btn.classList.add(status === 'Done' ? 'active-done' : 'active-no'); }
}
window.handleEnterKey = (e) => { if(e.key==='Enter'){e.preventDefault(); e.target.blur();} }
window.renameAccountGroup = async (el, old) => { 
    const n = el.innerText.trim(); if(n===old || !n) return;
    await setDoc(doc(db,"settings","account_list"), {names: arrayRemove(old)}, {merge:true});
    await setDoc(doc(db,"settings","account_list"), {names: arrayUnion(n)}, {merge:true});
    const q = query(collection(db,"users"), where("accountId","==",old));
    const s = await getDocs(q); const b = writeBatch(db); s.forEach(d=>b.update(doc(db,"users",d.id),{accountId:n})); await b.commit();
    managerCache = null; updateLogFilter(); renderSidebarAccounts();
}
window.deleteAccountGroup = async function(accountName) {
    // 1. Safety Check: Are there agents in this group?
    const q = query(collection(db, "users"), where("accountId", "==", accountName));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        window.showModal(
            "Cannot Delete", 
            `This account still has ${snapshot.size} active agents. Please move or remove them before deleting the account group.`, 
            false
        );
        return;
    }

    // 2. Confirmation
    window.showModal(
        "Delete Account", 
        `Are you sure you want to permanently delete the "${accountName}" group?`, 
        true, 
        async () => {
            try {
                // --- FIREBASE UPDATES (Parallel) ---
                const settingsRef = doc(db, "settings", "account_list");
                const assetsRef = doc(db, "settings", "account_assets");

                await Promise.all([
                    // A. Remove Name from List
                    updateDoc(settingsRef, { names: arrayRemove(accountName) }),
                    
                    // B. PERMANENTLY DELETE THE LOGO FIELD (Fixes the ghost logo issue)
                    updateDoc(assetsRef, { [accountName]: deleteField() })
                ]);

                // --- INSTANT UI UPDATES (No Glitch) ---

                // 3. Remove Name from local list
                if (cachedAccountList) {
                    cachedAccountList = cachedAccountList.filter(name => name !== accountName);
                }
                
                // 4. Remove Logo from local cache INSTANTLY
                if (managerCache && managerCache.logos) {
                    delete managerCache.logos[accountName];
                }

                // 5. Logic: If we are currently viewing the deleted account, switch back to 'All'
                if (activeManagerAccount === accountName) {
                    activeManagerAccount = 'All';
                }

                // 6. Force UI Refresh
                // We set managerCache to null to force a soft-reload of grid logic if needed, 
                // but since we manually cleaned the logos above, the visual update is instant.
                renderSidebarAccounts(); 
                filterManagerView(activeManagerAccount); 

                window.showModal("Success", "Account group and assets deleted.", false);
            } catch(e) {
                console.error(e);
                window.showModal("Error", "Database error.", false);
            }
        }
    );
}
window.openMoveAgentModal = async function(uid, name) {
    movingAgentUid = uid;
    document.getElementById('move-agent-name').innerText = name;
    
    // 1. Show Modal
    const modal = document.getElementById('move-agent-modal');
    modal.classList.remove('hidden');
    
    // 2. Target the dropdown & set Loading State
    const select = document.getElementById('target-account-select');
    select.innerHTML = '<option value="" disabled selected>Loading active groups...</option>';
    
    try {
        // 3. Get latest account list using your existing helper
        const accounts = await getAllActiveAccounts();
        
        // 4. Populate Dropdown
        select.innerHTML = '<option value="" disabled selected>Select Destination...</option>';
        
        if (accounts.length === 0) {
             select.innerHTML += '<option disabled>No accounts found</option>';
        } else {
            accounts.forEach(acc => {
                const option = document.createElement('option');
                option.value = acc;
                option.innerText = acc;
                select.appendChild(option);
            });
        }
        
    } catch (e) {
        console.error("Error loading accounts", e);
        select.innerHTML = '<option disabled>Error loading lists</option>';
    }
}
window.closeMoveModal = () => document.getElementById('move-agent-modal').classList.add('hidden');
window.saveAgentAccount = async function() {
    // 1. Get value from SELECT (not input)
    const selectEl = document.getElementById('target-account-select');
    const newAccount = selectEl.value;
    
    if (!newAccount) {
        return window.showModal("Error", "Please select a destination group", false);
    }

    try {
        // 2. Update Firestore
        await updateDoc(doc(db, "users", movingAgentUid), { 
            accountId: newAccount 
        });
        
        // 3. Reset manager cache to force a fresh re-render
        managerCache = null;
        
        // 4. Close & Refresh
        closeMoveModal();
        updateLogFilter(); 
        window.showModal("Success", "Agent moved successfully", false);
        
    } catch(e) {
        console.error("Move failed", e);
        window.showModal("Error", "Database update failed", false);
    }
}
window.deleteAgent = (uid, name) => {
    window.showModal("Remove", `Delete ${name}?`, true, async () => {
        try {
            // 1. Delete from Firebase
            await deleteDoc(doc(db, "users", uid));

            // 2. INSTANT UI UPDATE: 
            // Remove from local memory immediately (No network wait)
            if (managerCache && managerCache.agents) {
                managerCache.agents = managerCache.agents.filter(a => a.uid !== uid);
            }

            // 3. Refresh Grid immediately
            updateLogFilter();

            // 4. Success message
            window.showModal("Success", "Agent removed.", false);

        } catch (e) {
            console.error("Delete failed:", e);
            window.showModal("Error", "Database error.", false);
        }
    });
}
window.toggleAgentAccordions = (open) => {
    document.querySelectorAll('.group-header-row').forEach(h => open ? h.classList.add('active') : h.classList.remove('active'));
    document.querySelectorAll('.log-row').forEach(r => open ? r.classList.remove('hidden-row') : r.classList.add('hidden-row'));
}
window.toggleGroup = (gid, h) => {
    const rows = document.querySelectorAll(`tr[data-group="${gid}"]`);
    const closed = rows[0].classList.contains('hidden-row');
    rows.forEach(r => closed ? r.classList.remove('hidden-row') : r.classList.add('hidden-row'));
    closed ? h.classList.add('active') : h.classList.remove('active');
}
window.jumpToToday = function() {
    const now = new Date();
    const shiftDate = getShiftDate(now); 

    // 1. Force filter to specific day (This disables Accordions -> Flat View)
    filterState.year = shiftDate.getFullYear();
    filterState.month = shiftDate.getMonth();
    filterState.day = shiftDate.getDate(); 

    // 2. Visually update the dropdown back to 'this_month' context
    const quickSel = document.getElementById('quick-period');
    if(quickSel) quickSel.value = 'this_month';

    // 3. Refresh Logs
    updateLogFilter();
}

window.toggleGroup = function(groupId, headerTr) {
    const rows = document.querySelectorAll(`tr[data-group="${groupId}"]`);
    if(rows.length === 0) return;
    const isClosed = rows[0].classList.contains('hidden-row');
    if (isClosed) {
        rows.forEach(r => r.classList.remove('hidden-row'));
        headerTr.classList.add('active'); 
    } else {
        rows.forEach(r => r.classList.add('hidden-row'));
        headerTr.classList.remove('active');
    }
}
window.closeCreateAgentModal = function() {
    document.getElementById('create-agent-modal').classList.add('hidden');
}
// ===========================================
// TRENDS / ANALYTICS LOGIC (Daily & Monthly)
// ===========================================

let activeCharts = []; // Tracks chart instances for cleanup
let currentTrendAccount = null;
let trendState = { year: new Date().getFullYear(), month: new Date().getMonth() }; 

const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

window.openTrendsPanel = function(accountName) {
    const panel = document.getElementById('trends-panel');
    const header = panel.querySelector('.slide-header'); 

    // Logic: If clicking same account, close. If different, switch.
    if (panel.classList.contains('active') && currentTrendAccount === accountName) {
        closeTrendsPanel();
        return; 
    }

    currentTrendAccount = accountName; 
    panel.classList.add('active');

    // Default to Current Year & Current Month on open
    if (filterState.year !== 'all') {
        trendState.year = parseInt(filterState.year);
    } else {
        trendState.year = new Date().getFullYear();
    }

    if (filterState.month !== 'all') {
        trendState.month = filterState.month;
    } else {
        trendState.month = 'all'; // Default to Whole Year view if sidebar is "All Months"
    }

    // 1. Build Month Options HTML
    let monthOpts = `<div class="custom-dd-option" onclick="updateTrendFilter('month', 'all')">Whole Year</div>`;
    MONTH_NAMES_FULL.forEach((m, i) => {
        // Highlight current month
        const isSel = (i === trendState.month) ? 'selected' : '';
        monthOpts += `<div class="custom-dd-option ${isSel}" onclick="updateTrendFilter('month', ${i})">${m}</div>`;
    });

    // 2. Build Year Options HTML
    let yearOpts = '';
    for(let y = trendState.year; y >= trendState.year - 2; y--) {
        const isSel = (y === trendState.year) ? 'selected' : '';
        yearOpts += `<div class="custom-dd-option ${isSel}" onclick="updateTrendFilter('year', ${y})">${y}</div>`;
    }

    // 3. Inject Header with TWO Dropdowns
    header.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:8px; width:100%;">
            <h3 id="trends-title" style="margin:0; font-size:1.1rem; color:var(--primary);">
                <i class="fa-solid fa-chart-line"></i> ${accountName}
            </h3>
            
            <div style="display:flex; gap:10px;">
                <!-- MONTH DROPDOWN -->
                <div id="dd-trends-month" class="custom-dd-wrapper" style="width: 130px;">
                    <div class="custom-dd-trigger" onclick="toggleCustomDropdown('dd-trends-month')" style="padding: 5px 10px; font-size: 0.8rem; min-height: auto;">
                        <span id="trend-lbl-month">${MONTH_NAMES_FULL[trendState.month]}</span>
                        <i class="fa-solid fa-chevron-down"></i>
                    </div>
                    <div class="custom-dd-options">${monthOpts}</div>
                </div>

                <!-- YEAR DROPDOWN -->
                <div id="dd-trends-year" class="custom-dd-wrapper" style="width: 80px;">
                    <div class="custom-dd-trigger" onclick="toggleCustomDropdown('dd-trends-year')" style="padding: 5px 10px; font-size: 0.8rem; min-height: auto;">
                        <span id="trend-lbl-year">${trendState.year}</span>
                        <i class="fa-solid fa-chevron-down"></i>
                    </div>
                    <div class="custom-dd-options">${yearOpts}</div>
                </div>
            </div>
        </div>
        <button class="icon-btn" onclick="closeTrendsPanel()"><i class="fa-solid fa-xmark fa-lg"></i></button>
    `;

    // 4. Render Charts
    renderTrendCharts();
}

// Helper to update state and redraw
window.updateTrendFilter = function(type, val) {
    if (type === 'year') trendState.year = parseInt(val);
    if (type === 'month') trendState.month = val; // 'all' or 0-11

    // Update Label Text
    if (type === 'year') document.getElementById('trend-lbl-year').innerText = val;
    if (type === 'month') document.getElementById('trend-lbl-month').innerText = (val === 'all') ? "Whole Year" : MONTH_NAMES_FULL[val];

    // Close Dropdowns
    document.querySelectorAll('.custom-dd-wrapper').forEach(d => d.classList.remove('active'));

    // Redraw
    renderTrendCharts();
}

window.renderTrendCharts = async function() {
    const body = document.getElementById('trends-body');
    const accountName = currentTrendAccount;
    const { year, month } = trendState;

    // Display Label
    let timeLabel = `${year}`;
    if (month !== 'all' && MONTH_NAMES_FULL[month]) {
        timeLabel = `${MONTH_NAMES_FULL[month]} ${year}`;
    }

    body.innerHTML = `<div style="text-align:center; padding:50px; color:var(--primary);">
        <i class="fa-solid fa-circle-notch fa-spin fa-2x"></i><br><br>Analyzing ${timeLabel}...
    </div>`;

    // Clean up old charts
    if (activeCharts && activeCharts.length > 0) activeCharts.forEach(c => c.destroy());
    activeCharts = [];

    // 1. Get Agents
    let agents = [];
    let roleMap = {}; // Helper to get pretty role names

    if(managerCache) {
        agents = managerCache.agents.filter(a => a.accountId === accountName);
        roleMap = managerCache.roleMap;
    } else {
        // Fallback fetch if cache empty
        const q = query(collection(db, "users"), where("accountId", "==", accountName));
        const snap = await getDocs(q);
        snap.forEach(d => agents.push({ ...d.data(), uid: d.id }));
        // Fetch roles for names
        const rSnap = await getDocs(collection(db, "roles"));
        rSnap.forEach(d => roleMap[d.id] = { name: d.data().name });
    }

    if(agents.length === 0) {
        body.innerHTML = `<div style="text-align:center; color:#999;">No agents found.</div>`;
        return;
    }

    // 2. Setup Time Buckets
    let labels = [];
    let bucketCount = 0;
    if (month === 'all') {
        labels = MONTH_NAMES_SHORT;
        bucketCount = 12;
    } else {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        bucketCount = daysInMonth;
        for (let d = 1; d <= daysInMonth; d++) labels.push(d);
    }

    // 3. GROUP AGENTS BY ROLE
    // Structure: { 'csr': [agent1, agent2], 'data_entry': [agent3] }
    const groupedAgents = {};
    agents.forEach(a => {
        const r = a.role || 'unknown';
        if (!groupedAgents[r]) groupedAgents[r] = [];
        groupedAgents[r].push(a);
    });

    body.innerHTML = ''; // Clear loader

    // 4. PROCESS EACH ROLE GROUP SEPARATELY
    // Get role keys and sort them (optional: put 'csr' or specific roles first if you want)
    const roleKeys = Object.keys(groupedAgents).sort();

    let globalHasData = false;

    roleKeys.forEach(roleKey => {
        const group = groupedAgents[roleKey];
        
        // A. Calculate Stats for this group
        let leaderboard = group.map(agent => {
            let agentLogs = rawLogsCache.filter(l => l.agentUid === agent.uid && l.jsDate.getFullYear() === year);
            if (month !== 'all') {
                agentLogs = agentLogs.filter(l => getShiftDate(l.jsDate).getMonth() === month);
            }
            
            const dataPoints = new Array(bucketCount).fill(0);
            agentLogs.forEach(l => {
                const d = getShiftDate(l.jsDate);
                if (month === 'all') dataPoints[d.getMonth()]++;
                else dataPoints[d.getDate() - 1]++;
            });

            const total = dataPoints.reduce((a,b)=>a+b,0);
            return { agent, dataPoints, total };
        });

        // B. Filter empty & Sort (Highest Total First)
        leaderboard = leaderboard.filter(item => item.total > 0);
        leaderboard.sort((a, b) => b.total - a.total);

        if (leaderboard.length === 0) return; // Skip role if no data
        globalHasData = true;

        // C. Render SECTION HEADER
        // Get pretty name
        let prettyRoleName = "Specialist";
        if (roleKey === 'csr') prettyRoleName = "Customer Service";
        else if (roleKey === 'data_entry') prettyRoleName = "Data Entry";
        else if (roleKey === 'manager') prettyRoleName = "Managers";
        else if (roleMap[roleKey]) prettyRoleName = roleMap[roleKey].name;

        const sectionHeader = document.createElement('div');
        sectionHeader.style.cssText = "margin: 20px 0 10px 0; padding-bottom: 5px; border-bottom: 2px solid #e2e8f0; font-size: 0.85rem; font-weight: 900; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;";
        sectionHeader.innerHTML = `<i class="fa-solid fa-layer-group"></i> ${prettyRoleName}`;
        body.appendChild(sectionHeader);

        // D. Render Cards for this Role
        leaderboard.forEach((item, index) => {
            const { agent, dataPoints, total } = item;
            const rank = index + 1; // Rank resets for each role!

            // Trophies
            let rankHtml = '';
            let borderColor = '#2c5282'; // Default Blue
            if(rank === 1) { rankHtml = `<i class="fa-solid fa-trophy" style="color:#fbbf24; margin-right:5px;"></i>`; borderColor='#fbbf24'; }
            else if(rank === 2) { rankHtml = `<i class="fa-solid fa-medal" style="color:#94a3b8; margin-right:5px;"></i>`; }
            else if(rank === 3) { rankHtml = `<i class="fa-solid fa-medal" style="color:#b45309; margin-right:5px;"></i>`; }

            const card = document.createElement('div');
            card.className = 'chart-card';
            
            const avatarHtml = agent.img 
                ? `<img src="${agent.img}" class="chart-avatar">`
                : `<div class="chart-avatar default-avatar" style="font-size:0.9rem;"><i class="fa-solid fa-user"></i></div>`;

            card.innerHTML = `
                <div class="chart-header">
                    ${avatarHtml}
                    <div style="flex:1;">
                        <div class="chart-name">${rankHtml} ${agent.name}</div>
                        <div style="font-size:0.65rem; color:#64748b;">
                            TOTAL: <b>${total}</b> <span style="opacity:0.5;">|</span> AVG: <b>${Math.round(total/bucketCount)}</b>/day
                        </div>
                    </div>
                    <div style="font-size:1.5rem; font-weight:900; color:#f1f5f9;">#${rank}</div>
                </div>
                <div style="position: relative; height:150px; width:100%;">
                    <canvas></canvas>
                </div>
            `;
            body.appendChild(card);

            const ctx = card.querySelector('canvas').getContext('2d');
            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Logs',
                        data: dataPoints,
                        borderColor: borderColor,
                        backgroundColor: (rank === 1) ? 'rgba(251, 191, 36, 0.1)' : 'rgba(44, 82, 130, 0.1)',
                        borderWidth: 2,
                        tension: 0.3,
                        fill: true,
                        pointRadius: (month === 'all') ? 4 : 2,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: borderColor
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, grid: { display: true, color:'#f1f5f9' }, ticks: { precision:0 } },
                        x: { grid: { display: false } }
                    }
                }
            });
            activeCharts.push(chart);
        });
    });

    if(!globalHasData) {
         body.innerHTML = `<div style="text-align:center; padding:30px; color:#999; display:flex; flex-direction:column; align-items:center; gap:10px;">
            <i class="fa-regular fa-calendar-xmark fa-2x"></i>
            <span>No activity found for ${timeLabel}.</span>
         </div>`;
    }
}



window.closeTrendsPanel = function() {
    document.getElementById('trends-panel').classList.remove('active');
}
function formatTime24(dateObj) {
    if (!dateObj) return "00:00";
    // Force 24-hour format (HH:mm)
    return dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

window.deleteCurrentRole = async function() {
    if (!editingRoleId) return;

    // 1. SAFETY CHECK
    const q = query(collection(db, "users"), where("role", "==", editingRoleId));
    const snap = await getDocs(q);

    if (!snap.empty) {
        window.showModal(
            "Cannot Delete", 
            `There are ${snap.size} agents currently assigned to this role. Please reassign them to a different role first.`, 
            false
        );
        return;
    }

    // 2. CONFIRMATION
    window.showModal(
        "Delete Role", 
        "Are you sure you want to permanently delete this role layout?", 
        true, 
        async () => {
            try {
                // 3. DELETE FROM FIRESTORE
                await deleteDoc(doc(db, "roles", editingRoleId));

                // 4. INSTANT UI CLEANUP
                
                // A. Remove from global cache
                delete globalRoleCache[editingRoleId];
                
                // B. Remove from the Dropdown List (The Visual Fix)
                const optToRemove = document.querySelector(`#builder-load-options .custom-dd-option[data-val="${editingRoleId}"]`);
                if(optToRemove) optToRemove.remove();

                // C. Reset the Dropdown Trigger Label
                document.getElementById('builder-load-label').innerText = "-- Create New Role --";
                document.getElementById('builder-load-select').value = ""; // Reset hidden input

                // D. Reset the Builder Form
                loadRoleIntoBuilder(""); 
                
                window.showModal("Success", "Role deleted successfully.", false);

            } catch (e) {
                console.error("Delete role failed:", e);
                window.showModal("Error", "Database error.", false);
            }
        }
    );
}

/* =========================================
   CUSTOM DROPDOWN HELPERS
   ========================================= */

// 1. Toggle the dropdown open/close
window.toggleCustomDropdown = function(wrapperId) {
    const wrapper = document.getElementById(wrapperId);
    
    // Close all other open dropdowns first (so only one is open at a time)
    document.querySelectorAll('.custom-dd-wrapper.active').forEach(d => {
        if(d.id !== wrapperId) d.classList.remove('active');
    });

    // Toggle current
    wrapper.classList.toggle('active');
}

// 2. Handle Option Selection
window.selectCustomOption = function(wrapperId, value, displayText, callbackName) {
    const wrapper = document.getElementById(wrapperId);
    if(!wrapper) return;

    // 1. Update Hidden Input
    const hiddenInput = wrapper.querySelector('input[type="hidden"]');
    if(hiddenInput) hiddenInput.value = value;
    
    // 2. Update Visual Text
    // We look for a span inside 'dd-text-btn' OR 'custom-dd-trigger' to support both old and new styles
    const textSpan = wrapper.querySelector('.dd-text-btn span') || wrapper.querySelector('.custom-dd-trigger span');
    if(textSpan) textSpan.innerText = displayText;
    
    // 3. Update Selected Styling in List
    wrapper.querySelectorAll('.custom-dd-option').forEach(opt => {
        opt.classList.remove('selected');
        if(opt.getAttribute('data-val') === value) opt.classList.add('selected');
    });

    // 4. Close Dropdown
    wrapper.classList.remove('active');

    // 5. Trigger specific logic
    if (callbackName && typeof window[callbackName] === 'function') {
        window[callbackName](value);
    }
}


// 3. Global Click Listener: Close dropdowns if clicking outside
window.addEventListener('click', function(e) {
    if (!e.target.closest('.custom-dd-wrapper')) {
        document.querySelectorAll('.custom-dd-wrapper.active').forEach(d => {
            d.classList.remove('active');
        });
    }
});
window.openEditAgentModal = async function(uid, name, currentRole) {
    // Store UID globally for saving
    movingAgentUid = uid; 
    
    // Show Modal & Set Name
    document.getElementById('edit-agent-modal').classList.remove('hidden');
    document.getElementById('edit-agent-name').innerText = name;

    // UI Loading State
    const roleLabel = document.getElementById('label-edit-agent-role');
    const roleContainer = document.getElementById('opts-edit-agent-role');
    roleLabel.innerText = "Loading roles...";
    roleContainer.innerHTML = '';

    try {
        // Fetch custom roles
        const rolesSnap = await getDocs(collection(db, "roles"));

        // Helper to add role option
        const addRoleOpt = (val, txt) => {
            const opt = document.createElement('div');
            opt.className = 'custom-dd-option';
            opt.innerText = txt;
            opt.onclick = () => selectCustomOption('dd-edit-agent-role', val, txt);
            
            // If it's the agent's current role, pre-select it
            if (val === currentRole) {
                opt.classList.add('selected');
                roleLabel.innerText = txt; // Set the trigger text
                document.getElementById('edit-agent-role-select').value = val;
            }
            roleContainer.appendChild(opt);
        };

        // Add Default & Custom Roles
        addRoleOpt('csr', 'Standard CSR (Default)');
        addRoleOpt('data_entry', 'Data Entry Specialist (Default)');
        
        const sep = document.createElement('div');
        sep.style.borderTop = '1px dashed #cbd5e0';
        sep.style.margin = '5px 0';
        roleContainer.appendChild(sep);
        
        rolesSnap.forEach(doc => {
            addRoleOpt(doc.id, doc.data().name);
        });

    } catch (e) {
        console.error("Error loading roles:", e);
        roleLabel.innerText = "Error loading data";
    }
}

// 2. Saves the New Role to Firebase
window.saveAgentRole = async function() {
    const newRole = document.getElementById('edit-agent-role-select').value;

    if (!newRole) {
        return window.showModal("Error", "Please select a new role.", false);
    }
    
    try {
        await updateDoc(doc(db, "users", movingAgentUid), { role: newRole });
        
        // Instant Refresh: Clear cache and redraw grid
        managerCache = null;
        updateLogFilter();
        
        closeEditAgentModal();
        window.showModal("Success", "Agent's role has been updated.", false);
        
    } catch (e) {
        console.error("Role update failed:", e);
        window.showModal("Error", "Database update failed.", false);
    }
}

// 3. Closes the Modal
window.closeEditAgentModal = function() {
    document.getElementById('edit-agent-modal').classList.add('hidden');
}
// --- DATA ENTRY HOTKEY SELECTION ---
// --- SELECTION LOGIC ---
window.selectTaskOption = function(val) {
    // 1. Update the hidden input
    const input = document.getElementById('admin-task-select');
    if(input) input.value = val;

    // 2. Visual Toggle (Vertical Cards)
    document.querySelectorAll('.quick-card').forEach(el => {
        el.classList.remove('active');
        
        // Activate if data-val matches
        if(el.getAttribute('data-val') === val) {
            el.classList.add('active');
        }
    });
}

document.addEventListener('keydown', (e) => {
    // A. Check if user is typing text (If so, ignore Q/W/E/T)
    const activeTag = document.activeElement.tagName;
    const isTyping = (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || document.activeElement.isContentEditable);

    // B. SHORTCUT: Alt + S (Submit)
    // Works regardless of typing status
    if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault(); 
        
        // Check what is visible and submit
        if (!document.getElementById('form-data-entry').classList.contains('hidden')) {
            submitDataEntryTask(); // This handles the Tasks section
        } else if (!document.getElementById('form-csr').classList.contains('hidden')) {
            submitCSREntry();
        } else if (!document.getElementById('form-custom').classList.contains('hidden')) {
            submitCustomDynamicEntry();
        }
        return;
    }

    // C. SHORTCUTS: Q, W, E, T (Selection)
    // Works if user is Data Entry and NOT typing
    if (!isTyping && currentUser && currentUser.role === 'data_entry') {
        const key = e.key.toLowerCase();
        
        // This instantly triggers the radio click logic
        switch(key) {
            case 'q': 
                selectTaskOption('Invoice'); 
                break;
            case 't': 
                selectTaskOption('Tracking'); 
                break;
            case 'w': 
                selectTaskOption('Statement'); 
                break;
            case 'e': 
                selectTaskOption('Others'); 
                break;
        }
    }
});