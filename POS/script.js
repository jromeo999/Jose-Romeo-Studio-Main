import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    updatePassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    getDoc,
    setDoc,
    onSnapshot, 
    query, 
    orderBy,
    serverTimestamp,
    deleteField  
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- CONFIG ---
const firebaseConfig = {
  apiKey: "AIzaSyCuh4WEUl0yYQSpKHNfo1hozaud2k1Wiw8",
  authDomain: "abos-d2d56.firebaseapp.com",
  projectId: "abos-d2d56",
  storageBucket: "abos-d2d56.firebasestorage.app",
  messagingSenderId: "259485101738",
  appId: "1:259485101738:web:6577a55d719de2a363ead3",
  measurementId: "G-DKJPK8WD98"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const EMAIL_SUFFIX = "@tambayan.local"; 
const CATEGORY_ORDER = { 'Meal': 1, 'Drinks': 2, 'Snacks': 3, 'Others': 4 };

// --- STATE ---
let menu = [], sales = [], cart = [], config = { storeName: "Tambayan Sa Carbon", logo: null };
let activeFilter = 'Meal';
let currentUser = null;
let currentRole = 'cashier'; // Default safe role
let currentDisplayName = '';
let pendingVoidId = null;
let confirmCallback = null;

// --- INIT ---
function init() {
    // Inside init()
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            currentUser = user;
            const username = user.email.replace(EMAIL_SUFFIX, '');
            
            // This will now throw if user was deleted
            await determineRole(username);
            
            // ... (Rest of your normal startup code: subscribeToData, etc.) ...
            document.getElementById('login-view').classList.add('hidden');
            document.getElementById('app-view').classList.remove('hidden');
            document.getElementById('admin-display').innerText = currentDisplayName; // Ensure this is set
            document.getElementById('role-display').innerText = currentRole;

            applyRolePermissions();
            subscribeToData();
            switchTab('cashier');

        } catch (error) {
            console.error("Login Check Failed:", error);
            // If access revoked, ensure we are fully logged out and on login screen
            document.getElementById('login-msg').innerText = "Account Access Revoked.";
            document.getElementById('app-view').classList.add('hidden');
            document.getElementById('login-view').classList.remove('hidden');
        }
    } else {
        // ... (Existing logout handling) ...
        currentUser = null;
        // Unsubscribe if listeners exist
        if(unsubscribeMenu) unsubscribeMenu();
        if(unsubscribeSales) unsubscribeSales();
        if(unsubscribeUsers) unsubscribeUsers();
        
        document.getElementById('app-view').classList.add('hidden');
        document.getElementById('login-view').classList.remove('hidden');
    }
});
}

// Check Firestore for role. If 'admin' user doesn't exist yet, force create it.
async function determineRole(username) {
    if(username === 'admin') {
        currentRole = 'admin';
        currentDisplayName = "Administrator";
        await setDoc(doc(db, "users", "admin"), { role: 'admin', displayName: "Administrator" }, { merge: true });
    } else {
        const userDoc = await getDoc(doc(db, "users", username));
        
        // SECURITY CHECK: If doc doesn't exist, they were fired/deleted.
        if (!userDoc.exists()) {
            await signOut(auth); // Kick them out
            throw new Error("ACCESS_REVOKED"); // Stop execution
        }

        const data = userDoc.data();
        currentRole = data.role;
        currentDisplayName = data.displayName || username.toUpperCase();
    }
    
    document.getElementById('admin-display').innerText = currentDisplayName;
}

function applyRolePermissions() {
    const adminElements = document.querySelectorAll('.admin-only');
    
    if (currentRole === 'admin') {
        adminElements.forEach(el => el.classList.remove('hidden'));
        // Show restricted navs
        document.getElementById('nav-inventory').style.display = 'block';
        // document.getElementById('nav-settings').style.display = 'block'; // DELETE or COMMENT OUT this line
    } else {
        // CASHIER MODE
        adminElements.forEach(el => el.classList.add('hidden'));
        
        // Hide Admin Tabs
        
        // CHANGED: Removed the line that hides nav-settings
        // document.getElementById('nav-settings').style.display = 'none'; 
        
        // Ensure Cashier sees what they need
        document.getElementById('sales-stats').style.display = 'none'; 
    }
}

// --- DATA STREAMS ---
let unsubscribeMenu = null, unsubscribeSales = null, unsubscribeSettings = null, unsubscribeUsers = null;

function subscribeToData() {
    // 1. Menu
    unsubscribeMenu = onSnapshot(query(collection(db, "menu")), (snap) => {
        menu = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if(!document.getElementById('tab-cashier').classList.contains('hidden')) renderCashier();
        if(currentRole === 'admin' && !document.getElementById('tab-inventory').classList.contains('hidden')) renderInventory();
    });

    // 2. Sales
    unsubscribeSales = onSnapshot(query(collection(db, "sales"), orderBy("date", "desc")), (snap) => {
        sales = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Update Filters if Admin
        if(currentRole === 'admin') {
            populateReportFilters();
        }

        if(!document.getElementById('tab-reports').classList.contains('hidden')) renderReports();
    });

    // 3. Users (Admin Only)
    if (currentRole === 'admin') {
        unsubscribeUsers = onSnapshot(collection(db, "users"), (snap) => {
            const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            renderStaffList(users);
        });
    }
}

// --- LOGIN ---
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('username-input').value.trim().toLowerCase();
    const p = document.getElementById('password-input').value;
    const msg = document.getElementById('login-msg');

    try {
        msg.innerText = "Verifying...";
        await signInWithEmailAndPassword(auth, u + EMAIL_SUFFIX, p);
        msg.innerText = "";
        document.getElementById('password-input').value = "";
    } catch (error) {
        console.error(error);
        msg.innerText = "Invalid Username or Password";
        msg.style.color = "red";
    }
});

// --- TABS ---
window.switchTab = (tab) => {
    // Prevent Cashier from accessing restricted tabs manually
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    document.getElementById(`nav-${tab}`).classList.add('active');
    
    document.querySelectorAll('.tab-section').forEach(s => s.classList.add('hidden'));
    document.getElementById(`tab-${tab}`).classList.remove('hidden');
    
    if (tab === 'cashier') renderCashier();
    if (tab === 'inventory') renderInventory();
    if (tab === 'reports') renderReports();
    if (tab === 'settings') loadSettingsUI();
}

// --- CASHIER LOGIC ---
window.filterMenu = (cat) => {
    activeFilter = cat;
    document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.remove('active-filter');
        if (b.innerText === cat || b.innerText === cat + 's') b.classList.add('active-filter');
    });
    renderCashier();
}
// --- HELPER: Populate Month Dropdown ---
function populateReportFilters() {
    const select = document.getElementById('report-filter-date');
    if (!select) return;

    // 1. Get current selection to preserve it if possible
    const currentSelection = select.value;

    // 2. Extract unique YYYY-MM from sales data
    // sales[0].date format is usually ISO (e.g., "2026-01-19T...")
    const uniqueMonths = [...new Set(sales.map(s => s.date.substring(0, 7)))];
    
    // 3. Sort descending (Newest months first)
    uniqueMonths.sort().reverse();

    // 4. Build Options
    let html = '<option value="ALL">All Time</option>';
    
    uniqueMonths.forEach(monthStr => {
        // Convert "2026-01" to "January 2026"
        const [y, m] = monthStr.split('-');
        const dateObj = new Date(parseInt(y), parseInt(m) - 1, 1);
        const label = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        html += `<option value="${monthStr}">${label}</option>`;
    });

    select.innerHTML = html;

    // 5. Restore selection or Default to Current Month if available
    const currentMonthStr = new Date().toISOString().substring(0, 7);
    
    if (uniqueMonths.includes(currentSelection)) {
        select.value = currentSelection;
    } else if (uniqueMonths.includes(currentMonthStr) && currentSelection === 'ALL') {
        // Optional: Auto-select current month on first load
        select.value = currentMonthStr; 
    }
}
window.renderCashier = function() {
    const grid = document.getElementById('menu-grid');
    const searchInput = document.getElementById('menu-search');
    const search = searchInput ? searchInput.value.trim().toLowerCase() : "";
    
    grid.innerHTML = '';
    
    let filtered = [];

    // --- SMART LOGIC ---
    if (search.length > 0) {
        // 1. Search Mode: Search ALL categories
        filtered = menu.filter(i => i.name.toLowerCase().includes(search));
        
        // Visual: Deselect all tabs so user knows they are in "Global Search"
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active-filter'));
    } else {
        // 2. Browse Mode: Use the active category
        filtered = menu.filter(i => i.category === activeFilter);
        
        // Visual: Restore the active tab highlight
        document.querySelectorAll('.filter-btn').forEach(b => {
            if (b.innerText === activeFilter || b.innerText === activeFilter + 's') {
                b.classList.add('active-filter');
            } else {
                b.classList.remove('active-filter');
            }
        });
    }

    // --- SORTING (Rice -> A-Z) ---
    filtered.sort((a, b) => {
        const nA = a.name.toLowerCase(), nB = b.name.toLowerCase();
        const riceA = nA.includes('rice') || nA.includes('kanin');
        const riceB = nB.includes('rice') || nB.includes('kanin');
        
        if (riceA && !riceB) return -1;
        if (!riceA && riceB) return 1;
        return a.name.localeCompare(b.name);
    });

    // --- RENDER ---
    if (!filtered.length) { 
        grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;text-align:center;color:#999;padding:20px;">No items found.</div>'; 
        return; 
    }

    filtered.forEach(item => {
        const div = document.createElement('div');
        div.className = 'menu-card';
        div.onclick = () => addToCart(item);
        let color = item.category === 'Drinks' ? '#ecfdf5' : item.category === 'Snacks' ? '#fffbeb' : '#f3f4f6';
        
        div.innerHTML = `
            <span class="cat-tag" style="background:${color}">${item.category}</span>
            <h4>${item.name}</h4>
            <div style="color:var(--primary);font-weight:bold">₱${parseFloat(item.price).toFixed(2)}</div>
        `;
        grid.appendChild(div);
    });
};

function addToCart(item) {
    let exist = cart.find(c => c.id === item.id);
    if (exist) exist.qty++; else cart.push({...item, qty: 1});
    renderCart();
}

function renderCart() {
    const list = document.getElementById('cart-list');
    list.innerHTML = '';
    let total = 0;
    cart.forEach(item => {
        total += item.price * item.qty;
        list.innerHTML += `<div class="cart-item"><div>${item.name}<br><small>₱${item.price} x ${item.qty}</small></div><div><button class="btn-text" onclick="changeQty('${item.id}', -1)">[-]</button><span style="margin:0 5px">${item.qty}</span><button class="btn-text" onclick="changeQty('${item.id}', 1)">[+]</button></div></div>`;
    });
    document.getElementById('cart-total-display').innerText = `₱${total.toFixed(2)}`;
}

window.changeQty = (id, delta) => {
    const item = cart.find(c => c.id === id);
    if (item) {
        item.qty += delta;
        if (item.qty <= 0) cart = cart.filter(c => c.id !== id);
        renderCart();
    }
}
window.clearCart = () => { cart = []; renderCart(); }

window.closeCheckoutModal = () => { document.getElementById('checkout-modal').classList.add('hidden'); }

window.confirmPayment = async () => {
    // Get Cash Data
    const cashInput = parseFloat(document.getElementById('checkout-cash-input').value);
    const changeVal = cashInput - currentTotal;

    const cashierName = currentUser.email.replace(EMAIL_SUFFIX, '');
    
    try {
        await addDoc(collection(db, "sales"), {
            date: new Date().toISOString(),
            timestamp: serverTimestamp(),
            items: cart,
            total: currentTotal,
            cashReceived: cashInput, // SAVED
            change: changeVal,       // SAVED
            cashier: currentDisplayName, // CHANGED: Save the full name, not just username
            username: currentUser.email.replace(EMAIL_SUFFIX, '')
        });
        
        cart = []; 
        renderCart(); 
        closeCheckoutModal();
        
        // Improve Alert to show Change
        showAlert(`Success! Change: ₱${changeVal.toFixed(2)}`);
        
    } catch (e) { 
        showAlert("Error: " + e.message); 
    }
}

// --- INVENTORY (Admin Only) ---
window.renderInventory = function() {
    const tbody = document.querySelector('#inventory-table tbody');
    const searchInput = document.getElementById('inventory-search');
    const search = searchInput ? searchInput.value.trim().toLowerCase() : "";
    
    tbody.innerHTML = '';
    
    // 1. Get filtered items
    let filtered = menu.filter(i => i.name.toLowerCase().includes(search));
    
    // 2. Group items by Category
    const groups = {};
    filtered.forEach(item => {
        if(!groups[item.category]) groups[item.category] = [];
        groups[item.category].push(item);
    });

    // 3. Sort Categories (Meal -> Drinks -> Snacks -> Others)
    const sortedCats = Object.keys(groups).sort((a,b) => {
        return (CATEGORY_ORDER[a] || 99) - (CATEGORY_ORDER[b] || 99);
    });

    // 4. Render Groups
    if(sortedCats.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px; color:#999;">No items found</td></tr>';
        return;
    }

    sortedCats.forEach(cat => {
        // Sort items inside category (A-Z)
        groups[cat].sort((a,b) => a.name.localeCompare(b.name));

        // A. Render Category Header
        const headerRow = document.createElement('tr');
    headerRow.className = 'inventory-cat-header'; // Matches our new CSS
    headerRow.innerHTML = `<td colspan="3">${cat} (${groups[cat].length})</td>`;
    
    // Toggle Logic
    headerRow.onclick = () => {
        const rows = document.querySelectorAll(`.row-cat-${cat}`);
        
        // 1. Check current state of the *items*
        const isHidden = rows[0].classList.contains('hidden');
        
        // 2. Toggle visibility of items
        rows.forEach(r => isHidden ? r.classList.remove('hidden') : r.classList.add('hidden'));
        
        // 3. NEW: Toggle the arrow class on the header itself
        headerRow.classList.toggle('collapsed');
    };
    
    tbody.appendChild(headerRow);

        // B. Render Items
        groups[cat].forEach(item => {
            const tr = document.createElement('tr');
            // Add specific class for toggling
            tr.className = `clickable-row row-cat-${item.category}`;
            
            // If searching, always expand. If not, default to whatever you prefer (Expanded here)
            if(search.length === 0) {
               // Optional: Add 'hidden' here if you want them collapsed by default
            }

            tr.onclick = (e) => { if(!e.target.closest('.btn-delete')) editItem(item.id); };
            
            tr.innerHTML = `
                <td style="padding-left: 20px;">
                    <div style="font-weight:bold">${item.name}</div>
                </td>
                <td>₱${parseFloat(item.price).toFixed(2)}</td>
                <td style="text-align:right">
                    <button class="btn-delete btn-danger" style="padding:5px 10px;" onclick="deleteItem('${item.id}')">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    });
};
window.openItemModal = () => { document.getElementById('item-form').reset(); document.getElementById('item-id').value = ''; document.getElementById('item-modal').classList.remove('hidden'); }
window.closeModal = () => { document.getElementById('item-modal').classList.add('hidden'); }
window.editItem = (id) => { const i = menu.find(x => x.id === id); document.getElementById('item-id').value = i.id; document.getElementById('item-name').value = i.name; document.getElementById('item-category').value = i.category; document.getElementById('item-price').value = i.price; document.getElementById('item-modal').classList.remove('hidden'); }
window.deleteItem = (id) => showConfirm("Delete item?", async() => await deleteDoc(doc(db,"menu",id)));
document.getElementById('item-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('item-id').value;
    const data = { name: document.getElementById('item-name').value, category: document.getElementById('item-category').value, price: parseFloat(document.getElementById('item-price').value) };
    if(id) await updateDoc(doc(db,"menu",id), data); else await addDoc(collection(db,"menu"), data);
    closeModal();
});

// --- REPORTS ---
window.renderReports = function() {
    const tbody = document.querySelector('#sales-table tbody');
    const tfoot = document.querySelector('#sales-tfoot');
    const filterSelect = document.getElementById('report-filter-date');
    
    tbody.innerHTML = '';
    
    // --- 1. CALCULATE DASHBOARD STATS ---
    let dailyTotal = 0;
    let monthlyTotal = 0;
    const now = new Date();
    const currentMonthKey = now.toISOString().substring(0, 7); // "YYYY-MM"
    const todayKey = now.toDateString();

    sales.forEach(s => {
        const d = new Date(s.date);
        if (d.toDateString() === todayKey) dailyTotal += s.total;
        if (s.date.substring(0, 7) === currentMonthKey) monthlyTotal += s.total;
    });

    // Update Top Cards (Admin Only)
    if(currentRole === 'admin') {
        document.getElementById('sales-stats').style.display = 'grid';
        document.getElementById('report-daily').innerText = `₱${dailyTotal.toFixed(2)}`;
        document.getElementById('report-monthly').innerText = `₱${monthlyTotal.toFixed(2)}`;
        
        // Update "On Duty" Label
        document.getElementById('report-card-user').innerText = currentDisplayName || 'ADMIN';
    } else {
        document.getElementById('sales-stats').style.display = 'none';
    }

    // --- 2. FILTER TABLE DATA ---
    const filterValue = filterSelect ? filterSelect.value : 'ALL';
    let filteredSales = sales;
    
    if (filterValue !== 'ALL') {
        filteredSales = sales.filter(s => s.date.startsWith(filterValue));
    }

    // --- 3. RENDER TABLE ROWS ---
    let displayedTotal = 0;

    if (filteredSales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px; color:#999;">No transactions found.</td></tr>';
        if(tfoot) tfoot.classList.add('hidden');
        return;
    }

    filteredSales.forEach(s => {
        displayedTotal += s.total;
        const d = new Date(s.date);
        
        // CHECK STATUS
        const isPending = s.voidRequest && s.voidRequest.status === 'pending';
        
        const tr = document.createElement('tr');

        // --- A. ADD CLICK LISTENER (RESTORED) ---
        tr.onclick = (e) => {
            // If user clicked a button (Void/Approve/Reject), DO NOT open the details modal
            if(e.target.closest('button')) return;
            
            // Otherwise, open the modal
            viewSaleDetails(s.id);
        };
        // ----------------------------------------

        // --- B. STYLING (Orange for Pending) ---
        if(isPending) {
            tr.style.background = '#fff7ed'; // Light Orange
            tr.style.borderLeft = '4px solid #f97316'; // Orange indicator
        }

        // --- C. BUTTON LOGIC ---
        let actionButtons = '';

        if (isPending) {
            // IF PENDING
            if (currentRole === 'admin') {
                // Admin sees: Approve / Reject
                actionButtons = `
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <button class="btn-danger" style="font-size:0.7rem; padding:4px 8px; border-radius:4px;" onclick="approveVoid('${s.id}')">Approve</button>
                        <button class="btn-text" style="font-size:0.7rem; padding:4px 8px; border:1px solid #ccc; background:white; border-radius:4px;" onclick="rejectVoid('${s.id}')">Reject</button>
                    </div>
                `;
            } else {
                // Cashier sees: "PENDING" text
                actionButtons = `<span style="color:#f97316; font-size:0.75rem; font-weight:bold;">PENDING REVIEW</span>`;
            }
        } else {
            // NORMAL SALE
            actionButtons = `<button class="btn-danger btn-table-action" onclick="voidSale('${s.id}')">Void</button>`;
        }

        tr.innerHTML = `
            <td>
                <div style="font-weight:600">${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                <small style="color:#64748b">${s.items.length} items | Cashier: ${s.cashier || '?'}</small>
                ${isPending ? `<div style="color:#c2410c; font-size:0.75rem; font-style:italic; margin-top:2px;">Reason: ${s.voidRequest.reason}</div>` : ''}
            </td>
            <td style="text-align:right; font-weight:bold; color:var(--primary);">
                ₱${s.total.toFixed(2)}
            </td>
            <td style="text-align:right">
                ${actionButtons}
            </td>
        `;
        tbody.appendChild(tr);
    });

    // --- 4. UPDATE FOOTER TOTAL ---
    if(tfoot) {
        document.getElementById('filtered-total-display').innerText = `₱${displayedTotal.toFixed(2)}`;
        tfoot.classList.remove('hidden');
    }
}
// --- CHECKOUT LOGIC ---
window.approveVoid = (id) => {
    showConfirm("Approve void? This will remove the sale.", async () => {
        await deleteDoc(doc(db, "sales", id));
        showAlert("Sale Voided.");
    }, "Approve & Delete", "Cancel", "Confirm Void");
}

// 2. Reject: Removes the flag, keeps the sale
window.rejectVoid = (id) => {
    showConfirm("Reject request? Sale will remain valid.", async () => {
        // Remove the 'voidRequest' field
        await updateDoc(doc(db, "sales", id), {
            voidRequest: deleteField() // Requires importing deleteField from firestore
        });
        showAlert("Request Rejected.");
    }, "Reject Request", "Cancel");
}
let currentTotal = 0; // Helper to store total globally for this modal

window.openCheckoutModal = () => {
    if (!cart.length) return showAlert("Cart is empty");
    
    // 1. Target the container
    const summaryContainer = document.getElementById('checkout-summary');
    
    // 2. Build the Header (Premium Look)
    let html = `
        <div class="receipt-card">
            <div class="receipt-header">
                <span>Item</span>
                <span>Subtotal</span>
            </div>
            <div class="receipt-body">
    `;

    // 3. Build the Rows
    currentTotal = 0;
    cart.forEach(item => {
        const lineTotal = item.price * item.qty;
        currentTotal += lineTotal;
        
        html += `
            <div class="receipt-row">
                <span class="qty-badge">${item.qty}</span>
                <span class="item-name">${item.name}</span>
                <span class="item-price">₱${lineTotal.toFixed(2)}</span>
            </div>
        `;
    });

    // 4. Close the tags
    html += `</div></div>`;

    // 5. Inject HTML
    summaryContainer.innerHTML = html;

    // 6. Set Totals
    document.getElementById('checkout-total-amount').innerText = `₱${currentTotal.toFixed(2)}`;
    
    // 7. Reset Inputs
    document.getElementById('checkout-cash-input').value = '';
    document.getElementById('checkout-change-display').innerText = '₱0.00';
    document.getElementById('checkout-change-display').style.color = 'var(--accent)';
    
    // 8. Disable Confirm Button (until cash is entered)
    const btn = document.getElementById('btn-confirm-pay');
    btn.disabled = true; 
    btn.style.opacity = '0.5';

    // 9. Show Modal and Focus Input
    document.getElementById('checkout-modal').classList.remove('hidden');
    setTimeout(() => {
        const input = document.getElementById('checkout-cash-input');
        if(input) input.focus();
    }, 100);
}

window.calculateChange = () => {
    const input = document.getElementById('checkout-cash-input').value;
    const cash = parseFloat(input) || 0;
    const change = cash - currentTotal;
    const changeDisplay = document.getElementById('checkout-change-display');
    const payBtn = document.getElementById('btn-confirm-pay');

    changeDisplay.innerText = `₱${change.toFixed(2)}`;

    if (cash >= currentTotal) {
        // Valid
        changeDisplay.style.color = 'var(--accent)'; // Green
        payBtn.disabled = false;
        payBtn.style.opacity = '1';
    } else {
        // Insufficient
        changeDisplay.style.color = 'var(--danger)'; // Red
        payBtn.disabled = true;
        payBtn.style.opacity = '0.5';
    }
}

window.setCash = (amount) => {
    document.getElementById('checkout-cash-input').value = amount;
    calculateChange();
}
// --- STRICT VOID LOGIC ---
window.voidSale = (id) => {
    pendingVoidId = id;
    
    // 1. If Admin: Show the strict Password Modal (Existing behavior)
    if (currentRole === 'admin') {
        document.getElementById('auth-admin-user').value = currentUser.email.replace(EMAIL_SUFFIX, '');
        document.getElementById('auth-admin-pass').value = '';
        document.getElementById('auth-error').classList.add('hidden');
        document.getElementById('auth-modal').classList.remove('hidden');
    } 
    // 2. If Cashier: Show the "Request" Modal
    else {
        document.getElementById('void-reason').value = ''; // Reset text
        document.getElementById('void-request-modal').classList.remove('hidden');
    }
}
window.closeVoidRequest = () => { document.getElementById('void-request-modal').classList.add('hidden'); }

window.submitVoidRequest = async () => {
    const reason = document.getElementById('void-reason').value.trim();
    if(!reason) return showAlert("Please enter a reason.");
    
    try {
        // We Update the Sale Document, adding a "voidRequest" object
        await updateDoc(doc(db, "sales", pendingVoidId), {
            voidRequest: {
                status: 'pending',
                reason: reason,
                requestedBy: currentDisplayName,
                requestedAt: new Date().toISOString()
            }
        });
        
        closeVoidRequest();
        showAlert("Void Request Sent. Admin will review.");
    } catch(e) {
        showAlert("Error: " + e.message);
    }
}
window.closeAuthModal = () => { document.getElementById('auth-modal').classList.add('hidden'); }

window.executeVoid = async () => {
    const u = document.getElementById('auth-admin-user').value.trim().toLowerCase();
    const p = document.getElementById('auth-admin-pass').value;
    const err = document.getElementById('auth-error');
    
    // We must verify this against Firebase. 
    // Trick: We create a TEMPORARY secondary app instance to check credentials 
    // without logging out the current user.
    
    try {
        const { initializeApp: initApp2 } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
        const { getAuth: getAuth2, signInWithEmailAndPassword: signIn2 } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");

        const tempApp = initApp2(firebaseConfig, "voidAuth");
        const tempAuth = getAuth2(tempApp);
        
        await signIn2(tempAuth, u + EMAIL_SUFFIX, p);
        
        // If successful, we know credentials are valid. Now check if that user is actually an Admin.
        const adminDoc = await getDoc(doc(db, "users", u));
        
        if (adminDoc.exists() && adminDoc.data().role === 'admin') {
            await deleteDoc(doc(db, "sales", pendingVoidId));
            closeAuthModal();
            showAlert("Sale Voided Successfully.");
        } else {
            throw new Error("User is not an Admin");
        }
        
        // Cleanup temp app (optional, but good practice)
        // deleteApp(tempApp); 

    } catch (e) {
        console.error(e);
        err.innerText = "Invalid Admin Credentials";
        err.classList.remove('hidden');
    }
}

// --- SETTINGS & USER CREATION ---
function loadSettingsUI() {
    document.getElementById('setting-store-name').value = config.storeName || '';
    document.getElementById('setting-user').value = currentUser.email.replace(EMAIL_SUFFIX, '');
}

window.saveBranding = async () => {
    const n = document.getElementById('setting-store-name').value;
    const f = document.getElementById('setting-logo-upload').files[0];
    
    // Copy existing config to preserve other fields
    let newConfig = { ...config, storeName: n };

    try {
        if (f) {
            const r = new FileReader();
            r.onload = async (e) => {
                newConfig.logo = e.target.result; // Base64 string
                
                // 1. Save to Database
                await setDoc(doc(db, "config", "store_settings"), newConfig, { merge: true });
                
                // 2. Save to Local Storage immediately
                localStorage.setItem('storeConfig', JSON.stringify(newConfig));
                
                // 3. Update State
                config = newConfig;
                applyBranding();
                showAlert("Branding Saved & Applied!");
            };
            r.readAsDataURL(f);
        } else {
            // No new logo, just name update
            await setDoc(doc(db, "config", "store_settings"), newConfig, { merge: true });
            localStorage.setItem('storeConfig', JSON.stringify(newConfig));
            config = newConfig;
            applyBranding();
            showAlert("Store Name Saved.");
        }
    } catch (e) {
        showAlert("Error saving: " + e.message);
    }
}

function applyBranding() {
    // 1. Update Header (Inside App)
    const headerName = document.getElementById('header-store-name');
    if(headerName) headerName.innerText = config.storeName || 'Tambayan Sa Carbon';
    
    const hLogo = document.getElementById('header-logo');
    if(hLogo) {
        if(config.logo) {
            hLogo.src = config.logo; 
            hLogo.classList.remove('hidden');
        } else {
            hLogo.classList.add('hidden');
        }
    }

    // 2. Update Login Screen (The Fix)
    const loginImg = document.getElementById('login-logo-img');
    const loginText = document.getElementById('login-logo-text');

    if (config.logo) {
        // HAVE LOGO: Show Image, Hide Text
        if(loginImg) {
            loginImg.src = config.logo;
            loginImg.classList.remove('hidden');
        }
        if(loginText) loginText.classList.add('hidden');
    } else {
        // NO LOGO: Hide Image, Show Text
        if(loginImg) loginImg.classList.add('hidden');
        if(loginText) loginText.classList.remove('hidden');
    }
}

// Create Cashier using Secondary App (No Logout Required)
window.createCashier = async () => {
    const name = document.getElementById('new-cashier-name').value.trim(); // NEW
    const u = document.getElementById('new-cashier-user').value.trim().toLowerCase();
    const p = document.getElementById('new-cashier-pass').value;
    
    if(!u || !p || !name) return showAlert("Fill all fields (Name, User, Pass)");

    try {
        const { initializeApp: initApp2 } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
        const { getAuth: getAuth2, createUserWithEmailAndPassword: create2 } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");

        const tempApp = initApp2(firebaseConfig, "createUser");
        const tempAuth = getAuth2(tempApp);

        await create2(tempAuth, u + EMAIL_SUFFIX, p);
        
        // Save Role AND Display Name
        await setDoc(doc(db, "users", u), { 
            role: 'cashier',
            displayName: name 
        });

        showAlert(`Cashier '${name}' created!`);
        // Clear inputs
        document.getElementById('new-cashier-name').value = '';
        document.getElementById('new-cashier-user').value = '';
        document.getElementById('new-cashier-pass').value = '';
    } catch(e) {
        showAlert("Error: " + e.message);
    }
}

window.updateProfile = async () => {
    const p = document.getElementById('setting-pass').value;
    if(!p) return;
    try { await updatePassword(currentUser, p); showAlert("Updated. Login again."); setTimeout(logout,1500); }
    catch(e){ showAlert("Error: "+e.message); }
}
function renderStaffList(users) {
    const container = document.getElementById('staff-list');
    if (!container) return;
    container.innerHTML = '';

    // Filter out the 'admin' user so you don't delete yourself
    const staff = users.filter(u => u.id !== 'admin');

    if (staff.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:#999; font-size:0.8rem;">No staff accounts yet.</div>';
        return;
    }

    staff.forEach(u => {
        const row = document.createElement('div');
        row.style.cssText = "display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid var(--border);";
        
        row.innerHTML = `
            <div>
                <div style="font-weight:600; font-size:0.9rem;">${u.displayName || u.id.toUpperCase()}</div>
                <div style="font-size:0.75rem; color:var(--text-sub);">User: ${u.id}</div>
            </div>
            <button class="btn-danger btn-table-action" style="padding: 5px 10px; font-size: 0.8rem;" onclick="confirmDeleteStaff('${u.id}', '${u.displayName}')">
                Remove
            </button>
        `;
        container.appendChild(row);
    });
}

window.confirmDeleteStaff = (username, name) => {
    showConfirm(
        `Remove access for ${name || username}? They will be logged out immediately.`,
        async () => {
            try {
                // Delete from Firestore
                await deleteDoc(doc(db, "users", username));
                showAlert("Staff removed.");
            } catch (e) {
                showAlert("Error: " + e.message);
            }
        },
        "Remove Staff",
        "Cancel",
        "Revoke Access?"
    );
}
// --- UTILS ---
window.showAlert = (msg) => { document.getElementById('alert-msg').innerText = msg; document.getElementById('alert-modal').classList.remove('hidden'); }
window.closeAlert = () => { document.getElementById('alert-modal').classList.add('hidden'); }
// 1. Updated showConfirm (Now accepts Title and Button Labels)
window.showConfirm = (msg, callback, yesLabel = "Confirm", noLabel = "Cancel", title = "Are you sure?") => {
    document.getElementById('confirm-msg').innerText = msg;
    document.getElementById('confirm-title').innerText = title;
    
    // Update Button Text
    document.getElementById('confirm-btn-yes').innerText = yesLabel;
    document.getElementById('confirm-btn-no').innerText = noLabel;
    
    confirmCallback = callback;
    document.getElementById('confirm-modal').classList.remove('hidden');
}

// 2. Updated Logout (Uses the new labels)
window.logout = function() {
    showConfirm(
        "You will be returned to the login screen.", 
        () => {
            // ... existing logout logic ...
            signOut(auth).then(() => window.location.reload());
        },
        "Logout",   // Red Button Text
        "Cancel",   // Grey Button Text
        "Log Out?"  // Title
    );
};
function initStoreSettings() {
    // 1. Try to load from Local Storage immediately (Offline/Logged Out support)
    const cachedConfig = localStorage.getItem('storeConfig');
    if (cachedConfig) {
        try {
            config = JSON.parse(cachedConfig);
            applyBranding(); // Update UI immediately
        } catch (e) {
            console.error("Error parsing cached settings", e);
        }
    }

    // 2. Listen for live updates from database
    onSnapshot(doc(db, "config", "store_settings"), (snap) => {
        if (snap.exists()) {
            config = snap.data();
            // Save to Local Storage for next time
            localStorage.setItem('storeConfig', JSON.stringify(config));
            applyBranding();
        }
    }, (error) => {
        // This error is expected on the Login Screen (Permission Denied),
        // but it's fine because we loaded from Local Storage in step 1.
        console.log("Using cached branding (Live sync paused until login).");
    });
}
window.closeConfirm = (r) => { document.getElementById('confirm-modal').classList.add('hidden'); if(r && confirmCallback) confirmCallback(); }
window.viewSaleDetails = (id) => {
    const sale = sales.find(s => s.id === id);
    if (!sale) return;

    // 1. Populate Metadata (Date, Cashier, ID)
    const d = new Date(sale.date);
    const dateStr = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;
    
    document.getElementById('details-meta').innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <span><strong>Date:</strong> ${dateStr}</span>
        </div>
        <div style="margin-top:5px;"><strong>Cashier:</strong> ${sale.cashier || 'Unknown'}</div>
        <div style="font-size:0.75rem; color:#94a3b8; margin-top:2px;">ID: ${sale.id}</div>
    `;

    // 2. Build Item List (Premium Look)
    const list = document.getElementById('details-list');
    
    let html = `
        <div class="receipt-card">
            <div class="receipt-header">
                <span>Item</span>
                <span>Subtotal</span>
            </div>
            <div class="receipt-body">
    `;

    sale.items.forEach(item => {
        const lineTotal = item.price * item.qty;
        html += `
            <div class="receipt-row">
                <span class="qty-badge">${item.qty}</span>
                <span class="item-name">${item.name}</span>
                <span class="item-price">₱${lineTotal.toFixed(2)}</span>
            </div>
        `;
    });

    html += `</div></div>`;
    list.innerHTML = html;

    // 3. Populate Totals (Cash & Change Logic)
    const cashReceived = sale.cashReceived || 0;
    const changeVal = sale.change || 0;

    const cashStr = sale.cashReceived ? `₱${cashReceived.toFixed(2)}` : '-';
    
    // Label as "EXACT AMOUNT" if change is 0
    let changeStr;
    if (Math.abs(changeVal) < 0.01) {
        changeStr = `<span style="color:var(--accent); font-weight:bold;">EXACT AMOUNT</span>`;
    } else {
        changeStr = `₱${changeVal.toFixed(2)}`;
    }

    document.getElementById('details-total').innerHTML = `
        <div style="display:flex; justify-content:space-between; font-size:0.9rem; color:#64748b; margin-bottom:5px;">
            <span>Cash Given:</span> <span>${cashStr}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:0.9rem; color:#64748b; margin-bottom:10px; border-bottom:1px solid #e2e8f0; padding-bottom:10px;">
            <span>Change:</span> <span>${changeStr}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:1.2rem; font-weight:800; color:var(--primary);">
            <span>Total:</span> <span>₱${sale.total.toFixed(2)}</span>
        </div>
    `;

    // 4. Show Modal
    document.getElementById('details-modal').classList.remove('hidden');
}
window.setExact = () => {
    document.getElementById('checkout-cash-input').value = currentTotal.toFixed(2);
    calculateChange();
}
window.closeDetailsModal = () => {
    document.getElementById('details-modal').classList.add('hidden');
}
initStoreSettings(); 
init();

