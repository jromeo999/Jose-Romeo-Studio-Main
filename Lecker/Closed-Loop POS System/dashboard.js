import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, query, orderBy, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

// --- CONFIG ---
const firebaseConfig = {
  apiKey: "AIzaSyBrjvQw8R5toyV8UbC8ZyRQ1TX2YKz5SSY",
  authDomain: "lecker-a33cd.firebaseapp.com",
  projectId: "lecker-a33cd",
  storageBucket: "lecker-a33cd.firebasestorage.app",
  messagingSenderId: "996792295156",
  appId: "1:996792295156:web:56f01161909e19e86f88a1",
  measurementId: "G-1CV509XRL8"
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
    // Get ALL orders ordered by time
    const orderQ = query(collection(db, "orders"), orderBy("timestamp", "desc"));
    let isFirstLoad = true;

    onSnapshot(orderQ, (snapshot) => {
        allOrdersCache = [];
        const pendingContainer = document.getElementById('pendingGrid');
        if (pendingContainer) pendingContainer.innerHTML = '';

        // --- STATS COUNTERS ---
        let pendingCount = 0;
        let completedTodayCount = 0; // "Labor" Count

        const today = new Date();
        const todayStr = today.toDateString(); // "Tue Dec 30 2025"

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            const dateObj = data.timestamp ? new Date(data.timestamp.seconds * 1000) : new Date();
            const orderDateStr = dateObj.toDateString();

            // 1. Cache Data
            allOrdersCache.push({ id: id, ...data, dateObj: dateObj });

            // 2. KITCHEN MONITOR (View A)
            // Show: 'pending' or 'confirmed'
            const isLive = (data.status === 'pending' || data.status === 'confirmed');
            
            if (isLive) {
                pendingCount++;
                if (pendingContainer) renderPendingCard(id, data, dateObj, pendingContainer);
            }

            // 3. STATS: Completed Count (Labor)
            // STRICTLY: Orders marked 'completed' or 'paid' THAT HAPPENED TODAY.
            // We include 'paid' because a paid order was once completed.
            if (orderDateStr === todayStr) {
                if (data.status === 'completed' || data.status === 'paid') {
                    completedTodayCount++;
                }
            }
        });

        // Update Top Bar Stats
        const statPending = document.getElementById('statPending');
        const statCompleted = document.getElementById('statCompleted');
        if(statPending) statPending.innerText = pendingCount;
        if(statCompleted) statCompleted.innerText = completedTodayCount;

        // Sound Notification
        if (!isFirstLoad) {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const s = change.doc.data().status;
                    if (s === 'pending') playNotificationSound();
                }
            });
        }
        isFirstLoad = false;

        // Refresh Sales View if active
        if(document.getElementById('viewSales').classList.contains('active')) {
            updateSalesView();
        }
    });

    // Feedbacks Listener
    initReviewsListener();
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
    const cycleInfo = getPaydayCycle();
    const payTitle = document.getElementById('paydayTitle');
    const payRange = document.getElementById('paydayCycle');
    if(payTitle) payTitle.innerText = cycleInfo.payoutText;
    if(payRange) payRange.innerText = cycleInfo.rangeText;
    // 1. UPDATE LABELS
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const lblYear = document.getElementById('lblYear');
    const lblMonth = document.getElementById('lblMonth');
    if (lblYear) lblYear.innerText = y;
    if (lblMonth) lblMonth.innerText = monthNames[m];

    // --- VARIABLES ---
    const dayMap = {}; // Tracks revenue for EVERY day in history
    
    // View Specific Data
    const dailyLogData = {}; 
    let toCollectTotal = 0;
    let totalRevenueMonth = 0; 
    let totalOrdersMonth = 0; // <--- Restored Counter
    const paydayTableList = [];

    // --- LOOP THROUGH ALL ORDERS ---
    allOrdersCache.forEach(o => {
        
        // A. PAYDAY COLLECTION LOGIC (Unpaid Debts)
        if (o.paymentMethod === 'Payday' && o.status !== 'paid' && o.status !== 'cancelled') {
            toCollectTotal += o.total;
            
            // Full Account Parsing Logic
            let acctNum = "N/A";
            if (o.addressDetails && o.addressDetails.includes('|')) {
                const parts = o.addressDetails.split('|');
                // Format is usually: "SOS | Floor: 7th | ID: 1234"
                if(parts[2]) {
                    acctNum = parts[2].replace('ID:', '').replace('Acct:', '').trim();
                }
            }
            
            paydayTableList.push({
                docId: o.id,
                name: o.customerName,
                acct: acctNum,
                date: o.dateObj,
                total: o.total
            });
        }

        // B. SALES & STATS LOGIC (Completed/Paid Only)
        if (o.status === 'completed' || o.status === 'paid') {
            
            // 1. Global Aggregation (For Busiest Day calculations)
            const dateKey = o.dateObj.toDateString(); 
            if(!dayMap[dateKey]) dayMap[dateKey] = 0;
            dayMap[dateKey] += o.total;

            // 2. Filter for Selected Month & Year
            if (o.dateObj.getMonth() === m && o.dateObj.getFullYear() === y) {
                const day = o.dateObj.getDate();
                
                // Init day object if not exists
                if(!dailyLogData[day]) {
                    dailyLogData[day] = { count: 0, cash: 0, credit: 0, total: 0 };
                }
                
                // Increment Daily Stats
                dailyLogData[day].count++;
                dailyLogData[day].total += o.total;
                
                // Increment Monthly Totals
                totalRevenueMonth += o.total;
                totalOrdersMonth++; // <--- COUNTING ORDERS HERE

                // Payment Type Split
                if (o.paymentMethod === 'Payday') {
                    dailyLogData[day].credit += o.total;
                } else {
                    dailyLogData[day].cash += o.total;
                }
            }
        }
    });

    // --- C. CALCULATE WINNERS (Busiest Days) ---
    let bestAllTime = { date: null, total: 0 };
    let bestYear = { date: null, total: 0 };
    let bestMonth = { date: null, total: 0 };

    for (const [dateStr, total] of Object.entries(dayMap)) {
        const d = new Date(dateStr);

        // 1. All Time Record
        if (total > bestAllTime.total) {
            bestAllTime = { date: d, total };
        }

        // 2. Year Record
        if (d.getFullYear() === y) {
            if (total > bestYear.total) {
                bestYear = { date: d, total };
            }

            // 3. Month Record
            if (d.getMonth() === m) {
                if (total > bestMonth.total) {
                    bestMonth = { date: d, total };
                }
            }
        }
    }

    // --- D. RENDER STATS TO DOM ---
    
    // Date Formatter
    const fmt = (d) => d ? d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '-';

    // Update Cards
    document.getElementById('busiestAllTime').innerText = fmt(bestAllTime.date);
    document.getElementById('valAllTime').innerText = `₱${bestAllTime.total.toLocaleString()}`;

    document.getElementById('busiestYear').innerText = fmt(bestYear.date);
    document.getElementById('valYear').innerText = `₱${bestYear.total.toLocaleString()}`;

    document.getElementById('busiestDay').innerText = fmt(bestMonth.date);
    document.getElementById('valMonth').innerText = `₱${bestMonth.total.toLocaleString()}`;

    // Standard Monthly Stats
    document.getElementById('monthTotalSales').innerText = `₱${totalRevenueMonth.toLocaleString()}`;
    document.getElementById('paydayPendingTotal').innerText = `₱${toCollectTotal.toLocaleString()}`;
    document.getElementById('monthTotalCount').innerText = totalOrdersMonth; // <--- UPDATING TOTAL ORDERS

    // --- E. RENDER TABLES ---
    renderSalesTable(dailyLogData, m, y);
    renderPaydayTable(paydayTableList);
}

// --- 4. RENDER: DAILY SALES LOG ---
function renderSalesTable(dailyData, month, year) {
    const tbody = document.getElementById('salesTableBody');
    tbody.innerHTML = ''; 

    // 1. Get all days that actually have data
    // Object.keys returns strings ["1", "5", "12"], map converts to Numbers [1, 5, 12]
    const activeDays = Object.keys(dailyData).map(Number).sort((a, b) => a - b);

    // 2. Handle Empty Month
    if (activeDays.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; padding:30px; color:#666;">
                    No sales recorded for this month.
                </td>
            </tr>`;
        return;
    }

    const mStr = String(month + 1).padStart(2, '0');
    const now = new Date();
    const isCurrentMonth = (now.getMonth() === month && now.getFullYear() === year);
    const todayDate = now.getDate();

    // 3. Loop ONLY through active days
    activeDays.forEach(d => {
        const stats = dailyData[d];
        const dStr = String(d).padStart(2, '0');
        
        // Add Day Name for context (e.g., "Jan 02 (Fri)")
        // Since we are skipping dates, knowing the day of week helps mentally fill gaps.
        const specificDate = new Date(year, month, d);
        const dayName = specificDate.toLocaleDateString('en-US', { weekday: 'short' }); 
        const dateDisplay = `<span style="color:#888; font-size:0.8rem; margin-right:5px;">${dayName}</span> ${mStr}/${dStr}`;

        const tr = document.createElement('tr');
        
        // Highlight Today (Only if today has sales)
        if (isCurrentMonth && d === todayDate) {
            tr.classList.add('today-row');
            tr.id = 'activeDayRow';
        }

        // DATA ROW CONFIG
        tr.classList.add('clickable-row');
        tr.onclick = (e) => viewHistoryLog(e, d, month, year);

        const cashDisplay = stats.cash > 0 ? `₱${stats.cash.toLocaleString()}` : '<span class="text-muted">-</span>';
        const creditDisplay = stats.credit > 0 ? `₱${stats.credit.toLocaleString()}` : '<span class="text-muted">-</span>';
        const totalDisplay = `₱${stats.total.toLocaleString()}`;

        tr.innerHTML = `
            <td>${dateDisplay}</td>
            <td class="text-center">${stats.count}</td>
            <td class="text-right text-success">${cashDisplay}</td>
            <td class="text-right text-danger">${creditDisplay}</td>
            <td class="text-right" style="font-weight:bold; color:white;">${totalDisplay}</td>
        `;
        
        tbody.appendChild(tr);
    });

    // Auto-scroll to today if it exists
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

    tbody.innerHTML = ''; // Clear previous data
    
    const targetDate = new Date(year, month, day);
    const today = new Date();
    
    // Set Title
    if (targetDate.toDateString() === today.toDateString()) {
        title.innerText = "Today's Log (Live)";
    } else {
        title.innerText = `Log: ${targetDate.toDateString()}`;
    }

    // Filter Cache: Same Day AND (Completed OR Paid)
    const dayOrders = allOrdersCache.filter(o => {
        const isSameDay = (
            o.dateObj.getDate() === day &&
            o.dateObj.getMonth() === month &&
            o.dateObj.getFullYear() === year
        );
        // Only show valid "Done" orders
        const isValid = (o.status === 'completed' || o.status === 'paid');
        return isSameDay && isValid;
    });

    if (dayOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#666;">No records found for this date.</td></tr>';
    } else {
        // Sort Newest First
        dayOrders.sort((a,b) => b.timestamp - a.timestamp);
        dayOrders.forEach(data => renderDailyLogRow(data, tbody));
    }

    drawer.classList.add('open');
}

// --- 7. HELPERS & RENDERERS ---

function renderDailyLogRow(data, tbody) {
    const orderHtml = data.items.map(i => 
        `<div class="log-item-row">
            <span>${i.name}</span> 
            <span style="color:var(--gold); font-weight:bold;">x${i.qty}</span>
         </div>`
    ).join('');
    
    let methodClass = 'cash';
    const methodText = data.paymentMethod || 'Cash';
    
    if (methodText === 'Payday') methodClass = 'payday';
    else if (['GCash', 'BPI'].includes(methodText)) methodClass = 'online';

    // --- NEW LOGIC: CLICKABLE BADGE ---
    let methodDisplay = '';

    // If it has proof AND is online -> Make it a button
    if (data.proofOfPayment && (methodText === 'GCash' || methodText === 'BPI')) {
        methodDisplay = `
            <button class="method-badge ${methodClass} proof-btn" onclick="viewProof('${data.proofOfPayment}')" title="View Screenshot">
                ${methodText} <i class="fas fa-paperclip" style="margin-left:4px;"></i>
            </button>
        `;
    } else {
        // Standard Badge
        methodDisplay = `<span class="method-badge ${methodClass}">${methodText}</span>`;
    }

    const row = document.createElement('tr');
    // Identify SOS in history with a red border
    if(data.isSOS) row.style.borderLeft = "2px solid #D32F2F";

    row.innerHTML = `
        <td style="vertical-align: top; padding-top: 10px;">
            <div style="font-weight:600; color:#eee;">${data.customerName}</div>
            ${data.status === 'paid' 
                ? '<div style="font-size:0.65rem; color:#4CAF50; font-weight:bold; margin-top:2px;">PAID</div>' 
                : ''}
        </td>
        <td style="vertical-align: top; padding-top: 10px;">${orderHtml}</td>
        <td style="vertical-align: top; padding-top: 10px;">
            ${methodDisplay}
        </td>
        <td style="vertical-align: top; padding-top: 10px; font-weight:bold; color:white;">₱${data.total}</td>
    `;
    tbody.appendChild(row);
}

function renderPendingCard(id, data, date, container) {
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // 1. SOS Styling
    const sosClass = data.isSOS ? 'sos' : '';
    const sosBadge = data.isSOS ? '<span class="sos-badge">SOS</span>' : '';

    // 2. Clean Address Logic
    let displayAddress = data.addressDetails || "";
    if (displayAddress.includes("ID:")) {
        displayAddress = displayAddress.split("| ID:")[0].trim();
        if(displayAddress.endsWith('|')) displayAddress = displayAddress.slice(0, -1).trim();
    }

    // 3. PAYMENT VERIFICATION LOGIC
    let paymentActionHtml = '';
    const isOnlinePay = (data.paymentMethod === 'GCash' || data.paymentMethod === 'BPI');
    const isPaid = data.financialStatus === 'paid'; // New field we will track

    if (isOnlinePay) {
        // A. View Proof Button
        const proofBtn = data.proofOfPayment 
            ? `<button class="btn-action-small" onclick="viewProof('${data.proofOfPayment}')" title="View Screenshot"><i class="fas fa-image"></i> Payment Proof</button>` 
            : `<span style="color:#d32f2f; font-size:0.8rem;">No Screenshot</span>`;

        // B. Verify Payment Button
        let verifyBtn = '';
        if (isPaid) {
            verifyBtn = `<span style="color:#4CAF50; font-weight:bold; font-size:0.8rem;"><i class="fas fa-check-circle"></i> PAID</span>`;
        } else {
            verifyBtn = `<button class="btn-action-small verify" onclick="verifyOnlinePayment('${id}')" title="Mark Money Received"><i class="fas fa-money-bill-wave"></i> Verify</button>`;
        }

        paymentActionHtml = `
            <div style="margin-top:10px; padding-top:10px; border-top:1px dashed #444; display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; gap:5px;">${proofBtn}</div>
                <div>${verifyBtn}</div>
            </div>
        `;
    }

    // Items List
    let itemsHtml = data.items.map(i => 
        `<li><span>${i.qty}x ${i.name}</span> <span>₱${i.price*i.qty}</span></li>`
    ).join('');

    const card = document.createElement('div');
    card.className = `order-card new ${sosClass}`;
    
    card.innerHTML = `
        <div class="card-top">
            <span>${time}</span>
            <div style="display:flex; gap:5px;">
                <span class="method-badge ${isOnlinePay ? 'online' : 'cash'}">${data.paymentMethod}</span>
                ${sosBadge}
            </div>
        </div>
        <div class="card-body">
            <div class="cust-name">${data.customerName}</div>
            <div class="cust-meta" style="font-weight:600; color:#ccc;">${displayAddress}</div>
            <div class="cust-meta"><i class="fas fa-phone"></i> ${data.contactNum}</div>
            
            <ul class="items-list">${itemsHtml}</ul>
            
            <!-- TOTAL -->
            <div style="text-align:right; font-weight:bold; color:var(--gold); margin-top:5px;">Total: ₱${data.total}</div>

            <!-- PAYMENT ACTIONS (GCash/BPI Only) -->
            ${paymentActionHtml}

            ${data.note ? `<div style="margin-top:5px; font-size:0.8rem; color:#ffd700; font-style:italic;">"${data.note}"</div>` : ''}
        </div>
        <div class="card-actions">
            <!-- If verified or Cash/SOS, allow Kitchen Done. If Online & Unpaid, maybe warn? (Optional) -->
            <button class="btn-done" onclick="markDone('${id}')">KITCHEN DONE</button>
        </div>
    `;
    container.appendChild(card);
}
window.viewProof = function(url) {
    document.getElementById('proofImgDisplay').src = url;
    document.getElementById('proofLightbox').classList.remove('hidden');
}

// 2. Verify Payment (Updates a specific field, doesn't remove card)
window.verifyOnlinePayment = async function(docId) {
    const isConfirmed = await showCustomConfirm("Confirm money received in BPI/GCash?");
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
function getPaydayCycle() {
    const today = new Date();
    const d = today.getDate();
    // 11th - 25th = Current Cycle (Payout 30th)
    // 26th - 10th = Cross Cycle (Payout 15th)
    if (d >= 11 && d <= 25) {
        return { payoutText: `NEXT PAYOUT: 30th`, rangeText: "Cycle: 11th - 25th" };
    } else {
        return { payoutText: `NEXT PAYOUT: 15th`, rangeText: "Cycle: 26th - 10th" };
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
            } else if (viewId === 'sos') {
            document.getElementById('viewSOS').classList.add('active');
            initSOSView();    
            } else {
                document.getElementById('viewOrders').classList.add('active');
            }
        };
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
// --- 8. SOS VIEW LOGIC ---

let employeesCache = [];

function initSOSView() {
    // Listener for Employees
    onSnapshot(collection(db, "employees"), (snap) => {
        employeesCache = [];
        snap.forEach(doc => {
            employeesCache.push({ id: doc.id, ...doc.data() });
        });
        
        document.getElementById('sosTotalUsers').innerText = employeesCache.length;
        renderSOSList();
    });

    // Search Filter
    document.getElementById('sosSearch').addEventListener('input', (e) => {
        renderSOSList(e.target.value);
    });
}
function renderSOSList(filterText = "") {
    const container = document.getElementById('sosUserList');
    if(!container) return;

    container.innerHTML = "";
    
    const term = filterText.toLowerCase();

    // 1. Filter Logic
    const filtered = employeesCache.filter(e => 
        e.name.toLowerCase().includes(term) || 
        (e.company || "").toLowerCase().includes(term)
    );

    // 2. Group by Company
    const grouped = filtered.reduce((acc, emp) => {
        const company = emp.company ? emp.company.toUpperCase() : "NO ACCOUNT";
        if (!acc[company]) acc[company] = [];
        acc[company].push(emp);
        return acc;
    }, {});

    const sortedCompanies = Object.keys(grouped).sort();

    if(sortedCompanies.length === 0) {
        container.innerHTML = `<div style="padding:20px; text-align:center; color:#666;">No users found.</div>`;
        return;
    }

    // 3. Render Groups (Accordion Style)
    sortedCompanies.forEach(company => {
        // Wrapper for the group
        const groupWrapper = document.createElement('div');
        
        // A. The Header
        const header = document.createElement('div');
        header.className = 'sos-group-header';
        header.innerHTML = `
            <span class="sos-group-title">${company} <span style="color:#666; font-size:0.7rem;">(${grouped[company].length})</span></span>
            <i class="fas fa-chevron-down"></i>
        `;
        
        // B. The Body (User List)
        const body = document.createElement('div');
        body.className = 'sos-group-body'; // Default closed via CSS
        
        // Sort Users
        const users = grouped[company].sort((a, b) => a.name.localeCompare(b.name));

        users.forEach(u => {
            const div = document.createElement('div');
            div.className = 'sos-user-item';
            div.dataset.uid = u.id; // Helper for clearing selection later
            div.onclick = () => selectSOSUser(u, div);
            
            const avatarUrl = u.avatar || 'images/default-user.png';
            
            div.innerHTML = `
                <img src="${avatarUrl}" class="u-avatar" alt="pic">
                <div class="u-info">
                    <h4>${u.name}</h4>
                    <span>${u.floor || '?'}th Floor</span>
                </div>
            `;
            body.appendChild(div);
        });

        // Toggle Logic
        header.onclick = () => {
            header.classList.toggle('active');
            body.classList.toggle('open');
        };

        // AUTO-EXPAND if Searching
        if(filterText !== "") {
            header.classList.add('active');
            body.classList.add('open');
        }

        groupWrapper.appendChild(header);
        groupWrapper.appendChild(body);
        container.appendChild(groupWrapper);
    });
}

// NEW: Function to Clear/Close the Right Panel
window.clearSOSSelection = function() {
    // 1. Hide Content, Show Placeholder
    document.getElementById('sosDetailContent').classList.add('hidden');
    document.getElementById('sosDetailPlaceholder').classList.remove('hidden');

    // 2. Clear Active State from List
    document.querySelectorAll('.sos-user-item').forEach(el => el.classList.remove('active'));
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
function selectSOSUser(user, element) {
    document.querySelectorAll('.sos-user-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');

    document.getElementById('sosDetailPlaceholder').classList.add('hidden');
    document.getElementById('sosDetailContent').classList.remove('hidden');

    document.getElementById('detName').innerText = user.name;
    document.getElementById('detMeta').innerText = `${user.company || 'No Company'} • ${user.floor || '?'}F`;
    
    renderEmployeeHistory(user.email);
}

function renderEmployeeHistory(email) {
    const tbody = document.getElementById('sosHistoryBody');
    tbody.innerHTML = "";
    
    // Filter global orders cache for this user
    const userOrders = allOrdersCache.filter(o => o.email === email);
    
    // Sort Date Descending
    userOrders.sort((a, b) => b.timestamp - a.timestamp);

    let totalDebt = 0;

    if (userOrders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:#666;">No transaction history.</td></tr>`;
        document.getElementById('detDebt').innerText = "₱0";
        return;
    }

    userOrders.forEach(o => {
        // Debt Calculation Logic (Matches existing Payday logic)
        if (o.paymentMethod === 'Payday' && o.status !== 'paid' && o.status !== 'cancelled') {
            totalDebt += o.total;
        }

        // Status Styling
        let statusBadge = `<span class="method-badge cash">${o.status}</span>`;
        if (o.status === 'paid') statusBadge = `<span class="method-badge online">PAID</span>`;
        if (o.status === 'pending') statusBadge = `<span class="method-badge" style="border:1px solid #666; color:#888;">PENDING</span>`;
        if (o.paymentMethod === 'Payday' && o.status !== 'paid' && o.status !== 'cancelled') {
             statusBadge = `<span class="method-badge payday">UNPAID</span>`;
        }
        if (o.status === 'cancelled') statusBadge = `<span class="method-badge" style="color:#d32f2f;">VOID</span>`;

        const dateStr = o.dateObj.toLocaleDateString();
        const itemCount = o.items.reduce((acc, i) => acc + i.qty, 0);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${dateStr}</td>
            <td>${itemCount} Items</td>
            <td>${statusBadge}</td>
            <td class="text-right" style="font-weight:bold; color:white;">₱${o.total}</td>
        `;
        tbody.appendChild(tr);
    });

    // Update Debt Display
    document.getElementById('detDebt').innerText = `₱${totalDebt.toLocaleString()}`;
}
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
