import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, updateDoc, deleteDoc, setDoc, doc, onSnapshot, getDoc, runTransaction,query, where, getDocs 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAHlmRVqHmpbdGllsDQNVtz3g9XEMaXKTA",
    authDomain: "sos-marketplace.firebaseapp.com",
    projectId: "sos-marketplace",
    storageBucket: "sos-marketplace.firebasestorage.app",
    messagingSenderId: "428350148342",
    appId: "1:428350148342:web:55792ce066b50f7594e6d7",
    measurementId: "G-8HJRB5YR2K"
};

// FACEBOOK STYLE DEFAULT AVATAR (SVG Base64)
const DEFAULT_AVATAR = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRTRFNEU3Ii8+PHBhdGggZD0iTTI0IDIwLjk5M1YyNEgwdi0yLjk5NkExNC45NzcgMTQuOTc3IDAgMDExMi4wMDQgMTVjNC45MDQgMCA5LjI2IDIuMzU0IDExLjk5NiA1Ljk5M3pNMTYuMDAyIDguOTk5YTQgNCAwIDExLTggMCA0IDQgMCAwMTggMHoiIGZpbGw9IiNBMUExQUEiLz48L3N2Zz4=";
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
window.db = db; 
window.appGlobal = { currentUser: null }; 

// GLOBAL STATE
let currentUser = null; 
let cart = {}; 
let validVendors = [];
let validBuyers = [];
let products = [];
let orders = [];
let historyMode = 'sales';
let reports = [];
let resolvedReports = [];

function cleanId(str) {
    return str.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 15);
}

// --- CUSTOM TOAST SYSTEM ---
window.showToast = function(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = type === 'success' ? `<span>✅</span> ${msg}` : `<span>⚠️</span> ${msg}`;
    container.appendChild(toast);
    
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- LIGHTBOX SYSTEM ---
window.openLightbox = function(src, caption = '') {
    if(!src) return;
    const box = document.getElementById('lightbox');
    document.getElementById('lightbox-img').src = src;
    
    const capEl = document.getElementById('lightbox-text');
    if(caption) {
        capEl.innerText = caption;
        capEl.classList.remove('hidden');
    } else {
        capEl.classList.add('hidden');
    }
    box.classList.add('open');
}
window.closeLightbox = function() {
    document.getElementById('lightbox').classList.remove('open');
}
// --- FORGOT PASSWORD SYSTEM ---

window.openForgotModal = function() {
    document.getElementById('recoveryEmail').value = '';
    document.getElementById('btnRecover').innerText = "Send Code";
    document.getElementById('btnRecover').disabled = false;
    openModal('forgotModal');
}

window.submitRecovery = async function() {
    const email = document.getElementById('recoveryEmail').value.trim();
    const btn = document.getElementById('btnRecover');

    if(!email || !email.includes('@')) return showToast("Enter a valid email", "error");

    btn.innerText = "Searching...";
    btn.disabled = true;

    try {
        // 1. Search Vendors
        const vQuery = query(collection(db, "vendors"), where("email", "==", email));
        const vSnap = await getDocs(vQuery);
        
        // 2. Search Buyers
        let foundUser = null;
        if(!vSnap.empty) {
            foundUser = vSnap.docs[0].data();
        } else {
            const bQuery = query(collection(db, "buyers"), where("email", "==", email));
            const bSnap = await getDocs(bQuery);
            if(!bSnap.empty) foundUser = bSnap.docs[0].data();
        }

        if(foundUser) {
            btn.innerText = "Sending...";

            // 3. Prepare Data for EmailJS
            // Make sure your EmailJS Template uses {{to_name}}, {{message}}, and {{to_email}}
            const templateParams = {
                to_email: email,       
                to_name: foundUser.name,
                message: foundUser.code 
            };

            // YOUR IDs
            const SERVICE_ID = "service_a26o3ho"; 
            const TEMPLATE_ID = "template_36hyb6z";

            await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams);

            closeModalById('forgotModal');
            showToast(`✅ Code sent to ${email}`);
        } else {
            showToast("Email not found in database", "error");
        }

    } catch(e) {
        console.error("EmailJS Error:", e);
        showToast("Error sending email. Check console.", "error");
    } finally {
        btn.innerText = "Send Code";
        btn.disabled = false;
    }
}
// --- LISTENERS ---
onSnapshot(collection(db, "vendors"), (snapshot) => {
    validVendors = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, role: 'vendor' }));
    window.appGlobal.validVendors = validVendors;
    // Re-render buyer grids when vendor data loads
    renderBuyerCards(document.getElementById('buyerTodayGrid'), false);
    renderBuyerCards(document.getElementById('buyerPreOrderGrid'), true);
    
    if(currentUser && currentUser.role === 'admin') renderAdminPanel();
});

onSnapshot(collection(db, "buyers"), (snapshot) => {
    validBuyers = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, role: 'buyer' }));
    window.appGlobal.validBuyers = validBuyers;
    // IF ADMIN IS LOGGED IN, REFRESH THE BUYER LIST INSTANTLY
    if(currentUser && currentUser.role === 'admin') {
        const searchVal = document.getElementById('adminBuyerSearch') ? document.getElementById('adminBuyerSearch').value : '';
        renderAdminBuyers(searchVal);
    }
});
onSnapshot(collection(db, "resolved_reports"), (snapshot) => {
    resolvedReports = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    // If admin is currently looking at history, refresh the view
    if(currentUser && currentUser.role === 'admin' && document.getElementById('btnShowReportHistory')?.classList.contains('active-tab')) {
        renderAdminReports('history');
    }
});

onSnapshot(collection(db, "products"), (snapshot) => {
    products = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    
    // 1. Always render Buyer Views
    renderBuyerCards(document.getElementById('buyerTodayGrid'), false);
    renderBuyerCards(document.getElementById('buyerPreOrderGrid'), true);
    
    // 2. If Vendor is logged in, Update Admin View AND Split Previews
    if(currentUser && currentUser.role === 'vendor') {
        renderAdminProducts();
        renderBuyerCards(document.getElementById('vendorPreviewToday'), false, true, currentUser.code); 
        renderBuyerCards(document.getElementById('vendorPreviewPreOrder'), true, true, currentUser.code); 
    }
});
onSnapshot(collection(db, "reports"), (snapshot) => {
    reports = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    if(currentUser && currentUser.role === 'admin') renderAdminReports();
});

let previousPendingCount = 0;

onSnapshot(collection(db, "orders"), (snapshot) => {
    orders = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    
    // IF VENDOR: CHECK FOR NEW ORDERS & UPDATE BADGE
    if(currentUser && currentUser.role === 'vendor') {
        renderVendorOrders();
        checkNewOrders(); 
    }
    
    if(document.getElementById('slidePanel').classList.contains('open')) renderHistory();
});

// --- ORDER NOTIFICATIONS ---
function checkNewOrders() {
    if (!currentUser || currentUser.role !== 'vendor') return;

    const shiftDate = getShiftDate(false);
    
    // Count Unpaid orders for today
    const pendingOrders = orders.filter(o => 
        o.vendorCode === currentUser.code && 
        o.date === shiftDate && 
        o.status === 'Unpaid'
    );
    
    const count = pendingOrders.length;
    const badge = document.getElementById('floatingBadge');
    const bell = document.getElementById('vendorFloatBell');
    
    if(count > 0) {
        badge.innerText = count;
        badge.classList.remove('hidden');
        if(count > previousPendingCount) {
             bell.style.animation = "shake-tiny 0.5s ease";
             setTimeout(()=> bell.style.animation = "", 500);
        }
    } else {
        badge.classList.add('hidden');
    }

    if(count > previousPendingCount) {
        const audio = document.getElementById('orderSound');
        if(audio) {
            audio.currentTime = 0;
            audio.play().catch(e => console.log("Interaction needed"));
        }
        showToast(`🔔 ${count} Pending Order(s)`);
    }

    previousPendingCount = count;
}

window.scrollToOrders = function() {
    const orderPanel = document.getElementById('orderList');
    if(orderPanel) {
        orderPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const parent = orderPanel.closest('.panel');
        if(parent) {
            parent.style.transition = "box-shadow 0.3s ease, border-color 0.3s";
            parent.style.boxShadow = "0 0 0 4px rgba(239, 68, 68, 0.2)";
            parent.style.borderColor = "#ef4444";
            setTimeout(() => {
                parent.style.boxShadow = "none";
                parent.style.borderColor = ""; 
            }, 1500);
        }
    }
}

// --- DATE HELPER ---
function getShiftDate(isPreOrder = false) {
    const now = new Date();
    if (now.getHours() < 6) now.setDate(now.getDate() - 1); 
    if (isPreOrder) now.setDate(now.getDate() + 1);
    return now.toLocaleDateString(); 
}

// --- CONFIRM MODAL ---
let pendingConfirmAction = null;
window.showConfirm = function(msg, action) {
    const modalTitle = document.querySelector('#confirmModal h3');
    const yesBtn = document.getElementById('confirmYesBtn');
    const cancelBtn = document.querySelector('#confirmModal .btn-secondary');

    // Reset basics
    yesBtn.style.display = ''; 
    yesBtn.innerText = "Confirm"; // Simpler text
    cancelBtn.innerText = "Cancel";
    
    // Remove old manual styles
    yesBtn.style.background = ''; 
    yesBtn.className = 'btn btn-primary'; // Reset classes

    // Logic
    if(msg.toLowerCase().includes('delete') || msg.toLowerCase().includes('cancel')) {
        modalTitle.innerText = "Are you sure?";
        modalTitle.style.color = "#ef4444"; 
        
        // Apply the new Danger Class
        yesBtn.className = 'btn btn-danger';
        yesBtn.innerText = "Yes, Delete";
    } else {
        modalTitle.innerText = "Please Confirm";
        modalTitle.style.color = "#09090b";
        
        // Standard Black Button
        yesBtn.className = 'btn btn-primary';
    }

    document.getElementById('confirmMsg').innerHTML  = msg;
    pendingConfirmAction = action;
    openModal('confirmModal');
}
window.executeConfirm = function() {
    if (pendingConfirmAction) pendingConfirmAction();
    closeConfirmModal();
}
window.closeConfirmModal = function() {
    closeModalById('confirmModal');
    pendingConfirmAction = null;
}

// --- AUTHENTICATION ---
window.handleLogin = function() {
    // 1. Trigger Animation
    const btn = document.querySelector('.icon-btn'); // Select the arrow button
    btn.classList.add('pulsing');
    
    // Remove class after animation ends so it can be clicked again if login fails
    setTimeout(() => {
        btn.classList.remove('pulsing');
    }, 400);

    // 2. Existing Logic
    const code = document.getElementById('codeJson').value.trim();
    if(code === "RESET") { location.reload(); return; }

    if(code === "SOS-ADMIN") { 
        currentUser = { role: 'admin', name: 'Super Admin', account: 'System' };
        loginAdmin();
        return;
    }

    let user = validVendors.find(v => v.code === code) || validBuyers.find(b => b.code === code);
    
    if(user) {
        if(user.isMuted) {
            showToast("Account Suspended by Admin", "error");
            return;
        }
        loginUser(user);
    } else {
        showToast("Invalid Access Code", "error");
    }
}

window.loginAdmin = async function() {
    // 1. Define where the admin lives in DB
    const adminId = 'super_admin_profile';
    const adminRef = doc(db, 'admins', adminId);

    try {
        // 2. Try to get existing profile
        const snap = await getDoc(adminRef);
        let adminData;

        if (snap.exists()) {
            adminData = snap.data();
        } else {
            // 3. First time? Create default Admin Profile
            adminData = { name: 'Administrator', account: 'System Control', img: null };
            await setDoc(adminRef, adminData);
        }

        // 4. Set Current User with ID and Role
        currentUser = { ...adminData, id: adminId, role: 'admin' };

        // 5. UI Updates (Same as before)
        document.getElementById('codeJson').value = '';
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('userControls').classList.remove('hidden');
        
        // Populate Sidebar
        document.getElementById('displayUserName').innerText = currentUser.name;
        document.getElementById('displayUserAcc').innerText = currentUser.account;
        document.getElementById('editNameInput').value = currentUser.name;
        document.getElementById('editAccInput').value = currentUser.account;
        document.getElementById('displayUserCode').innerText = "ADMIN";

        // Handle Image
        const profileImg = document.getElementById('sidebarProfileImg');
        if(currentUser.img && currentUser.img.length > 100) {
            profileImg.src = currentUser.img;
            document.getElementById('btnRemoveImg').classList.remove('hidden');
        } else {
            profileImg.src = DEFAULT_AVATAR;
            document.getElementById('btnRemoveImg').classList.add('hidden');
        }

        // View Switching
        document.getElementById('buyerView').classList.add('hidden');
        document.getElementById('vendorView').classList.add('hidden');
        document.getElementById('adminView').classList.remove('hidden');
        
        // Admin Specifics
        renderAdminPanel();

    } catch (e) {
        console.error(e);
        showToast("Error logging in as Admin", "error");
    }
}

function loginUser(user) {
    currentUser = user;
    window.appGlobal.currentUser = user;
    if(window.startChatListener) window.startChatListener();
    previousPendingCount = 0;
    document.getElementById('codeJson').value = ''; 
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('userControls').classList.remove('hidden');
    
    // Populate Display Info
    document.getElementById('displayUserName').innerText = user.name;
    document.getElementById('displayUserAcc').innerText = user.account;
    
    // Populate Edit Inputs
    document.getElementById('editNameInput').value = user.name;
    document.getElementById('editAccInput').value = user.account;
    
    const displayCode = user.role === 'admin' ? 'ADMIN' : user.code;
    document.getElementById('displayUserCode').innerText = displayCode;
    
    // Image Logic (Show/Hide remove button)
    const profileImg = document.getElementById('sidebarProfileImg');
    const removeBtn = document.getElementById('btnRemoveImg');
    
    if(user.img && user.img.length > 100) {
        profileImg.src = user.img;
        removeBtn.classList.remove('hidden');
    } else {
        profileImg.src = DEFAULT_AVATAR;
        removeBtn.classList.add('hidden');
    }

    if(user.role === 'vendor') {
        document.getElementById('vendorSpecificButtons').classList.remove('hidden');
        document.getElementById('buyerSpecificButtons').classList.add('hidden'); // Hide Upgrade btn
        document.getElementById('vendorView').classList.remove('hidden');
        document.getElementById('buyerView').classList.add('hidden');
        document.getElementById('vendorFloatBell').classList.remove('hidden');
        checkNewOrders(); 
        
        renderAdminProducts();
        renderVendorOrders();
        
        renderBuyerCards(document.getElementById('vendorPreviewToday'), false, true, currentUser.code);
        renderBuyerCards(document.getElementById('vendorPreviewPreOrder'), true, true, currentUser.code);
        
    } else {
        document.getElementById('vendorSpecificButtons').classList.add('hidden');
        document.getElementById('buyerSpecificButtons').classList.remove('hidden'); // Show Upgrade btn
        document.getElementById('vendorView').classList.add('hidden');
        document.getElementById('buyerView').classList.remove('hidden');
        document.getElementById('vendorFloatBell').classList.add('hidden');
    }
    if (window.startChatListener) {
        console.log("Triggering Listener from script.js..."); 
        window.startChatListener();
    } else {
        console.error("startChatListener NOT found in window!");
    }
}

window.logout = function() {
    // Optional: Show a message right before refreshing
    // showToast("Logging out..."); 
    
    // This forces the browser to refresh the page
    location.reload();
}

window.copyAccessCode = function() {
    const code = document.getElementById('displayUserCode').innerText;
    if(code && code !== '----') {
        navigator.clipboard.writeText(code).then(() => {
            showToast(`Code ${code} Copied!`);
        });
    }
}

// --- PROFILE EDITING SYSTEM ---
window.toggleProfileEdit = function(showEdit) {
    if(showEdit) {
        document.getElementById('profileDisplayMode').classList.add('hidden');
        document.getElementById('profileEditMode').classList.remove('hidden');
    } else {
        document.getElementById('profileDisplayMode').classList.remove('hidden');
        document.getElementById('profileEditMode').classList.add('hidden');
        if(currentUser) {
            document.getElementById('editNameInput').value = currentUser.name;
            document.getElementById('editAccInput').value = currentUser.account;
        }
    }
}

window.saveProfileInfo = async function() {
    if(!currentUser) return;
    const newName = document.getElementById('editNameInput').value.trim();
    const newAcc = document.getElementById('editAccInput').value.trim();

    if(!newName || !newAcc) return showToast("Name and Account required", "error");

    try {
        // UPDATED LOGIC HERE:
        let collectionName;
        if(currentUser.role === 'admin') collectionName = 'admins';
        else collectionName = currentUser.role === 'vendor' ? 'vendors' : 'buyers';

        await updateDoc(doc(db, collectionName, currentUser.id), {
            name: newName,
            account: newAcc
        });
        
        currentUser.name = newName;
        currentUser.account = newAcc;
        document.getElementById('displayUserName').innerText = newName;
        document.getElementById('displayUserAcc').innerText = newAcc;
        toggleProfileEdit(false);
        showToast("Profile Updated");
    } catch(e) {
        console.error(e);
        showToast("Error saving profile", "error");
    }
}

window.uploadProfilePic = function(input) {
    if(input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = async function(e) {
            const base64 = e.target.result;
            if(base64.length > 1000000) { showToast("Image too large", "error"); return; }
            
            document.getElementById('sidebarProfileImg').src = base64;
            document.getElementById('btnRemoveImg').classList.remove('hidden'); 
            
            // UPDATED LOGIC HERE:
            let collectionName;
            if(currentUser.role === 'admin') collectionName = 'admins';
            else collectionName = currentUser.role === 'vendor' ? 'vendors' : 'buyers';

            await updateDoc(doc(db, collectionName, currentUser.id), { img: base64 });
            currentUser.img = base64;
            showToast("Profile Updated");
        };
        reader.readAsDataURL(input.files[0]);
    }
}

window.deleteProfileImage = function() {
    showConfirm("Remove profile picture?", async () => {
        if(!currentUser) return;
        try {
            // UPDATED LOGIC HERE:
            let collectionName;
            if(currentUser.role === 'admin') collectionName = 'admins';
            else collectionName = currentUser.role === 'vendor' ? 'vendors' : 'buyers';

            await updateDoc(doc(db, collectionName, currentUser.id), { img: null });
            
            currentUser.img = null;
            document.getElementById('sidebarProfileImg').src = DEFAULT_AVATAR;
            document.getElementById('btnRemoveImg').classList.add('hidden');
            
            showToast("Image removed");
        } catch(e) {
            console.error(e); // See exact error in console
            showToast("Error removing image", "error");
        }
    });
}

// --- ACCOUNT UPGRADE (BUYER TO VENDOR) ---
window.upgradeToVendor = function() {
    showConfirm("<b>Want to Sell?</b><br><span style='font-size:0.9rem; opacity:0.8;'> Convert as Merchant.", async () => {
        if(!currentUser || currentUser.role !== 'buyer') return;
        
        try {
            const uid = currentUser.id;
            const userRef = doc(db, 'buyers', uid);
            const newVendorRef = doc(db, 'vendors', uid);

            // Fetch current data to preserve it
            const snap = await getDoc(userRef);
            if(!snap.exists()) return showToast("Account error", "error");
            const data = snap.data();

            // Run Transaction
            await runTransaction(db, async (transaction) => {
                transaction.delete(userRef);
                transaction.set(newVendorRef, {
                    ...data,
                    role: 'vendor', // Explicitly logic handles this, but good to have
                    paymentMethods: { cash: true, payday: true } // Default settings
                });
            });

            showToast("Welcome, Vendor! Please re-login.");
            setTimeout(() => { logout(); }, 1500);

        } catch(e) {
            console.error(e);
            showToast("Upgrade failed", "error");
        }
    });
}


// --- PAYMENT SETTINGS (VENDOR) ---
window.openPaymentSettings = function() {
    const settings = currentUser.paymentMethods || { cash: true, payday: true, bank: false };
    
    document.getElementById('psCash').checked = !!settings.cash;
    document.getElementById('psPayday').checked = !!settings.payday;
    document.getElementById('psBank').checked = !!settings.bank;
    
    toggleBankSettings(!!settings.bank);

    if(settings.bankDetails) {
        document.getElementById('psBankText').value = settings.bankDetails.text || '';
        if(settings.bankDetails.qr) {
            document.getElementById('psQRPreview').src = settings.bankDetails.qr;
            document.getElementById('psQRPreview').classList.add('show');
            document.getElementById('psQRPlaceholder').style.display = 'none';
        }
    } else {
        document.getElementById('psBankText').value = '';
        document.getElementById('psQRPreview').classList.remove('show');
        document.getElementById('psQRPlaceholder').style.display = 'block';
    }

    openModal('paymentSettingsModal');
}

window.toggleBankSettings = function(isChecked) {
    if(isChecked) {
        document.getElementById('bankSettings').classList.remove('hidden');
    } else {
        document.getElementById('bankSettings').classList.add('hidden');
    }
}

window.previewQR = function(input) {
    if(input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.getElementById('psQRPreview');
            img.src = e.target.result;
            img.classList.add('show');
            document.getElementById('psQRPlaceholder').style.display = 'none';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

window.savePaymentSettings = async function() {
    const cash = document.getElementById('psCash').checked;
    const payday = document.getElementById('psPayday').checked;
    const bank = document.getElementById('psBank').checked;
    
    const bankText = document.getElementById('psBankText').value.trim();
    const qrSrc = document.getElementById('psQRPreview').src;
    const hasQR = document.getElementById('psQRPreview').classList.contains('show');

    // Logic: Vendors must have at least one payment method
    if(!cash && !payday && !bank) return showToast("Select at least 1 method", "error");

    const settings = {
        cash, payday, bank,
        bankDetails: {
            text: bank ? bankText : '',
            qr: (bank && hasQR) ? qrSrc : null
        }
    };

    try {
        await updateDoc(doc(db, "vendors", currentUser.id), { paymentMethods: settings });
        currentUser.paymentMethods = settings;
        showToast("Settings Saved");
        closeModalById('paymentSettingsModal');
    } catch(e) {
        console.error(e);
        showToast("Error saving settings", "error");
    }
}

// --- ADMIN PANEL ---
window.renderAdminPanel = function() {
    renderAdminReports();
    renderAdminVendors();
    renderAdminBuyers();
}

window.renderAdminVendors = function() {
    const container = document.getElementById('adminVendorList');
    if(!container) return;
    container.innerHTML = '';
    
    if(validVendors.length === 0) {
        container.innerHTML = '<div style="color:#999; text-align:center;">No vendors registered.</div>';
        return;
    }

    const grouped = {};
    validVendors.forEach(v => {
        const team = v.account ? v.account.toUpperCase() : 'GENERAL';
        if(!grouped[team]) grouped[team] = [];
        grouped[team].push(v);
    });

    const sortedTeams = Object.keys(grouped).sort();

    sortedTeams.forEach(team => {
        const groupDiv = document.createElement('div');
        groupDiv.style.background = "white";
        groupDiv.style.borderRadius = "10px";
        groupDiv.style.border = "1px solid #e4e4e7";
        groupDiv.style.overflow = "hidden";
        groupDiv.style.marginBottom = "15px";

        groupDiv.innerHTML = `
            <div style="background:#f4f4f5; padding:8px 12px; font-size:0.75rem; font-weight:800; color:#555; border-bottom:1px solid #e4e4e7; display:flex; justify-content:space-between;">
                <span>${team}</span>
                <span>${grouped[team].length} Shop(s)</span>
            </div>
        `;

        const listDiv = document.createElement('div');

        grouped[team].sort((a,b) => a.name.localeCompare(b.name)).forEach(v => {
            const isMuted = v.isMuted || false;
            const row = document.createElement('div');
            row.className = 'admin-user-row';
            if(isMuted) row.style.background = "#fef2f2";

            // Clicking empty space opens History
            row.onclick = () => viewUserHistory(v, 'vendor');

            const img = v.img || DEFAULT_AVATAR;

            row.innerHTML = `
                <div style="display:flex; align-items:center; gap:12px;" 
                     onclick="event.stopPropagation(); openUserInfo('${v.code}', 'vendor')"
                     title="View Profile">
                    
                    <img src="${img}" style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:1px solid #eee; cursor:pointer;">
                    
                    <div style="cursor:pointer;">
                        <div style="font-size:0.9rem; font-weight:600; ${isMuted ? 'color:#991b1b; text-decoration:line-through;' : ''}">${v.name}</div>
                        <div style="font-size:0.7rem; color:#bbb;">Code: ${v.code}</div>
                    </div>
                </div>

                <div style="display:flex; gap:10px; align-items:center;">
                    <!-- FIXED: NOW USES openHistoryById -->
                    <button onclick="event.stopPropagation(); openHistoryById('${v.id}', 'vendor')" 
                            style="cursor:pointer; border:none; background:transparent; font-size:1rem;" title="View History">
                        📜
                    </button>

                    <button onclick="event.stopPropagation(); toggleVendorMute('${v.id}', ${isMuted})" 
                            style="cursor:pointer; border:none; background:transparent; font-size:1.1rem;" title="${isMuted ? 'Unmute' : 'Mute'}">
                        ${isMuted ? '✅' : '⛔'}
                    </button>
                    
                    <button onclick="event.stopPropagation(); deleteVendor('${v.id}', '${v.name}')" 
                            style="cursor:pointer; border:none; background:transparent; font-size:1rem;" title="Delete">
                        🗑️
                    </button>
                </div>
            `;
            listDiv.appendChild(row);
        });

        groupDiv.appendChild(listDiv);
        container.appendChild(groupDiv);
    });
}

window.renderAdminBuyers = function(searchTerm = '') {
    const container = document.getElementById('adminBuyerList');
    if(!container) return;
    container.innerHTML = '';

    const term = searchTerm.toLowerCase();
    const filtered = validBuyers.filter(b => 
        b.name.toLowerCase().includes(term) || 
        (b.account && b.account.toLowerCase().includes(term))
    );

    if(filtered.length === 0) {
        container.innerHTML = '<div style="color:#999; text-align:center;">No buyers found.</div>';
        return;
    }

    const grouped = {};
    filtered.forEach(b => {
        const team = b.account ? b.account.toUpperCase() : 'NO TEAM';
        if(!grouped[team]) grouped[team] = [];
        grouped[team].push(b);
    });

    const sortedTeams = Object.keys(grouped).sort();

    sortedTeams.forEach(team => {
        const groupDiv = document.createElement('div');
        groupDiv.style.background = "white";
        groupDiv.style.borderRadius = "10px";
        groupDiv.style.border = "1px solid #e4e4e7";
        groupDiv.style.overflow = "hidden";
        groupDiv.style.marginBottom = "15px";

        groupDiv.innerHTML = `
            <div style="background:#f4f4f5; padding:8px 12px; font-size:0.75rem; font-weight:800; color:#555; border-bottom:1px solid #e4e4e7; display:flex; justify-content:space-between;">
                <span>${team}</span>
                <span>${grouped[team].length} User(s)</span>
            </div>
        `;

        const listDiv = document.createElement('div');
        
        grouped[team].sort((a,b) => a.name.localeCompare(b.name)).forEach(b => {
            const isMuted = b.isMuted || false;
            const row = document.createElement('div');
            row.className = 'admin-user-row'; 
            
            if(isMuted) row.style.background = "#fef2f2";
            
            // Clicking empty space opens History
            row.onclick = () => viewUserHistory(b, 'buyer');
            
            const img = b.img || DEFAULT_AVATAR;

            row.innerHTML = `
                <div style="display:flex; align-items:center; gap:12px;"
                     onclick="event.stopPropagation(); openUserInfo('${b.code}', 'buyer')"
                     title="View Profile">
                     
                    <img src="${img}" style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:1px solid #eee; cursor:pointer;">
                    
                    <div style="cursor:pointer;">
                        <div style="font-size:0.9rem; font-weight:600; ${isMuted ? 'color:#991b1b; text-decoration:line-through;' : ''}">${b.name}</div>
                        <div style="font-size:0.7rem; color:#bbb;">Code: ${b.code}</div>
                    </div>
                </div>

                <div style="display:flex; gap:10px; align-items:center;">
                     <!-- FIXED: NOW USES openHistoryById -->
                     <button onclick="event.stopPropagation(); openHistoryById('${b.id}', 'buyer')" 
                            style="cursor:pointer; border:none; background:transparent; font-size:1rem;" title="View History">
                        📜
                    </button>

                     <button onclick="event.stopPropagation(); toggleBuyerMute('${b.id}', ${isMuted})" 
                             style="cursor:pointer; border:none; background:transparent; font-size:1.1rem;" title="${isMuted ? 'Unmute' : 'Mute'}">
                        ${isMuted ? '✅' : '⛔'}
                    </button>
                    
                    <button onclick="event.stopPropagation(); deleteBuyer('${b.id}', '${b.name}')" 
                            style="cursor:pointer; border:none; background:transparent; font-size:1rem;" title="Delete">
                        🗑️
                    </button>
                </div>
            `;
            listDiv.appendChild(row);
        });

        groupDiv.appendChild(listDiv);
        container.appendChild(groupDiv);
    });
}
window.renderAdminReports = function() {
    // 1. Create section if missing
    let reportContainer = document.getElementById('adminReportSection');
    if(!reportContainer) {
        const adminView = document.getElementById('adminView');
        const wrapper = document.createElement('div');
        wrapper.style.marginBottom = "30px";
        wrapper.innerHTML = `
            <h3 class="section-title" style="color:#ef4444;">🚨 Active Reports</h3>
            <div id="adminReportSection" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:15px;"></div>
        `;
        adminView.insertBefore(wrapper, adminView.firstChild);
        reportContainer = document.getElementById('adminReportSection');
    }
    
    reportContainer.innerHTML = '';
    
    if(reports.length === 0) {
        reportContainer.innerHTML = '<div style="color:#aaa; font-style:italic; text-align:center; padding:20px;">No active reports. All good!</div>';
        return;
    }

    // Sort Newest First
    const sorted = reports.sort((a,b) => b.timestamp.localeCompare(a.timestamp));

    sorted.forEach(r => {
        const dateStr = new Date(r.timestamp).toLocaleDateString();
        const proofHtml = r.proof ? `<div class="report-proof-link" onclick="openLightbox('${r.proof}', 'Report Evidence')">📸 View Attached Proof</div>` : '';
        
        const card = document.createElement('div');
        card.className = 'report-card';
        card.innerHTML = `
            <div class="report-header">
                <span>From: ${r.reporter}</span>
                <span>${dateStr}</span>
            </div>
            <div style="margin-bottom:8px;">
                <span style="color:#ef4444; font-weight:700;">AGAINST: ${r.target}</span>
            </div>
            <div class="report-body">"${r.reason}"</div>
            ${proofHtml}
            <div style="margin-top:12px; display:flex; gap:10px; justify-content:flex-end; align-items:center;">
                 <button onclick="resolveReport('${r.id}')" style="font-size:0.75rem; background:#18181b; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;">
                    ✅ Resolve & Archive
                 </button>
                 <button onclick="openUserInfo('${r.targetCode}', 'buyer')" style="font-size:0.75rem; background:#fee2e2; color:#b91c1c; border:1px solid #fecaca; padding:6px 12px; border-radius:6px; cursor:pointer;">
                    Inspect
                </button>
            </div>
        `;
        reportContainer.appendChild(card);
    });
}

window.resolveReport = async function(id) {
    if(showConfirm("Mark this report as resolved? It will be moved to history.")) return;

    // 1. Find the report data in our local array
    const reportData = reports.find(r => r.id === id);
    if(!reportData) return showToast("Report data error", "error");

    try {
        // 2. Add to History Collection
        // We strip the ID so Firestore generates a new unique one, or use the same ID.
        // Let's use same ID for consistency.
        const { id: oldId, ...dataToSave } = reportData;
        
        await setDoc(doc(db, "resolved_reports", id), {
            ...dataToSave,
            resolvedAt: new Date().toISOString(),
            resolvedBy: currentUser.name,
            status: 'Resolved'
        });

        // 3. Delete from Active
        await deleteDoc(doc(db, "reports", id));

        showToast("Report Resolved & Archived");
        // UI auto-updates via onSnapshot listeners
    } catch(e) {
        console.error(e);
        showToast("Error moving report", "error");
    }
}
window.toggleBuyerMute = async function(id, currentStatus) {
    try {
        await updateDoc(doc(db, "buyers", id), { isMuted: !currentStatus });
        showToast(currentStatus ? "Buyer Active" : "Buyer Muted");
    } catch(e) {
        showToast("Error updating status", "error");
    }
}

window.deleteBuyer = function(id, name) {
    showConfirm(`Delete user "${name}"?`, async () => {
        try {
            await deleteDoc(doc(db, "buyers", id));
            showToast("User Deleted");
        } catch(e) {
            showToast("Error deleting", "error");
        }
    });
}

window.toggleVendorMute = async function(id, currentStatus) {
    try {
        await updateDoc(doc(db, "vendors", id), { isMuted: !currentStatus });
        showToast(currentStatus ? "Vendor Activated" : "Vendor Muted");
        if(currentUser.role === 'admin') setTimeout(renderAdminPanel, 200); 
    } catch(e) {
        showToast("Error updating status", "error");
    }
}

window.deleteVendor = function(id, name) {
    showConfirm(`Delete shop "${name}"? This cannot be undone.`, async () => {
        try {
            await deleteDoc(doc(db, "vendors", id));
            showToast("Vendor Deleted");
            if(currentUser.role === 'admin') setTimeout(renderAdminPanel, 200);
        } catch(e) {
            showToast("Error deleting", "error");
        }
    });
}

// --- MODAL & REGISTRATION ---
window.openRegisterModal = function(role) {
    document.getElementById('regRole').value = role;
    document.getElementById('regTitle').innerText = role === 'vendor' ? "Merchant Registration" : "Customer Registration";
    openModal('registerModal');
}
window.closeRegisterModal = function() { closeModalById('registerModal'); }

window.submitRegistration = async function() {
    const role = document.getElementById('regRole').value;
    const nameInput = document.getElementById('regName').value.trim();
    const account = document.getElementById('regAccount').value.trim();
    const emailInput = document.getElementById('regEmail').value.trim(); // NEW
    
    if(!nameInput || !account) return showToast("Name & Account required", "error");

    // Basic email validation
    if(emailInput && !emailInput.includes('@')) return showToast("Invalid Email", "error");

    const existingUsers = role === 'vendor' ? validVendors : validBuyers;
    if (existingUsers.some(user => user.id === nameInput)) {
        return showToast("Name taken! Use another.", "error");
    }

    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    const collectionName = role === 'vendor' ? 'vendors' : 'buyers';
    const extraData = role === 'vendor' ? { paymentMethods: { cash: true, payday: true } } : {};

    try {
        await setDoc(doc(db, collectionName, nameInput), { 
            code, 
            name: nameInput, 
            account, 
            img: null,
            email: emailInput || null, // Save Email here
            joinedAt: new Date().toISOString(),
            ...extraData
        });
        
        closeRegisterModal();
        document.getElementById('codeJson').value = code;
        showToast(`Registered! Code: ${code}`);
    } catch(e) { 
        console.error(e);
        showToast("Error connecting", "error"); 
    }
}

function openModal(id) {
    const modal = document.getElementById(id);
    modal.classList.remove('hidden');
    requestAnimationFrame(() => modal.classList.add('open'));
}

window.closeModalById = function(id) {
    const modal = document.getElementById(id);
    modal.classList.remove('open');
    setTimeout(() => modal.classList.add('hidden'), 200);
}

window.closeModal = function() { window.closeModalById('productModal'); }

document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape') {
        document.querySelectorAll('.modal.open').forEach(m => window.closeModalById(m.id));
        closeSlidePanel();
        closeLightbox();
    }
});
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if(e.target === modal) window.closeModalById(modal.id);
    });
});

// --- VENDOR INVENTORY ---
window.renderAdminProducts = function() {
    const list = document.getElementById('adminProductList');
    list.innerHTML = '';
    const myProducts = products.filter(p => p.vendor === currentUser.code);
    
    if(myProducts.length === 0) return list.innerHTML = '<div style="color:#999; text-align:center; padding:20px;">No items. Click +Add.</div>';

    myProducts.forEach(p => {
        const div = document.createElement('div');
        div.className = `inventory-item ${!p.active ? 'inactive-row' : ''}`;
        
        const imgHTML = (p.media && p.media.length > 50) 
            ? `<img src="${p.media}" class="item-img" onclick="event.stopPropagation(); openLightbox('${p.media}')">`
            : ''; 

        const stockDisplay = (p.stock === null || p.stock === undefined) ? '∞' : p.stock;

        div.onclick = (e) => { 
             if(!['BUTTON','INPUT'].includes(e.target.tagName)) openEditModal(p.id); 
        };

        div.innerHTML = `
            <input type="checkbox" class="item-checkbox" 
                   ${p.active ? 'checked' : ''} 
                   onclick="event.stopPropagation(); toggleProductActive('${p.id}', ${p.active})">
            
            ${imgHTML}
            
            <div class="item-info">
                <span class="item-name">${p.name}</span>
                <span class="item-price">₱${p.price} • Stock: ${stockDisplay}</span>
                ${p.note ? `<span style="font-size:0.7rem; color:#f59e0b;">${p.note}</span>` : ''}
            </div>

            <div class="item-actions">
                <button class="btn-delete" onclick="event.stopPropagation(); deleteProduct('${p.id}')">🗑️</button>
                <button class="btn-toggle-pre ${p.isPreOrder ? 'active' : ''}" 
                        onclick="event.stopPropagation(); togglePreOrder('${p.id}', ${p.isPreOrder})">
                    ${p.isPreOrder ? 'Pre-Order' : 'Standard'}
                </button>
            </div>
        `;
        list.appendChild(div);
    });
}

window.toggleProductActive = async function(id, current) {
    await updateDoc(doc(db, "products", id), { active: !current });
}
window.togglePreOrder = async function(id, current) {
    await updateDoc(doc(db, "products", id), { isPreOrder: !current });
}
window.deleteProduct = async function(id) {
    if(showConfirm("Delete this item permanently?")) {
        await deleteDoc(doc(db, "products", id));
        showToast("Item deleted");
    }
}
window.soldOut = async function() {
    showConfirm("Mark ALL items as Sold Out?", () => {
        products.filter(p => p.vendor === currentUser.code).forEach(async (p) => {
            if(p.active) await updateDoc(doc(db, "products", p.id), { active: false });
        });
        showToast("All items marked Sold Out");
    }); 
}

// --- ADD / EDIT PRODUCT ---
window.openAddModal = function() {
    document.getElementById('mId').value = '';
    document.getElementById('mName').value = '';
    document.getElementById('mPrice').value = '';
    document.getElementById('mStock').value = ''; 
    document.getElementById('mNote').value = ''; 
    document.getElementById('mVariants').value = '';
    
    // Reset Image UI
    document.getElementById('mPreview').src = '';
    document.getElementById('mPreview').classList.remove('show');
    document.getElementById('uploadPlaceholder').style.display = 'block';
    document.getElementById('btnRemoveProdImg').classList.add('hidden'); // Hide X
    document.getElementById('mFile').value = ''; 

    document.getElementById('modalTitle').innerText = 'Add Item';
    openModal('productModal');
}

window.openEditModal = function(id) {
    const p = products.find(x => x.id === id);
    if(!p) return;
    document.getElementById('mId').value = p.id;
    document.getElementById('mName').value = p.name;
    document.getElementById('mPrice').value = p.price;
    document.getElementById('mStock').value = (p.stock === null || p.stock === undefined) ? '' : p.stock;
    document.getElementById('mVariants').value = (p.variants || []).join(', ');
    document.getElementById('mNote').value = p.note || ''; 
    
    // Handle Image
    const hasImg = (p.media && p.media.length > 50);
    document.getElementById('mPreview').src = hasImg ? p.media : '';
    document.getElementById('mFile').value = ''; // Reset input

    if(hasImg) {
        document.getElementById('mPreview').classList.add('show');
        document.getElementById('uploadPlaceholder').style.display = 'none';
        document.getElementById('btnRemoveProdImg').classList.remove('hidden'); // Show X
    } else {
        document.getElementById('mPreview').classList.remove('show');
        document.getElementById('uploadPlaceholder').style.display = 'block';
        document.getElementById('btnRemoveProdImg').classList.add('hidden'); // Hide X
    }
    
    document.getElementById('modalTitle').innerText = 'Edit Item';
    openModal('productModal');
}

window.openHelpModal = function() {
    const content = document.getElementById('helpContent');
    const title = document.getElementById('helpTitle');
    if (!currentUser) return;
    if (currentUser.role === 'admin') {
        title.innerText = "👑 Super Admin Guide";
        content.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:15px;">
                <div style="background:#f0f9ff; padding:10px; border-radius:8px; border:1px solid #bae6fd;">
                    <strong style="color:#0369a1;">1. USERS Management</strong>
                    <p style="margin:5px 0 0; font-size:0.85rem;">Global view of all shops.</p>
                </div>
                <div><strong style="color:#b91c1c;">2. Muting</strong><p style="margin:5px 0 0; font-size:0.85rem;">Hides shop from market.</p></div>
                <div><strong style="color:#b91c1c;">3. Deletion</strong><p style="margin:5px 0 0; font-size:0.85rem;">Permanent removal.</p></div>
            </div>`;
     } else if (currentUser.role === 'vendor') {
        title.innerText = "🏪 Merchant Guide";
        content.innerHTML = `
            <ul style="padding-left:15px; margin:0 0 15px 0; display:flex; flex-direction:column; gap:8px;">
                <li><b>Adding Items:</b> Click <i>+ Add Item</i>. Leave stock blank for unlimited.</li>
                <li><b>Payment Settings:</b> Configure accepted payments and QR codes.</li>
                <li><b>Orders:</b> Mark "Paid" to clear notifications. Use Trash icon to delete orders.</li>
                <li><b>End Shift:</b> Clears your local view (data saved in History).</li>
            </ul>
            <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px; text-align: center; color: #1e40af;">
                <div style="font-size: 0.85rem; font-style: italic; margin-bottom: 10px; opacity: 0.9;">* Orders cannot be cancelled once placed.</div>
            </div>`;
    }  else {
        title.innerText = "🛒 Buyer Guide";
        content.innerHTML = `
            <ul style="padding-left:15px; margin:0 0 15px 0; display:flex; flex-direction:column; gap:8px;">
                <li><b>Ordering:</b> Click (+) to add items.</li>
                <li><b>Bank Transfer:</b> You must upload a receipt screenshot.</li>
                <li><b>History:</b> Check slide-out menu for past purchases.</li>          
            </ul>
            <div style="background-color: #fff1f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; text-align: center; color: #881337;">
                <div style="font-size: 0.85rem; font-style: italic; margin-bottom: 10px; opacity: 0.9;">* Orders cannot be cancelled once placed.</div>
            </div>`;
    }
    openModal('helpModal');
}

window.previewImage = function(input) {
    if(input.files && input.files[0]) {
        const r = new FileReader();
        r.onload = (e) => {
            const img = document.getElementById('mPreview');
            img.src = e.target.result;
            img.classList.add('show');
            document.getElementById('uploadPlaceholder').style.display = 'none';
            document.getElementById('btnRemoveProdImg').classList.remove('hidden'); // Show X
        };
        r.readAsDataURL(input.files[0]);
    }
}
window.switchUploadMode = function(mode) {
    const btnUp = document.getElementById('tab-upload');
    const btnLn = document.getElementById('tab-link');
    const divFile = document.getElementById('mode-file');
    const divUrl = document.getElementById('mode-url');

    if(mode === 'file') {
        divFile.classList.remove('hidden');
        divUrl.classList.add('hidden');
        btnUp.style.background = '#3b82f6'; btnUp.style.color = 'white';
        btnLn.style.background = '#f3f4f6'; btnLn.style.color = '#555';
        document.getElementById('mUrl').value = ''; 
    } else {
        divFile.classList.add('hidden');
        divUrl.classList.remove('hidden');
        btnLn.style.background = '#3b82f6'; btnLn.style.color = 'white';
        btnUp.style.background = '#f3f4f6'; btnUp.style.color = '#555';
        document.getElementById('mFile').value = '';
    }
}
window.removeProductImage = function() {
    document.getElementById('mFile').value = ''; // Clear input
    document.getElementById('mPreview').src = '';
    document.getElementById('mPreview').classList.remove('show');
    document.getElementById('uploadPlaceholder').style.display = 'block';
    document.getElementById('btnRemoveProdImg').classList.add('hidden');
}
window.commitProduct = function() {
    const id = document.getElementById('mId').value;
    const name = document.getElementById('mName').value.trim();
    const price = document.getElementById('mPrice').value;
    const stockVal = document.getElementById('mStock').value; 
    const note = document.getElementById('mNote').value.trim();
    const variantsStr = document.getElementById('mVariants').value;
    const variants = variantsStr ? variantsStr.split(',').map(s => s.trim()).filter(s => s) : [];

    // Image Logic
    const fileInput = document.getElementById('mFile');
    const previewSrc = document.getElementById('mPreview').src;
    const hasVisibleImg = document.getElementById('mPreview').classList.contains('show');

    if(!name || !price) return showToast("Name & Price required", "error");
    const stock = stockVal === '' ? null : parseInt(stockVal);

    const save = async (imgData) => {
        try {
            // If adding new, we need base data
            let data = { 
                vendor: currentUser.code, vendorName: currentUser.name, 
                name, price: parseInt(price), stock: stock, 
                note: note, variants: variants, 
                isPreOrder: false, active: true 
            };

            // If updating
            if(id) { 
                const updateData = { name, price: parseInt(price), stock: stock, note: note, variants: variants };
                // Update media only if changed or removed
                updateData.media = imgData; 
                await updateDoc(doc(db,"products",id), updateData);
                showToast("Item Updated");
             } else { 
                // New Item
                data.media = imgData || null;
                
                // GENERATE ID: VENDOR - ITEM
                // Example: JOESBURGERS-CHEESEBURGER
                const customId = `${cleanId(currentUser.name)}-${cleanId(name)}`;

                await setDoc(doc(db, "products", customId), data); 
                showToast("Item Added");
            }
            window.closeModal();
        } catch(err) {
            console.error(err);
            showToast("Error saving", "error");
        }
    };

    // Determine what to save for media
    if(fileInput.files && fileInput.files[0]) { 
        if(fileInput.files[0].size > 1000000) return showToast("File too big (Max 1MB)", "error");
        const r = new FileReader(); 
        r.onload = (e) => save(e.target.result); 
        r.readAsDataURL(fileInput.files[0]); 
    } else if (hasVisibleImg && previewSrc.startsWith('data:')) {
        // Keep existing image (passed as dataurl)
        save(previewSrc);
    } else {
        // No image (removed or never added)
        save(null); 
    }
}

// --- BUYER & CARD RENDERING ---
// --- BUYER & CARD RENDERING UPDATED ---
function renderBuyerCards(container, showPreOrders, isCompact = false, excludeVendor = null) {
    if(!container) return;
    container.innerHTML = '';
    const vendors = {};
    
    // 1. Group Products by Vendor
    products.forEach(p => {
        if(!p.active) return;
        if(p.isPreOrder !== showPreOrders) return;
        if(excludeVendor && p.vendor === excludeVendor) return; 

        if(!vendors[p.vendor]) {
            const vObj = validVendors.find(v => v.code === p.vendor);
            if(!vObj || vObj.isMuted) return; 

            vendors[p.vendor] = { 
                name: vObj.name, account: vObj.account, img: vObj.img,
                items: [], code: p.vendor,
                // Default to legacy (Cash/Payday) if no settings exist
                paymentMethods: vObj.paymentMethods || { cash: true, payday: true, bank: false }
            };
        }
        if(vendors[p.vendor]) vendors[p.vendor].items.push(p);
    });

    const vendorKeys = Object.keys(vendors);
    if(vendorKeys.length === 0) {
        container.innerHTML = '<div style="color:#999; font-size:0.8rem; padding:10px;">No active shops.</div>';
        return;
    }

    // 2. Build Cards
    vendorKeys.forEach(code => {
        const v = vendors[code];
        const card = document.createElement('div');
        card.className = 'vendor-card collapsed'; 
        if(isCompact) card.style.border = "1px solid #e4e4e7";

        // Render Items
        let itemsHtml = v.items.map(i => {
            const itemImgHTML = (i.media && i.media.length > 50) 
                ? `<img src="${i.media}" class="product-img" onclick="openLightbox('${i.media}')">`
                : '';
            
            const isUnlimited = (i.stock === null || i.stock === undefined);
            const variants = i.variants || [];
            
            let totalInCartForThisItem = 0;
            Object.keys(cart).forEach(key => {
                if(key.startsWith(i.id)) totalInCartForThisItem += cart[key];
            });

            let controlsHTML = '';
            if (variants.length > 0) {
                controlsHTML = `<div class="variant-list">`;
                variants.forEach(variant => {
                    const compositeKey = `${i.id}::${variant}`;
                    const qty = cart[compositeKey] || 0;
                    const isOOS = !isUnlimited && (totalInCartForThisItem >= i.stock);
                    
                    controlsHTML += `
                        <div class="variant-row">
                            <span class="variant-name">${variant}</span>
                            <div class="qty-controls small-controls">
                                <button class="qty-btn" onclick="changeQty('${i.id}', -1, ${i.price}, '${v.code}', '${variant}')">-</button>
                                <span class="qty-val" id="qty-${compositeKey}">${qty}</span>
                                <button class="qty-btn" id="btn-plus-${compositeKey}" 
                                    ${(isOOS && qty === 0) ? 'disabled style="opacity:0.3"' : ''} 
                                    onclick="changeQty('${i.id}', 1, ${i.price}, '${v.code}', '${variant}')">+</button>
                            </div>
                        </div>`;
                });
                controlsHTML += `</div>`;
            } else {
                const qty = cart[i.id] || 0;
                const isOOS = !isUnlimited && (totalInCartForThisItem >= i.stock);
                controlsHTML = `
                    <div class="qty-controls">
                        <button class="qty-btn" onclick="changeQty('${i.id}',-1,${i.price},'${v.code}')">-</button>
                        <span class="qty-val" id="qty-${i.id}">${qty}</span>
                        <button class="qty-btn" id="btn-plus-${i.id}" ${isOOS ? 'disabled style="opacity:0.3"' : ''} onclick="changeQty('${i.id}',1,${i.price},'${v.code}')">+</button>
                    </div>`;
            }
            const stockDisplay = !isUnlimited ? `<div class="stock-badge">Stock: ${i.stock}</div>` : '';

            return `
            <div class="product-item ${variants.length > 0 ? 'has-variants' : ''}">
                ${itemImgHTML}
                <div class="product-details">
                    <span class="product-name">${i.name}</span>
                    <span class="product-price">₱${i.price}</span>
                    ${i.note ? `<div class="item-note">${i.note}</div>` : ''}
                    ${stockDisplay}
                </div>
                ${controlsHTML}
            </div>`;
        }).join('');

        // --- UPDATED VENDOR IMAGE LOGIC ---
        // Clicking image now calls openUserInfo instead of lightbox directly
        const hasCustomImg = (v.img && v.img.length > 50);
        const imgSrc = hasCustomImg ? v.img : DEFAULT_AVATAR;
        
        const vendorImgHTML = `
            <img src="${imgSrc}" class="vendor-header-img" 
                 onclick="event.stopPropagation(); openUserInfo('${v.code}', 'vendor')" 
                 style="cursor:pointer;" 
                 title="View Shop Info">
        `;

        // DYNAMIC PAYMENT BUTTONS
        let paymentButtonsHTML = '';
        if(v.paymentMethods.cash) {
            paymentButtonsHTML += `<button class="pay-btn" onclick="togglePayment(this, '${v.code}')">Cash Only</button>`;
        }
        if(v.paymentMethods.payday) {
            paymentButtonsHTML += `<button class="pay-btn" onclick="togglePayment(this, '${v.code}')">Payday</button>`;
        }
        if(v.paymentMethods.bank) {
            const detailsText = v.paymentMethods.bankDetails?.text || 'Ask Vendor';
            const detailsQR = v.paymentMethods.bankDetails?.qr || '';
            paymentButtonsHTML += `<button class="pay-btn" data-type="bank" 
                onclick="togglePayment(this, '${v.code}', '${btoa(detailsText)}', '${detailsQR}')">Bank Transfer</button>`;
        }
        
        // HIDDEN ACTIONS & UPLOAD
        const bankActionsHTML = `
            <div id="bank-actions-${v.code}" class="bank-actions hidden">
                <button class="bank-action-btn" onclick="viewBankQR('${v.code}')">📷 Show QR</button>
                <button class="bank-action-btn" onclick="viewBankDetails('${v.code}')">📄 Details</button>
            </div>
            <div id="receipt-upload-${v.code}" class="receipt-upload-box hidden" onclick="triggerReceiptUpload('${v.code}')">
                <span id="receipt-label-${v.code}" style="font-size:0.75rem; color:#555;">📎 Upload Receipt (Required)</span>
                <img id="receipt-preview-${v.code}" class="receipt-preview-img">
                <input type="file" id="receipt-input-${v.code}" hidden accept="image/*" onchange="previewReceipt(this, '${v.code}')">
            </div>
        `;

        card.innerHTML = `
            <div class="card-header" onclick="toggleCard(this)">
                <div class="vendor-header-wrapper">
                    ${vendorImgHTML}
                    <div>
                        <div class="shop-name">${v.name}</div>
                        <span class="shop-meta">${v.account}</span>
                    </div>
                </div>
                <span class="chevron">▼</span>
            </div>
            <div class="card-content">${itemsHtml}</div>
            <div class="card-footer">
                <div class="total-display"><span>Total:</span><span id="total-${v.code}">₱0</span></div>
                
                <div class="payment-options">
                    ${paymentButtonsHTML}
                </div>
                
                ${bankActionsHTML}

                <div class="action-row">
                    <button class="btn-cancel-order" onclick="clearVendorCart('${v.code}')">Cancel</button>
                    <button class="submit-btn" id="submit-btn-${v.code}" style="flex:2;" onclick="submitOrder('${v.code}', this, ${showPreOrders})">Submit Order</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

window.toggleCard = function(header) {
    header.parentElement.classList.toggle('collapsed');
}

window.changeQty = function(id, chg, price, vendorCode, variant = null) {
    const cartKey = variant ? `${id}::${variant}` : id;
    if (!cart[cartKey]) cart[cartKey] = 0;

    const product = products.find(x => x.id === id);
    if (product && chg > 0) {
        const isUnlimited = (product.stock === null || product.stock === undefined);
        if (!isUnlimited) {
            let currentTotalUsage = 0;
            Object.keys(cart).forEach(k => {
                if (k.startsWith(id)) currentTotalUsage += cart[k];
            });
            if (currentTotalUsage >= product.stock) {
                showToast("Max stock reached", "error");
                return;
            }
        }
    }

    cart[cartKey] += chg;
    if (cart[cartKey] < 0) cart[cartKey] = 0;

    const qtySpan = document.getElementById(`qty-${cartKey}`);
    if(qtySpan) qtySpan.innerText = cart[cartKey];

    const vItems = products.filter(x => x.vendor === vendorCode);
    let tot = 0;
    Object.keys(cart).forEach(key => {
        const pId = key.split('::')[0]; 
        const prod = vItems.find(p => p.id === pId);
        if(prod) tot += (prod.price * cart[key]);
    });
    
    document.querySelectorAll(`#total-${vendorCode}`).forEach(el => el.innerText = `₱${tot.toLocaleString()}`);
}

// Global store for current bank details per vendor card interaction
let currentBankDetails = {}; 

window.togglePayment = function(btn, vCode, encodedText = '', qrSrc = '') {
    const parent = btn.parentElement;
    
    if(btn.classList.contains('selected')) {
        // Deselecting
        btn.classList.remove('selected');
        hideBankOptions(vCode);
    } else {
        // Selecting new
        parent.querySelectorAll('.pay-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        if(btn.dataset.type === 'bank') {
            // Show Bank Options
            document.getElementById(`bank-actions-${vCode}`).classList.remove('hidden');
            document.getElementById(`receipt-upload-${vCode}`).classList.remove('hidden');
            
            // Store details for the view buttons
            currentBankDetails[vCode] = { text: atob(encodedText), qr: qrSrc };
        } else {
            hideBankOptions(vCode);
        }
    }
}

function hideBankOptions(vCode) {
    document.getElementById(`bank-actions-${vCode}`).classList.add('hidden');
    document.getElementById(`receipt-upload-${vCode}`).classList.add('hidden');
}

window.viewBankQR = function(vCode) {
    const data = currentBankDetails[vCode];
    if(data && data.qr) {
        openLightbox(data.qr, "Scan to Pay");
    } else {
        showToast("No QR code provided by vendor", "error");
    }
}

window.viewBankDetails = function(vCode) {
    const data = currentBankDetails[vCode];
    
    if(data && data.text) {
        const container = document.getElementById('bankCardContainer');
        const rawText = data.text;
        
        // Inject the ATM Card HTML
        container.innerHTML = `
            <div class="atm-card-wrapper" onclick="copyCardData('${rawText.replace(/'/g, "\\'")}', this)">
                <div class="atm-card">
                    <div class="copy-overlay">COPIED!</div>
                    
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div class="atm-chip"></div>
                        <div class="atm-wifi">)))</div>
                    </div>
                    
                    <div>
                        <div class="atm-label">Details / Bank</div>
                        <div class="atm-number">${rawText}</div>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:flex-end;">
                        <div>
                            <div class="atm-label">Account Name / ID</div>
                            <div class="atm-holder"></div>
                        </div>
                        <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" 
                             style="height:24px; opacity:0.6; filter:brightness(100) grayscale(1);">
                    </div>
                </div>
            </div>
            <div style="text-align:center; font-size:0.8rem; color:#71717A; margin-top:15px; font-weight:500;">
                👆 Tap card to copy details
            </div>
        `;

        openModal('bankDetailsModal');
    } else {
        showToast("No details provided", "error");
    }
}

// New Helper function for the card animation
window.copyCardData = function(text, wrapper) {
    navigator.clipboard.writeText(text).then(() => {
        const card = wrapper.querySelector('.atm-card');
        
        // Add class to trigger CSS overlay
        card.classList.add('copied');
        
        // Remove it after 1.5 seconds
        setTimeout(() => {
            card.classList.remove('copied');
        }, 1500);
        
        // Optional: Also show standard toast
        // showToast("Details copied!"); 
    });
}

// Helper to actually copy text
window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Visual feedback inside the card
        const hint = document.getElementById('copyHintText');
        if(hint) {
            hint.innerText = "✅ COPIED!";
            hint.style.background = "#10B981";
            hint.style.color = "white";
            setTimeout(() => {
                hint.innerText = "Click to Copy";
                hint.style.background = "rgba(255,255,255,0.9)";
                hint.style.color = "black";
            }, 2000);
        }
        // Fallback toast
        // showToast("Details copied to clipboard"); 
    });
}


window.triggerReceiptUpload = function(vCode) {
    document.getElementById(`receipt-input-${vCode}`).click();
}

window.previewReceipt = function(input, vCode) {
    if(input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.getElementById(`receipt-preview-${vCode}`);
            img.src = e.target.result;
            img.classList.add('show');
            document.getElementById(`receipt-label-${vCode}`).innerText = "✅ Receipt Attached";
            document.getElementById(`receipt-label-${vCode}`).style.color = "green";
            document.getElementById(`receipt-label-${vCode}`).style.fontWeight = "bold";
        };
        reader.readAsDataURL(input.files[0]);
    }
}


window.clearVendorCart = function(vendorCode) {
    const vendorItems = products.filter(p => p.vendor === vendorCode).map(p => p.id);
    let clearedCount = 0;
    Object.keys(cart).forEach(key => {
        const pId = key.split('::')[0];
        if(vendorItems.includes(pId)) {
            delete cart[key];
            clearedCount++;
        }
    });

    if(clearedCount > 0) {
        showToast("Cart cleared for this shop");
        renderBuyerCards(document.getElementById('buyerTodayGrid'), false);
        renderBuyerCards(document.getElementById('buyerPreOrderGrid'), true);
        if(currentUser && currentUser.role === 'vendor') {
             renderBuyerCards(document.getElementById('vendorPreviewToday'), false, true, currentUser.code); 
             renderBuyerCards(document.getElementById('vendorPreviewPreOrder'), true, true, currentUser.code); 
        }
    }
}

window.submitOrder = async function(vCode, btn, isPreOrder) {
    if(!currentUser) return showToast("Please Login first", "error");

    if(currentUser.isMuted) {
        return showToast("⛔ Account Muted. Contact Admin.", "error");
    }
    // --------------------------------
    const vItems = products.filter(p => p.vendor === vCode);
    const purchased = [];
    let total = 0;
    
    const relevantKeys = Object.keys(cart).filter(k => {
        const pId = k.split('::')[0];
        return vItems.some(v => v.id === pId) && cart[k] > 0;
    });

    if(relevantKeys.length === 0) return showToast("Cart is empty", "error");

    const usageMap = {}; 
    for(let key of relevantKeys) {
        const pId = key.split('::')[0];
        if(!usageMap[pId]) usageMap[pId] = 0;
        usageMap[pId] += cart[key];
    }

    for(let pId in usageMap) {
        const product = products.find(p => p.id === pId);
        const isUnlimited = (product.stock === null || product.stock === undefined);
        if(!isUnlimited && usageMap[pId] > product.stock) {
            return showToast(`Not enough stock for ${product.name}`, "error");
        }
    }

    for(let key of relevantKeys) {
        const [pId, variant] = key.split('::');
        const product = products.find(p => p.id === pId);
        const qty = cart[key];
        const finalName = variant ? `${product.name} (${variant})` : product.name;
        
        purchased.push({ 
            name: finalName, qty: qty, price: product.price, 
            id: pId, originalStock: product.stock 
        });
        total += (product.price * qty);
    }

    const selectedBtn = btn.parentElement.parentElement.querySelector('.pay-btn.selected');
    if(!selectedBtn) return showToast("Select Payment Option", "error");
    const method = selectedBtn.innerText; // "Cash", "Payday", "Bank / GCash"

    // RECEIPT CHECK
    let receiptData = null;
    if(selectedBtn.dataset.type === 'bank') {
        const fileInput = document.getElementById(`receipt-input-${vCode}`);
        if(fileInput.files && fileInput.files[0]) {
            // Need to read it if not already read (or grab from preview src)
            const preview = document.getElementById(`receipt-preview-${vCode}`);
            if(preview.src && preview.src.startsWith('data:')) {
                receiptData = preview.src;
            } else {
                return showToast("Processing image... try again in a sec", "error");
            }
        } else {
            return showToast("⚠️ Receipt Upload Required for Bank Transfer", "error");
        }
    }

    btn.disabled = true;
    btn.innerText = "Sending...";

     try {
        // 1. GET VENDOR NAME FOR THE ID
        const vendorObj = validVendors.find(v => v.code === vCode);
        const vName = vendorObj ? vendorObj.name : vCode;

        // 2. GET ITEM NAME (If multiple, take the first one + "and_others")
        let itemLabel = purchased[0].name;
        if(purchased.length > 1) itemLabel += "_AND_OTHERS";
        const shortCode = Math.floor(1000 + Math.random() * 9000);

        // 3. GENERATE ID: VENDOR - BUYER - ITEM - TIMESTAMP
        // We MUST add a timestamp (Date.now()) at the end. 
        // Without it, if a buyer orders the same item twice, the second order deletes the first one.
        const customOrderId = `${cleanId(vName)}-${cleanId(currentUser.name)}-${cleanId(itemLabel)}-${shortCode}`;

        // 4. SAVE WITH CUSTOM ID
        await setDoc(doc(db, "orders", customOrderId), {
            vendorCode: vCode,
            buyerCode: currentUser.code,
            buyer: { name: currentUser.name, account: currentUser.account },
            items: purchased.map(x => ({ name: x.name, qty: x.qty, price: x.price })),
            total: total,
            method: method,
            receipt: receiptData, 
            status: "Unpaid",
            date: getShiftDate(isPreOrder),
            timestamp: new Date().toLocaleString(),
            type: isPreOrder ? "Pre-Order" : "Standard"
        });

        for(let pId in usageMap) {
            const product = products.find(p => p.id === pId);
            if (product.stock !== null && product.stock !== undefined) {
                const newStock = product.stock - usageMap[pId];
                const updates = { stock: newStock };
                if(newStock <= 0) {
                    updates.active = false;
                    updates.stock = 0;
                }
                await updateDoc(doc(db, "products", pId), updates);
            }
        }

        relevantKeys.forEach(k => delete cart[k]);
        document.querySelectorAll(`#total-${vCode}`).forEach(el => el.innerText = `₱0`);
        renderBuyerCards(document.getElementById('buyerTodayGrid'), false);
        renderBuyerCards(document.getElementById('buyerPreOrderGrid'), true);
        
        showToast("Order Sent!");
    } catch(e) { 
        console.error(e); 
        showToast("Failed to send", "error"); 
    } finally {
        btn.disabled = false;
        btn.innerText = "Submit Order";
    }
}

// --- HISTORY ---
window.openSlidePanel = function() {
    document.getElementById('slideOverlay').classList.add('open');
    document.getElementById('slidePanel').classList.add('open');
    
    // --- ADMIN LOGIC ---
    if(currentUser.role === 'admin') {
        historyMode = 'reports'; // Set mode
        document.getElementById('historyTitle').innerText = "Resolved Reports"; // Change Title
        document.getElementById('vendorHistoryToggle').classList.add('hidden'); // Hide Sales/Purchases buttons
        document.getElementById('historyTotalBadge').style.display = 'none'; // Hide Money Badge
    } 
    // --- VENDOR LOGIC ---
    else if(currentUser.role === 'vendor') {
        document.getElementById('historyTitle').innerText = "History";
        document.getElementById('vendorHistoryToggle').classList.remove('hidden');
        document.getElementById('historyTotalBadge').style.display = 'block'; 
        historyMode = 'sales'; 
        updateHistoryToggleUI();
    } 
    // --- BUYER LOGIC ---
    else {
        document.getElementById('historyTitle').innerText = "History";
        document.getElementById('vendorHistoryToggle').classList.add('hidden');
        document.getElementById('historyTotalBadge').style.display = 'block';
        historyMode = 'purchases';
    }
    
    populateDateFilters(); // This triggers renderHistory()
}

window.closeSlidePanel = function() {
    document.getElementById('slideOverlay').classList.remove('open');
    document.getElementById('slidePanel').classList.remove('open');
}

window.switchHistoryMode = function(mode) {
    historyMode = mode;
    updateHistoryToggleUI();
    renderHistory();
}

function updateHistoryToggleUI() {
    const btnSales = document.getElementById('btnShowSales');
    const btnPurch = document.getElementById('btnShowPurchases');
    if(historyMode === 'sales') {
        btnSales.style.background = 'white'; btnSales.style.color = 'black'; btnSales.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
        btnPurch.style.background = 'transparent'; btnPurch.style.color = '#71717A'; btnPurch.style.boxShadow = "none";
    } else {
        btnPurch.style.background = 'white'; btnPurch.style.color = 'black'; btnPurch.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
        btnSales.style.background = 'transparent'; btnSales.style.color = '#71717A'; btnSales.style.boxShadow = "none";
    }
}

function populateDateFilters() {
    const mSelect = document.getElementById('filterMonth');
    const ySelect = document.getElementById('filterYear');
    if(mSelect.options.length === 0) {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        months.forEach((m, i) => mSelect.add(new Option(m, i)));
        const today = new Date();
        for(let y = today.getFullYear(); y >= today.getFullYear() - 2; y--) {
            ySelect.add(new Option(y, y));
        }
        mSelect.value = today.getMonth();
        ySelect.value = today.getFullYear();
    }
    renderHistory();
}

window.renderHistory = function() {
    const tbody = document.getElementById('historyTableBody');
    const thead = document.getElementById('historyTableHead');
    tbody.innerHTML = '';
    
    // Get Date Filters
    const m = parseInt(document.getElementById('filterMonth').value);
    const y = parseInt(document.getElementById('filterYear').value);
    
    // --- MODE: ADMIN REPORTS ---
    if (historyMode === 'reports') {
        thead.innerHTML = `<tr><th>Target / Reason</th><th class="text-right">Resolved</th></tr>`;
        
        // Filter Resolved Reports by Date (using resolvedAt)
        const relevantReports = resolvedReports.filter(r => {
            if(!r.resolvedAt) return false;
            const d = new Date(r.resolvedAt);
            return d.getMonth() === m && d.getFullYear() === y;
        }).sort((a,b) => b.resolvedAt.localeCompare(a.resolvedAt));

        if(relevantReports.length === 0) {
            tbody.innerHTML = `<tr><td colspan="2" style="text-align:center; color:#999; padding:20px;">No resolved reports this month.</td></tr>`;
            return;
        }

        relevantReports.forEach(r => {
            const resolveDate = new Date(r.resolvedAt).toLocaleDateString(undefined, {month:'short', day:'numeric'});
            const proofIcon = r.proof ? `<span onclick="event.stopPropagation(); openLightbox('${r.proof}')" style="cursor:pointer; margin-left:5px;">📸</span>` : '';

            // Click row to inspect the user who was reported
            const inspectAttr = `onclick="openUserInfo('${r.targetCode}', 'buyer')" style="cursor:pointer;"`;

            tbody.innerHTML += `
            <tr class="history-row" ${inspectAttr}>
                <td>
                    <div style="font-weight:700; color:#ef4444;">${r.target} ${proofIcon}</div>
                    <div style="font-size:0.8rem; color:#18181b;">"${r.reason}"</div>
                    <div style="font-size:0.7rem; color:#71717a;">Rep: ${r.reporter}</div>
                </td>
                <td class="text-right">
                    <span style="font-size:0.7rem; background:#ecfdf5; color:#059669; padding:2px 6px; border-radius:4px; font-weight:600;">
                        ${resolveDate}
                    </span>
                </td>
            </tr>`;
        });
        return; // Stop here for admin
    }

    // --- EXISTING LOGIC FOR VENDORS/BUYERS ---
    // (Keep your existing code for Sales/Purchases below)
    
    let relevantOrders = orders.filter(o => {
        const d = new Date(o.date);
        return d.getMonth() === m && d.getFullYear() === y;
    });

    const totalBadge = document.getElementById('historyTotalBadge');
    totalBadge.classList.remove('total-pop'); 
    void totalBadge.offsetWidth; 
    totalBadge.classList.add('total-pop');

    if(historyMode === 'sales') {
        // ... (Existing Vendor Logic) ...
        thead.innerHTML = `<tr><th>Date/Buyer</th><th class="text-right">Amt</th></tr>`;
        relevantOrders = relevantOrders.filter(o => o.vendorCode === currentUser.code);
        let grand = 0;
        relevantOrders.forEach(o => {
            const isPaid = o.status === 'Paid';
            const itemsStr = o.items.map(i => `${i.qty} ${i.name}`).join(', ');
            const receiptIcon = o.receipt ? `<span onclick="event.stopPropagation(); openLightbox('${o.receipt}')" style="cursor:pointer; margin-left:5px;">📎</span>` : '';
            
            tbody.innerHTML += `
            <tr class="history-row">
                <td>
                    <div class="user-link" onclick="openUserInfo('${o.buyerCode}', 'buyer')">
                         <span style="font-weight:600;">${o.buyer.name}</span>
                         <span class="acc-tag">${o.buyer.account}</span>
                    </div> ${receiptIcon}
                    <div style="font-size:0.75rem; color:#777; margin-top:2px;">${itemsStr}</div>
                    <span class="status-badge ${isPaid ? 'bg-paid' : 'bg-unpaid'}">${o.status}</span>
                </td>
                <td class="text-right amount-cell">+₱${o.total}</td>
            </tr>`;
            grand += o.total;
        });
        totalBadge.innerText = `₱${grand.toLocaleString()}`;
    } else {
        // ... (Existing Buyer Logic) ...
        thead.innerHTML = `<tr><th>Shop/Items</th><th class="text-right">Total</th></tr>`;
        relevantOrders = relevantOrders.filter(o => o.buyerCode === currentUser.code);
        let grand = 0;
        relevantOrders.forEach(o => {
            const isPaid = o.status === 'Paid';
            if(!isPaid) grand += o.total; 
            const itemsStr = o.items.map(i => `${i.qty} ${i.name}`).join(', ');
            const statusText = isPaid ? '' : '<div style="color:#ef4444; font-size:0.7rem; font-weight:700;">TO BE PAID</div>';
            
            const vendorObj = validVendors.find(v => v.code === o.vendorCode);
            const vName = vendorObj ? vendorObj.name : o.vendorCode; 
            const vAcc = vendorObj ? vendorObj.account : 'Shop';

            tbody.innerHTML += `
            <tr class="history-row">
                <td>
                    <div class="user-link" onclick="openUserInfo('${o.vendorCode}', 'vendor')">
                        <span style="font-weight:700;">${vName}</span>
                        <span class="acc-tag">${vAcc}</span>
                    </div>
                    <div style="font-size:0.85rem; color:#555;">${itemsStr}</div>
                    ${statusText}
                </td>
                <td class="text-right amount-cell">₱${o.total}</td>
            </tr>`;
        });
        totalBadge.innerText = `₱${grand.toLocaleString()}`;
    }
}

// --- VENDOR ORDERS ---
function renderVendorOrders() {
    const list = document.getElementById('orderList');
    list.innerHTML = '';
    const currentShiftDate = getShiftDate(false);
    
    const myOrders = orders
        .filter(o => o.vendorCode === currentUser.code && o.date === currentShiftDate)
        .sort((a,b) => b.timestamp.localeCompare(a.timestamp));
        
    if(myOrders.length === 0) return list.innerHTML = '<div style="text-align:center; color:#ccc;">No orders today</div>';

    myOrders.forEach(o => {
        const div = document.createElement('div');
        div.style.background = "white"; div.style.padding = "12px"; div.style.borderRadius = "10px"; div.style.border = "1px solid #eee";
        const isPaid = o.status === 'Paid';
        
        const receiptHtml = o.receipt ? `
            <div style="margin-top:5px; background:#f9fafb; padding:4px; border-radius:4px; font-size:0.75rem; cursor:pointer; color:#2563eb;" 
                 onclick="openLightbox('${o.receipt}', 'Receipt from ${o.buyer.name}')">
                📎 View Receipt
            </div>
        ` : '';

        // "Conjoined Twins": Name + Account
        // Added onclick to open User Modal
        const buyerNameHtml = `
            <div class="user-link" onclick="openUserInfo('${o.buyerCode}', 'buyer')">
            <span style="font-weight:700; color:#18181b;">${o.buyer.name}</span>
            <span class="acc-tag">${o.buyer.account}</span>
        </div>
        `;

        div.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:5px;">
            ${buyerNameHtml}
            <span style="font-weight:800;">₱${o.total}</span>
        </div>
            <div style="font-size:0.85rem; color:#555; margin:5px 0;">${o.items.map(i=>`${i.qty}x ${i.name}`).join(', ')}</div>
            ${receiptHtml}
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                <span style="font-size:0.75rem; background:#f4f4f5; padding:2px 6px; border-radius:4px;">${o.method}</span>
                <div style="display:flex; align-items:center;">
                    <button onclick="toggleOrderStatus('${o.id}', '${o.status}')" class="btn ${isPaid?'btn-secondary':'btn-primary'}" style="padding:4px 10px; font-size:0.75rem;">
                        ${isPaid ? 'Mark Unpaid' : 'Mark Paid'}
                    </button>
                    <button onclick="deleteOrder('${o.id}')" class="btn-delete-order" title="Delete Order">🗑️</button>
                </div>
            </div>
        `;
        list.appendChild(div);
    });
}

// GENERIC USER INFO CARD
window.openUserInfo = function(userCode, userRole = 'buyer') {
    let user;
    // 1. Find the User Data
    if (userRole === 'vendor') {
        user = validVendors.find(v => v.code === userCode);
    } else {
        user = validBuyers.find(b => b.code === userCode);
    }

    const uName = user ? user.name : "Unknown User";
    const uAcc  = user ? user.account : "----";
    const uImg  = (user && user.img) ? user.img : DEFAULT_AVATAR;
    
    let joinedText = "Legacy Member"; 
    if (user && user.joinedAt) {
        const date = new Date(user.joinedAt);
        joinedText = date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }

    // 2. LOGIC: Action Buttons (Chat & Report)
    let actionButtons = '';
    
    // Only show buttons if logged in AND not looking at myself
    if(currentUser && currentUser.code !== userCode) {
        
        // A. CHAT BUTTON (Primary Action)
        // We close the modal ('userInfoModal') immediately so the Chat Window can take focus
        actionButtons += `
            <button onclick="closeModalById('userInfoModal'); openChat('${userCode}', '${uName}')" 
                style="width:100%; background:#2563EB; color:white; border:none; padding:12px; border-radius:12px; font-weight:700; margin-top:20px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 4px 6px rgba(37,99,235,0.2);">
                💬 Send Message
            </button>
        `;

        // B. REPORT BUTTON (Secondary Action - Only if not Admin)
        if(currentUser.role !== 'admin') {
            actionButtons += `
                <button class="btn-report-user" onclick="openReportModal('${userCode}', '${uName}')" style="margin-top:10px;">
                    🚩 Report User
                </button>
            `;
        }
    }

    const container = document.getElementById('userCardContainer');
    
    // 3. RENDER CARD
    container.innerHTML = `
        <div class="profile-card-wrapper">
            <div class="pc-header"></div>
            <div class="pc-avatar-container">
                <img src="${uImg}" class="pc-avatar" onclick="openLightbox('${uImg}')">
            </div>
            <div class="pc-body">
                <div class="pc-name">${uName}</div>
                <div class="pc-role-badge">${userRole} • ${uAcc}</div>

                <div class="pc-info-grid">
                    <div class="pc-row">
                        <span class="pc-label">Status</span>
                        <span class="pc-value" style="color:${(user && user.isMuted) ? '#ef4444' : '#10b981'}">
                            ${(user && user.isMuted) ? 'Restricted' : 'Active'}
                        </span>
                    </div>
                    <div class="member-since-row">
                        <span>📅 Member since:</span>
                        <strong style="color:#52525b;">${joinedText}</strong>
                    </div>
                </div>
                
                ${actionButtons}
            </div>
        </div>
    `;

    openModal('userInfoModal');
}

window.toggleOrderStatus = async function(oid, currentStatus) {
    const newStatus = currentStatus === 'Paid' ? 'Unpaid' : 'Paid';
    await updateDoc(doc(db, "orders", oid), { status: newStatus });
}

window.deleteOrder = function(orderId) {
    showConfirm("Delete this order record permanently?", async () => {
        try {
            await deleteDoc(doc(db, "orders", orderId));
            showToast("Order Deleted");
        } catch(e) {
            console.error(e);
            showToast("Error deleting order", "error");
        }
    });
}

// --- BULK TOGGLE & SYSTEM ---
window.toggleAllCards = function(containerId, shouldCollapse) {
    const container = document.getElementById(containerId);
    if(!container) return;
    const cards = container.querySelectorAll('.vendor-card');
    cards.forEach(card => {
        if(shouldCollapse) {
            card.classList.add('collapsed');
        } else {
            card.classList.remove('collapsed');
        }
    });
}

window.finishDay = function() {
 showConfirm("<b>End Shift?</b><br><span style='font-size:0.9rem; opacity:0.8;'>This will hide all items and log you out.</span>", async () => {        if (!currentUser) return;
        const myActiveItems = products.filter(p => p.vendor === currentUser.code && p.active === true);

        if (myActiveItems.length > 0) {
            showToast(`Closing shop... (${myActiveItems.length} items)`, "info");
            try {
                const updatePromises = myActiveItems.map(p => 
                    updateDoc(doc(db, "products", p.id), { active: false })
                );
                await Promise.all(updatePromises);
            } catch (e) {
                console.error(e);
                showToast("Error closing shop", "error");
                return;
            }
        }
        showToast("Shift Ended. Good job! 🌙");
        setTimeout(() => { logout(); }, 1500);
    });
}
setInterval(() => { 
    document.getElementById('clock').innerText = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); 
}, 1000);

// --- INPUT SANITIZER (PREVENTS SPECIAL CHARS) ---
window.sanitizeInput = function(input) {
    // 1. Regex Explanation:
    // ^ = NOT
    // a-z, A-Z = Letters
    // 0-9 = Numbers
    // \s = Spaces
    // \- = Hyphens (for names like Mary-Ann)
    // _ = Underscores
    
    // 2. Logic: If the char is NOT one of those, replace it with nothing.
    const cleanValue = input.value.replace(/[^a-zA-Z0-9\s\-_]/g, '');
    
    // 3. Update the input only if it changed (prevents cursor jumping)
    if (input.value !== cleanValue) {
        input.value = cleanValue;
        
        // Optional: Warn the user (uncomment if you want a toast popup)
        // showToast("Special characters not allowed", "error");
    }
}

window.viewUserHistory = function(user, role) {
    const modal = document.getElementById('userHistoryModal');
    const content = document.getElementById('histModalContent');
    const totalEl = document.getElementById('histModalTotal');
    
    document.getElementById('histModalName').innerText = user.name;
    document.getElementById('histModalRole').innerText = `${role} • ${user.account}`;

    content.innerHTML = '';
    
    // Filter Orders
    // If role is vendor, find orders where vendorCode matches
    // If role is buyer, find orders where buyerCode matches (comparing Codes, not IDs)
    const userOrders = orders.filter(o => {
        if (role === 'vendor') return o.vendorCode === user.code;
        return o.buyerCode === user.code;
    }).sort((a,b) => b.timestamp.localeCompare(a.timestamp)); // Newest first

    if(userOrders.length === 0) {
        content.innerHTML = '<div style="text-align:center; padding:30px; color:#aaa;">No history found.</div>';
        totalEl.innerText = '₱0';
        openModal('userHistoryModal');
        return;
    }

    let grandTotal = 0;

    userOrders.forEach(o => {
        const isPaid = o.status === 'Paid';
        const dateStr = new Date(o.timestamp).toLocaleString(undefined, { 
    month: 'short', 
    day: 'numeric', 
    hour: 'numeric', 
    minute: '2-digit' 
});
        // If viewing as Vendor, show who Bought it. If Buyer, show who sold it.
        const counterparty = role === 'vendor' ? `Buyer: ${o.buyer.name}` : `Shop: ${validVendors.find(v=>v.code===o.vendorCode)?.name || o.vendorCode}`;
        
        const itemsStr = o.items.map(i => `${i.qty}x ${i.name}`).join(', ');
        
        if(isPaid) grandTotal += o.total; // Only sum paid? Or all? Usually Sales Volume includes all. 
        // Let's sum ALL for volume, or just Paid. Let's do ALL for now.
        // grandTotal += o.total; 
        
        // Actually, for history, usually we track realized sales (Paid). 
        if(role === 'vendor' && isPaid) grandTotal += o.total;
        if(role === 'buyer' && !isPaid) grandTotal += o.total; // For buyers, show "Debt"? Or Total Spent?
        // Let's stick to simple "Total Value" of all orders listed
        // grandTotal += o.total;

        const div = document.createElement('div');
        div.className = 'hist-item';
        div.innerHTML = `
            <div style="flex:1;">
                <div class="hist-date">${dateStr} • ${counterparty}</div>
                <div class="hist-items">${itemsStr}</div>
            </div>
            <div style="text-align:right;">
                <div class="hist-price">₱${o.total}</div>
                <span class="hist-status" style="background:${isPaid ? '#dcfce7' : '#fee2e2'}; color:${isPaid ? '#166534' : '#991b1b'};">
                    ${o.status}
                </span>
            </div>
        `;
        content.appendChild(div);
    });

    // Calculate Total based on the list
    const totalVal = userOrders.reduce((sum, o) => sum + o.total, 0);
    totalEl.innerText = `₱${totalVal.toLocaleString()}`;

    openModal('userHistoryModal');
}
window.openHistoryById = function(id, role) {
    let user;
    if(role === 'vendor') {
        user = validVendors.find(v => v.id === id);
    } else {
        user = validBuyers.find(b => b.id === id);
    }
    
    if(user) {
        viewUserHistory(user, role);
    } else {
        showToast("User data not found", "error");
    }
}
// --- REPORTING SYSTEM ---

window.openReportModal = function(targetCode, targetName) {
    // Close the profile card first so they don't overlap
    closeModalById('userInfoModal');
    
    document.getElementById('reportTargetCode').value = targetCode;
    document.getElementById('reportTargetName').value = targetName;
    document.getElementById('reportReason').value = '';
    document.getElementById('reportImg').value = '';
    
    // Reset Image Preview
    document.getElementById('reportImgPreview').src = '';
    document.getElementById('reportImgPreview').classList.remove('show');
    document.getElementById('reportImgPlaceholder').style.display = 'block';
    
    openModal('reportModal');
}

window.previewReportImg = function(input) {
    if(input.files && input.files[0]) {
        const r = new FileReader();
        r.onload = (e) => {
            const img = document.getElementById('reportImgPreview');
            img.src = e.target.result;
            img.classList.add('show');
            document.getElementById('reportImgPlaceholder').style.display = 'none';
        };
        r.readAsDataURL(input.files[0]);
    }
}

window.submitReport = async function() {
    const targetCode = document.getElementById('reportTargetCode').value;
    const targetName = document.getElementById('reportTargetName').value;
    const reason = document.getElementById('reportReason').value.trim();
    
    // Image Logic
    const fileInput = document.getElementById('reportImg');
    let proofImg = null;
    
    if(!reason) return showToast("Please provide a reason", "error");

    const proceed = async (imgData) => {
        try {
            await addDoc(collection(db, "reports"), {
                reporter: currentUser.name,
                reporterCode: currentUser.code,
                target: targetName,
                targetCode: targetCode,
                reason: reason,
                proof: imgData || null,
                timestamp: new Date().toISOString(),
                status: 'Open'
            });
            
            closeModalById('reportModal');
            showToast("Report Sent to Admin. Thank you.");
        } catch(e) {
            console.error(e);
            showToast("Error sending report", "error");
        }
    };

    if(fileInput.files && fileInput.files[0]) {
        const r = new FileReader();
        r.onload = (e) => proceed(e.target.result);
        r.readAsDataURL(fileInput.files[0]);
    } else {
        proceed(null);
    }
}
