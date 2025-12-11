import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot 
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
// ... under firebaseConfig ...

// FACEBOOK STYLE DEFAULT AVATAR (SVG Base64)
const DEFAULT_AVATAR = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRTRFNEU3Ii8+PHBhdGggZD0iTTI0IDIwLjk5M1YyNEgwdi0yLjk5NkExNC45NzcgMTQuOTc3IDAgMDExMi4wMDQgMTVjNC45MDQgMCA5LjI2IDIuMzU0IDExLjk5NiA1Ljk5M3pNMTYuMDAyIDguOTk5YTQgNCAwIDExLTggMCA0IDQgMCAwMTggMHoiIGZpbGw9IiNBMUExQUEiLz48L3N2Zz4=";
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// GLOBAL STATE
let currentUser = null; 
let cart = {}; 
let validVendors = [];
let validBuyers = [];
let products = [];
let orders = [];
let historyMode = 'sales';

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
window.openLightbox = function(src) {
    if(!src) return;
    const box = document.getElementById('lightbox');
    document.getElementById('lightbox-img').src = src;
    box.classList.add('open');
}
window.closeLightbox = function() {
    document.getElementById('lightbox').classList.remove('open');
}

// --- LISTENERS ---
onSnapshot(collection(db, "vendors"), (snapshot) => {
    validVendors = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, role: 'vendor' }));
    
    // FIX: Re-render the buyer grids immediately when vendor data (images/names) loads
    renderBuyerCards(document.getElementById('buyerTodayGrid'), false);
    renderBuyerCards(document.getElementById('buyerPreOrderGrid'), true);
    
    // Also update Admin panel if open
    if(currentUser && currentUser.role === 'admin') renderAdminPanel();
});

onSnapshot(collection(db, "buyers"), (snapshot) => {
    validBuyers = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, role: 'buyer' }));
});

onSnapshot(collection(db, "products"), (snapshot) => {
    products = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    
    // 1. Always render Buyer Views
    renderBuyerCards(document.getElementById('buyerTodayGrid'), false);
    renderBuyerCards(document.getElementById('buyerPreOrderGrid'), true);
    
    // 2. If Vendor is logged in, Update Admin View AND the new Split Previews
    if(currentUser && currentUser.role === 'vendor') {
        renderAdminProducts();
        
        // --- FIX: UPDATE BOTH PREVIEWS ---
        renderBuyerCards(document.getElementById('vendorPreviewToday'), false, true, currentUser.code); 
        renderBuyerCards(document.getElementById('vendorPreviewPreOrder'), true, true, currentUser.code); 
    }
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

// NEW FUNCTION: CHECK FOR ALERTS
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
    const badge = document.getElementById('floatingBadge'); // Targeted ID
    const bell = document.getElementById('vendorFloatBell'); // Targeted ID
    
    // UPDATE BADGE
    if(count > 0) {
        badge.innerText = count;
        badge.classList.remove('hidden');
        // Optional: Shake the bell if new order
        if(count > previousPendingCount) {
             bell.style.animation = "shake-tiny 0.5s ease";
             setTimeout(()=> bell.style.animation = "", 500);
        }
    } else {
        badge.classList.add('hidden');
    }

    // PLAY SOUND
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
// NEW FUNCTION: SCROLL TO ORDER PANEL
window.scrollToOrders = function() {
    // If we are in vendor view, scroll to the order list
    const orderPanel = document.getElementById('orderList');
    if(orderPanel) {
        // Smooth scroll
        orderPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Visual cue (Flash background)
        const parent = orderPanel.closest('.panel');
        if(parent) {
            parent.style.transition = "box-shadow 0.3s ease, border-color 0.3s";
            parent.style.boxShadow = "0 0 0 4px rgba(239, 68, 68, 0.2)"; // Red glow
            parent.style.borderColor = "#ef4444";
            setTimeout(() => {
                parent.style.boxShadow = "none";
                parent.style.borderColor = ""; // Reset
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

let pendingConfirmAction = null;
window.showConfirm = function(msg, action) {
    document.getElementById('confirmMsg').innerText = msg;
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
    const code = document.getElementById('codeJson').value.trim();
    if(code === "RESET") { location.reload(); return; }

    // --- NEW: ADMIN CHECK ---
    if(code === "SOS-ADMIN") { 
        // Hardcoded admin login for simplicity
        currentUser = { role: 'admin', name: 'Super Admin', account: 'System' };
        loginAdmin();
        return;
    }

    let user = validVendors.find(v => v.code === code) || validBuyers.find(b => b.code === code);
    
    if(user) {
        // --- NEW: CHECK IF VENDOR IS MUTED ---
        if(user.isMuted) {
            showToast("Account Suspended by Admin", "error");
            return;
        }
        loginUser(user);
    } else {
        showToast("Invalid Access Code", "error");
    }
}
function loginAdmin() {
    document.getElementById('codeJson').value = '';
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('userControls').classList.remove('hidden');
    document.getElementById('displayUserName').innerText = "Administrator";
    document.getElementById('displayUserAcc').innerText = "Super User";
    
    // Show Admin View
    document.getElementById('buyerView').classList.add('hidden');
    document.getElementById('vendorView').classList.add('hidden');
    document.getElementById('adminView').classList.remove('hidden');
    
    renderAdminPanel();
}

window.renderAdminPanel = function() {
    const container = document.getElementById('adminVendorList');
    container.innerHTML = '';
    
    if(validVendors.length === 0) {
        container.innerHTML = '<div style="color:#999">No vendors registered.</div>';
        return;
    }

    validVendors.forEach(v => {
        const isMuted = v.isMuted || false;
        
        const card = document.createElement('div');
        card.className = 'vendor-card';
        card.style.padding = '20px';
        
        // --- CHANGE HERE: Use DEFAULT_AVATAR instead of placeholder ---
        const img = v.img || DEFAULT_AVATAR; 
        
        card.innerHTML = `
            <div style="display:flex; gap:15px; align-items:center; margin-bottom:15px;">
                <img src="${img}" style="width:50px; height:50px; border-radius:50%; object-fit:cover; border:1px solid #eee;">
                <div>
                    <div style="font-weight:700; font-size:1rem;">${v.name}</div>
                    <div style="font-size:0.8rem; color:#777;">Code: ${v.code}</div>
                </div>
                ${isMuted ? '<span style="margin-left:auto; background:#fee2e2; color:#991b1b; padding:4px 8px; border-radius:6px; font-size:0.7rem; font-weight:bold;">SUSPENDED</span>' : ''}
            </div>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                <button onclick="toggleVendorMute('${v.id}', ${isMuted})" class="btn" style="background:${isMuted ? '#dcfce7' : '#f3f4f6'}; color:${isMuted ? '#166534' : 'black'}; border:1px solid #ddd;">
                    ${isMuted ? '✅ Unmute' : '🚫 Mute'}
                </button>
                <button onclick="deleteVendor('${v.id}', '${v.name}')" class="btn" style="background:#fee2e2; color:#991b1b; border:1px solid #fecaca;">
                    🗑️ Delete
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}
window.toggleVendorMute = async function(id, currentStatus) {
    try {
        await updateDoc(doc(db, "vendors", id), { isMuted: !currentStatus });
        showToast(currentStatus ? "Vendor Activated" : "Vendor Muted");
        // The onSnapshot listener will auto-update the UI
        if(currentUser.role === 'admin') setTimeout(renderAdminPanel, 200); 
    } catch(e) {
        showToast("Error updating status", "error");
    }
}

window.deleteVendor = function(id, name) {
    // Uses your existing confirmation modal
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

function loginUser(user) {
    currentUser = user;
    previousPendingCount = 0;
    document.getElementById('codeJson').value = '';
    
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('userControls').classList.remove('hidden');
    document.getElementById('displayUserName').innerText = user.name;
    document.getElementById('displayUserAcc').innerText = user.account;
    
    const displayCode = user.role === 'admin' ? 'ADMIN' : user.code;
    document.getElementById('displayUserCode').innerText = displayCode;
    const profileImg = document.getElementById('sidebarProfileImg');
    profileImg.src = user.img ? user.img : DEFAULT_AVATAR;

    if(user.role === 'vendor') {
        document.getElementById('vendorSpecificButtons').classList.remove('hidden');
        document.getElementById('vendorView').classList.remove('hidden');
        document.getElementById('buyerView').classList.add('hidden');
        document.getElementById('vendorFloatBell').classList.remove('hidden');
        checkNewOrders(); // Run immediate check
        
        renderAdminProducts();
        renderVendorOrders();
        
        // --- FIX: RENDER BOTH PREVIEWS HERE ---
        // 1. Render Today
        renderBuyerCards(document.getElementById('vendorPreviewToday'), false, true, currentUser.code);
        // 2. Render Pre-Orders
        renderBuyerCards(document.getElementById('vendorPreviewPreOrder'), true, true, currentUser.code);
        
    } else {
        document.getElementById('vendorSpecificButtons').classList.add('hidden');
        document.getElementById('vendorView').classList.add('hidden');
        document.getElementById('buyerView').classList.remove('hidden');
        document.getElementById('vendorFloatBell').classList.add('hidden');

    }
}

window.logout = function() {
    currentUser = null;
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('userControls').classList.add('hidden');
    
    // Hide specialized views
    document.getElementById('vendorView').classList.add('hidden');
    document.getElementById('adminView').classList.add('hidden'); // <--- ADDED THIS LINE
    document.getElementById('vendorFloatBell').classList.add('hidden');

    
    // Show default public view (Buyer View)
    document.getElementById('buyerView').classList.remove('hidden');
    
    closeSlidePanel();
}
window.copyAccessCode = function() {
    const code = document.getElementById('displayUserCode').innerText;
    if(code && code !== '----') {
        navigator.clipboard.writeText(code).then(() => {
            showToast(`Code ${code} Copied!`);
        });
    }
}
window.uploadProfilePic = function(input) {
    if(input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = async function(e) {
            const base64 = e.target.result;
            if(base64.length > 1000000) { showToast("Image too large", "error"); return; }
            document.getElementById('sidebarProfileImg').src = base64;
            const collectionName = currentUser.role === 'vendor' ? 'vendors' : 'buyers';
            await updateDoc(doc(db, collectionName, currentUser.id), { img: base64 });
            currentUser.img = base64;
            showToast("Profile Updated");
        };
        reader.readAsDataURL(input.files[0]);
    }
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
    
    if(!nameInput || !account) return showToast("Fill all fields", "error");

    const existingUsers = role === 'vendor' ? validVendors : validBuyers;
    const nameExists = existingUsers.some(user => user.name.toLowerCase() === nameInput.toLowerCase());

    if (nameExists) return showToast("Name taken! Use another.", "error");

    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    const collectionName = role === 'vendor' ? 'vendors' : 'buyers';
    
    try {
        await addDoc(collection(db, collectionName), { 
            code, name: nameInput, account, img: null 
        });
        closeRegisterModal();
        document.getElementById('codeJson').value = code;
        showToast(`Registered! Code: ${code}`);
    } catch(e) { 
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
        
        // HIDE IMAGE IF NONE
        const imgHTML = (p.media && p.media.length > 50) 
            ? `<img src="${p.media}" class="item-img" onclick="event.stopPropagation(); openLightbox('${p.media}')">`
            : ''; 

        // Display "Unl." if stock is null
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
    document.getElementById('mStock').value = ''; // Reset Stock (Blank = Unlimited)
    document.getElementById('mNote').value = ''; 
    document.getElementById('mPreview').classList.remove('show');
    document.getElementById('uploadPlaceholder').style.display = 'block';
    document.getElementById('modalTitle').innerText = 'Add Item';
    document.getElementById('mFile').value = ''; 
    openModal('productModal');
}

window.openEditModal = function(id) {
    const p = products.find(x => x.id === id);
    if(!p) return;
    document.getElementById('mId').value = p.id;
    document.getElementById('mName').value = p.name;
    document.getElementById('mPrice').value = p.price;
    // If null/undefined, set to empty string for "Unlimited"
    document.getElementById('mStock').value = (p.stock === null || p.stock === undefined) ? '' : p.stock;
    document.getElementById('mVariants').value = (p.variants || []).join(', ');
    document.getElementById('mNote').value = p.note || ''; 
    
    // Check if media is valid image
    const hasImg = (p.media && p.media.length > 50);
    document.getElementById('mPreview').src = hasImg ? p.media : '';
    if(hasImg) {
        document.getElementById('mPreview').classList.add('show');
        document.getElementById('uploadPlaceholder').style.display = 'none';
    } else {
        document.getElementById('mPreview').classList.remove('show');
        document.getElementById('uploadPlaceholder').style.display = 'block';
    }
    
    document.getElementById('modalTitle').innerText = 'Edit Item';
    document.getElementById('mFile').value = '';
    openModal('productModal');
}

window.openHelpModal = function() {
    const content = document.getElementById('helpContent');
    const title = document.getElementById('helpTitle');

    if (!currentUser) return;

    if (currentUser.role === 'admin') {
        // --- SUPER ADMIN GUIDE ---
        title.innerText = "👑 Super Admin Guide";
        content.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:15px;">
                <div style="background:#f0f9ff; padding:10px; border-radius:8px; border:1px solid #bae6fd;">
                    <strong style="color:#0369a1;">1. Vendor Management</strong>
                    <p style="margin:5px 0 0; font-size:0.85rem;">
                        You have a global view of all registered shops. You can see their images, names, and access codes.
                    </p>
                </div>
                
                <div>
                    <strong style="color:#b91c1c;">2. Muting (Suspension)</strong>
                    <p style="margin:5px 0 0; font-size:0.85rem;">
                        Clicking <span style="background:#dcfce7; color:#166534; padding:2px 6px; border-radius:4px; font-size:0.75rem; border:1px solid #ddd;">🚫 Mute</span> 
                        immediately <b>hides</b> the shop from the Buyer's marketplace.
                        <br><br>
                        <i>Use this for:</i> Policy violations, unpaid fees, or temporary suspensions. The data is preserved, and you can Unmute them anytime.
                    </p>
                </div>

                <div>
                    <strong style="color:#b91c1c;">3. Deletion</strong>
                    <p style="margin:5px 0 0; font-size:0.85rem;">
                        Clicking <span style="background:#fee2e2; color:#991b1b; padding:2px 6px; border-radius:4px; font-size:0.75rem; border:1px solid #fecaca;">🗑️ Delete</span> 
                        permanently removes the user. <span style="text-decoration:underline;">This cannot be undone.</span>
                    </p>
                </div>
            </div>
        `;
     } else if (currentUser.role === 'vendor') {
        // --- VENDOR GUIDE ---
        title.innerText = "🏪 Merchant Guide";
        content.innerHTML = `
            <ul style="padding-left:15px; margin:0 0 15px 0; display:flex; flex-direction:column; gap:8px;">
                <li><b>Adding Items:</b> Click <i>+ Add Item</i>. Leave stock blank if not selling per piece.</li>
                <li><b>Variants:</b> To add options (e.g., <i>Spicy, Regular</i>), type them in the Variants box separated by commas.</li>
                <li><b>Pre-Order vs Standard:</b> Toggle the button on the item card. Pre-orders appear in the "Tomorrow" list.</li>
                <li><b>Orders:</b> Mark orders as "Paid" when payment received.<br><span><i>*Also clears notification(s)</i></span></li>
                <li><b>End Shift:</b> Clears your local view (data is saved in History).</li>
            </ul>

            <!-- DESIGNED BOTTOM SECTION (Blue Theme) -->
            <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px; text-align: center; color: #1e40af;">
                <div style="font-size: 0.85rem; font-style: italic; margin-bottom: 10px; opacity: 0.9;">
                    * Orders cannot be cancelled once placed.
                </div>
                
                <div style="border-top: 1px dashed #93c5fd; padding-top: 10px;">
                    <strong style="font-size: 1rem; display: block; margin-bottom: 4px; color: #1e3a8a;">ℹ️ ADMIN SUPPORT</strong>
                    <span style="font-size: 0.85rem; color: #1e3a8a;">
                        For questions, coordinate with admin via <span style="text-decoration: underline;">Synology Chat</span>.
                    </span>
                </div>
            </div>
        `;
    }  else {
        // --- BUYER GUIDE ---
        title.innerText = "🛒 Buyer Guide";
        content.innerHTML = `
            <ul style="padding-left:15px; margin:0 0 15px 0; display:flex; flex-direction:column; gap:8px;">
                <li><b>Ordering:</b> Click (+) to add items to your cart.</li>
                <li><b>Payments:</b> Select "Cash" or "Payday" before submitting.</li>
                <li><b>Today vs Pre-Order:</b> "Today" items are available now. "Pre-Order" items are for the next shift.</li>
                <li><b>History:</b> Check the slide-out menu to see your past purchases.</li>          
            </ul>

            <!-- DESIGNED BOTTOM SECTION -->
            <div style="background-color: #fff1f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; text-align: center; color: #881337;">
                <div style="font-size: 0.85rem; font-style: italic; margin-bottom: 10px; opacity: 0.9;">
                    * Orders cannot be cancelled once placed.
                </div>
                
                <div style="border-top: 1px dashed #fca5a5; padding-top: 10px;">
                    <strong style="font-size: 1rem; display: block; margin-bottom: 4px; color: #991b1b;">⚠️ PAY ON TIME</strong>
                    <span style="font-size: 0.85rem; color: #7f1d1d;">
                        For questions, coordinate with admin via <span style="text-decoration: underline;">Synology Chat</span>.
                    </span>
                </div>
            </div>
        `;
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
        // Clear URL input so logic knows to use file
        document.getElementById('mUrl').value = ''; 
    } else {
        divFile.classList.add('hidden');
        divUrl.classList.remove('hidden');
        btnLn.style.background = '#3b82f6'; btnLn.style.color = 'white';
        btnUp.style.background = '#f3f4f6'; btnUp.style.color = '#555';
        // Clear File input so logic knows to use URL
        document.getElementById('mFile').value = '';
    }
}

window.commitProduct = function() {
    const id = document.getElementById('mId').value;
    const name = document.getElementById('mName').value.trim();
    const price = document.getElementById('mPrice').value;
    const stockVal = document.getElementById('mStock').value; 
    const note = document.getElementById('mNote').value.trim();
    const variantsStr = document.getElementById('mVariants').value;
    const variants = variantsStr ? variantsStr.split(',').map(s => s.trim()).filter(s => s) : [];

    // CHECK BOTH INPUTS
    const fileInput = document.getElementById('mFile');
    const urlInput = document.getElementById('mUrl').value.trim();

    if(!name || !price) return showToast("Name & Price required", "error");
    const stock = stockVal === '' ? null : parseInt(stockVal);

    const save = async (imgData) => {
        try {
            const data = { 
                vendor: currentUser.code, vendorName: currentUser.name, 
                name, 
                price: parseInt(price),
                stock: stock, 
                note: note, 
                variants: variants,
                media: imgData || null, 
                isPreOrder: false, 
                active: true 
            };
            
            if(id) { 
                delete data.vendor; delete data.vendorName; delete data.active; delete data.isPreOrder;
                const updateData = { name, price: parseInt(price), stock: stock, note: note, variants: variants };
                if(imgData) updateData.media = imgData;
                await updateDoc(doc(db,"products",id), updateData);
                showToast("Item Updated");
            } else { 
                await addDoc(collection(db,"products"), data); 
                showToast("Item Added");
            }
            window.closeModal();
        } catch(err) {
            console.error(err);
            showToast("Error saving", "error");
        }
    };

    // LOGIC: IF FILE SELECTED -> USE FILE. IF URL ENTERED -> USE URL.
    if(fileInput.files && fileInput.files[0]) { 
        // SAFETY CHECK FOR FILES
        if(fileInput.files[0].size > 700000) {
            return showToast("File too big! Use 'Paste Link' tab.", "error");
        }
        const r = new FileReader(); 
        r.onload = (e) => save(e.target.result); 
        r.readAsDataURL(fileInput.files[0]); 
    } else if (urlInput) {
        // USE THE GIF URL DIRECTLY
        save(urlInput);
    } else {
        save(null); 
    }
}
// --- BUYER & CARD RENDERING ---
function renderBuyerCards(container, showPreOrders, isCompact = false, excludeVendor = null) {
    if(!container) return;
    container.innerHTML = '';
    const vendors = {};
    
    products.forEach(p => {
    if(!p.active) return;
    if(p.isPreOrder !== showPreOrders) return;
    if(excludeVendor && p.vendor === excludeVendor) return; 

    if(!vendors[p.vendor]) {
        const vObj = validVendors.find(v => v.code === p.vendor);
        
        // --- MODIFIED CHECK ---
        // If vendor doesn't exist OR IS MUTED, skip their products
        if(!vObj || vObj.isMuted) return; 

        vendors[p.vendor] = { 
            name: vObj.name, 
            account: vObj.account, 
            img: vObj.img,
            items: [], 
            code: p.vendor 
        };
    }
        if(vendors[p.vendor]) vendors[p.vendor].items.push(p);
    });

    const vendorKeys = Object.keys(vendors);
    if(vendorKeys.length === 0) {
        container.innerHTML = '<div style="color:#999; font-size:0.8rem; padding:10px;">No active shops.</div>';
        return;
    }

    vendorKeys.forEach(code => {
        const v = vendors[code];
        const card = document.createElement('div');
        card.className = 'vendor-card collapsed'; 
        if(isCompact) card.style.border = "1px solid #e4e4e7";

        let itemsHtml = v.items.map(i => {
    const itemImgHTML = (i.media && i.media.length > 50) 
        ? `<img src="${i.media}" class="product-img" onclick="openLightbox('${i.media}')">`
        : '';
    
    const isUnlimited = (i.stock === null || i.stock === undefined);
    const variants = i.variants || [];
    
    // --- LOGIC: Calculate Total Stock Used for this Parent Item ---
    // We sum up all variants of this item currently in cart to check against limit
    let totalInCartForThisItem = 0;
    Object.keys(cart).forEach(key => {
        if(key.startsWith(i.id)) totalInCartForThisItem += cart[key];
    });

    // --- HTML GENERATOR ---
    let controlsHTML = '';

    if (variants.length > 0) {
        // RENDER VARIANT ROWS
        controlsHTML = `<div class="variant-list">`;
        variants.forEach(variant => {
            const compositeKey = `${i.id}::${variant}`;
            const qty = cart[compositeKey] || 0;
            const isOOS = !isUnlimited && (totalInCartForThisItem >= i.stock);
            
            // Allow clicking plus if we haven't hit limit OR if we are just adding to existing count (logic handled in changeQty)
            // Actually, simplified: Disable + if total >= stock
            
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
                </div>
            `;
        });
        controlsHTML += `</div>`;
    } else {
        // STANDARD RENDER (No Variants)
        const qty = cart[i.id] || 0;
        const isOOS = !isUnlimited && (totalInCartForThisItem >= i.stock);
        controlsHTML = `
            <div class="qty-controls">
                <button class="qty-btn" onclick="changeQty('${i.id}',-1,${i.price},'${v.code}')">-</button>
                <span class="qty-val" id="qty-${i.id}">${qty}</span>
                <button class="qty-btn" id="btn-plus-${i.id}" ${isOOS ? 'disabled style="opacity:0.3"' : ''} onclick="changeQty('${i.id}',1,${i.price},'${v.code}')">+</button>
            </div>
        `;
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
    </div>
`}).join('');

        // VENDOR IMAGE HIDING LOGIC
        const hasCustomImg = (v.img && v.img.length > 50);
const imgSrc = hasCustomImg ? v.img : DEFAULT_AVATAR;

// 2. Add onclick ONLY if custom. CRITICAL: event.stopPropagation() prevents the card from closing.
const clickAction = hasCustomImg 
    ? `onclick="event.stopPropagation(); openLightbox('${imgSrc}')"` 
    : ''; // Don't lightbox the default grey avatar

// 3. Build the HTML
const vendorImgHTML = `<img src="${imgSrc}" class="vendor-header-img" ${clickAction} style="${hasCustomImg ? 'cursor:pointer;' : ''}">`;

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
                    <button class="pay-btn" onclick="togglePayment(this)">Cash</button>
                    <button class="pay-btn" onclick="togglePayment(this)">Payday</button>
                </div>
                <button class="submit-btn" onclick="submitOrder('${v.code}', this, ${showPreOrders})">Submit Order</button>
            </div>
        `;
        container.appendChild(card);
    });
}

window.toggleCard = function(header) {
    header.parentElement.classList.toggle('collapsed');
}

window.changeQty = function(id, chg, price, vendorCode, variant = null) {
    // Construct Key: if variant exists, use "id::variant", else just "id"
    const cartKey = variant ? `${id}::${variant}` : id;

    if (!cart[cartKey]) cart[cartKey] = 0;

    // --- SHARED STOCK CHECK ---
    // We must find the Base Product to check the Total Stock
    const product = products.find(x => x.id === id);
    
    if (product && chg > 0) {
        const isUnlimited = (product.stock === null || product.stock === undefined);
        if (!isUnlimited) {
            // Count total items in cart that belong to this product ID
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

    // Update DOM
    // Note: We use querySelectorAll because IDs must be escaped if they contain "::" but 
    // simply using getElementById usually fails with colons unless escaped. 
    // Simplest way is to match the ID string directly.
    const qtySpan = document.getElementById(`qty-${cartKey}`);
    if(qtySpan) qtySpan.innerText = cart[cartKey];

    // Update Vendor Total
    const vItems = products.filter(x => x.vendor === vendorCode);
    let tot = 0;
    
    // Calculate total based on ALL cart keys that belong to this vendor's products
    Object.keys(cart).forEach(key => {
        const pId = key.split('::')[0]; // Extract ID part
        const prod = vItems.find(p => p.id === pId);
        if(prod) {
            tot += (prod.price * cart[key]);
        }
    });
    
    document.querySelectorAll(`#total-${vendorCode}`).forEach(el => el.innerText = `₱${tot.toLocaleString()}`);
}

window.togglePayment = function(btn) {
    if(btn.classList.contains('selected')) {
        btn.classList.remove('selected');
    } else {
        btn.parentElement.querySelectorAll('.pay-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
    }
}

window.submitOrder = async function(vCode, btn, isPreOrder) {
    if(!currentUser) return showToast("Please Login first", "error");

    const vItems = products.filter(p => p.vendor === vCode);
    const purchased = [];
    let total = 0;
    
    // New Logic: Iterate keys in Cart that match this vendor
    const relevantKeys = Object.keys(cart).filter(k => {
        const pId = k.split('::')[0];
        return vItems.some(v => v.id === pId) && cart[k] > 0;
    });

    if(relevantKeys.length === 0) return showToast("Cart is empty", "error");

    // STOCK VALIDATION LOOP
    // We group by Product ID to ensure shared stock isn't exceeded
    const usageMap = {}; // { pid: totalQty }
    
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

    // BUILD PURCHASE ARRAY
    for(let key of relevantKeys) {
        const [pId, variant] = key.split('::');
        const product = products.find(p => p.id === pId);
        const qty = cart[key];
        
        // Format Name: "Adobo" or "Adobo (Spicy)"
        const finalName = variant ? `${product.name} (${variant})` : product.name;
        
        purchased.push({ 
            name: finalName, 
            qty: qty, 
            price: product.price, 
            id: pId, // We track parent ID for stock subtraction
            originalStock: product.stock 
        });
        
        total += (product.price * qty);
    }

    const selectedBtn = btn.parentElement.querySelector('.pay-btn.selected');
    if(!selectedBtn) return showToast("Select Payment Option", "error");
    const method = selectedBtn.innerText;

    try {
        await addDoc(collection(db, "orders"), {
            vendorCode: vCode,
            buyerCode: currentUser.code,
            buyer: { name: currentUser.name, account: currentUser.account },
            items: purchased.map(x => ({ name: x.name, qty: x.qty, price: x.price })),
            total: total,
            method: method,
            status: "Unpaid",
            date: getShiftDate(isPreOrder),
            timestamp: new Date().toLocaleString(),
            type: isPreOrder ? "Pre-Order" : "Standard"
        });

        // SUBTRACT STOCK (Aggregated per parent product)
        // We use 'usageMap' calculated earlier
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

        // RESET CART
        relevantKeys.forEach(k => delete cart[k]);
        
        // Reset DOM totals
        document.querySelectorAll(`#total-${vCode}`).forEach(el => el.innerText = `₱0`);
        // We trigger a re-render or just let the user see the reset via UI
        renderBuyerCards(document.getElementById('buyerTodayGrid'), false);
        renderBuyerCards(document.getElementById('buyerPreOrderGrid'), true);
        
        showToast("Order Sent!");
    } catch(e) { console.error(e); showToast("Failed to send", "error"); }
}


// ... Rest of the file (history, etc) ...
window.openSlidePanel = function() {
    document.getElementById('slideOverlay').classList.add('open');
    document.getElementById('slidePanel').classList.add('open');
    
    if(currentUser.role === 'vendor') {
        document.getElementById('vendorHistoryToggle').classList.remove('hidden');
        historyMode = 'sales'; 
        updateHistoryToggleUI();
    } else {
        document.getElementById('vendorHistoryToggle').classList.add('hidden');
        historyMode = 'purchases';
    }
    populateDateFilters();
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
    
    // Clear current content
    tbody.innerHTML = '';
    
    const m = parseInt(document.getElementById('filterMonth').value);
    const y = parseInt(document.getElementById('filterYear').value);
    
    let relevantOrders = orders.filter(o => {
        const d = new Date(o.date);
        return d.getMonth() === m && d.getFullYear() === y;
    });

    // Animation Reset (unchanged)
    const totalBadge = document.getElementById('historyTotalBadge');
    totalBadge.classList.remove('total-pop'); 
    void totalBadge.offsetWidth; 
    totalBadge.classList.add('total-pop');

    if(historyMode === 'sales' && currentUser.role === 'vendor') {
        // ... (Keep existing Vendor Sales logic unchanged) ...
        thead.innerHTML = `<tr><th>Date/Buyer</th><th class="text-right">Amt</th></tr>`;
        relevantOrders = relevantOrders.filter(o => o.vendorCode === currentUser.code);
        let grand = 0;
        relevantOrders.forEach(o => {
            const isPaid = o.status === 'Paid';
            const itemsStr = o.items.map(i=>`${i.qty} ${i.name}`).join(', ');
            
            tbody.innerHTML += `<tr class="history-row">
                <td>
                    <div style="font-weight:600">${o.buyer.name}</div>
                    <div style="font-size:0.75rem; color:#777;">${itemsStr}</div>
                    <span class="status-badge ${isPaid ? 'bg-paid' : 'bg-unpaid'}">${o.status}</span>
                </td>
                <td class="text-right amount-cell">+₱${o.total}</td>
            </tr>`;
            grand += o.total;
        });
        totalBadge.innerText = `₱${grand.toLocaleString()}`;

    } else {
        // --- UPDATED BUYER PURCHASES LOGIC ---
        thead.innerHTML = `<tr><th>Shop/Items</th><th class="text-right">Total</th></tr>`;
        relevantOrders = relevantOrders.filter(o => o.buyerCode === currentUser.code);
        let grand = 0;
        relevantOrders.forEach(o => {
            const isPaid = o.status === 'Paid';
            if(!isPaid) grand += o.total; 
            
            const itemsStr = o.items.map(i=>`${i.qty} ${i.name}`).join(', ');
            const statusText = isPaid ? '' : '<div style="color:#ef4444; font-size:0.7rem; font-weight:700;">TO BE PAID</div>';
            
            // LOOKUP VENDOR NAME HERE
            const vendorObj = validVendors.find(v => v.code === o.vendorCode);
            const vendorDisplayName = vendorObj ? vendorObj.name : o.vendorCode; // Fallback to code if name not found

            tbody.innerHTML += `<tr class="history-row">
                <td>
                    <!-- Display Name instead of Code -->
                    <span style="font-weight:700;">${vendorDisplayName}</span>
                    <div style="font-size:0.85rem; color:#555;">${itemsStr}</div>
                    ${statusText}
                </td>
                <td class="text-right amount-cell">₱${o.total}</td>
            </tr>`;
        });
        totalBadge.innerText = `₱${grand.toLocaleString()}`;
    }
}

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
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; font-weight:700;">
                <span>${o.buyer.name}</span>
                <span>₱${o.total}</span>
            </div>
            <div style="font-size:0.85rem; color:#555; margin:5px 0;">${o.items.map(i=>`${i.qty}x ${i.name}`).join(', ')}</div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                <span style="font-size:0.75rem; background:#f4f4f5; padding:2px 6px; border-radius:4px;">${o.method}</span>
                <button onclick="toggleOrderStatus('${o.id}', '${o.status}')" class="btn ${isPaid?'btn-secondary':'btn-primary'}" style="padding:4px 10px; font-size:0.75rem;">
                    ${isPaid ? 'Mark Unpaid' : 'Mark Paid'}
                </button>
            </div>
        `;
        list.appendChild(div);
    });
}

window.toggleOrderStatus = async function(oid, currentStatus) {
    const newStatus = currentStatus === 'Paid' ? 'Unpaid' : 'Paid';
    await updateDoc(doc(db, "orders", oid), { status: newStatus });
}
// --- BULK TOGGLE SYSTEM ---
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

    // Optional: Show a small toast to confirm action
    // showToast(shouldCollapse ? "All Collapsed" : "All Expanded", "success");
}

window.finishDay = function() {
    showConfirm("End Shift? This will hide all items and log you out.", async () => {
        
        if (!currentUser) return;

        // 1. Identify items to turn off (My active items)
        const myActiveItems = products.filter(p => 
            p.vendor === currentUser.code && p.active === true
        );

        if (myActiveItems.length > 0) {
            showToast(`Closing shop... (${myActiveItems.length} items)`, "info");

            try {
                // 2. Batch update: Turn off all items in parallel
                const updatePromises = myActiveItems.map(p => 
                    updateDoc(doc(db, "products", p.id), { active: false })
                );
                
                // Wait for database to finish
                await Promise.all(updatePromises);
                
            } catch (e) {
                console.error(e);
                showToast("Error closing shop", "error");
                return; // Stop if error
            }
        }

        // 3. Success Feedback & Logout
        showToast("Shift Ended. Good job! 🌙");
        
        setTimeout(() => {
            logout();
        }, 1500); // Small delay so they see the success message
    });
}
setInterval(() => { 
    document.getElementById('clock').innerText = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); 
}, 1000);
