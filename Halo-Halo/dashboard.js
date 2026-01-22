import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, query, deleteDoc, orderBy, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

// --- CONFIG ---
const firebaseConfig = {
  apiKey: "AIzaSyB75-jx80BqGjs3grB1sKKrPqmGEiPBIs8",
  authDomain: "johanas-bd440.firebaseapp.com",
  projectId: "johanas-bd440",
  storageBucket: "johanas-bd440.firebasestorage.app",
  messagingSenderId: "192280691657",
  appId: "1:192280691657:web:ea877da20a6c96ac8b5e18",
  measurementId: "G-CB154T9K3K"
};


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// GLOBAL CACHE
let allOrdersCache = [];

// --- 1. INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = "index.html";
        } else {
            initDashboard();
        }
    });
    setupNavigation();
});

// --- 2. MAIN DASHBOARD LOGIC ---
function initDashboard() {
    console.log("Initializing Dashboard..."); // Debug 1
    
    // 1. SAFE QUERY (Removes 'orderBy' temporarily to test connection)
    // If this works, add ', orderBy("timestamp", "desc")' back later.
    const orderQ = query(collection(db, "orders"));
    
     onSnapshot(orderQ, (snapshot) => {
        console.log(`Fetched ${snapshot.size} orders`); // This should now jump to 6+

        allOrdersCache = [];
        const pendingContainer = document.getElementById('pendingGrid');
        
        if (!pendingContainer) {
            console.error("CRITICAL ERROR: <div id='pendingGrid'> is missing from HTML!");
            return;
        }
        
        pendingContainer.innerHTML = ''; // Clear current list

        let pendingCount = 0;
        let completedTodayCount = 0;
        const todayStr = new Date().toDateString();

         const sortedDocs = snapshot.docs.sort((a, b) => {
            const tA = a.data().timestamp ? a.data().timestamp.seconds : 0;
            const tB = b.data().timestamp ? b.data().timestamp.seconds : 0;
            return tB - tA;
        });

        // Use sortedDocs instead of snapshot for the loop
        sortedDocs.forEach(docSnap => { 
            const data = docSnap.data();
            const id = docSnap.id;
            
            // Safe Timestamp Conversion
            let dateObj = new Date();
            if (data.timestamp && data.timestamp.toDate) {
                dateObj = data.timestamp.toDate();
            } else if (data.timestamp && data.timestamp.seconds) {
                dateObj = new Date(data.timestamp.seconds * 1000);
            }

            allOrdersCache.push({ id: id, ...data, dateObj: dateObj });

            // Status Check
            const isLive = (data.status === 'pending' || data.status === 'confirmed' || data.status === 'completed');
            
            if (isLive) {
                console.log(`Render Card: #${data.queueNum} (${data.status})`); // Debug 3
                pendingCount++;
                renderPendingCard(id, data, dateObj, pendingContainer);
            }

            // Stats Count
            if (dateObj.toDateString() === todayStr) {
                if (data.status === 'completed' || data.status === 'paid' || data.status === 'served') {
                    completedTodayCount++;
                }
            }
        });

        // Update Text Stats
        const statPending = document.getElementById('statPending');
        const statCompleted = document.getElementById('statCompleted');
        if(statPending) statPending.innerText = pendingCount;
        if(statCompleted) statCompleted.innerText = completedTodayCount;
        
        // Refresh Sales if active
        if(document.getElementById('viewSales') && document.getElementById('viewSales').classList.contains('active')) {
            updateSalesView();
        }
    });

    initReviewsListener();
    initSalesDropdowns(); 
}

// --- 3. SALES TRACKER LOGIC (View B) ---
function initSalesDropdowns() {
    
    // 1. DATA SOURCES
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    const currentYear = new Date().getFullYear();
    const years = [];
    for(let i = currentYear; i >= 2024; i--) {
        years.push(i);
    }

    // 2. SETUP FUNCTIONS
    setupCustomDD('ddMonth', months, new Date().getMonth(), (val) => {
        // Callback when changed
        updateSalesView();
    });

    setupCustomDD('ddYear', years, currentYear, (val) => {
        // Callback when changed
        updateSalesView();
    });

    // 3. GLOBAL CLICK LISTENER (To close dropdowns when clicking outside)
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-dd')) {
            document.querySelectorAll('.custom-dd').forEach(dd => dd.classList.remove('active'));
        }
    });
}

// --- HELPER: RENDER CUSTOM DROPDOWN ---
function setupCustomDD(containerId, dataArray, initialVal, onChangeCallback) {
    const container = document.getElementById(containerId);
    if(!container) return;

    const input = container.querySelector('input[type="hidden"]');
    const triggerLabel = container.querySelector('.dd-label');
    const menu = container.querySelector('.dd-menu');
    const trigger = container.querySelector('.dd-trigger');

    // Clear Menu
    menu.innerHTML = '';

    // A. Populate Options
    dataArray.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'dd-option';
        
        // Handle Key/Value differences
        // If it's the Month dropdown, value is Index (0-11). If Year, value is the Year itself (2025).
        const value = (containerId === 'ddMonth') ? index : item;
        
        div.innerText = item;
        
        // Click Option
        div.onclick = () => {
            // Set Value
            input.value = value;
            triggerLabel.innerText = item;
            
            // Visual Selection
            menu.querySelectorAll('.dd-option').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');
            
            // Close & Trigger Callback
            container.classList.remove('active');
            onChangeCallback(value);
        };

        // Set Initial Selection
        if(value == initialVal) {
            div.classList.add('selected');
            input.value = value;
            triggerLabel.innerText = item;
        }

        menu.appendChild(div);
    });

    // B. Toggle Menu
    trigger.onclick = (e) => {
        e.stopPropagation(); // Prevent document click from closing immediately
        // Close others
        document.querySelectorAll('.custom-dd').forEach(dd => {
            if(dd !== container) dd.classList.remove('active');
        });
        // Toggle current
        container.classList.toggle('active');
    };
}

function updateSalesView() {
    const m = parseInt(document.getElementById('filterMonth').value);
    const y = parseInt(document.getElementById('filterYear').value);

    // Update Labels
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const lblYear = document.getElementById('lblYear');
    const lblMonth = document.getElementById('lblMonth');
    if (lblYear) lblYear.innerText = y;
    if (lblMonth) lblMonth.innerText = monthNames[m];

    // --- VARIABLES ---
    const dayMap = {}; 
    const dailyLogData = {}; 
    let totalRevenueMonth = 0; 
    let totalOrdersMonth = 0;

    // --- LOOP THROUGH ORDERS ---
    allOrdersCache.forEach(o => {
        // Only count Completed/Paid/Served orders for Sales Stats
        // We include 'served' now too so they count towards revenue even after pickup
        const validForStats = (o.status === 'completed' || o.status === 'paid' || o.status === 'served');

        if (validForStats) {
            
            // 1. Global Aggregation (For Busiest Day)
            const dateKey = o.dateObj.toDateString(); 
            if(!dayMap[dateKey]) dayMap[dateKey] = 0;
            dayMap[dateKey] += o.total;

            // 2. Filter for Selected Month & Year
            if (o.dateObj.getMonth() === m && o.dateObj.getFullYear() === y) {
                const day = o.dateObj.getDate();
                
                // Init day
                if(!dailyLogData[day]) {
                    dailyLogData[day] = { count: 0, cash: 0, online: 0, total: 0 };
                }
                
                // Increment Stats
                dailyLogData[day].count++;
                dailyLogData[day].total += o.total;
                totalRevenueMonth += o.total;
                totalOrdersMonth++;

                // Payment Type Split
                if (o.paymentMethod === 'GCash' || o.paymentMethod === 'BPI') {
                    dailyLogData[day].online += o.total;
                } else {
                    dailyLogData[day].cash += o.total;
                }
            }
        }
    });

    // --- CALCULATE PEAKS ---
    let bestAllTime = { date: null, total: 0 };
    let bestYear = { date: null, total: 0 };
    let bestMonth = { date: null, total: 0 };

    for (const [dateStr, total] of Object.entries(dayMap)) {
        const d = new Date(dateStr);
        if (total > bestAllTime.total) bestAllTime = { date: d, total };
        if (d.getFullYear() === y) {
            if (total > bestYear.total) bestYear = { date: d, total };
            if (d.getMonth() === m) {
                if (total > bestMonth.total) bestMonth = { date: d, total };
            }
        }
    }

    // --- UPDATE UI TEXT ---
    const fmt = (d) => d ? d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '-';

    if(document.getElementById('busiestAllTime')) {
        document.getElementById('busiestAllTime').innerText = fmt(bestAllTime.date);
        document.getElementById('valAllTime').innerText = `₱${bestAllTime.total.toLocaleString()}`;
    }
    if(document.getElementById('busiestYear')) {
        document.getElementById('busiestYear').innerText = fmt(bestYear.date);
        document.getElementById('valYear').innerText = `₱${bestYear.total.toLocaleString()}`;
    }
    if(document.getElementById('busiestDay')) {
        document.getElementById('busiestDay').innerText = fmt(bestMonth.date);
        document.getElementById('valMonth').innerText = `₱${bestMonth.total.toLocaleString()}`;
    }

    document.getElementById('monthTotalSales').innerText = `₱${totalRevenueMonth.toLocaleString()}`;
    document.getElementById('monthTotalCount').innerText = totalOrdersMonth;

    // --- RENDER TABLE ---
    renderSalesTable(dailyLogData, m, y);
    
    // REMOVED: renderPaydayTable() call is gone!
}

// --- 4. RENDER: DAILY SALES LOG ---
function renderSalesTable(dailyData, month, year) {
    const tbody = document.getElementById('salesTableBody');
    if(!tbody) return; // Safety check
    tbody.innerHTML = ''; 

    const activeDays = Object.keys(dailyData).map(Number).sort((a, b) => a - b);

    if (activeDays.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:30px; color:#666;">No sales yet.</td></tr>`;
        return;
    }

    const mStr = String(month + 1).padStart(2, '0');
    const now = new Date();
    const isCurrentMonth = (now.getMonth() === month && now.getFullYear() === year);
    const todayDate = now.getDate();

    activeDays.forEach(d => {
        const stats = dailyData[d];
        const dStr = String(d).padStart(2, '0');
        const specificDate = new Date(year, month, d);
        const dayName = specificDate.toLocaleDateString('en-US', { weekday: 'short' }); 
        const dateDisplay = `<span style="color:#888; font-size:0.8rem; margin-right:5px;">${dayName}</span> ${mStr}/${dStr}`;

        const tr = document.createElement('tr');
        if (isCurrentMonth && d === todayDate) {
            tr.classList.add('today-row');
            tr.id = 'activeDayRow';
        }
        tr.classList.add('clickable-row');
        tr.onclick = (e) => viewHistoryLog(e, d, month, year);

        const cashDisplay = stats.cash > 0 ? `₱${stats.cash.toLocaleString()}` : '-';
        const onlineDisplay = stats.online > 0 ? `₱${stats.online.toLocaleString()}` : '-';
        const totalDisplay = `₱${stats.total.toLocaleString()}`;

        // UPDATED COLUMNS: Date | Count | Cash | Online | Total
        tr.innerHTML = `
            <td>${dateDisplay}</td>
            <td class="text-center">${stats.count}</td>
            <td class="text-right text-success">${cashDisplay}</td>
            <td class="text-right" style="color:#2196F3;">${onlineDisplay}</td>
            <td class="text-right" style="font-weight:bold; color:white;">${totalDisplay}</td>
        `;
        tbody.appendChild(tr);
    });

    setTimeout(() => {
        const target = document.getElementById('activeDayRow');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
}

// --- 5. RENDER: PAYDAY TABLE (To Collect) ---
function renderPaydayTable(dataList) {
    const tbody = document.getElementById('paydayTableBody');
    tbody.innerHTML = '';

    if (dataList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:20px; color:#666;">All Caught Up! No debts.</td></tr>`;
        return;
    }

    // Sort by Date (Oldest first)
    dataList.sort((a, b) => a.date - b.date);

    dataList.forEach(item => {
        const dateStr = item.date.toLocaleDateString(undefined, {month:'numeric', day:'numeric'});
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div style="font-weight:600; color:#eee;">${item.name}</div>
                <div class="acct-sub"><span style="color:var(--gold);">${dateStr}</span> • Acct: ${item.acct}</div>
            </td>
            <td class="text-center" style="font-family:monospace; font-size:1rem;">₱${item.total}</td>
            <td class="text-center">
                <button class="btn-pay-toggle" onclick="markPaydayPaid('${item.docId}')">
                    MARK PAID
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.markPaydayPaid = async function(docId) {
    // Calls the custom modal and waits for a click
    const isConfirmed = await showCustomConfirm("Mark this employee's debt as PAID?");
    
    if (!isConfirmed) return; // User clicked Cancel

    try {
        await updateDoc(doc(db, "orders", docId), { status: 'paid' });
        showToast("Payment Marked", "success");
    } catch(e) {
        showToast(e.message, "error");
    }
}


// Mark Kitchen Order DONE
window.markDone = async function(id) {
    try {
        await updateDoc(doc(db, "orders", id), { status: 'completed' });
        // Optional: showToast("Order Completed", "success"); 
    } catch(e) {
        showToast(e.message, "error"); // <--- CHANGED
    }
};


// View History Logic (Right Drawer)
window.viewHistoryLog = function(event, day, month, year) {
    if(event) event.stopPropagation(); // Stop bubbling
    
    const drawer = document.getElementById('dailyLogDrawer');
    const tbody = document.getElementById('dailyLogBody');
    const title = document.getElementById('drawerTitle');

    if(!tbody) return;
    tbody.innerHTML = ''; // Clear previous data
    
    const targetDate = new Date(year, month, day);
    const today = new Date();
    
    // Set Title
    if (targetDate.toDateString() === today.toDateString()) {
        title.innerText = "Today's Log (Live)";
    } else {
        title.innerText = `Log: ${targetDate.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}`;
    }

    // Filter Cache
    const dayOrders = allOrdersCache.filter(o => {
        // 1. Match Date
        const isSameDay = (
            o.dateObj.getDate() === day &&
            o.dateObj.getMonth() === month &&
            o.dateObj.getFullYear() === year
        );
        
        // 2. Match Valid Status (Completed, Paid, or Served)
        // We exclude 'pending' because those are still in the kitchen
        // We exclude 'cancelled'
        const isValid = (o.status === 'completed' || o.status === 'paid' || o.status === 'served');
        
        return isSameDay && isValid;
    });

    if (dayOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#666;">No finished orders found.</td></tr>';
    } else {
        // Sort: Newest Time First
        dayOrders.sort((a,b) => b.timestamp - a.timestamp);
        dayOrders.forEach(data => renderDailyLogRow(data, tbody));
    }

    drawer.classList.add('open');
}

// --- 7. HELPERS & RENDERERS ---

function renderDailyLogRow(data, tbody) {
    // A. Format Time
    const time = data.dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // B. Format Items (e.g., "2x Halo-Halo")
    const orderHtml = (data.items || []).map(i => 
        `<div class="log-item-row">
            <span>${i.name}</span> 
            <span style="color:var(--gold); font-weight:bold;">x${i.qty}</span>
         </div>`
    ).join('');
    
    // C. Format Payment Method
    const methodText = data.paymentMethod || 'Cash';
    let methodClass = 'cash';
    let methodDisplay = '';

    if (['GCash', 'BPI'].includes(methodText)) {
        methodClass = 'online';
        // If proof exists, show clickable button
        if (data.proofOfPayment) {
            methodDisplay = `
                <button class="method-badge ${methodClass} proof-btn" onclick="viewProof('${data.proofOfPayment}')" title="View Screenshot">
                    ${methodText} <i class="fas fa-paperclip" style="margin-left:4px;"></i>
                </button>
            `;
        } else {
            methodDisplay = `<span class="method-badge ${methodClass}">${methodText}</span>`;
        }
    } else {
        // Default Cash
        methodDisplay = `<span class="method-badge cash">${methodText}</span>`;
    }

    // D. Build Row
    const row = document.createElement('tr');
    
    row.innerHTML = `
        <td style="vertical-align: top; padding-top: 10px;">
            <div style="font-size:0.8rem; color:var(--gold); font-family:monospace;">${time}</div>
            <div style="font-weight:600; color:#eee;">${data.customerName}</div>
            <div style="font-size:0.7rem; color:#888;">Order #${data.queueNum || '??'}</div>
        </td>
        <td style="vertical-align: top; padding-top: 10px;">${orderHtml}</td>
        <td style="vertical-align: top; padding-top: 10px;">
            ${methodDisplay}
        </td>
        <td class="text-right" style="vertical-align: top; padding-top: 10px; font-weight:bold; color:white;">
            ₱${data.total}
        </td>
    `;
    tbody.appendChild(row);
}
function renderPendingCard(id, data, date, container) {
    // 1. Format Time & Queue
    const time = date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now';
    const qNum = data.queueNum ? `#${String(data.queueNum).padStart(6, '0')}` : '??';
    
    // 2. Status Definitions
    const isReady = data.status === 'completed';    
    // CRITICAL FIX: True if 'paid', False if 'unpaid'
    const isPaid = data.financialStatus === 'paid'; 
    
    // 3. Payment Method Types
    const isOnline = (data.paymentMethod === 'GCash' || data.paymentMethod === 'BPI');
    const isCOD = (data.paymentMethod === 'COD');       
    const isPayday = (data.paymentMethod === 'Payday'); 

    // --- LOCK LOGIC ---
    // Lock Kitchen if: NOT Paid AND NOT a Pay-Later type
    const isLocked = !isPaid && !isCOD && !isPayday;

    // --- PAYMENT ACTIONS (Top of Card) ---
    let paymentActionHtml = '';

    if (isOnline) {
        // === TYPE A: ONLINE (GCash) ===
        const proofBtn = data.proofOfPayment 
            ? `<button class="btn-action-small" onclick="viewProof('${data.proofOfPayment}')" title="View Screenshot"><i class="fas fa-image"></i> Proof</button>` 
            : `<span style="color:#d32f2f; font-size:0.8rem;">No Proof</span>`;

        let verifyBtn = '';
        if (isPaid) {
            // TRUE (Paid): Show Static Badge
            verifyBtn = `<span style="color:#4CAF50; font-weight:bold; font-size:0.8rem;"><i class="fas fa-check-circle"></i> PAID</span>`;
        } else {
            // FALSE (Unpaid): Show Verify Button
            verifyBtn = `<button class="btn-action-small verify" onclick="verifyOnlinePayment('${id}')" title="Confirm Receipt"><i class="fas fa-money-bill-wave"></i> Verify</button>`;
        }

        paymentActionHtml = `
            <div style="margin-top:10px; padding-top:10px; border-top:1px dashed #444; display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; gap:5px;">${proofBtn}</div>
                <div>${verifyBtn}</div>
            </div>`;
    } 
    else if (!isCOD && !isPayday) {
        // === TYPE B: CASHIER (Dine-in/Take-out) ===
        if (isPaid) {
            // TRUE (Paid): Show Info Badge
            paymentActionHtml = `
                <div style="margin-top:10px; padding-top:10px; border-top:1px dashed #444; text-align:right;">
                    <span style="color:#4CAF50; font-weight:bold; font-size:0.9rem;">
                        <i class="fas fa-check-circle"></i> CASH PAID
                    </span>
                    <div style="font-size:0.7rem; color:#888;">
                        Received: ₱${data.cashReceived || data.total} | Change: ₱${data.changeDue || 0}
                    </div>
                </div>`;
        } else {
            // FALSE (Unpaid): Show Calculator Button
            paymentActionHtml = `
                <div style="margin-top:10px; padding-top:10px; border-top:1px dashed #444;">
                    <button onclick="openCashModal('${id}', ${data.total})" 
                        style="width:100%; background:var(--gold); color:black; font-weight:bold; border:none; padding:12px; border-radius:4px; cursor:pointer; animation: pulse 2s infinite;">
                        <i class="fas fa-cash-register"></i> RECEIVE CASH (REQ)
                    </button>
                </div>`;
        }
    }

    // --- MAIN KITCHEN BUTTON (Bottom of Card) ---
    let mainActionHtml = '';

    if (isReady) {
        // State: Cooked -> Ready for Pickup
        mainActionHtml = `
            <div style="text-align:center; color:#4CAF50; font-weight:bold; margin-bottom:10px; animation: blink 1s infinite;">
                <i class="fas fa-bell"></i> READY FOR PICKUP
            </div>
            <button class="btn-done" style="background:#333; border:1px solid #666;" onclick="markServed('${id}')">
                ORDER CLAIMED (REMOVE)
            </button>
        `;
    } else {
        // State: Cooking
        if (isLocked) {
            // LOCKED (Must Pay First)
            mainActionHtml = `
                <button class="btn-done" disabled style="background:#222; color:#555; border:1px solid #333; cursor:not-allowed;">
                    <i class="fas fa-lock"></i> PAYMENT REQUIRED
                </button>
                <div style="text-align:center; font-size:0.7rem; color:#d32f2f; margin-top:5px;">
                    Receive Payment to Unlock
                </div>
            `;
        } else {
            // UNLOCKED (Paid or Credit)
            mainActionHtml = `
                <button class="btn-done" onclick="markDone('${id}')">
                    KITCHEN DONE (RING BELL)
                </button>
            `;
        }
    }

    // --- BUILD ITEMS LIST ---
    let itemsHtml = (data.items || []).map(i => 
        `<li>
            <span style="color:var(--gold); font-weight:bold; font-size:1.3rem; margin-right:10px;">${i.qty}x</span>
            <span style="color:white; font-size:1.1rem;">${i.name}</span>
         </li>`
    ).join('');

    // Meta Data
    let metaHtml = '';
    let cleanPhone = "";
    if(data.contactNum && data.contactNum !== "N/A") {
        cleanPhone = data.contactNum.replace(/^0/, "63").replace(/[^0-9]/g, "");
        metaHtml += `<div><i class="fas fa-phone"></i> ${data.contactNum}</div>`;
    }
    if(data.addressDetails) {
        metaHtml += `<div style="font-weight:bold; color:#ccc; margin-top:3px;">${data.addressDetails}</div>`;
    }

    // --- DELIVERY SPECIFICS ---
    let deliveryHtml = '';
    if (data.orderType === 'Delivery') {
        const safeName = (data.customerName || 'Customer').replace(/'/g, "\\'");
        const safeEmail = (data.email || '');

        if (data.deliveryFee && data.deliveryFee > 0) {
            deliveryHtml = `
                <div class="maxim-applied">
                    <div>
                        <span style="color:#aaa;">Food: ₱${data.subtotal}</span><br>
                        <span style="color:#ff6b6b;">+ Rider: ₱${data.deliveryFee}</span>
                        ${data.maximProof ? `<br><a href="#" onclick="viewProof('${data.maximProof}')" style="font-size:0.8rem; color:var(--gold);">[View Maxim Proof]</a>` : ''}
                    </div>
                   
                </div>`;
        } else {
            deliveryHtml = `
                <div class="maxim-box">
                    <p style="font-size:0.8rem; color:#aaa; margin-bottom:5px;"><i class="fas fa-motorcycle"></i> Add Maxim Rate</p>
                    <div style="display:flex; gap:5px; margin-bottom:5px;">
                        <input type="number" id="feeInput_${id}" placeholder="Fee (₱)" class="df-input" style="width:70px;">
                        <input type="file" id="feeProof_${id}" accept="image/*" class="df-file">
                    </div>
                    <button class="btn-action-small" onclick="submitDeliveryFee('${id}', ${data.total}, '${safeEmail}', '${safeName}')" style="width:100%; justify-content:center; background:#444;">
                        Update Total & Notify
                    </button>
                </div>`;
        }
    }

    // --- FINAL CARD HTML ---
    const card = document.createElement('div');
    card.className = 'order-card';
    card.setAttribute('data-status', data.status);

    card.innerHTML = `
        <div class="card-top">
            <span style="font-size:1.1rem;">${time}</span>
            <div style="display:flex; align-items:center; gap:10px;">
                <span class="method-badge ${isOnline ? 'online' : 'cash'}">${data.paymentMethod}</span>
                <span style="font-size:1.5rem; color:var(--gold); font-weight:800;">${qNum}</span>
            </div>
        </div>
        <div class="card-body">
            <div class="cust-name">${data.customerName || 'Guest'}</div>
            <div class="cust-meta">${metaHtml}</div>
            <ul class="items-list">${itemsHtml}</ul>
            ${deliveryHtml}
            <div style="text-align:right; font-weight:bold; color:var(--gold); margin-top:10px; font-size:1.2rem; border-top:1px solid #333; padding-top:10px;">
                Total: ₱${data.total}
            </div>
            ${data.note ? `<div style="margin-top:10px; padding:10px; border:1px solid #d32f2f; color:#ff6b6b; font-weight:bold; background:rgba(211,47,47,0.1);">NOTE: "${data.note}"</div>` : ''}
            ${paymentActionHtml}
        </div>
        <div class="card-actions">${mainActionHtml}</div>
    `;

    container.appendChild(card);
}

window.viewProof = function(url) {
    const img = document.getElementById('proofImgDisplay');
    const box = document.getElementById('proofLightbox');
    
    if(img && box) {
        img.src = url;
        box.classList.remove('hidden');
    } else {
        console.error("Lightbox elements missing in HTML");
    }
}

// 2. Verify Payment (Updates a specific field, doesn't remove card)
window.verifyOnlinePayment = async function(docId) {
    const isConfirmed = await showCustomConfirm("Confirm money received in GCash?");
    if (!isConfirmed) return;

    try {
        // We set financialStatus to 'paid'. 
        // We DO NOT set main status to 'completed' because the kitchen might still be cooking.
        await updateDoc(doc(db, "orders", docId), { financialStatus: 'paid' });
        showToast("Payment Verified", "success");
    } catch(e) {
        showToast(e.message, "error");
    }
}


function setupNavigation() {
    // 1. Tab Switching
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if(btn.classList.contains('locked')) return;
        btn.onclick = () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
            const viewId = btn.getAttribute('data-view');
            
            if(viewId === 'sales') {
                document.getElementById('viewSales').classList.add('active');
                initSalesDropdowns();
                updateSalesView();
            } else if (viewId === 'feedbacks') {
                document.getElementById('viewFeedbacks').classList.add('active');
            } else {
                document.getElementById('viewOrders').classList.add('active');
            }
        };
        document.querySelectorAll('.btn-logout-action').forEach(btn => {
        btn.onclick = () => signOut(auth);
    });
    });

    // 2. Drawer Logic (THE FIX)
    const drawer = document.getElementById('dailyLogDrawer');
    
    // When clicking the main "Clock" button, Load TODAY'S data
    document.getElementById('openDrawerBtn').onclick = (e) => {
        e.stopPropagation();
        const today = new Date();
        // Load history for today
        viewHistoryLog(e, today.getDate(), today.getMonth(), today.getFullYear());
    };

    // Close buttons
    document.getElementById('closeDrawer').onclick = () => drawer.classList.remove('open');
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') drawer.classList.remove('open'); });
    window.addEventListener('click', (e) => {
        if (drawer.classList.contains('open') && !drawer.contains(e.target)) {
            drawer.classList.remove('open');
        }
    });

    // 3. Logout
    document.getElementById('logoutBtn').onclick = () => signOut(auth);
}

function playNotificationSound() {
    const soundURI = "data:audio/mp3;base64,//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq";
    new Audio(soundURI).play().catch(e => console.log("Audio waiting for interaction"));
}

function initReviewsListener() {
    const reviewQ = query(collection(db, "reviews"), orderBy("timestamp", "desc"));
    onSnapshot(reviewQ, (snapshot) => {
        const container = document.getElementById('adminReviewsGrid');
        const avgLabel = document.getElementById('avgRating');
        if (!container) return;
        
        container.innerHTML = '';
        let totalStars = 0; let count = 0;

        if (snapshot.empty) {
            container.innerHTML = '<p style="color:#666; text-align:center; grid-column:1/-1;">No reviews yet.</p>';
        }

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            const date = data.timestamp ? new Date(data.timestamp.seconds*1000).toLocaleDateString() : 'N/A';
            const stars = '★'.repeat(data.rating) + '☆'.repeat(5-data.rating);
            totalStars += data.rating; count++;

            const card = document.createElement('div');
            card.className = 'order-card';
            card.innerHTML = `<div class="card-top" style="display:flex; justify-content:space-between; align-items:center;"><span>${date}</span><div><span style="color:var(--gold); margin-right:10px;">${stars}</span><button onclick="deleteReview('${id}')" style="background:none; border:none; color:#d32f2f; cursor:pointer;" title="Delete"><i class="fas fa-trash"></i></button></div></div><div class="card-body"><div class="cust-name">${data.name || 'Anonymous'}</div><div style="color:#ccc; font-style:italic; margin-top:5px; font-size:0.9rem;">"${data.comment}"</div></div>`;
            container.appendChild(card);
        });

        if(avgLabel) avgLabel.innerText = count > 0 ? (totalStars / count).toFixed(1) : "0.0";
    });
}

window.deleteReview = async function(id) {
    const isConfirmed = await showCustomConfirm("Remove this review permanently?");
    
    if(isConfirmed) {
        try {
            await deleteDoc(doc(db, "reviews", id));
            showToast("Review Deleted", "success");
        } catch(e) {
            showToast("Error deleting", "error");
        }
    }
}

const showToast = (msg, type = 'success') => {
    const box = document.getElementById('toastBox');
    if(!box) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> <span>${msg}</span>`;
    box.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { 
        toast.classList.remove('show'); 
        setTimeout(() => toast.remove(), 400); 
    }, 3000);
};

function showCustomConfirm(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('customConfirmModal');
        const msgEl = document.getElementById('confirmMsg');
        const btnYes = document.getElementById('btnConfirmYes');
        const btnNo = document.getElementById('btnConfirmNo');

        // Safety Check
        if(!modal) {
            console.error("Modal #customConfirmModal not found in HTML");
            return resolve(false); // Fail safe
        }

        // Set Message
        if(msgEl) msgEl.innerText = message;
        
        // Show Modal
        modal.classList.remove('hidden');

        // Cleanup Helper
        const cleanup = () => {
            modal.classList.add('hidden');
            btnYes.onclick = null;
            btnNo.onclick = null;
        };

        // Handle Yes
        btnYes.onclick = () => {
            cleanup();
            resolve(true);
        };

        // Handle No
        btnNo.onclick = () => {
            cleanup();
            resolve(false);
        };
    });
}
// 1. First Click: Kitchen finishes food (Moves to 'Now Serving')
window.markDone = async function(id) {
    try {
        // This makes it appear on the "Now Serving" screen and rings the bell
        await updateDoc(doc(db, "orders", id), { status: 'completed' });
    } catch(e) {
        showToast("Error updating status", "error");
    }
};

// 2. Second Click: Customer took food (Removes from screens)
window.markServed = async function(id) {
    try {
        // 'served' status is ignored by both Dashboard and Waiting Screen
        await updateDoc(doc(db, "orders", id), { status: 'served' });
        showToast("Order Cleared", "success");
    } catch(e) {
        showToast("Error clearing order", "error");
    }
};
window.submitDeliveryFee = async function(docId, currentSubtotal) {
    const feeInput = document.getElementById(`feeInput_${docId}`);
    const fileInput = document.getElementById(`feeProof_${docId}`);
    
    const feeAmount = parseFloat(feeInput.value);
    const file = fileInput.files[0];

    // Validation
    if (!feeAmount || feeAmount <= 0) return showToast("Enter valid fee amount", "error");
    if (!file) return showToast("Maxim screenshot required", "error");

    const btn = feeInput.parentElement.nextElementSibling; // The button
    btn.innerText = "Uploading...";
    btn.disabled = true;

    try {
        // 1. Upload Screenshot to ImgBB
        const formData = new FormData();
        formData.append('image', file);
        formData.append('key', "67e7a695efab5ecf8c5983e264b260a5"); // Use your API Key

        const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData });
        const json = await res.json();

        if (!json.success) throw new Error("Image Upload Failed");

        const proofUrl = json.data.url;
        const newTotal = currentSubtotal + feeAmount;

        // 2. Update Firebase
        await updateDoc(doc(db, "orders", docId), {
            subtotal: currentSubtotal, // Save old total as subtotal
            deliveryFee: feeAmount,
            maximProof: proofUrl,
            total: newTotal // Update the main total
        });

        showToast("Fee Added & Total Updated", "success");

    } catch (err) {
        console.error(err);
        showToast("Failed to update fee", "error");
        btn.innerText = "Update Total";
        btn.disabled = false;
    }
};
// --- CASHIER MODAL LOGIC ---
let dashCurrentCash = 0;

window.openCashModal = function(orderId, total) {
    // 1. Reset State
    dashCurrentCash = 0;
    document.getElementById('activeOrderId').value = orderId;
    document.getElementById('activeOrderTotal').value = total;
    document.getElementById('cashModalTotal').innerText = `₱${total}`;
    
    // 2. Reset UI
    dashUpdateUI();
    
    // 3. Show Modal
    document.getElementById('cashModal').classList.remove('hidden');
}

window.closeCashModal = function() {
    document.getElementById('cashModal').classList.add('hidden');
}

window.dashAddCash = function(amount) {
    dashCurrentCash += amount;
    dashUpdateUI();
}

window.dashResetCash = function() {
    dashCurrentCash = 0;
    dashUpdateUI();
}

window.dashExactCash = function() {
    dashCurrentCash = parseFloat(document.getElementById('activeOrderTotal').value);
    dashUpdateUI();
}

function dashUpdateUI() {
    const total = parseFloat(document.getElementById('activeOrderTotal').value);
    const change = dashCurrentCash - total;
    
    // Update Text
    document.getElementById('dispCashReceived').innerText = `₱${dashCurrentCash.toLocaleString()}`;
    const changeEl = document.getElementById('dispChange');
    const confirmBtn = document.getElementById('btnConfirmPayment');

    if (change >= 0) {
        changeEl.innerText = `₱${change.toLocaleString()}`;
        changeEl.style.color = "#4CAF50"; // Green
        
        // Enable Confirm Button
        confirmBtn.disabled = false;
        confirmBtn.style.background = "var(--gold)";
        confirmBtn.style.color = "black";
        confirmBtn.style.cursor = "pointer";
        confirmBtn.innerText = `ACCEPT PAYMENT (Change: ₱${change})`;
    } else {
        changeEl.innerText = `Short ₱${Math.abs(change).toLocaleString()}`;
        changeEl.style.color = "#ff6b6b"; // Red
        
        // Disable Button
        confirmBtn.disabled = true;
        confirmBtn.style.background = "#333";
        confirmBtn.style.color = "#666";
        confirmBtn.style.cursor = "not-allowed";
        confirmBtn.innerText = "INSUFFICIENT CASH";
    }
}

window.submitCashPayment = async function() {
    const orderId = document.getElementById('activeOrderId').value;
    const total = parseFloat(document.getElementById('activeOrderTotal').value);
    const change = dashCurrentCash - total;

    const btn = document.getElementById('btnConfirmPayment');
    btn.innerText = "Processing...";

    try {
        await updateDoc(doc(db, "orders", orderId), {
            financialStatus: 'paid',
            cashReceived: dashCurrentCash,
            changeDue: change
        });
        
        showToast("Payment Recorded!", "success");
        closeCashModal();
    } catch(err) {
        console.error(err);
        showToast("Error updating order", "error");
    }
}