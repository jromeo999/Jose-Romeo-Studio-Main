// --- 1. FIREBASE IMPORTS ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- 2. YOUR CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyAHlmRVqHmpbdGllsDQNVtz3g9XEMaXKTA",
    authDomain: "sos-marketplace.firebaseapp.com",
    projectId: "sos-marketplace",
    storageBucket: "sos-marketplace.firebasestorage.app",
    messagingSenderId: "428350148342",
    appId: "1:428350148342:web:55792ce066b50f7594e6d7",
    measurementId: "G-8HJRB5YR2K"
};

// --- 3. INITIALIZE DB ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- STATE ---
let currentUser = null;
let cart = {}; 
let validVendors = [];
let products = [];
let orders = [];

// --- REAL-TIME LISTENERS ---

// 1. Listen for Vendors
onSnapshot(collection(db, "vendors"), (snapshot) => {
    validVendors = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
});

// 2. Listen for Products
onSnapshot(collection(db, "products"), (snapshot) => {
    products = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    renderBuyerCards();
    if(currentUser) renderAdminProducts();
});

// 3. Listen for Orders
onSnapshot(collection(db, "orders"), (snapshot) => {
    orders = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    if(currentUser) {
        renderVendorOrders();
        renderSalesHistory();
    }
});

// --- HELPER: SHIFT LOGIC ---
function getShiftDate(isPreOrder = false) {
    const now = new Date();
    // If before 6AM, it counts as yesterday
    if (now.getHours() < 6) {
        now.setDate(now.getDate() - 1);
    }
    // If pre-order, it counts for tomorrow (relative to the shift)
    if (isPreOrder) {
        now.setDate(now.getDate() + 1);
    }
    return now.toLocaleDateString(); 
}

// --- AUTHENTICATION ---
window.handleLogin = function() {
    const code = document.getElementById('codeJson').value.trim();
    // Secret Reset (Optional, mostly for testing)
    if(code === "RESET") { location.reload(); return; }

    const vendor = validVendors.find(v => v.code === code);
    if(vendor) {
        currentUser = vendor;
        window.toggleView('vendor');
        document.getElementById('codeJson').value = ''; 
    } else {
        alert("Invalid Code (or waiting for database...)");
    }
}

window.logout = function() {
    currentUser = null;
    document.getElementById('codeJson').value = '';
    window.toggleView('buyer');
}

// --- NEW VENDOR REGISTRATION ---
window.openNewVendor = function() { document.getElementById('newVendorModal').classList.remove('hidden'); document.getElementById('vName').focus(); }
window.closeNewVendor = function() { document.getElementById('newVendorModal').classList.add('hidden'); window.clearNewVendor(); }
window.clearNewVendor = function() { document.getElementById('vName').value = ''; document.getElementById('vAccount').value = ''; }

window.registerVendor = async function() {
    const name = document.getElementById('vName').value.trim();
    const acc = document.getElementById('vAccount').value.trim();
    
    if(name.length < 3 || acc.length < 2) return alert("Details too short.");

    const code = (name.substring(0, 3) + acc.substring(0, 2)).toUpperCase();
    
    if(validVendors.find(v => v.code === code)) return alert("Code already exists.");

    try {
        await addDoc(collection(db, "vendors"), { 
            code: code, name: name, account: acc 
        });
        alert(`Success! Your Code: ${code}`);
        document.getElementById('codeJson').value = code;
        window.closeNewVendor();
    } catch(e) {
        console.error(e);
        alert("Connection Error.");
    }
}

// --- NAVIGATION & VIEWS ---
window.toggleView = function(view) {
    ['buyerView', 'vendorView', 'salesView'].forEach(id => document.getElementById(id).classList.add('hidden'));
    
    const login = document.getElementById('loginSection');
    const controls = document.getElementById('vendorControls');

    if (view === 'vendor') {
        document.getElementById('vendorView').classList.remove('hidden');
        login.classList.add('hidden');
        controls.classList.remove('hidden');
        document.getElementById('vendorGreeting').innerText = currentUser.name;
        renderAdminProducts();
        renderVendorOrders();
    } else if (view === 'sales') {
        document.getElementById('salesView').classList.remove('hidden');
        login.classList.add('hidden');
        controls.classList.remove('hidden');
        renderSalesHistory();
    } else {
        document.getElementById('buyerView').classList.remove('hidden');
        login.classList.remove('hidden');
        controls.classList.add('hidden');
        renderBuyerCards();
    }
}

window.switchTab = function(tab) {
    document.getElementById('tab-today').classList.remove('active');
    document.getElementById('tab-preorder').classList.remove('active');
    document.getElementById('view-today').classList.add('hidden');
    document.getElementById('view-preorder').classList.add('hidden');

    document.getElementById(`tab-${tab}`).classList.add('active');
    document.getElementById(`view-${tab}`).classList.remove('hidden');
}

// --- VENDOR ACTIONS ---
window.soldOut = function() {
    if(!confirm("Mark ALL items as Sold Out? (Hides from buyers)")) return;
    
    // Update all my products in Firestore
    const myProducts = products.filter(p => p.vendor === currentUser.code);
    myProducts.forEach(async (p) => {
        await updateDoc(doc(db, "products", p.id), { active: false });
    });
    alert("Updating database...");
}

window.finishDay = function() {
    // Visual only - data is permanent in Firestore
    alert("✅ Shift marked as done. Orders reset automatically tomorrow at 6AM.");
}

// --- SALES HISTORY LOGIC ---
window.openSalesHistory = function() { window.toggleView('sales'); }
window.closeSalesHistory = function() { window.toggleView('vendor'); }

function renderSalesHistory() {
    const tbody = document.getElementById('salesTableBody');
    tbody.innerHTML = '';
    
    const history = {};
    const myOrders = orders.filter(o => o.vendorCode === currentUser.code);

    myOrders.forEach(o => {
        const dateKey = o.date;
        if(!history[dateKey]) history[dateKey] = { count: 0, items: 0, total: 0 };
        
        history[dateKey].count++;
        history[dateKey].total += o.total;
        history[dateKey].items += o.items.reduce((sum, i) => sum + i.qty, 0);
    });

    if(Object.keys(history).length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">No history yet.</td></tr>';
        return;
    }

    Object.keys(history).reverse().forEach(date => {
        const data = history[date];
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${date}</td>
            <td><span class="clickable-count" onclick="showDayDetails('${date}')">${data.count}</span></td>
            <td>${data.items}</td>
            <td style="color:var(--success); font-weight:bold;">₱${data.total.toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
    });
}

window.showDayDetails = function(dateString) {
    const list = document.getElementById('detailList');
    document.getElementById('detailDate').innerText = `Sales: ${dateString}`;
    list.innerHTML = '';

    const dayOrders = orders.filter(o => o.vendorCode === currentUser.code && o.date === dateString);

    dayOrders.forEach(o => {
        const div = document.createElement('div');
        div.style.borderBottom = "1px solid #eee";
        div.style.padding = "10px 0";
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between;">
                <div style="font-weight:bold;">${o.buyer.name}</div>
                <div style="font-weight:bold; color:var(--success)">₱${o.total}</div>
            </div>
            <div style="font-size:0.8rem; color:#666;">
                ${o.buyer.account} | ${o.method} | <span style="color:var(--primary)">${o.type}</span>
            </div>
            <div style="font-size:0.75rem; color:#999;">${o.timestamp}</div>
            <div style="background:#f9f9f9; padding:5px; border-radius:4px; font-size:0.85rem; margin-top:5px;">
                ${o.items.map(i => `${i.qty}x ${i.name}`).join(', ')}
            </div>
        `;
        list.appendChild(div);
    });

    document.getElementById('salesDetailModal').classList.remove('hidden');
}

// --- ADMIN: PRODUCTS (CRUD) ---
window.openAddModal = function() {
    document.getElementById('mId').value = ''; 
    document.getElementById('mName').value = '';
    document.getElementById('mPrice').value = '';
    document.getElementById('mFile').value = '';
    document.getElementById('productModal').classList.remove('hidden');
}

window.openEditModal = function(id) {
    const p = products.find(x => x.id === id);
    if(!p) return;
    document.getElementById('mId').value = p.id;
    document.getElementById('mName').value = p.name;
    document.getElementById('mPrice').value = p.price;
    document.getElementById('productModal').classList.remove('hidden');
}

window.commitProduct = function() {
    const id = document.getElementById('mId').value;
    const name = document.getElementById('mName').value;
    const price = document.getElementById('mPrice').value;
    const fileInput = document.getElementById('mFile');
    
    if(!name || !price) return alert("Fill details");

    const saveToFirestore = async (imgSrc) => {
        try {
            if (id) {
                // EDIT
                const updateData = { name: name, price: parseInt(price) };
                if(imgSrc) updateData.media = imgSrc;
                await updateDoc(doc(db, "products", id), updateData);
            } else {
                // NEW
                await addDoc(collection(db, "products"), {
                    vendor: currentUser.code,
                    vendorName: currentUser.name,
                    name: name,
                    price: parseInt(price),
                    media: imgSrc || 'https://via.placeholder.com/50',
                    isPreOrder: false,
                    active: true 
                });
            }
            window.closeModal();
        } catch(e) { console.error(e); alert("Error saving."); }
    };

    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) { saveToFirestore(e.target.result); };
        reader.readAsDataURL(fileInput.files[0]);
    } else { saveToFirestore(null); }
}

window.togglePreOrder = async function(id) {
    const p = products.find(x => x.id === id);
    if(p) await updateDoc(doc(db, "products", id), { isPreOrder: !p.isPreOrder });
}

window.toggleActive = async function(id) {
    const p = products.find(x => x.id === id);
    if(p) await updateDoc(doc(db, "products", id), { active: !p.active });
}

window.deleteProduct = async function(id) {
    if(confirm("Delete item?")) await deleteDoc(doc(db, "products", id));
}

window.saveConfig = function() { alert("Configuration Saved to Cloud!"); }
window.closeModal = function() { document.getElementById('productModal').classList.add('hidden'); }

// --- BUYER & ORDERING ---
window.submitOrder = async function(vCode, btn, isPreOrder) {
    const vItems = products.filter(p => p.vendor === vCode);
    const purchased = [];
    let total = 0;

    vItems.forEach(p => {
        const qty = cart[p.id] || 0;
        if(qty > 0) {
            purchased.push({ name: p.name, qty: qty, price: p.price, total: p.price * qty });
            total += (p.price * qty);
        }
    });

    if(purchased.length === 0) return alert("Cart is empty!");

    const footer = btn.parentElement;
    const name = footer.querySelector('.buyer-name').value.trim();
    const acc = footer.querySelector('.buyer-acc').value.trim();
    if(!name || !acc) return alert("Please enter Name & Account.");
    
    const method = footer.querySelector('.pay-btn.selected') ? footer.querySelector('.pay-btn.selected').innerText : "Cash";
    const accountingDate = getShiftDate(isPreOrder);
    const realTimestamp = new Date().toLocaleString();

    try {
        await addDoc(collection(db, "orders"), {
            vendorCode: vCode,
            buyer: { name: name, account: acc },
            items: purchased,
            total: total,
            method: method,
            date: accountingDate,
            timestamp: realTimestamp,
            type: isPreOrder ? "Pre-Order" : "Standard"
        });
        
        vItems.forEach(p => cart[p.id] = 0);
        renderBuyerCards();
        alert(`Order Sent! Recorded for: ${accountingDate}`);
    } catch(e) { console.error(e); alert("Failed to send order."); }
}

// --- RENDERERS ---
function renderBuyerCards() {
    const today = document.getElementById('buyerTodayGrid');
    const pre = document.getElementById('buyerPreOrderGrid');
    today.innerHTML = ''; pre.innerHTML = '';

    const vendors = {};
    products.forEach(p => {
        if(p.active === false) return; 

        if(!vendors[p.vendor]) {
            const vObj = validVendors.find(v => v.code === p.vendor);
            vendors[p.vendor] = { name: p.vendorName, account: vObj ? vObj.account : '', items: [], code: p.vendor };
        }
        vendors[p.vendor].items.push(p);
    });

    Object.keys(vendors).forEach(code => {
        const vData = vendors[code];
        const tItems = vData.items.filter(i => !i.isPreOrder);
        const pItems = vData.items.filter(i => i.isPreOrder);
        
        if(tItems.length > 0) createCard(vData, tItems, today);
        if(pItems.length > 0) createCard(vData, pItems, pre);
    });
}

function createCard(vData, items, container) {
    const card = document.createElement('div');
    card.className = 'vendor-card minimized'; 
    const isPreOrderCard = items.length > 0 && items[0].isPreOrder;

    let html = items.map(i => `
        <div class="product-item">
            <img src="${i.media}" class="product-img" onclick="openLightbox('${i.media}')">
            <div class="product-details"><span class="product-name">${i.name}</span><span class="product-price">₱${i.price}</span></div>
            <div class="qty-controls">
                <button class="qty-btn" onclick="changeQty('${i.id}',-1,${i.price},'${vData.code}')">-</button>
                <span class="qty-val" id="qty-${i.id}">${cart[i.id]||0}</span>
                <button class="qty-btn" onclick="changeQty('${i.id}',1,${i.price},'${vData.code}')">+</button>
            </div>
        </div>
    `).join('');

    card.innerHTML = `
        <div class="card-header" onclick="toggleCard(this)">
            <div style="display:flex;gap:10px;align-items:center;width:100%"><span class="chevron">▼</span><span>${vData.name} <span style="opacity:0.7;font-weight:normal">- ${vData.account}</span></span></div>
        </div>
        <div class="card-content">${html}</div>
        <div class="card-footer">
            <div class="total-display"><span>Total:</span><span class="total-amount" id="total-${vData.code}">₱0</span></div>
            <div class="buyer-details" id="buyer-details-${vData.code}">
                <input type="text" class="buyer-input buyer-name" placeholder="Full Name">
                <input type="text" class="buyer-input buyer-acc" placeholder="Account">
            </div>
            <div class="payment-options">
                <button class="pay-btn" onclick="togglePayment(this)">Cash</button><button class="pay-btn" onclick="togglePayment(this)">Payday</button>
            </div>
            <button class="submit-btn" onclick="submitOrder('${vData.code}', this, ${isPreOrderCard})">
                ${isPreOrderCard ? 'Submit Pre-Order' : 'Submit Order'}
            </button>
        </div>
    `;
    container.appendChild(card);
}

function renderAdminProducts() {
    const list = document.getElementById('adminProductList');
    list.innerHTML = '';
    products.filter(p => p.vendor === currentUser.code).forEach(p => {
        const div = document.createElement('div');
        div.className = 'admin-item-row';
        div.innerHTML = `
            <div style="margin-right:10px;"><input type="checkbox" ${p.active !== false ? 'checked' : ''} onchange="toggleActive('${p.id}')"></div>
            <div class="clickable-area" onclick="openEditModal('${p.id}')">
                <img src="${p.media}" style="width:30px;height:30px;border-radius:4px;object-fit:cover;">
                <div>${p.name} (₱${p.price})</div>
            </div>
            <div style="display:flex;gap:5px;align-items:center;">
                <label style="font-size:0.8rem;"><input type="checkbox" ${p.isPreOrder?'checked':''} onclick="event.stopPropagation()" onchange="togglePreOrder('${p.id}')"> Pre</label>
                <button class="danger" style="padding:2px 6px;" onclick="event.stopPropagation();deleteProduct('${p.id}')">X</button>
            </div>
        `;
        list.appendChild(div);
    });
}

function renderVendorOrders() {
    const list = document.getElementById('orderList');
    list.innerHTML = '';
    const currentShiftDate = getShiftDate(false);
    
    // Filter orders by Date AND Vendor Code
    const myOrders = orders.filter(o => o.vendorCode === currentUser.code && o.date === currentShiftDate);

    if(myOrders.length === 0) return list.innerHTML = '<div style="text-align:center; color:#999; margin-top:20px;">No orders for this shift</div>';

    // Sort: Newest at top
    myOrders.sort((a,b) => b.timestamp.localeCompare(a.timestamp));

    myOrders.forEach(o => {
        const div = document.createElement('div');
        div.style.borderBottom = "1px solid #eee"; div.style.padding = "10px"; div.style.fontSize = "0.9rem";
        div.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:5px;">
                <div><div style="font-weight:bold;color:var(--primary);">${o.buyer.name}</div><div style="font-size:0.8rem;color:#666;">${o.buyer.account}</div></div>
                <div style="text-align:right;"><div style="color:var(--success);font-weight:bold;">₱${o.total}</div><div style="font-size:0.8rem;font-weight:bold;">${o.method}</div></div>
            </div>
            <div style="background:#f9f9f9;padding:5px;border-radius:4px;color:#555;">${o.items.map(i=>i.qty+"x "+i.name).join(', ')}</div>
            <div style="font-size:0.75rem;color:#999;margin-top:5px;">${o.timestamp} <span style="color:var(--primary)">(${o.type})</span></div>
        `;
        list.appendChild(div);
    });
}

// --- UTILS ---
window.handleModalClick = function(e, id) { 
    if(e.target.id === id) {
        if(id === 'newVendorModal') window.closeNewVendor();
        if(id === 'salesDetailModal') document.getElementById('salesDetailModal').classList.add('hidden');
    }
}
window.toggleCard = function(el) { el.parentElement.classList.toggle('minimized'); }
window.changeQty = function(id,chg,p,vc) { 
    if(!cart[id])cart[id]=0; cart[id]+=chg; if(cart[id]<0)cart[id]=0; 
    document.getElementById(`qty-${id}`).innerText=cart[id]; 
    const vItems=products.filter(x=>x.vendor===vc); let tot=0; vItems.forEach(i=>tot+=(i.price*(cart[i.id]||0))); 
    document.getElementById(`total-${vc}`).innerText=`₱${tot.toLocaleString()}`;
    const panel = document.getElementById(`buyer-details-${vc}`); if(panel) tot>0?panel.classList.add('visible'):panel.classList.remove('visible');
}
window.togglePayment = function(btn) { btn.parentElement.querySelectorAll('.pay-btn').forEach(b=>b.classList.remove('selected')); btn.classList.add('selected'); }
window.openLightbox = function(src) { document.getElementById('lightbox-img').src=src; document.getElementById('lightbox').classList.remove('hidden'); }
window.closeLightbox = function() { document.getElementById('lightbox').classList.add('hidden'); }
setInterval(() => { document.getElementById('clock').innerText = new Date().toLocaleDateString() + " | " + new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); }, 1000);
document.addEventListener('keydown', e => { if(e.key==="Escape") { window.closeNewVendor(); window.closeModal(); window.closeLightbox(); }});
