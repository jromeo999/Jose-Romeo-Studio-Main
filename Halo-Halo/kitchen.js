import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, query, orderBy, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

// CONFIG
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

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Auth Check (Security: Only Admins can view the kitchen feed)
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = "index.html"; // Redirect to login/kiosk if not logged in
        } else {
            showToast("Kitchen Monitor Connected", "success");
        }
    });

    // 2. Start Overlay (Sound Permission)
    document.getElementById('btnStartKitchen').onclick = () => {
        document.getElementById('startOverlay').style.display = 'none';
        initOrderListener();
        // Play a silent sound to unlock audio context
        const audio = document.getElementById('notifSound');
        audio.volume = 0.0;
        audio.play().then(() => audio.volume = 1.0);
    };
});

// --- ORDER LISTENER ---
function initOrderListener() {
    const q = query(collection(db, "orders"), orderBy("timestamp", "asc")); // Oldest first for Kitchen (First In, First Out)
    
    onSnapshot(q, (snapshot) => {
        const container = document.getElementById('pendingGrid');
        container.innerHTML = '';
        
        let count = 0;
        let isNewOrder = false;

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;

            // Only show Pending
            if (data.status === 'pending') {
                count++;
                renderKitchenCard(id, data, container);
                
                // Check if this is a "fresh" update to trigger sound
                // (In a real app, you'd compare against a local timestamp cache, 
                // but here we check change type in docChanges below)
            }
        });

        document.getElementById('statPending').innerText = count;

        // Check for new additions to play sound
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added" && change.doc.data().status === 'pending') {
                playNotificationSound();
            }
        });
    });
}

// --- RENDER CARD ---
function renderKitchenCard(id, data, container) {
    const dateObj = data.timestamp ? new Date(data.timestamp.seconds * 1000) : new Date();
    const time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const qNum = data.queueNum ? `#${String(data.queueNum).padStart(6, '0')}` : '??';
    // SOS Visuals
    const sosClass = data.isSOS ? 'sos' : '';
    const sosBadge = data.isSOS ? '<span class="sos-badge" style="background:#D32F2F; color:white; padding:2px 6px; border-radius:4px;">SOS PRIORITY</span>' : '';

    // --- NEW: CLEAN ADDRESS LOGIC ---
    // Turn "SOS | Floor: 7 | ID: 1234" -> "SOS | Floor: 7"
    let displayAddress = data.addressDetails || "";
    if (displayAddress.includes("ID:")) {
        // Split by the ID tag and keep only the first part
        displayAddress = displayAddress.split("| ID:")[0].trim();
        // Just in case there is a trailing pipe
        if(displayAddress.endsWith('|')) {
            displayAddress = displayAddress.slice(0, -1).trim();
        }
    }

    // Items HTML
    let itemsHtml = data.items.map(i => 
        `<li>
            <span style="font-weight:bold; color:white;">${i.qty}x</span> 
            <span style="margin-left:10px;">${i.name}</span>
         </li>`
    ).join('');

    const card = document.createElement('div');
    card.className = `order-card new ${sosClass}`;
    
    // Style override for kitchen visibility
    card.style.border = data.isSOS ? "2px solid #D32F2F" : "1px solid #444";
    card.style.background = "#1e1e1e";

    card.innerHTML = `
        <div class="card-top" style="background:#252525; padding:10px; display:flex; justify-content:space-between; align-items:center;">
            <span style="font-weight:bold; font-size:1.2rem; color:var(--gold);">${time}</span>
            ${sosBadge}
        </div>
        <div class="card-body" style="padding:15px;">
            <div class="cust-name" style="font-size:1.3rem; margin-bottom:5px;">${data.customerName}</div>
            
            <!-- USE THE CLEAN ADDRESS HERE -->
            <div class="cust-meta" style="color:#888; font-size:1.1rem; font-weight:bold;">${displayAddress}</div>
            
            <hr style="border:0; border-top:1px solid #333; margin:10px 0;">
            
            <ul class="items-list" style="list-style:none;">${itemsHtml}</ul>
            
            ${data.note ? `<div style="margin-top:15px; background:#332b00; padding:10px; border-left:3px solid var(--gold); color:#ffd700; font-style:italic;">Note: "${data.note}"</div>` : ''}
        </div>
        <div class="card-actions" style="padding:15px;">
            <button class="btn-done" onclick="markDone('${id}')" style="width:100%; background:#4CAF50; color:white; padding:15px; border:none; font-weight:bold; border-radius:6px; cursor:pointer;">
                ORDER READY <i class="fas fa-check"></i>
            </button>
        </div>
    `;
    container.appendChild(card);
}

// --- ACTIONS ---
window.markDone = async function(id) {
    try {
        await updateDoc(doc(db, "orders", id), { status: 'completed' });
        // Optional: showToast("Order Completed", "success");
    } catch(e) {
        // REPLACE NATIVE ALERT
        showToast("Error: " + e.message, "error");
    }
};

window.kitchenLogout = function() {
    // 1. Show Toast for feedback (optional)
    if (typeof showToast === "function") {
        showToast("Returning to Dashboard...", "info");
    }

    // 2. Simply redirect. DO NOT use signOut(auth).
    // This preserves the login state for the other tabs.
    setTimeout(() => {
        window.location.href = "dashboard.html";
    }, 500); // Small delay for the toast to be seen
};

function playNotificationSound() {
    const audio = document.getElementById('notifSound');
    audio.currentTime = 0;
    audio.play().catch(e => console.log("Sound blocked until interaction"));
}
const showToast = (msg, type = 'success') => {
    const box = document.getElementById('toastBox');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> <span>${msg}</span>`;
    box.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 3000);
};