import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
// FIX: Added 'query' and 'orderBy' to the imports below
import { getFirestore, collection, addDoc, updateDoc, getDocs, deleteDoc, doc,where, onSnapshot, setDoc, query, orderBy, limit  } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, updatePassword  } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

// --- PASTE YOUR FIREBASE CONFIG HERE ---
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

// IMGBB API KEY
const IMGBB_KEY = "67e7a695efab5ecf8c5983e264b260a5";

// --- STATE ---
let menuItems = [];
let cart = []; // Committed orders
let stagedItems = {}; // Temp items on cards
let currentUser = null;
let storeConfig = { showPromos: false };
// --- MAP CONFIG ---
let map = null;
let marker = null;
// app.js

const STORE_COORDS = [10.3139, 123.8805];

// Keep these pricing settings (Adjust if needed)
const BASE_FARE = 25;  
const PER_KM = 7;
const CEBU_BOUNDS = [
    [10.1900, 123.7000], // South-West Limit
    [10.4500, 124.0500]  // North-East Limit
];
// --- UI HELPERS ---
const showToast = (msg, type = 'success') => {
    const box = document.getElementById('toastBox');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> <span>${msg}</span>`;
    box.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 3000);
};

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('click', (e) => {
    const adminPanel = document.getElementById('adminPanel');
    const revDrawer = document.getElementById('reviewsDrawer');
    
    // 1. Close Admin Panel (Item Editor)
    // If panel is open AND click is NOT inside panel AND click is NOT on the open button
    if (adminPanel && !adminPanel.classList.contains('hidden')) {
        // We check if the click target is NOT inside the panel
        if (!adminPanel.contains(e.target) && !e.target.closest('.edit-badge')) {
            // Check if user is trying to edit something, if not, close
            // Actually, for the Admin Panel, we usually rely on the X button 
            // because editing is complex. But if you want auto-close:
            // adminPanel.classList.add('hidden'); 
        }
    }

    // 2. Close Reviews Drawer (Public)
    if (revDrawer && revDrawer.classList.contains('open')) {
        // If click is NOT inside drawer AND click is NOT the "Read Reviews" button
        if (!revDrawer.contains(e.target) && !e.target.closest('#btnReadReviews')) {
            revDrawer.classList.remove('open');
        }
    }
    });
    setupDataListeners();
    setupAuth();
    setupInteractions();
    setupBuyerUploads();
    setupReviewSystem(); // New Reviews Logic

    initCartSession();
});
// --- PERSISTENT SESSION LOGIC ---
function setupBuyerUploads() {
    // Helper to handle upload
    const handleProof = async (fileInputId, hiddenInputId, statusId) => {
        const fileInput = document.getElementById(fileInputId);
        const hiddenInput = document.getElementById(hiddenInputId);
        const statusSpan = document.getElementById(statusId);

        // Safety Check: If element doesn't exist, stop.
        if (!fileInput || !hiddenInput || !statusSpan) return;

        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // UI Updates
            statusSpan.className = 'upload-status';
            statusSpan.innerText = "Uploading screenshot...";
            statusSpan.style.color = "var(--gold)";
            
            const formData = new FormData();
            formData.append('image', file);
            formData.append('key', IMGBB_KEY);

            try {
                const response = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData });
                const result = await response.json();

                if (result.success) {
                    hiddenInput.value = result.data.url; // Save URL
                    statusSpan.innerHTML = '<i class="fas fa-check"></i> Attached';
                    statusSpan.style.color = "#4CAF50";
                } else {
                    throw new Error('Upload failed');
                }
            } catch (err) {
                statusSpan.innerText = "Upload Failed. Try again.";
                statusSpan.style.color = "#D32F2F";
                hiddenInput.value = ""; 
            }
        };
    };

    // Attach to GCash ONLY (We removed BPI)
    handleProof('fileGCash', 'urlGCash', 'statusGCash');
}
// --- DATA LISTENERS ---
function setupDataListeners() {
    // Menu Listener
    onSnapshot(collection(db, "menu"), (snap) => {
        menuItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        refreshCurrentView();
    });

    // Config Listener
// Config Listener
    onSnapshot(doc(db, "settings", "storeConfig"), (docSnap) => {
        if(docSnap.exists()) {
            storeConfig = docSnap.data();
            applyStoreConfig();
            
            // --- UPDATED QR LOGIC ---
            // Only update GCash if the element actually exists on the page
            const gcashImg = document.getElementById('qrGcashDisplay');
            if(gcashImg && storeConfig.gcashUrl) {
                gcashImg.src = storeConfig.gcashUrl; 
            }
            
            // We removed BPI, so we deleted the code that tries to update 'qrBpiDisplay'
        }
    });
}

function applyStoreConfig() {
    const promoTab = document.getElementById('promoTab');
    const toggle = document.getElementById('togglePromoVisibility');
    
    // 1. Show/Hide the Tab
    if (storeConfig.showPromos) {
        promoTab.classList.remove('hidden');
        // 2. Turn ON the Snake Animation
        promoTab.classList.add('promo-highlight');
    } else {
        promoTab.classList.add('hidden');
        // 3. Turn OFF the Snake Animation
        promoTab.classList.remove('promo-highlight');
    }

    if(toggle) toggle.checked = storeConfig.showPromos;
}

function refreshCurrentView() {
    const activeTab = document.querySelector('.nav-item.active');
    if(activeTab) renderMenu(activeTab.dataset.cat);
}

// --- RENDER MENU ---
function renderMenu(category) {
    const grid = document.getElementById('menuGrid');
    document.querySelectorAll('.stage-view').forEach(v => v.classList.remove('active-view'));
    document.getElementById('menuView').classList.add('active-view');
    
    grid.innerHTML = '';
    const filtered = menuItems.filter(i => i.category === category);

    if(filtered.length === 0) {
        grid.innerHTML = '<p style="color:#666; grid-column:1/-1; text-align:center; padding-top:20px;">No items yet.</p>';
        return;
    }

    filtered.forEach(item => {
        const wrapper = document.createElement('div');
        wrapper.className = 'menu-item-wrapper';

        const imgUrl = item.img || 'images/lecker-logo.png';
        const overlay = currentUser ? `<div class="admin-overlay" onclick="editItem('${item.id}')"><span class="edit-chip">EDIT</span></div>` : '';
        
        // CHECK STAGED STATE (Active Editing on Card)
        const stagedQty = stagedItems[item.id] || 0;
        
        // CHECK CART STATE (Already confirmed in tray)
        const inCartItem = cart.find(x => x.id === item.id);
        const cartBadge = inCartItem ? `<div class="in-tray-badge">${inCartItem.qty}</div>` : '';

        let controlHtml = '';
        let dockClass = 'action-dock';
        
        if (stagedQty > 0) {
            // Active Editing State
            dockClass += ' visible'; 
            controlHtml = `
                <div class="qty-pill-floating">
                    <button class="qty-btn" onclick="adjustStage('${item.id}', -1)">-</button>
                    <span class="qty-val">${stagedQty}</span>
                    <button class="qty-btn" onclick="adjustStage('${item.id}', 1)">+</button>
                </div>`;
        } else {
            // Idle State (Round Button)
            controlHtml = `
                <div class="btn-float-add" onclick="adjustStage('${item.id}', 1)">
                    <i class="fas fa-plus"></i>
                </div>`;
        }

        wrapper.innerHTML = `
            <div class="menu-card">
                ${overlay}
                
                <!-- Wrapper for Image + Badge -->
                <div id="img-wrap-${item.id}">
                    <img src="${imgUrl}" onerror="this.src='images/lecker-logo.png'">
                    ${cartBadge} <!-- Shows number if in cart -->
                </div>

                <div class="card-details">
                    <h4><span>${item.name}</span></h4>
                        <p class="card-desc">${item.desc || ''}</p>
                    <div class="card-price">₱${item.price}</div>
                </div>
                <div class="card-controls" id="ctrl-${item.id}">
                    ${controlHtml}
                </div>
            </div>
            <div class="${dockClass}" id="dock-${item.id}">
                <button class="dock-btn dock-cancel" onclick="cancelStage('${item.id}')">
                    <i class="fas fa-times"></i>
                </button>
                <button class="dock-btn dock-confirm" onclick="confirmStage('${item.id}')">
                    <i class="fas fa-check"></i>
                </button>
            </div>
        `;
        grid.appendChild(wrapper);
    });


    // Globals
    window.adjustStage = adjustStage;
    window.cancelStage = cancelStage;
    window.confirmStage = confirmStage;
}
function updateItemBadge(id) {
    const wrapper = document.getElementById(`img-wrap-${id}`);
    if (!wrapper) return; // Guard in case element isn't in DOM

    const inCart = cart.find(x => x.id === id);
    let badge = wrapper.querySelector('.in-tray-badge');

    if (inCart) {
        // If item is in cart, update or create badge
        if (!badge) {
            badge = document.createElement('div');
            badge.className = 'in-tray-badge';
            wrapper.appendChild(badge);
        }
        badge.innerText = inCart.qty;
    } else {
        // If item removed (or 0), remove badge
        if (badge) badge.remove();
    }
}
// --- STAGING LOGIC ---
function adjustStage(id, change) {
    if (!stagedItems[id]) stagedItems[id] = 0;
    stagedItems[id] += change;
    if (stagedItems[id] <= 0) delete stagedItems[id];
    updateCardUI(id);
}

function cancelStage(id) {
    delete stagedItems[id];
    updateCardUI(id);
}

function confirmStage(id) {
    const qty = stagedItems[id];
    if (!qty) return;

    // Commit to Cart
    const item = menuItems.find(x => x.id === id);
    const existing = cart.find(x => x.id === id);
    if(existing) existing.qty += qty;
    else cart.push({ ...item, qty: qty });

    // Reset Card
    delete stagedItems[id];
    updateCardUI(id); 
    updateCartUI();
    updateItemBadge(id); 
    showToast("Added to Tray", "success");
}

function updateCardUI(id) {
    const ctrlBox = document.getElementById(`ctrl-${id}`);
    const dockBox = document.getElementById(`dock-${id}`);
    const qty = stagedItems[id] || 0;

    if (qty > 0) {
        ctrlBox.innerHTML = `
            <div class="qty-pill-floating">
                <button class="qty-btn" onclick="adjustStage('${id}', -1)">-</button>
                <span class="qty-val">${qty}</span>
                <button class="qty-btn" onclick="adjustStage('${id}', 1)">+</button>
            </div>`;
        dockBox.classList.add('visible');
    } else {
        ctrlBox.innerHTML = `
            <div class="btn-float-add" onclick="adjustStage('${id}', 1)">
                <i class="fas fa-plus"></i>
            </div>`;
        dockBox.classList.remove('visible');
    }
}

function updateCartUI() {
    const qty = cart.reduce((a,b) => a + b.qty, 0);
    const total = cart.reduce((a,b) => a + (b.price * b.qty), 0);
    
    document.getElementById('cartCountBadge').innerText = qty;
    document.getElementById('cartTotalDisplay').innerText = `₱${total}`;

    // --- NEW: PERSIST TRAY TO STORAGE ---
    if (cart.length > 0) {
        localStorage.setItem('lecker_cart', JSON.stringify(cart));
    } else {
        // If empty, clear the storage so we don't load ghost items later
        localStorage.removeItem('lecker_cart');
    }
}
function initCartSession() {
    // 1. CHECK: Is there a logged-in user?
    const isUserLoggedIn = localStorage.getItem('lecker_sos_user');

    // 2. GUEST LOGIC: 
    // If NO user is logged in, we assume F5 means "Reset Kiosk"
    if (!isUserLoggedIn) {
        localStorage.removeItem('lecker_cart'); // Wipe the saved cart
        cart = []; // Clear memory
        updateCartUI();
        console.log("Guest Refresh: Tray cleared for security.");
        return; // Stop here! Don't load anything.
    }

    // 3. LOGGED-IN LOGIC:
    // If we have a user, we assume they hit F5 by mistake or are resuming later
    const storedCart = localStorage.getItem('lecker_cart');
    if (storedCart) {
        try {
            cart = JSON.parse(storedCart);
            updateCartUI(); 
            console.log("User Session: Tray restored.");
        } catch (e) {
            console.error("Cart restore failed", e);
            localStorage.removeItem('lecker_cart'); 
        }
    }
}

// --- REVIEWS SYSTEM ---
// --- REVIEWS SYSTEM ---
function setupReviewSystem() {
    // 1. Get Elements
    const modal = document.getElementById('reviewModal');
    const nameInput = document.getElementById('revName');
    const userBadge = document.getElementById('revLoggedInBadge');
    
    // 2. Open Modal Logic
    const btnOpen = document.getElementById('btnWriteReview');
    if(btnOpen) {
        btnOpen.onclick = () => {
            modal.classList.remove('hidden');

            // ALWAYS GUEST MODE (Since we removed employees)
            if(nameInput) {
                nameInput.classList.remove('hidden');
                nameInput.value = ""; // Clear previous input
            }
            
            if(userBadge) {
                userBadge.classList.add('hidden'); // Hide the employee badge
            }
            
            // Reset image just in case
            const userImg = document.getElementById('revUserImg');
            if(userImg) userImg.src = "images/default-user.png";
        };
    }

    // 3. Close Modal Logic
    document.getElementById('closeReviewModal').onclick = () => modal.classList.add('hidden');

    // 4. Submit Logic
    document.getElementById('reviewForm').onsubmit = async (e) => {
        e.preventDefault();
        const ratingEl = document.querySelector('input[name="rate"]:checked');
        if(!ratingEl) return showToast("Pick a star rating!", "error");
        
        // Determine Name
        let finalName = "Anonymous";
        const inputVal = nameInput.value.trim();
        if (inputVal) finalName = inputVal;

        try {
            await addDoc(collection(db, "reviews"), {
                name: finalName,
                avatar: "", // No avatar for guests
                isSOS: false,
                rating: parseInt(ratingEl.value),
                comment: document.getElementById('revComment').value,
                timestamp: new Date()
            });
            showToast("Review Posted!", "success");
            e.target.reset();
            document.querySelectorAll('input[name="rate"]').forEach(i => i.checked = false);
            modal.classList.add('hidden');
        } catch(err) {
            console.error(err);
            showToast("Error posting review", "error");
        }
    };

    // 5. Read Reviews Drawer
    const drawer = document.getElementById('reviewsDrawer');
    if(document.getElementById('btnReadReviews')) {
        document.getElementById('btnReadReviews').onclick = () => {
            drawer.classList.add('open');
            loadPublicReviews();
        };
    }
    if(document.getElementById('closeReviewsDrawer')) {
        document.getElementById('closeReviewsDrawer').onclick = () => {
            drawer.classList.remove('open');
        };
    }
}

function loadPublicReviews() {
    const list = document.getElementById('publicReviewsList');
    
    // Query reviews, newest first
    const q = query(collection(db, "reviews"), orderBy("timestamp", "desc"));
    
    onSnapshot(q, (snapshot) => {
        list.innerHTML = '';
        
        if(snapshot.empty) {
            list.innerHTML = '<p style="text-align:center; color:#666; margin-top:20px;">No reviews yet.</p>';
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            const stars = '★'.repeat(data.rating) + '☆'.repeat(5 - data.rating);
            const date = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleDateString() : '';

            // 1. DETERMINE AVATAR HTML
            let avatarHtml = '';
            
            // Check if avatar exists and is a valid URL
            if (data.avatar && data.avatar.startsWith('http')) {
                // RENDER IMAGE
                avatarHtml = `
                    <img src="${data.avatar}" style="
                        width: 28px; 
                        height: 28px; 
                        border-radius: 50%; 
                        object-fit: cover; 
                        border: 1px solid var(--gold);
                        margin-right: 8px;
                    " alt="User">`;
            } else {
                // RENDER DEFAULT ICON (Replaces the CSS ::before)
                avatarHtml = `
                    <div style="
                        width: 28px; 
                        height: 28px; 
                        background: #333; 
                        border-radius: 50%; 
                        display: flex; 
                        align-items: center; 
                        justify-content: center; 
                        margin-right: 8px;
                        color: #888;
                        font-size: 0.8rem;
                    ">
                        <i class="fas fa-user"></i>
                    </div>`;
            }

            // 2. BUILD CARD
            const div = document.createElement('div');
            div.className = 'review-card-public';
            div.innerHTML = `
                <div class="rev-top">
                    <div class="rev-name" style="display: flex; align-items: center;">
                        ${avatarHtml}
                        <span>${data.name || 'Anonymous'}</span>
                    </div>
                    <span class="rev-stars">${stars}</span>
                </div>
                <div class="rev-body">"${data.comment}"</div>
                <div class="rev-time">${date}</div>
            `;
            list.appendChild(div);
        });
    });
}

// --- INTERACTIONS & CHECKOUT ---
function setupInteractions() {
    // Landing
    
    // Nav
    document.querySelectorAll('.nav-item').forEach(item => {
    item.onclick = () => {
        // If it's the SOS Portal button, Handle differently
        if(item.id === 'navSOSPortal') {
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // Switch to Portal View
            document.querySelectorAll('.stage-view').forEach(v => v.classList.remove('active-view'));
            document.getElementById('sosPortalView').classList.add('active-view');
            return; 
        }

        // Standard Menu Logic
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        renderMenu(item.dataset.cat);
    };
});

    // Checkout
    // --- REPLACE THIS BLOCK INSIDE setupInteractions() ---
// Checkout Button Logic
    document.getElementById('cartBtn').onclick = () => {
        if(cart.length === 0) return showToast("Tray is empty!", "error");
        
        // 1. Switch Views
        document.querySelectorAll('.stage-view').forEach(v => v.classList.remove('active-view'));
        document.getElementById('checkoutView').classList.add('active-view');
        
        // 2. Render List
        renderCheckoutList();

        // 3. Handle Delivery Logic
        const orderType = sessionStorage.getItem('currentOrderType') || 'Dine-in';
        
        const deliveryBlock = document.getElementById('deliveryInfoBlock');
        const btnCashier = document.getElementById('optCashier');
        const btnGCash = document.getElementById('optGCash');
        const btnCOD = document.getElementById('optCOD'); // <--- Get New Button
        
        const payInput = document.getElementById('selectedPaymentMethod');

        // Reset previous selections
        document.querySelectorAll('.pay-option').forEach(el => el.classList.remove('selected'));
        payInput.value = "";

        if (orderType === 'Delivery') {
            // A. Show Delivery Form
            if(deliveryBlock) deliveryBlock.classList.remove('hidden');
            
            // B. Hide Cashier (Can't pay at counter if you are at home)
            if(btnCashier) btnCashier.classList.add('hidden');
            
            // C. Show COD
            if(btnCOD) btnCOD.classList.remove('hidden');
            setTimeout(initDeliveryMap, 100); 
            // Note: We do NOT auto-select GCash anymore. 
            // We let the customer choose between GCash or COD.

        } else {
            // Dine-in / Take-out
            
            // A. Hide Delivery Form
            if(deliveryBlock) deliveryBlock.classList.add('hidden');
            
            // B. Show Cashier
            if(btnCashier) btnCashier.classList.remove('hidden');
            
            // C. Hide COD (Can't COD if you are here)
            if(btnCOD) btnCOD.classList.add('hidden');
        }
    };


    document.getElementById('backToMenuBtn').onclick = refreshCurrentView;

    // Place Order
// --- REPLACE THIS BLOCK INSIDE setupInteractions() ---
// Place Order Logic
    // --- PLACE ORDER LOGIC (Updated with Map & Fee) ---
document.getElementById('orderForm').onsubmit = async (e) => {
    e.preventDefault();
    
    // 1. GET BASIC INFO
    const payInput = document.getElementById('selectedPaymentMethod');
    const payMethod = payInput.value; // 'Cashier', 'GCash', or 'COD'
    const orderType = sessionStorage.getItem('currentOrderType') || 'Dine-in';
    const payContainer = document.getElementById('paymentContainer');

    // Capture Proof URL (for GCash)
    const proofUrlInput = document.getElementById('urlGCash');
    const proofUrl = proofUrlInput ? proofUrlInput.value : "";

    // 2. BASIC VALIDATION: Payment Selected?
    if (!payMethod) {
        showToast("⚠️ Please select payment method", "error");
        payContainer.style.border = "1px solid #D32F2F"; 
        return;
    }

    // 3. CALCULATE FOOD TOTAL (Base)
    const foodTotal = cart.reduce((a,b) => a + (b.price*b.qty), 0);
    
    // Initialize Delivery Variables
    let deliveryFee = 0;
    let distanceKm = 0;
    let finalTotal = foodTotal;
    
    let finalName = "Guest";
    let finalContact = "N/A";
    let finalEmail = "";
    let finalAddress = orderType; 

    // 4. DELIVERY SPECIFIC LOGIC
    if (orderType === 'Delivery') {
        const inName = document.getElementById('custName').value.trim();
        const inEmail = document.getElementById('custEmail').value.trim();
        const inContact = document.getElementById('custContact').value.trim();
        const inAddress = document.getElementById('custAddress').value.trim();

        // A. Check Text Fields
        if (!inName || !inContact || !inAddress) {
            showToast("⚠️ Name, Contact, and Landmark required!", "error");
            document.getElementById('deliveryInfoBlock').style.border = "1px solid #D32F2F";
            return; 
        }

        // B. CHECK MAP CALCULATION (Crucial)
        const feeInput = document.getElementById('calcFee').value;
        const distInput = document.getElementById('calcDistance').value;

        if(!feeInput || feeInput == "0" || feeInput == "") {
            showToast("⚠️ Please PIN your location on the map", "error");
            // Scroll to map to show them
            document.getElementById('mapContainer').scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        deliveryFee = parseFloat(feeInput);
        distanceKm = parseFloat(distInput);
        finalTotal = foodTotal + deliveryFee; // Update the Final Total

        // C. CHECK SCREENSHOT (Strict for GCash Delivery)
        if (payMethod === 'GCash') {
            if (!proofUrl || proofUrl === "") {
                showToast("⚠️ Payment Screenshot Required!", "error");
                const statusTxt = document.getElementById('statusGCash');
                if(statusTxt) {
                    statusTxt.innerText = "Please attach screenshot";
                    statusTxt.style.color = "#D32F2F";
                }
                return; // STOP
            }
        }

        finalName = inName;
        finalContact = inContact;
        finalEmail = inEmail; 
        finalAddress = `DELIVERY (${distanceKm}km): ${inAddress}`;
    }

    // 5. START PROCESSING
    try {
        const btn = document.querySelector('.place-order-btn');
        btn.disabled = true;
        btn.innerText = "Processing Order...";

        // A. Get Queue Number
        const q = query(collection(db, "orders"), orderBy("queueNum", "desc"), limit(1));
        const snap = await getDocs(q);
        let nextQueueNum = 1; 
        if (!snap.empty) {
            const lastOrder = snap.docs[0].data();
            if (lastOrder.queueNum) nextQueueNum = Number(lastOrder.queueNum) + 1;
        }

        // B. SAVE TO FIREBASE
        const docRef = await addDoc(collection(db, "orders"), {
            queueNum: nextQueueNum,
            customerName: finalName === "Guest" ? `${orderType} #${nextQueueNum}` : finalName, 
            contactNum: finalContact,
            email: finalEmail,
            addressDetails: finalAddress,
            orderType: orderType,
            paymentMethod: payMethod,
            
            // Financials
            subtotal: foodTotal,     // Food Cost
            deliveryFee: deliveryFee,// Rider Cost
            total: finalTotal,       // Grand Total
            distanceKm: distanceKm,
            
            proofOfPayment: proofUrl || "",
            items: cart,
            note: document.getElementById('custNote').value,
            timestamp: new Date(),
            status: 'pending',
            // If GCash, we assume paid (pending verification). If COD, it's unpaid.
            financialStatus: 'unpaid' 
        });

        // 6. SUCCESS UI & EMAIL
        const numDisplay = document.getElementById('displayQueueNum');
        if(numDisplay) {
        // Turns 6 into 000006
        const formattedNum = String(nextQueueNum).padStart(6, '0');
        numDisplay.innerText = `#${formattedNum}`;
    }

        // Send Email if provided (Now includes Delivery Fee in breakdown)
        if (finalEmail && finalEmail.includes('@')) {
            // NOTE: You may want to update your EmailJS template to show the fee
            sendInvoiceEmail(finalName, finalEmail, cart, finalTotal, `ORD-${nextQueueNum}`);
        }

        showThankYouScreen();
        
        // 7. CLEANUP / RESET
        cart = [];
        stagedItems = {};
        localStorage.removeItem('lecker_cart');
        updateCartUI();
        e.target.reset();
        
        // Clear Selection UI
        document.querySelectorAll('.pay-option').forEach(el => el.classList.remove('selected'));
        payInput.value = "";
        
        // Clear Delivery Inputs
        if(proofUrlInput) proofUrlInput.value = "";
        document.getElementById('deliveryInfoBlock').style.border = "none";
        document.getElementById('calcFee').value = ""; // Reset Fee
        document.getElementById('calcDistance').value = ""; // Reset Distance
        document.getElementById('feeDisplay').innerText = "₱0"; // Reset UI Text
        document.getElementById('distDisplay').innerText = "0 km";

        const statusTxt = document.getElementById('statusGCash');
        if(statusTxt) { statusTxt.innerText = ""; }

    } catch(err) {
        console.error(err);
        showToast("Order Failed. Check internet.", "error");
    } finally {
        const btn = document.querySelector('.place-order-btn');
        if(btn) {
            btn.disabled = false;
            btn.innerText = "PLACE ORDER";
        }
    }
};


}
// --- EMPLOYEE REGISTRATION LOGIC ---

// 1. Open Modal
window.openEmpRegModal = function() {
    document.getElementById('empRegModal').classList.remove('hidden');
}

// 2. Handle Registration Submit
// --- EMPLOYEE REGISTRATION LOGIC ---
document.getElementById('empRegForm').onsubmit = async (e) => {
    e.preventDefault();

    const code = document.getElementById('regAccessCode').value.trim();
    const company = document.getElementById('regCompany').value;
    
    if(!code) return showToast("Access Code is required", "error");

    const btn = document.getElementById('btnRegSubmit');
    btn.disabled = true; btn.innerText = "Checking...";

    try {
        // Check if Code is already taken
        const q = query(collection(db, "employees"), where("accessCode", "==", code));
        const snap = await getDocs(q);

        if (!snap.empty) {
            showToast("Access Code taken! Choose another.", "error");
            btn.disabled = false; btn.innerText = "Create Profile";
            return;
        }

        const newData = {
            name: document.getElementById('regName').value,
            email: document.getElementById('regEmail').value,
            floor: document.getElementById('regFloor').value,
            company: company,
            accessCode: code, // Replaces accountId and pin
            avatar: "", 
            createdAt: new Date()
        };

        await addDoc(collection(db, "employees"), newData);

        showToast("Profile Created!", "success");
        document.getElementById('empRegModal').classList.add('hidden');
        
        // Auto-fill login and trigger logic
        document.getElementById('landingCodeInput').value = code;
        handleLandingLogin(); 
        
        e.target.reset();

    } catch(err) {
        console.error(err);
        showToast("Error registering.", "error");
    } finally {
        btn.disabled = false; btn.innerText = "Create Profile";
    }
};
// --- EMAILJS HELPER ---
function sendInvoiceEmail(name, email, cartItems, total, orderIdRaw) {
    const summary = cartItems.map(i => `${i.qty}x ${i.name} - ₱${i.price * i.qty}`).join('\n');
    
    // 1. EXTRACT NUMBER & FORMAT IT
    // orderIdRaw comes in as "ORD-12" or just the Doc ID. 
    // If you passed `ORD-${nextQueueNum}`, we strip "ORD-" first.
    let numOnly = orderIdRaw.replace('ORD-', ''); 
    let formattedID = `ORD-${String(numOnly).padStart(6, '0')}`; // Result: ORD-000012

    const params = {
        to_name: name,
        to_email: email,
        order_id: formattedID, // <--- Use the fancy number here
        order_summary: summary,
        total_amount: `₱${total}`,
        order_date: new Date().toLocaleDateString()
    };

    emailjs.send("Invoicing", "order_confirmation", params)
        .then(() => console.log("Invoice sent!"))
        .catch((err) => console.error("Email failed:", err));
}
function showThankYouScreen() {
    document.querySelectorAll('.stage-view').forEach(v => v.classList.remove('active-view'));
    document.getElementById('thankYouView').classList.add('active-view');
    document.querySelector('.success-content').classList.remove('active-timer');
    void document.querySelector('.success-content').offsetWidth; // Reflow
    document.querySelector('.success-content').classList.add('active-timer');

    setTimeout(() => {
        // Reset to Landing
        document.getElementById('landingPage').classList.remove('slide-up');
        document.getElementById('kioskContainer').classList.add('hidden');
        document.querySelectorAll('.stage-view').forEach(v => v.classList.remove('active-view'));
        document.getElementById('idleView').classList.add('active-view');
    }, 10000);
}


// --- PAYMENT LOGIC ---
// --- REPLACE THIS FUNCTION IN YOUR CODE ---
window.togglePayment = function(method, element, event) {
    // 1. STOP PROPAGATION: If clicking file input or upload button, do not toggle the card
    if (event && (event.target.tagName === 'INPUT' || event.target.tagName === 'BUTTON' || event.target.closest('.btn-upload-proof'))) {
        return; 
    }

    const input = document.getElementById('selectedPaymentMethod');
    const payContainer = document.getElementById('paymentContainer');
    
    // --- CLEAR RED BORDER ---
    payContainer.style.border = "none";
    payContainer.style.padding = "0";

    const isSelected = element.classList.contains('selected');
    
    // Reset all options
    document.querySelectorAll('.pay-option').forEach(el => el.classList.remove('selected'));
    
    // Logic: If it wasn't selected, select it. 
    // If it was selected, keep it selected (don't unselect it, which is better for UX)
    element.classList.add('selected');
    input.value = method;

    // Auto-Scroll Logic
    setTimeout(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
}

// --- LIGHTBOX ---
window.openLightbox = function(src) {
    const lb = document.getElementById('qrLightbox');
    document.getElementById('lightboxImg').src = src;
    lb.classList.add('active');
}
document.querySelector('.lightbox-close').onclick = () => document.getElementById('qrLightbox').classList.remove('active');
document.getElementById('qrLightbox').onclick = (e) => {
    if(e.target.id === 'qrLightbox') e.target.classList.remove('active');
}

// --- AUTH & ADMIN ---
function setupAuth() {
    document.getElementById('doLoginBtn').onclick = async () => {
        const e = document.getElementById('loginEmail').value;
        const p = document.getElementById('loginPass').value;
        try {
            await signInWithEmailAndPassword(auth, e, p);
            showToast("Welcome Boss!", "success");
            document.getElementById('authModal').classList.add('hidden');
            // Auto-redirect logic
            document.getElementById('landingPage').classList.add('slide-up');
            document.getElementById('kioskContainer').classList.remove('hidden');
        } catch(err) {
            showToast("Wrong Password", "error");
        }
    };
    
    document.getElementById('closeAuth').onclick = () => document.getElementById('authModal').classList.add('hidden');
    document.getElementById('adminLogout').onclick = () => signOut(auth);

    onAuthStateChanged(auth, (user) => {
    currentUser = user;
    
    // Get Elements
    const grid = document.getElementById('kioskContainer');
    const adminPanel = document.getElementById('adminPanel');
    const landing = document.getElementById('landingPage');
    
    const lockBtn = document.getElementById('adminLockBtn');
    const gearBtn = document.getElementById('ownerSettingsBtn');

    if(user) {
        // --- ADMIN IS LOGGED IN ---
        grid.classList.add('admin-mode');
        adminPanel.classList.remove('hidden');
        
        // SWAP BUTTONS: Hide Lock, Show Gear
        if(lockBtn) lockBtn.classList.add('hidden');
        if(gearBtn) gearBtn.classList.remove('hidden');

        setupUploadLogic();
        
        // Skip landing
        if(landing) {
            landing.classList.add('slide-up');
            grid.classList.remove('hidden');
        }
    } else {
        // --- ADMIN IS LOGGED OUT ---
        grid.classList.remove('admin-mode');
        adminPanel.classList.add('hidden');

        // SWAP BUTTONS: Show Lock, Hide Gear
        // FIX: Only show Lock Button if SOS User is NOT logged in
        if(lockBtn) {

                lockBtn.classList.remove('hidden'); // Show if nobody is home
        }
        if(gearBtn) gearBtn.classList.add('hidden');
    }
    
    refreshCurrentView();
});

    setupAdminForm();
}

// --- ADMIN UPLOAD ---
function setupUploadLogic() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    dropZone.onclick = () => fileInput.click();
    fileInput.onchange = (e) => { if(e.target.files[0]) handleFileUpload(e.target.files[0]); };

    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); if(e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0]); });
}

async function handleFileUpload(file) {
    if(!file.type.startsWith('image/')) return showToast("Images only", "error");

    const loader = document.getElementById('uploadLoader');
    const preview = document.getElementById('imgPreview');
    const placeholder = document.getElementById('uploadPlaceholder');
    const hiddenInput = document.getElementById('finalImgUrl');

    loader.classList.remove('hidden');
    placeholder.classList.add('hidden');
    
    const formData = new FormData();
    formData.append('image', file);
    formData.append('key', IMGBB_KEY);

    try {
        const response = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData });
        const result = await response.json();

        if (result.success) {
            hiddenInput.value = result.data.url;
            preview.src = result.data.url;
            preview.classList.remove('hidden');
            showToast("Uploaded!", "success");
        } else {
            throw new Error('ImgBB Failed');
        }
    } catch (err) {
        showToast("Upload Error", "error");
        placeholder.classList.remove('hidden');
    } finally {
        loader.classList.add('hidden');
    }
}

// --- ADMIN FORM ---
function setupAdminForm() {
    const form = document.getElementById('adminForm');
    
    // 1. Toggle Promos Switch
    const promoToggle = document.getElementById('togglePromoVisibility');
    if (promoToggle) {
        promoToggle.onchange = async (e) => {
            await setDoc(doc(db, "settings", "storeConfig"), { showPromos: e.target.checked });
            showToast("Store Settings Updated", "success");
        };
    }

    // 2. Save (Add or Update)
    form.onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('editId').value;
        const finalUrl = document.getElementById('finalImgUrl').value;
        
        if(!finalUrl) return showToast("Image is required!", "error");

        const data = {
            category: document.getElementById('inpCat').value,
            name: document.getElementById('inpName').value,
            price: Number(document.getElementById('inpPrice').value),
            desc: document.getElementById('inpDesc').value,
            img: finalUrl
        };

        try {
            if(id) {
                await updateDoc(doc(db, "menu", id), data);
                showToast("Item Updated", "success");
            } else {
                await addDoc(collection(db, "menu"), data);
                showToast("New Item Added", "success");
            }
            resetAdminForm();
        } catch(err) {
            console.error(err);
            showToast("Error saving item", "error");
        }
    };


    // Delete
    document.getElementById('deleteBtn').onclick = async () => {
        const id = document.getElementById('editId').value;
        if (!id) return; 

        // REPLACE NATIVE CONFIRM WITH CUSTOM MODAL
        const isConfirmed = await showCustomConfirm("Phase out this item permanently?");

        if(isConfirmed) {
            try {
                await deleteDoc(doc(db, "menu", id));
                showToast("Item Phased Out", "success");
                resetAdminForm();
            } catch(err) {
                console.error(err);
                showToast("Error deleting item", "error");
            }
        }
    };
    
    // 4. Cancel/Clear
    document.getElementById('cancelBtn').onclick = resetAdminForm;
}


function resetAdminForm() {
    // 1. Capture the current category selection BEFORE resetting
    const lastCategory = document.getElementById('inpCat').value;

    // 2. Reset the form (clears text inputs, files, etc.)
    document.getElementById('adminForm').reset();
    
    // 3. Restore the category back to what the Admin was using
    if(lastCategory) {
        document.getElementById('inpCat').value = lastCategory;
    }

    // 4. Clear hidden IDs and Image Data
    document.getElementById('editId').value = "";
    document.getElementById('finalImgUrl').value = "";
    
    // 5. Reset Visuals (Image Preview & Buttons)
    document.getElementById('imgPreview').src = "";
    document.getElementById('imgPreview').classList.add('hidden');
    document.getElementById('uploadPlaceholder').classList.remove('hidden');
    
    document.getElementById('saveBtn').innerText = "Save Item";
    document.getElementById('deleteBtn').classList.add('hidden'); 
}

// Expose to window for onClick
window.editItem = function(id) {
    const item = menuItems.find(i => i.id === id);
    if (!item) return;

    // Populate Fields
    document.getElementById('editId').value = item.id;
    document.getElementById('inpCat').value = item.category;
    document.getElementById('inpName').value = item.name;
    document.getElementById('inpPrice').value = item.price;
    document.getElementById('inpDesc').value = item.desc || "";
    
    // Populate Image
    document.getElementById('finalImgUrl').value = item.img;
    document.getElementById('imgPreview').src = item.img;
    document.getElementById('imgPreview').classList.remove('hidden');
    document.getElementById('uploadPlaceholder').classList.add('hidden');
    
    // Update Buttons
    document.getElementById('saveBtn').innerText = "Update Item";
    document.getElementById('deleteBtn').classList.remove('hidden'); // SHOW DELETE BTN
}
window.triggerUpload = function(btnElement) {
    // Find the inputs relative to the clicked button
    const container = btnElement.parentElement;
    const fileInput = container.querySelector('.proof-file-input');
    const hiddenInput = container.querySelector('.proof-url-hidden');
    const statusSpan = container.querySelector('.upload-status');

    // 1. Trigger File Selection
    fileInput.click();

    // 2. Handle File Change
    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Visual Feedback
        statusSpan.className = 'upload-status';
        statusSpan.innerText = "Uploading...";
        statusSpan.style.color = "var(--gold)";
        
        // Remove Red Border (if it was there from error)
        container.style.borderColor = "transparent";

        // Upload to ImgBB
        const formData = new FormData();
        formData.append('image', file);
        formData.append('key', IMGBB_KEY);

        try {
            const response = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData });
            const result = await response.json();

            if (result.success) {
                hiddenInput.value = result.data.url; // Save URL for Submit Logic
                statusSpan.innerHTML = '<i class="fas fa-check"></i> Screenshot Attached';
                statusSpan.style.color = "#4CAF50"; // Green
            } else {
                throw new Error('Upload failed');
            }
        } catch (err) {
            statusSpan.innerText = "Upload Failed";
            statusSpan.style.color = "#D32F2F"; // Red
            hiddenInput.value = "";
        }
    };
};
/* =========================================
   SOS EMPLOYEE SYSTEM (Paste at bottom of app.js)
   ========================================= */

// 1. VERIFY USER (Login)
window.verifySOSUser = async function() {
    const input = document.getElementById('sosIdInput');
    const id = input.value.trim();
    if(!id) return showToast("Enter ID", "error");

    // Optional: Add loading spinner logic here if you want

    const q = query(collection(db, "employees"), where("accountId", "==", id));
    const snap = await getDocs(q);

    if(snap.empty) {
        showToast("ID not found", "error");
    } else {
        const data = snap.docs[0].data();
        data.docId = snap.docs[0].id; 
        
        // MIGRATION FIX: If DB lacks accessCode, use the ID
        if (!data.accessCode) data.accessCode = data.accountId;

        // 1. Update Global State
        state.activeEmployee = data;
        localStorage.setItem('lecker_sos_user', JSON.stringify(data));
        
        // 2. Update Header & Global UI
        updateSOSHeaderUI(data); 

        // 3. FORCE FORM REFRESH (The Fix)
        hydrateCheckoutForm(data);

        // 4. Hide the Search Box
        document.getElementById('sosSearchBox').classList.add('hidden');

        showToast("Welcome back!", "success");
    }
}
function hydrateCheckoutForm(data) {
    if (!data) return;

    // 1. Force Global Flag
    isSOS = true;
    
    // 2. Fill Hidden Inputs (Data carriers for the database)
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if(el) el.value = val || '';
    };
    
    setVal('finalEmpName', data.name);
    setVal('finalEmpEmail', data.email);
    setVal('finalEmpFloor', data.floor);
    // Use accessCode if available, otherwise accountId (Migration support)
    setVal('finalEmpAcct', data.accessCode || data.accountId); 

    // --- VISUAL UPDATES ---

    // A. Update Name
    const nameDisp = document.getElementById('empNameDisplay');
    if(nameDisp) nameDisp.innerText = data.name;
    
    // B. Update Meta Data (Company First, then Floor)
    const metaDisp = document.getElementById('empMetaDisplay');
    if(metaDisp) {
        // Fallback text if data is missing
        const comp = data.company || "Company"; 
        const flr = data.floor || "?";
        // Styling: Gold company name, gray floor divider
        metaDisp.innerHTML = `<span style="color:var(--gold); font-weight:600;">${comp}</span> <span style="color:#666;">|</span> ${flr}th Flr`;
    }

    // C. Update Avatar
    const avatarImg = document.getElementById('empCheckoutAvatar');
    if(avatarImg) {
        // Use user's avatar, or fall back to default if null/empty
        avatarImg.src = data.avatar || "images/default-user.png";
    }

    // --- UI TOGGLES ---

    // 1. Hide Regular Inputs
    const regBlock = document.getElementById('regularInfoBlock');
    if(regBlock) regBlock.classList.add('hidden');
    const guestAddr = document.getElementById('custAddress');
    if(guestAddr) guestAddr.removeAttribute('required');
    // 2. Show Employee Card
    const sosCard = document.getElementById('sosEmployeeCard');
    if(sosCard) sosCard.classList.remove('hidden');

    // 3. Show Payday Option
    const payDay = document.getElementById('optPayday');
    if(payDay) payDay.classList.remove('field-hidden');
    
    // 4. LOCK THE CHECKBOX UI (Visual Feedback)
    const sosToggle = document.getElementById('sosToggle');
    if(sosToggle) {
        sosToggle.classList.add('active'); 
        
        // Change Icon to LOCK
        const icon = sosToggle.querySelector('.sos-checkbox i');
        if(icon) {
            icon.className = "fas fa-lock"; 
            icon.style.fontSize = "0.7rem";
        }
        
        // Change Label to indicate lock
        const label = sosToggle.querySelector('.sos-label');
        if(label) {
            label.innerText = "Logged In";
            label.style.color = "var(--gold)";
        }
    }

    // 5. Ensure History Button works
    const histBtn = document.getElementById('btnCheckoutHistory');
    if(histBtn) histBtn.onclick = window.openEmpHistory;
}
// 2. RESET (Logout)
window.resetSOSLogin = function() {
    document.getElementById('sosSearchBox').classList.remove('hidden');
    document.getElementById('sosEmployeeCard').classList.add('hidden');
    document.getElementById('sosIdInput').value = "";
    document.getElementById('custName').parentElement.classList.remove('hidden');
    document.getElementById('custContact').parentElement.classList.remove('hidden');
}

// 3. REGISTER NEW USER
window.openEmpRegModal = () => document.getElementById('empRegModal').classList.remove('hidden');

document.getElementById('empRegForm').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('regID').value.trim();
    
    // Check duplicate
    const q = query(collection(db, "employees"), where("accountId", "==", id));
    const snap = await getDocs(q);
    
    if(!snap.empty) {
        showToast("ID taken, choose another", "error");
        return;
    }

    // Save
    await addDoc(collection(db, "employees"), {
        name: document.getElementById('regName').value,
        email: document.getElementById('regEmail').value,
        floor: document.getElementById('regFloor').value,
        accountId: id
    });

    showToast("Registered! You can now login.", "success");
    document.getElementById('empRegModal').classList.add('hidden');
    
    // Auto-fill login to be nice
    document.getElementById('sosIdInput').value = id;
    verifySOSUser();
};
// Hook up the button click

window.loginToPortal = async function() {
    const input = document.getElementById('portalIdInput');
    const id = input.value.trim();
    if(!id) return showToast("Enter ID", "error");

    const btn = input.nextElementSibling;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; // Loading

    try {
        // 1. Verify Employee
        const empQ = query(collection(db, "employees"), where("accountId", "==", id));
        const empSnap = await getDocs(empQ);

        if(empSnap.empty) {
            showToast("ID Not Found", "error");
            btn.innerHTML = '<i class="fas fa-arrow-right"></i>';
            return;
        }

        const empData = empSnap.docs[0].data();
        const email = empData.email;

        // 2. Fetch History & Calc Debt
        const ordQ = query(collection(db, "orders"), where("email", "==", email), orderBy("timestamp", "desc"));
        const ordSnap = await getDocs(ordQ);

        let totalDebt = 0;
        let html = '';

        if(ordSnap.empty) {
            html = '<div style="text-align:center; padding:20px; color:#666;">No history found.</div>';
        } else {
            ordSnap.forEach(d => {
                const o = d.data();
                const date = new Date(o.timestamp.seconds*1000).toLocaleDateString();
                
                // Debt Calc: Payday AND Not Paid AND Not Cancelled
                const isDebt = (o.paymentMethod === 'Payday' && o.status !== 'paid' && o.status !== 'cancelled');
                if(isDebt) totalDebt += o.total;

                // Status Badge Logic
                let statusBadge = '<span class="status-pill status-cash">PAID</span>';
                if(o.paymentMethod === 'Payday') {
                    if(o.status === 'paid') statusBadge = '<span class="status-pill status-paid">CLEARED</span>';
                    else if(o.status === 'cancelled') statusBadge = '<span class="status-pill status-cash">VOID</span>';
                    else statusBadge = '<span class="status-pill status-unpaid">UNPAID</span>';
                }

                html += `
                    <div class="hist-row">
                        <div class="hist-left">
                            <h4 style="font-size:0.9rem;">Order #${d.id.slice(-4).toUpperCase()}</h4>
                            <span>${date}</span>
                        </div>
                        <div class="hist-right">
                            <span class="hist-price">₱${o.total}</span>
                            ${statusBadge}
                        </div>
                    </div>`;
            });
        }

        // 3. Update UI
        document.getElementById('pName').innerText = empData.name;
        document.getElementById('pDebt').innerText = `₱${totalDebt.toLocaleString()}`;
        document.getElementById('portalHistoryList').innerHTML = html;

        // Switch States
        document.getElementById('portalLoginState').classList.add('hidden');
        document.getElementById('portalDashboardState').classList.remove('hidden');

    } catch(e) {
        console.error(e);
        showToast("Error loading profile", "error");
    } finally {
        btn.innerHTML = '<i class="fas fa-arrow-right"></i>';
    }
}

window.logoutSOSPortal = function() {
    document.getElementById('portalIdInput').value = "";
    document.getElementById('portalDashboardState').classList.add('hidden');
    document.getElementById('portalLoginState').classList.remove('hidden');
}

window.closeSOSMainModal = function() {
    document.getElementById('sosMainModal').classList.add('hidden');
}

window.handleLandingLogin = async function() {
    const input = document.getElementById('landingCodeInput');
    const code = input.value.trim();
    if(!code) return showToast("Enter Access Code", "error");

    const btn = input.nextElementSibling;
    const originalIcon = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        const empRef = collection(db, "employees");

        // 1. Try finding by NEW Code
        let q = query(empRef, where("accessCode", "==", code));
        let snap = await getDocs(q);

        // 2. If not found, try finding by OLD ID (Migration)
        if(snap.empty) {
            const oldQ = query(empRef, where("accountId", "==", code));
            const oldSnap = await getDocs(oldQ);

            if(!oldSnap.empty) {
                // Found old user -> Update DB
                const userDoc = oldSnap.docs[0];
                await updateDoc(doc(db, "employees", userDoc.id), { accessCode: code });
                snap = oldSnap; // Use this user data
                showToast("Profile Upgraded!", "success");
            }
        }

        if(snap.empty) {
            showToast("Access Code not found", "error");
        } else {
            const docSnap = snap.docs[0];
            const data = docSnap.data();
            data.docId = docSnap.id; 

            // --- CRITICAL FIX IS HERE ---
            // If we just migrated, the snapshot data won't have 'accessCode' yet.
            // We manually inject the code the user just typed.
            if (!data.accessCode) {
                data.accessCode = code; 
            }
            // -----------------------------

            state.activeEmployee = data; 
            localStorage.setItem('lecker_sos_user', JSON.stringify(data)); 
            
            // Calc Debt
            const ordQ = query(collection(db, "orders"), where("email", "==", data.email));
            const ordSnap = await getDocs(ordQ);
            let debt = 0;
            ordSnap.forEach(d => {
                const o = d.data();
                if(o.paymentMethod === 'Payday' && o.status !== 'paid' && o.status !== 'cancelled') {
                    debt += o.total;
                }
            });
            data.currentDebt = debt;

            showLandingStatus(data);
            showToast(`Welcome back, ${data.name.split(' ')[0]}`, "success");
            input.value = "";
        if(document.getElementById('checkoutView').classList.contains('active-view')) {
                hydrateCheckoutForm(data);
            }
        }
    } catch(e) {
        console.error(e);
        showToast("Connection Error", "error");
    } finally {
        btn.innerHTML = originalIcon;
    }
}

function showLandingStatus(data) {
    // Header
    document.getElementById('landingEmpName').innerText = data.name;
    
    // SAFE DEBT DISPLAY (Fixes the crash)
    const debtVal = data.currentDebt || 0; 
    document.getElementById('landingEmpDebt').innerText = `₱${debtVal.toLocaleString()}`;
    
    // Avatar
    const avatarImg = document.getElementById('portalAvatarDisplay');
    if(avatarImg) avatarImg.src = data.avatar || 'images/default-user.png';
    
    // Fields
    document.getElementById('portalCompany').value = data.company || "";
    document.getElementById('portalFloor').value = data.floor || "";
    document.getElementById('portalAccessCode').value = data.accessCode || "****";

    // Hidden Fields
    document.getElementById('finalEmpEmail').value = data.email; 
    
    // UI Updates
    updateSOSHeaderUI(data); 
    document.getElementById('sosModalLogin').classList.add('hidden');
    document.getElementById('sosModalStatus').classList.remove('hidden');
}

window.proceedToOrder = function() {
    // 1. Close the modal
    closeSOSMainModal();
    
    // 2. Hide Landing / Show Kiosk (Standard logic)
    document.getElementById('landingPage').classList.add('slide-up');
    document.getElementById('kioskContainer').classList.remove('hidden');

    // 3. NEW: If we are ALREADY on the checkout screen, refresh it!
    // This fills in the Employee Card and hides the regular inputs automatically
    if(document.getElementById('checkoutView').classList.contains('active-view')) {
        // Simulate clicking the cart button again to re-render the checkout view 
        // with the new 'state.activeEmployee' data.
        document.getElementById('cartBtn').click(); 
        
        showToast("SOS Mode Activated", "success");
    }
}

window.logoutLanding = function() {
    const wasLoggedIn = !!state.activeEmployee; 
    // 1. Clear State & Storage
    state.activeEmployee = null;
    isSOS = false; 
    localStorage.removeItem('lecker_sos_user');

    // 2. Reset Header UI
    const headerLbl = document.getElementById('headerSosLabel');
    const headerBtn = document.getElementById('headerSosBtn');
    const lockBtn = document.getElementById('adminLockBtn');
    const logoutBtn = document.getElementById('headerLogoutBtn');
    const homeBtn = document.getElementById('btnHome'); 

    if(headerLbl) headerLbl.innerText = "SOS Login";
    if(headerBtn) headerBtn.classList.remove('active-session');
    if(lockBtn) lockBtn.classList.remove('hidden');
    if(logoutBtn) logoutBtn.classList.add('hidden');
    if(homeBtn) homeBtn.classList.remove('hidden');

    // 3. Reset Checkout Form UI
    const sosToggle = document.getElementById('sosToggle');
    if(sosToggle) {
        sosToggle.classList.remove('active');
        const icon = sosToggle.querySelector('.sos-checkbox i');
        if(icon) icon.className = "fas fa-check";
        const label = sosToggle.querySelector('.sos-label');
        if(label) { label.innerText = "SOS Employee?"; label.style.color = ""; }
    }
    
    const regBlock = document.getElementById('regularInfoBlock');
    if(regBlock) regBlock.classList.remove('hidden');
    
    const sosCard = document.getElementById('sosEmployeeCard');
    if(sosCard) sosCard.classList.add('hidden');
    
    const payDay = document.getElementById('optPayday');
    if(payDay) payDay.classList.add('field-hidden');

    // 4. Reset Modals & View
    // --- FIX APPLIED HERE ---
    const codeInput = document.getElementById('landingCodeInput');
    if(codeInput) codeInput.value = ""; 
    // ------------------------

    const statusModal = document.getElementById('sosModalStatus');
    if(statusModal) statusModal.classList.add('hidden');

    const loginModal = document.getElementById('sosModalLogin');
    if(loginModal) loginModal.classList.remove('hidden');

    // 5. Force Landing Page
    const landing = document.getElementById('landingPage');
    if(landing) landing.classList.remove('slide-up');
    
    const kiosk = document.getElementById('kioskContainer');
    if(kiosk) kiosk.classList.add('hidden');
    
    if (wasLoggedIn) {
        showToast("Logged out safely", "info");
    }
}
// --- UNIFIED HISTORY FUNCTION ---
window.openEmpHistory = async function() {
    let email = null;

    // 1. Determine Email
    if (state.activeEmployee) {
        email = state.activeEmployee.email;
    } else {
        email = document.getElementById('finalEmpEmail').value;
    }

    if (!email) return showToast("No active employee session found.", "error");

    // 2. INTELLIGENT NAVIGATION TRACKING
    // Check if the Main Portal is currently open/visible
    const sosModal = document.getElementById('sosMainModal');
    state.wasPortalOpen = !sosModal.classList.contains('hidden');

    // 3. Hide Main Portal (if it was open) to show History cleanly
    sosModal.classList.add('hidden'); 

    const modal = document.getElementById('empHistoryModal');
    const container = document.getElementById('empHistoryList');
    
    modal.classList.remove('hidden');
    container.innerHTML = '<div style="text-align:center; padding:20px; color:#888;"><i class="fas fa-spinner fa-spin"></i> Loading records...</div>';

    try {
        const q = query(collection(db, "orders"), where("email", "==", email), orderBy("timestamp", "desc"));
        const snap = await getDocs(q);
        
        container.innerHTML = "";
        if(snap.empty) {
            container.innerHTML = '<div style="text-align:center; padding:20px; color:#666;">No transaction history found.</div>';
            return;
        }

        snap.forEach(d => {
            const o = d.data();
            let color = '#888'; 
            let statusText = 'CASH';
            
            if (o.paymentMethod === 'Payday') {
                if (o.status === 'paid') {
                    color = '#4CAF50'; statusText = 'CLEARED';
                } else if (o.status === 'cancelled') {
                    color = '#666'; statusText = 'VOID';
                } else {
                    color = '#ff6b6b'; statusText = 'UNPAID';
                }
            } else if (o.status === 'paid') {
                color = '#4CAF50'; statusText = 'PAID';
            }

            const dateStr = o.timestamp ? new Date(o.timestamp.seconds*1000).toLocaleDateString() : 'N/A';

            container.innerHTML += `
                <div style="background:#111; padding:12px; margin-bottom:8px; border-radius:6px; border-left:4px solid ${color}; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="color:white; font-weight:600; font-size:0.9rem;">${o.items.length} Items</div>
                        <div style="color:#666; font-size:0.75rem;">${dateStr} • Order #${d.id.substr(-4).toUpperCase()}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="color:var(--gold); font-weight:bold;">₱${o.total}</div>
                        <div style="font-size:0.6rem; color:${color}; font-weight:bold; letter-spacing:1px;">${statusText}</div>
                    </div>
                </div>
            `;
        });
    } catch(err) {
        console.error(err);
        container.innerHTML = '<div style="text-align:center; color:#d32f2f;">Error loading history.</div>';
    }
};
window.closeHistoryModal = function() {
    document.getElementById('empHistoryModal').classList.add('hidden');
    
    // INTELLIGENT RETURN:
    // Only reopen the Portal if it was actually open before!
    if(state.activeEmployee && state.wasPortalOpen) {
        // Use openSOSMainModal() because it smartly checks login state 
        // and shows the Dashboard instead of the Login screen.
        openSOSMainModal(); 
    }
    // If state.wasPortalOpen is false (meaning we came from Checkout), 
    // we do nothing, which leaves the user looking at the Checkout screen. Perfect.
}
// --- FORGOT ID / RECOVERY ---

window.openForgotIdModal = function() {
    // 1. Hide the Main Portal (so they don't overlap)
    document.getElementById('sosMainModal').classList.add('hidden');
    // 2. Show the Recovery Modal
    document.getElementById('forgotIdModal').classList.remove('hidden');
};

// --- FORGOT CODE / RECOVERY ---
const forgotForm = document.getElementById('forgotIdForm');

if (forgotForm) {
    forgotForm.onsubmit = async (e) => {
        e.preventDefault();
        
        // 1. Get the email from the (now unique) input
        const emailInput = document.getElementById('recoverEmail');
        if (!emailInput) return; // Safety check
        
        const email = emailInput.value.trim();
        const btn = document.getElementById('btnRecoverSubmit');
        
        if (!email) return showToast("Please enter email", "error");

        btn.innerText = "Searching...";
        btn.disabled = true;

        try {
            // 2. Search Database
            const q = query(collection(db, "employees"), where("email", "==", email));
            const snap = await getDocs(q);

            if (snap.empty) {
                showToast("Email not found.", "error");
            } else {
                const data = snap.docs[0].data();
                const codeToShow = data.accessCode || data.accountId;
                alert(`Hi ${data.name},\n\nYour Access Code is: ${codeToShow}`);
                
                // 4. Reset and Return to Login
                document.getElementById('forgotIdModal').classList.add('hidden');
                document.getElementById('sosMainModal').classList.remove('hidden'); 
            }
        } catch (err) {
            console.error(err);
            showToast("Error searching.", "error");
        } finally {
            btn.innerText = "Find Code";
            btn.disabled = false;
            e.target.reset();
        }
    };
}
// Hook up the button in the checkout card specifically
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btnCheckoutHistory');
    if(btn) btn.onclick = window.openEmpHistory;
});
window.returnToLanding = async function() {
    // 1. Check if cart has items
    if(cart.length > 0) {
        const isConfirmed = await showCustomConfirm("Your tray has items. Clear them and exit?");
        if(!isConfirmed) return;
    }

    // 2. Clear Cart & Staging
    cart = [];
    stagedItems = {};
    localStorage.removeItem('lecker_cart');
    updateCartUI();
    
    // 3. Reset Views to Default
    document.querySelectorAll('.stage-view').forEach(v => v.classList.remove('active-view'));
    document.getElementById('idleView').classList.add('active-view');
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));

    // 4. Slide Landing Page Back Down
    document.getElementById('landingPage').classList.remove('slide-up');
    document.getElementById('kioskContainer').classList.add('hidden');
    
    // 5. Clear the Order Type (Cleanup)
    sessionStorage.removeItem('currentOrderType');
}
// Toggle Edit Mode
window.toggleProfileEdit = function() {
    const compInput = document.getElementById('portalCompany');
    const floorInput = document.getElementById('portalFloor');
    const codeInput = document.getElementById('portalAccessCode'); // <--- UPDATED ID

    const isEditing = compInput.disabled === false;
    const rows = document.querySelectorAll('.field-row');

    if(!isEditing) {
        // ENABLE EDITING
        compInput.disabled = false;
        floorInput.disabled = false;
        codeInput.disabled = false; // Unlock access code
        
        rows.forEach(r => r.classList.add('editing'));
        document.getElementById('btnToggleEdit').classList.add('hidden');
        document.getElementById('btnSaveProfile').classList.remove('hidden');
    } else {
        // DISABLE EDITING
        compInput.disabled = true;
        floorInput.disabled = true;
        codeInput.disabled = true;
        
        rows.forEach(r => r.classList.remove('editing'));
        document.getElementById('btnToggleEdit').classList.remove('hidden');
        document.getElementById('btnSaveProfile').classList.add('hidden');
    }
}
// Save Changes
window.saveProfileChanges = async function() {
    if(!state.activeEmployee || !state.activeEmployee.docId) return;

    const newCompany = document.getElementById('portalCompany').value;
    const newFloor = document.getElementById('portalFloor').value;
    const newCode = document.getElementById('portalAccessCode').value;

    try {
        // Check uniqueness if code changed (Optional but recommended safety)
        if(newCode !== state.activeEmployee.accessCode) {
             const q = query(collection(db, "employees"), where("accessCode", "==", newCode));
             const snap = await getDocs(q);
             if(!snap.empty) return showToast("Access Code already exists!", "error");
        }

        const docRef = doc(db, "employees", state.activeEmployee.docId);
        await updateDoc(docRef, {
            company: newCompany,
            floor: newFloor,
            accessCode: newCode
        });

        // Update Local State
        state.activeEmployee.company = newCompany;
        state.activeEmployee.floor = newFloor;
        state.activeEmployee.accessCode = newCode;

        showToast("Profile Updated!", "success");
         const input = document.getElementById('portalAccessCode');
        const icon = document.getElementById('secretIcon');
        if(input) input.type = "password";
        if(icon) {
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-key');
            icon.style.color = "";
        }
        window.toggleProfileEdit(); // Lock inputs
    } catch(err) {
        console.error(err);
        showToast("Update failed", "error");
    }
}
window.saveProfileChanges = async function() {
    if(!state.activeEmployee || !state.activeEmployee.docId) return;

    // 1. Target the correct IDs
    const compInput = document.getElementById('portalCompany');
    const floorInput = document.getElementById('portalFloor');
    const codeInput = document.getElementById('portalAccessCode'); // <--- CRITICAL FIX

    // Safety check to prevent crash if element is missing
    if (!compInput || !floorInput || !codeInput) {
        return showToast("Error: Missing input fields", "error");
    }

    const newCompany = compInput.value;
    const newFloor = floorInput.value;
    const newCode = codeInput.value;

    try {
        // 2. Check for uniqueness if code changed
        if(newCode !== state.activeEmployee.accessCode) {
             const q = query(collection(db, "employees"), where("accessCode", "==", newCode));
             const snap = await getDocs(q);
             if(!snap.empty) return showToast("Access Code already exists!", "error");
        }

        const docRef = doc(db, "employees", state.activeEmployee.docId);
        
        // 3. Update Firestore
        await updateDoc(docRef, {
            company: newCompany,
            floor: newFloor,
            accessCode: newCode
        });

        // 4. Update Local State
        state.activeEmployee.company = newCompany;
        state.activeEmployee.floor = newFloor;
        state.activeEmployee.accessCode = newCode;

        showToast("Profile Updated!", "success");

        // 5. Reset to hidden password visuals
        codeInput.type = "password";
        const icon = document.getElementById('secretIcon');
        if(icon) {
            icon.className = "fas fa-key";
            icon.style.color = "";
        }

        window.toggleProfileEdit(); // Lock inputs
    } catch(err) {
        console.error(err);
        showToast("Update failed", "error");
    }
}

// 3. Avatar Upload
const portalAvatarInput = document.getElementById('portalAvatarInput');
if(portalAvatarInput) {
    portalAvatarInput.onchange = async (e) => {
        const file = e.target.files[0];
        if(!file) return;

        if(!state.activeEmployee) return showToast("Login required", "error");

        showToast("Uploading avatar...", "info");
        
        const formData = new FormData();
        formData.append('image', file);
        formData.append('key', IMGBB_KEY);

        try {
            const response = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData });
            const result = await response.json();

            if (result.success) {
                const url = result.data.url;
                
                // 1. Update Firestore
                const docRef = doc(db, "employees", state.activeEmployee.docId);
                await updateDoc(docRef, { avatar: url });
                
                // 2. Update Global State
                state.activeEmployee.avatar = url;
                
                // 3. UPDATE LOCAL STORAGE (Crucial Fix)
                // This ensures if they refresh, the avatar is remembered
                localStorage.setItem('lecker_sos_user', JSON.stringify(state.activeEmployee));

                // 4. Update UI Elements immediately
                const portalDisplay = document.getElementById('portalAvatarDisplay');
                const checkoutDisplay = document.getElementById('empCheckoutAvatar'); // The one on the form
                const reviewDisplay = document.getElementById('revUserImg'); // The one on reviews

                if(portalDisplay) portalDisplay.src = url;
                if(checkoutDisplay) checkoutDisplay.src = url;
                if(reviewDisplay) reviewDisplay.src = url;

                showToast("Avatar Updated!", "success");
            } else {
                throw new Error('Upload failed');
            }
        } catch (err) {
            console.error(err);
            showToast("Avatar upload failed", "error");
        }
    };
}
// Toggle Password Visibility in Profile
window.toggleSecret = function() {
    const input = document.getElementById('portalAccessCode');
    const icon = document.getElementById('secretIcon');
    
    if (!input || !icon) return; // Safety check

    if (input.type === "password") {
        // Show Password
        input.type = "text";
        icon.className = "fas fa-eye"; // Switch to Eye
        icon.style.color = "var(--gold)"; // Highlight gold
    } else {
        // Hide Password
        input.type = "password";
        icon.className = "fas fa-key"; // Switch back to Key
        icon.style.color = ""; // Remove highlight
    }
}
window.openOwnerPortal = function() {
    // Populate Promo Switch
    document.getElementById('ownerPromoToggle').checked = storeConfig.showPromos || false;
    document.getElementById('ownerPortalModal').classList.remove('hidden');
}

// 2. Handle Promo Toggle (Live Save)
const ownerPromoToggle = document.getElementById('ownerPromoToggle');
if(ownerPromoToggle) {
    ownerPromoToggle.onchange = async (e) => {
        await setDoc(doc(db, "settings", "storeConfig"), { 
            ...storeConfig, 
            showPromos: e.target.checked 
        });
        showToast(e.target.checked ? "Promos Active!" : "Promos Hidden", "success");
    };
}

// 3. Handle QR Uploads
async function handleQrUpload(file, type) {
    if(!file) return;
    showToast(`Uploading ${type} QR...`, "info");

    const formData = new FormData();
    formData.append('image', file);
    formData.append('key', IMGBB_KEY);

    try {
        const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData });
        const json = await res.json();
        
        if(json.success) {
            const url = json.data.url;
            
            // Save to Firebase
            const updateData = {};
            if(type === 'GCash') updateData.gcashUrl = url;
            if(type === 'BPI') updateData.bpiUrl = url;
            
            await setDoc(doc(db, "settings", "storeConfig"), { 
                ...storeConfig, 
                ...updateData 
            });
            
            showToast(`${type} QR Updated!`, "success");
            
            // Visual feedback in modal
            const statusId = type === 'GCash' ? 'gcashStatus' : 'bpiStatus';
            document.getElementById(statusId).innerText = "✔ Updated Just Now";
            document.getElementById(statusId).style.color = "#4CAF50";
        }
    } catch(err) {
        console.error(err);
        showToast("Upload Failed", "error");
    }
}

// Listeners for QR Inputs
document.getElementById('uploadGcashInput').onchange = (e) => handleQrUpload(e.target.files[0], 'GCash');
document.getElementById('uploadBpiInput').onchange = (e) => handleQrUpload(e.target.files[0], 'BPI');

// 4. Update Password
window.updateOwnerPassword = async function() {
    const newPass = document.getElementById('newAdminPass').value;
    if(!newPass || newPass.length < 6) return showToast("Password too short", "error");

    const user = auth.currentUser;
    if(user) {
        try {
            await updatePassword(user, newPass);
            showToast("Password Changed!", "success");
            document.getElementById('newAdminPass').value = "";
        } catch(err) {
            console.error(err);
            showToast("Login again to change pass", "error"); // Firebase requires recent login
        }
    }
}

// 5. Admin Logout Wrapper
window.adminLogout = function() {
    signOut(auth);
    document.getElementById('ownerPortalModal').classList.add('hidden');
}
window.handleLockClick = function() {
    if(auth.currentUser) {
        openOwnerPortal(); // Already logged in? Open Dashboard
    } else {
        document.getElementById('authModal').classList.remove('hidden'); // Logged out? Show Login
    }
}
function showCustomConfirm(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('customConfirmModal');
        const msgEl = document.getElementById('confirmMsg');
        const btnYes = document.getElementById('btnConfirmYes');
        const btnNo = document.getElementById('btnConfirmNo');

        if(!modal) return resolve(false);

        msgEl.innerText = message;
        modal.classList.remove('hidden');

        const cleanup = () => {
            modal.classList.add('hidden');
            btnYes.onclick = null;
            btnNo.onclick = null;
        };

        btnYes.onclick = () => { cleanup(); resolve(true); };
        btnNo.onclick = () => { cleanup(); resolve(false); };
    });
}
window.renderCheckoutList = function() {
    const list = document.getElementById('checkoutList');
    const totalEl = document.getElementById('finalTotal');
    
    list.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:30px; color:#666;">Tray is empty</div>';
        totalEl.innerText = '₱0';
        return;
    }

    cart.forEach(item => {
        const lineTotal = item.price * item.qty;
        total += lineTotal;

        list.innerHTML += `
            <div class="checkout-item">
                <div class="chk-details">
                    <span class="chk-name">${item.name}</span>
                    <span class="chk-price">@ ₱${item.price}</span>
                </div>
                <div class="chk-actions">
                    <button class="chk-btn chk-minus" onclick="updateCheckQty('${item.id}', -1)">
                        <i class="fas fa-minus"></i>
                    </button>
                    <span class="chk-qty">${item.qty}</span>
                    <button class="chk-btn chk-plus" onclick="updateCheckQty('${item.id}', 1)">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
                <div style="font-weight:bold; width: 60px; text-align:right;">
                    ₱${lineTotal}
                </div>
            </div>
        `;
    });

    totalEl.innerText = `₱${total.toLocaleString()}`;
    
    // Also update the global badge in the sidebar
    updateCartUI(); 
}

// 2. Handle + / - clicks
window.updateCheckQty = function(id, change) {
    const itemIndex = cart.findIndex(x => x.id === id);
    if (itemIndex === -1) return;

    // Apply change
    cart[itemIndex].qty += change;

    // If 0, remove it
    if (cart[itemIndex].qty <= 0) {
        cart.splice(itemIndex, 1);
        delete stagedItems[id]; // Safety clear
    } 
    // ELSE: DO NOT UPDATE STAGED ITEMS
    // Removing this line fixes the UI issue when going back to menu:
    // else { stagedItems[id] = cart[itemIndex].qty; } <--- DELETE THIS

    // Save to Storage (Persistence)
    localStorage.setItem('lecker_cart', JSON.stringify(cart));

    // Re-render
    renderCheckoutList();
    
    if(cart.length === 0) showToast("Tray is now empty", "info");
}

// 3. Handle "Clear Selection"
window.clearEntireCart = async function() {
    if(cart.length === 0) return;

    const isConfirmed = await showCustomConfirm("Remove all items from tray?");
    if (isConfirmed) {
        cart = [];
        stagedItems = {};
        localStorage.removeItem('lecker_cart');
        
        renderCheckoutList();
        updateCartUI();
        showToast("Tray Cleared", "info");
        
        // Optional: Send them back to menu if clear?
        // document.getElementById('backToMenuBtn').click();
    }
}
// Add this anywhere in app.js
window.startKioskSession = function(type) {
    // 1. Save the type (Dine-in, Take-out, etc)
    sessionStorage.setItem('currentOrderType', type);
    
    // 2. Perform the Slide Animation
    document.getElementById('landingPage').classList.add('slide-up');
    document.getElementById('kioskContainer').classList.remove('hidden');
}
// --- BADGE ZOOM LOGIC ---
window.triggerBadgeZoom = function(imgElement) {
    const viewer = document.getElementById('badgeZoomViewer');
    
    // 1. Copy the image
    viewer.src = imgElement.src;
    
    // 2. Pop it up
    viewer.classList.add('active');
    
    // 3. Wait 2 seconds, then shrink it back
    setTimeout(() => {
        viewer.classList.remove('active');
    }, 2000);
}
// 1. INITIALIZE MAP
function initDeliveryMap() {
    if (map) {
        setTimeout(() => map.invalidateSize(), 100);
        return;
    }

    // 1. Initialize Map with Constraints
    map = L.map('mapContainer', {
        maxBounds: CEBU_BOUNDS,   // LOCK AREA
        maxBoundsViscosity: 1.0,  // Bouncy edge
        minZoom: 13,              // Don't let them zoom out too far
        maxZoom: 18
    }).setView(STORE_COORDS, 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);

    // Shop Marker
    const shopPopup = "<b>Joanna's Store</b><br>We start here.";
    L.marker(STORE_COORDS).addTo(map).bindPopup(shopPopup).openPopup();

    // Customer Marker
    const startOffset = [STORE_COORDS[0] + 0.002, STORE_COORDS[1] + 0.002]; 
    marker = L.marker(startOffset, {draggable: true}).addTo(map);

    // Event Listeners
    marker.on('dragend', function(e) {
        const pos = marker.getLatLng();
        calculateRoute(pos.lat, pos.lng);
    });

    map.on('click', function(e) {
        marker.setLatLng(e.latlng);
        calculateRoute(e.latlng.lat, e.latlng.lng);
    });
    
    setTimeout(() => map.invalidateSize(), 200);
}


async function calculateRoute(custLat, custLng) {
    const statusText = document.getElementById('feeDisplay');
    statusText.innerText = "...";

    try {
        // OSRM requires: Longitude,Latitude
        const startPoint = `${STORE_COORDS[1]},${STORE_COORDS[0]}`; 
        const endPoint = `${custLng},${custLat}`;
        
        const url = `https://router.project-osrm.org/route/v1/driving/${startPoint};${endPoint}?overview=false`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.code === 'Ok') {
            const meters = data.routes[0].distance;
            const km = (meters / 1000).toFixed(1);

            // NEW FORMULA:
            // Base ₱25 + (₱7 per km)
            // Example: 2.1km -> 25 + 14.7 = 39.7 -> Rounds to 40
            let fee = Math.round(BASE_FARE + (parseFloat(km) * PER_KM));
            
            // Safety: Never go below ₱30 (Minimum rider acceptance rate)
            if(fee < 30) fee = 30;  

            // Update UI
            document.getElementById('distDisplay').innerText = `${km} km`;
            document.getElementById('feeDisplay').innerText = `₱${fee}`;
            
            // Update Inputs
            document.getElementById('calcDistance').value = km;
            document.getElementById('calcFee').value = fee;

            // Recalculate Grand Total
            const foodTotal = cart.reduce((a,b) => a + (b.price * b.qty), 0);
            const grandTotal = foodTotal + fee;
            
            document.getElementById('finalTotal').innerHTML = `
                <span style="color:#ccc; font-size:0.9rem;">Food: ₱${foodTotal}</span><br>
                <span style="color:var(--gold); font-size:1.3rem;">Total: ₱${grandTotal}</span>
            `;
        }
    } catch (err) {
        console.error("Routing Error", err);
    }
}

// 3. HELPER TO UPDATE CART TOTAL UI
function updateCartWithDelivery(fee) {
    const foodTotal = cart.reduce((a,b) => a + (b.price * b.qty), 0);
    const grandTotal = foodTotal + fee;
    
    // Update the Checkout UI Total
    document.getElementById('finalTotal').innerHTML = `
        <span style="color:#ccc; font-size:0.9rem;">Food: ₱${foodTotal}</span><br>
        <span style="color:var(--gold); font-size:1.3rem;">Total: ₱${grandTotal}</span>
    `;
}
// --- SEARCH LOCATION FUNCTION ---
// --- SEARCH LOCATION FUNCTION (Updated to use Photon API) ---
window.searchLocation = async function() {
    const query = document.getElementById('geoSearchInput').value;
    if(!query) return showToast("Type a location first", "error");

    const btn = document.querySelector('#geoSearchInput + button');
    const originalIcon = btn ? btn.innerHTML : '<i class="fas fa-search"></i>';
    if(btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; 

    try {
        // 1. Search with Cebu Context
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lat=10.3157&lon=123.8854&limit=5`;
        
        const response = await fetch(url);
        const data = await response.json();

        // 2. Filter Results: Must be inside Cebu City/Mandaue/Talisay area
        // We do this by checking if it's within ~15km of the store
        let bestResult = null;

        if (data.features && data.features.length > 0) {
            // Find the first result that is actually in Cebu
            for (let item of data.features) {
                const props = item.properties;
                const cityCheck = (props.city || "").toLowerCase();
                const stateCheck = (props.state || "").toLowerCase();
                
                // Loose check for Cebu context
                if (cityCheck.includes('cebu') || stateCheck.includes('cebu') || props.postcode?.startsWith('60')) {
                    bestResult = item;
                    break;
                }
            }
        }

        if (bestResult) {
            const lng = bestResult.geometry.coordinates[0];
            const lat = bestResult.geometry.coordinates[1];

            // 3. Update Map
            const newLatLng = [lat, lng];
            if(map) {
                map.setView(newLatLng, 16); // Zoom in close
                if(marker) marker.setLatLng(newLatLng);
            }

            // 4. Update Address Field
            const props = bestResult.properties;
            const addrString = [props.name, props.street].filter(Boolean).join(', ');
            const addrInput = document.getElementById('custAddress');
            if(addrInput) addrInput.value = addrString;

            // 5. Calculate
            calculateRoute(lat, lng);
            showToast("Location Found!", "success");

        } else {
            // FALLBACK FOR NEW BUILDINGS
            showToast("Location not on map yet. Please drag the pin manually.", "warning");
            
            // Helpful: Focus the map so they know they have to drag
            document.getElementById('mapContainer').scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

    } catch (err) {
        console.error(err);
        showToast("Connection failed", "error");
    } finally {
        if(btn) btn.innerHTML = originalIcon;
    }
}
// Allow pressing "Enter" in the box
window.handleEnterSearch = function(e) {
    if(e.key === 'Enter') window.searchLocation();
}
