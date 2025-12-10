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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// GLOBAL STATE
let currentUser = null; // { code, name, account, role: 'vendor'|'buyer', img }
let cart = {}; 
let validVendors = [];
let validBuyers = [];
let products = [];
let orders = [];

// --- LISTENERS ---
onSnapshot(collection(db, "vendors"), (snapshot) => {
    validVendors = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, role: 'vendor' }));
});

onSnapshot(collection(db, "buyers"), (snapshot) => {
    validBuyers = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, role: 'buyer' }));
});

onSnapshot(collection(db, "products"), (snapshot) => {
    products = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    renderBuyerCards(document.getElementById('buyerTodayGrid'), false);
    renderBuyerCards(document.getElementById('buyerPreOrderGrid'), true);
    
    if(currentUser && currentUser.role === 'vendor') {
        renderAdminProducts();
        renderBuyerCards(document.getElementById('vendorMarketPreview'), false, true, currentUser.code); 
    }
});

onSnapshot(collection(db, "orders"), (snapshot) => {
    orders = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    if(currentUser && currentUser.role === 'vendor') renderVendorOrders();
    if(currentUser) renderHistory(); // Updates for both if open
});

// --- DATE HELPER ---
function getShiftDate(isPreOrder = false) {
    const now = new Date();
    if (now.getHours() < 6) now.setDate(now.getDate() - 1); // Shift starts 6am
    if (isPreOrder) now.setDate(now.getDate() + 1);
    return now.toLocaleDateString(); 
}

// --- AUTHENTICATION ---
window.handleLogin = function() {
    const code = document.getElementById('codeJson').value.trim();
    if(code === "RESET") { location.reload(); return; }

    // Check Vendors
    let user = validVendors.find(v => v.code === code);
    if(user) {
        loginUser(user);
        return;
    }

    // Check Buyers
    user = validBuyers.find(b => b.code === code);
    if(user) {
        loginUser(user);
        return;
    }

    alert("Invalid Access Code");
}

function loginUser(user) {
    currentUser = user;
    document.getElementById('codeJson').value = '';
    
    // Update Sidebar
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('userControls').classList.remove('hidden');
    
    document.getElementById('displayUserName').innerText = user.name;
    document.getElementById('displayUserAcc').innerText = user.account;
    document.getElementById('displayUserCode').innerText = user.code;
    
    // Set Profile Pic
    const defaultSvg = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNzE3MTdBIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIwIDIxdi0yYTQgNCAwIDAgMC00LTRoThYTQgMCAwIDAtNCA0djIiPjwvcGF0aD48Y2lyY2xlIGN4PSIxMiIgY3k9IjciIHI9IjQiPjwvY2lyY2xlPjwvc3ZnPg==";
    document.getElementById('sidebarProfileImg').src = user.img || defaultSvg;

    // Route View
    if(user.role === 'vendor') {
        document.getElementById('vendorSpecificButtons').style.display = 'block';
        toggleView('vendor');
    } else {
        document.getElementById('vendorSpecificButtons').style.display = 'none';
        toggleView('buyer');
    }
}

window.logout = function() {
    currentUser = null;
    document.getElementById('codeJson').value = '';
    toggleView('buyer'); // Reset to default view
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('userControls').classList.add('hidden');
}

// --- PROFILE PICTURE ---
window.uploadProfilePic = function(input) {
    if(input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = async function(e) {
            const base64 = e.target.result;
            document.getElementById('sidebarProfileImg').src = base64;
            
            // Update Firestore
            const collectionName = currentUser.role === 'vendor' ? 'vendors' : 'buyers';
            await updateDoc(doc(db, collectionName, currentUser.id), { img: base64 });
            currentUser.img = base64; // local update
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// --- REGISTRATION ---
window.openRegisterModal = function(role) {
    document.getElementById('regRole').value = role;
    document.getElementById('regTitle').innerText = role === 'vendor' ? "Join as Vendor" : "Register Buyer";
    document.getElementById('registerModal').classList.remove('hidden');
}
window.closeRegisterModal = function() { document.getElementById('registerModal').classList.add('hidden'); }

window.submitRegistration = async function() {
    const role = document.getElementById('regRole').value;
    const name = document.getElementById('regName').value.trim();
    const account = document.getElementById('regAccount').value.trim();
    
    if(!name || !account) return alert("Please fill all fields");

    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    const collectionName = role === 'vendor' ? 'vendors' : 'buyers';
    
    try {
        await addDoc(collection(db, collectionName), { 
            code, name, account, 
            img: null // default
        });
        alert(`Registered! Your Access Code is: ${code}`);
        closeRegisterModal();
        
        // Auto Login
        document.getElementById('codeJson').value = code;
        handleLogin();
        
    } catch(e) { console.error(e); alert("Error registering"); }
}

// --- VIEW NAVIGATION ---
window.toggleView = function(view) {
    ['buyerView', 'vendorView', 'historyView'].forEach(id => document.getElementById(id).classList.add('hidden'));

    if (view === 'vendor') {
        document.getElementById('vendorView').classList.remove('hidden');
        renderAdminProducts();
        renderVendorOrders();
        renderBuyerCards(document.getElementById('vendorMarketPreview'), false, true, currentUser.code);
    } else if (view === 'history') {
        document.getElementById('historyView').classList.remove('hidden');
        renderHistory();
    } else {
        document.getElementById('buyerView').classList.remove('hidden');
    }
}

// --- BUYER & CARD RENDERING ---
function renderBuyerCards(container, showPreOrders, isCompact = false, excludeVendor = null) {
    if(!container) return;
    container.innerHTML = '';

    const vendors = {};
    products.forEach(p => {
        if(p.active === false) return; 
        if(p.isPreOrder !== showPreOrders) return;
        if(excludeVendor && p.vendor === excludeVendor) return;

        if(!vendors[p.vendor]) {
            const vObj = validVendors.find(v => v.code === p.vendor);
            vendors[p.vendor] = { name: p.vendorName, account: vObj ? vObj.account : '', items: [], code: p.vendor };
        }
        vendors[p.vendor].items.push(p);
    });

    const vendorKeys = Object.keys(vendors);
    if(excludeVendor && vendorKeys.length === 0) {
        container.innerHTML = '<div style="color:#999; text-align:center; padding:20px; font-size:0.9rem;">No active shops</div>';
        return;
    }

    vendorKeys.forEach(code => {
        createCard(vendors[code], vendors[code].items, container, isCompact);
    });
}

function createCard(vData, items, container, isCompact) {
    const card = document.createElement('div');
    card.className = isCompact ? 'vendor-card compact' : 'vendor-card';
    const chevronHtml = isCompact ? '<span class="chevron">▼</span>' : '';
    const clickAttr = isCompact ? `onclick="this.parentElement.classList.toggle('expanded')"` : '';

    let html = items.map(i => `
        <div class="product-item">
            <img src="${i.media}" class="product-img" onclick="event.stopPropagation(); openLightbox('${i.media}')">
            <div class="product-details">
                <span class="product-name">${i.name}</span>
                <span class="product-price">₱${i.price}</span>
            </div>
            <div class="qty-controls" onclick="event.stopPropagation()">
                <button class="qty-btn" onclick="changeQty('${i.id}',-1,${i.price},'${vData.code}')">-</button>
                <span class="qty-val" id="qty-${i.id}">${cart[i.id]||0}</span>
                <button class="qty-btn" onclick="changeQty('${i.id}',1,${i.price},'${vData.code}')">+</button>
            </div>
        </div>
    `).join('');

    // Buyer Inputs Removed. Uses currentUser data.
    const footerHtml = isCompact ? '' : `
        <div class="card-footer">
            <div class="total-display"><span>Total:</span><span class="total-amount" id="total-${vData.code}">₱0</span></div>
            <div class="payment-options">
                <button class="pay-btn" onclick="togglePayment(this)">Cash</button>
                <button class="pay-btn" onclick="togglePayment(this)">Payday</button>
            </div>
            <button class="submit-btn" onclick="submitOrder('${vData.code}', this, ${items[0].isPreOrder})">Submit Order</button>
        </div>
    `;

    card.innerHTML = `
        <div class="card-header" ${clickAttr}>
            <div class="shop-name">${vData.name}</div>
            <span class="shop-meta">${vData.account}</span>
            ${chevronHtml}
        </div>
        <div class="card-content">${html}</div>
        ${footerHtml}
    `;
    container.appendChild(card);
}

// --- ORDER SUBMISSION ---
window.changeQty = function(id,chg,p,vc) { 
    if(!cart[id])cart[id]=0; cart[id]+=chg; if(cart[id]<0)cart[id]=0; 
    document.querySelectorAll(`#qty-${id}`).forEach(el => el.innerText=cart[id]);
    const vItems=products.filter(x=>x.vendor===vc); let tot=0; 
    vItems.forEach(i=>tot+=(i.price*(cart[i.id]||0))); 
    document.querySelectorAll(`#total-${vc}`).forEach(el => el.innerText=`₱${tot.toLocaleString()}`);
}

window.togglePayment = function(btn) {
    const isSelected = btn.classList.contains('selected');
    btn.parentElement.querySelectorAll('.pay-btn').forEach(b => b.classList.remove('selected'));
    if (!isSelected) btn.classList.add('selected');
}

window.submitOrder = async function(vCode, btn, isPreOrder) {
    if(!currentUser) return alert("Please Login or Register to order.");

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
    const method = footer.querySelector('.pay-btn.selected') ? footer.querySelector('.pay-btn.selected').innerText : "Cash";
    
    try {
        await addDoc(collection(db, "orders"), {
            vendorCode: vCode,
            buyerCode: currentUser.code, // Link to buyer
            buyer: { name: currentUser.name, account: currentUser.account },
            items: purchased,
            total: total,
            method: method,
            status: "Unpaid", // Default status
            date: getShiftDate(isPreOrder),
            timestamp: new Date().toLocaleString(),
            type: isPreOrder ? "Pre-Order" : "Standard"
        });
        
        vItems.forEach(p => {
            cart[p.id] = 0;
            document.querySelectorAll(`#qty-${p.id}`).forEach(e => e.innerText = "0");
        });
        document.querySelectorAll(`#total-${vCode}`).forEach(e => e.innerText = "₱0");
        alert("Order Sent!");
    } catch(e) { console.error(e); alert("Failed."); }
}

// --- HISTORY & PURCHASES ---
let historyMode = 'sales'; // 'sales' or 'purchases'

window.openHistoryView = function() { 
    // Reset mode based on role
    if(currentUser.role === 'vendor') {
        historyMode = 'sales';
        document.getElementById('vendorHistoryToggle').classList.remove('hidden');
        updateHistoryToggleUI();
    } else {
        historyMode = 'purchases';
        document.getElementById('vendorHistoryToggle').classList.add('hidden');
    }
    
    toggleView('history'); 
    populateDateFilters(); 
}

window.closeHistoryView = function() { toggleView(currentUser.role === 'vendor' ? 'vendor' : 'buyer'); }

window.switchHistoryMode = function(mode) {
    historyMode = mode;
    updateHistoryToggleUI();
    renderHistory();
}

function updateHistoryToggleUI() {
    if(historyMode === 'sales') {
        document.getElementById('btnShowSales').classList.add('active');
        document.getElementById('btnShowPurchases').classList.remove('active');
    } else {
        document.getElementById('btnShowSales').classList.remove('active');
        document.getElementById('btnShowPurchases').classList.add('active');
    }
}

function populateDateFilters() {
    const mSelect = document.getElementById('filterMonth');
    const ySelect = document.getElementById('filterYear');
    if(ySelect.options.length > 0) return; 

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    months.forEach((m, i) => mSelect.add(new Option(m, i)));
    
    const today = new Date();
    for(let y = today.getFullYear(); y >= today.getFullYear() - 2; y--) {
        ySelect.add(new Option(y, y));
    }
    mSelect.value = today.getMonth();
    ySelect.value = today.getFullYear();
    renderHistory();
}

window.renderHistory = function() {
    if(!currentUser) return;
    
    const thead = document.getElementById('historyTableHead');
    const tbody = document.getElementById('historyTableBody');
    tbody.innerHTML = '';

    const m = parseInt(document.getElementById('filterMonth').value);
    const y = parseInt(document.getElementById('filterYear').value);
    
    // 1. FILTER ORDERS BY DATE
    let relevantOrders = orders.filter(o => {
        const d = new Date(o.date);
        return d.getMonth() === m && d.getFullYear() === y;
    });

    // 2. DETERMINE MODE (Vendor Sales vs Vendor/Buyer Purchases)
    
    // MODE: SALES (Vendors Only)
    if(historyMode === 'sales' && currentUser.role === 'vendor') {
        document.getElementById('historyTitle').innerText = "Sales Performance";
        thead.innerHTML = `<tr><th>Date</th><th class="text-center">Orders</th><th class="text-center">Items</th><th class="text-right">Revenue</th></tr>`;
        
        relevantOrders = relevantOrders.filter(o => o.vendorCode === currentUser.code);
        
        const history = {};
        let grandTotal = 0;
        
        relevantOrders.forEach(o => {
            if(!history[o.date]) history[o.date] = { count: 0, items: 0, total: 0 };
            history[o.date].count++;
            history[o.date].total += o.total;
            history[o.date].items += o.items.reduce((s,i)=>s+i.qty,0);
            grandTotal += o.total;
        });

        document.getElementById('historyTotalBadge').innerText = `Total: ₱${grandTotal.toLocaleString()}`;

        if(Object.keys(history).length === 0) {
             tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:30px; color:#aaa;">No sales records.</td></tr>'; return;
        }

        Object.keys(history).sort((a,b)=>new Date(b)-new Date(a)).forEach(date => {
            const data = history[date];
            const dObj = new Date(date);
            tbody.innerHTML += `
                <tr>
                    <td>${dObj.getMonth()+1}/${dObj.getDate()}</td>
                    <td class="text-center"><span class="clickable-count">${data.count}</span></td>
                    <td class="text-center">${data.items}</td>
                    <td class="text-right" style="color:var(--success); font-weight:bold;">₱${data.total.toLocaleString()}</td>
                </tr>`;
        });

    } 
    // MODE: PURCHASES (Buyers OR Vendors buying things)
    else {
        document.getElementById('historyTitle').innerText = "My Purchases";
        thead.innerHTML = `<tr><th>Date</th><th>Item Details</th><th class="text-center">Status</th><th class="text-right">Total</th></tr>`;
        
        relevantOrders = relevantOrders.filter(o => o.buyerCode === currentUser.code);
        relevantOrders.sort((a,b) => b.timestamp.localeCompare(a.timestamp));
        
        let grandTotal = 0;
        relevantOrders.forEach(o => grandTotal += o.total);
        document.getElementById('historyTotalBadge').innerText = `Total: ₱${grandTotal.toLocaleString()}`;

        if(relevantOrders.length === 0) {
             tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:30px; color:#aaa;">No purchases found.</td></tr>'; return;
        }

        relevantOrders.forEach(o => {
            const dObj = new Date(o.date);
            const statusClass = o.status === 'Paid' ? 'status-paid' : 'status-unpaid';
            const itemsSummary = o.items.map(i => `${i.qty}x ${i.name}`).join(', ');
            
            tbody.innerHTML += `
                <tr>
                    <td>${dObj.getMonth()+1}/${dObj.getDate()}</td>
                    <td><div style="font-weight:600;">${o.vendorCode}</div><div style="font-size:0.8rem; color:#666;">${itemsSummary}</div></td>
                    <td class="text-center"><span class="status-pill ${statusClass}">${o.status}</span></td>
                    <td class="text-right" style="font-weight:bold;">₱${o.total}</td>
                </tr>`;
        });
    }
}

// --- VENDOR ORDER ACTIONS (Toggle Paid) ---
function renderVendorOrders() {
    const list = document.getElementById('orderList');
    list.innerHTML = '';
    const currentShiftDate = getShiftDate(false);
    
    const myOrders = orders.filter(o => o.vendorCode === currentUser.code && o.date === currentShiftDate);
    if(myOrders.length === 0) return list.innerHTML = '<div class="empty-state" style="text-align:center;padding:20px;color:#aaa;">No orders for today</div>';

    myOrders.sort((a,b) => b.timestamp.localeCompare(a.timestamp));

    myOrders.forEach(o => {
        const div = document.createElement('div');
        div.style.borderBottom = "1px solid #f0f0f0"; div.style.padding = "12px";
        
        const isPaid = o.status === 'Paid';
        const statusColor = isPaid ? 'var(--success)' : 'var(--danger)';
        const btnText = isPaid ? 'Mark Unpaid' : 'Mark Paid';

        div.innerHTML = `
            <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                <div style="font-weight:700;">${o.buyer.name}</div>
                <div style="font-weight:700;color:var(--success);">₱${o.total}</div>
            </div>
            <div style="font-size:0.85rem;color:#555;">${o.items.map(i=>`${i.qty}x ${i.name}`).join(', ')}</div>
            <div style="font-size:0.75rem;color:#999;margin-top:8px;display:flex;justify-content:space-between;align-items:center;">
                <span style="color:${statusColor}; font-weight:700;">${o.status}</span>
                <button onclick="toggleOrderStatus('${o.id}', '${o.status}')" style="font-size:0.7rem; padding:4px 8px; border:1px solid #eee; background:white; border-radius:4px; cursor:pointer;">${btnText}</button>
            </div>
        `;
        list.appendChild(div);
    });
}

window.toggleOrderStatus = async function(oid, currentStatus) {
    const newStatus = currentStatus === 'Paid' ? 'Unpaid' : 'Paid';
    await updateDoc(doc(db, "orders", oid), { status: newStatus });
}

// --- STANDARD FUNCTIONS ---
window.finishDay = function() { if(confirm("End Shift?")) window.logout(); }
window.soldOut = async function() {
    if(!confirm("Mark ALL as sold out?")) return;
    products.filter(p => p.vendor === currentUser.code).forEach(async (p) => {
        await updateDoc(doc(db, "products", p.id), { active: false });
    });
}
window.commitProduct = function() {
    const id = document.getElementById('mId').value;
    const name = document.getElementById('mName').value.trim();
    const price = document.getElementById('mPrice').value;
    const fileInput = document.getElementById('mFile');
    if(!name || !price) return alert("Required fields missing");

    const save = async (img) => {
        const data = { vendor: currentUser.code, vendorName: currentUser.name, name, price: parseInt(price), media: img||'https://via.placeholder.com/50', isPreOrder: false, active: true };
        if(id) { delete data.vendor; delete data.vendorName; await updateDoc(doc(db,"products",id), {name, price: parseInt(price), ...(img && {media:img})}); }
        else { await addDoc(collection(db,"products"), data); }
        window.closeModal();
    };
    if(fileInput.files[0]) { const r = new FileReader(); r.onload=e=>save(e.target.result); r.readAsDataURL(fileInput.files[0]); }
    else save(null);
}
window.openAddModal = function() { document.getElementById('mId').value='';document.getElementById('mName').value='';document.getElementById('mPrice').value='';document.getElementById('productModal').classList.remove('hidden'); }
window.closeModal = function() { document.getElementById('productModal').classList.add('hidden'); }
window.openLightbox = function(src) { document.getElementById('lightbox-img').src=src; document.getElementById('lightbox').classList.remove('hidden'); }
window.closeLightbox = function() { document.getElementById('lightbox').classList.add('hidden'); }
// Admin product list (Inventory)
window.renderAdminProducts = function() {
    const list = document.getElementById('adminProductList'); list.innerHTML='';
    products.filter(p=>p.vendor===currentUser.code).forEach(p=>{
        const div=document.createElement('div'); div.className='admin-item-row'; div.style.padding="10px"; div.style.borderBottom="1px solid #eee";
        div.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between"><span>${p.name}</span><button onclick="deleteDoc(doc(db,'products','${p.id}'))" style="color:red;border:none;background:none;cursor:pointer">Del</button></div>`;
        list.appendChild(div);
    });
}

setInterval(() => { document.getElementById('clock').innerText = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); }, 1000);
// --- GLOBAL MODAL BEHAVIOR ---

// 1. Close Modals on "Esc" Key Press
document.addEventListener('keydown', function(event) {
    if (event.key === "Escape") {
        // Find all active modals and hide them
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
        
        // Also close lightbox if open
        document.getElementById('lightbox').classList.add('hidden');
    }
});

// 2. Close Modal when clicking outside the card (Backdrop check)
window.addEventListener('click', function(event) {
    // If the clicked element has the class 'modal', it means we clicked the backdrop
    // (because the inner .modal-card stops propagation, or simply sits on top)
    if (event.target.classList.contains('modal')) {
        event.target.classList.add('hidden');
    }
});
