import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, query, onSnapshot } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// --- CONFIG (Same as App) ---
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

// STATE
let previousServingIds = [];

// INIT
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. RAW QUERY (Fixes the "Stuck" issue)
    // We grab all orders and filter them in JavaScript
    const q = query(collection(db, "orders"));

    // 2. Define "Start of Today"
    const today = new Date();
    today.setHours(0,0,0,0);

    onSnapshot(q, (snapshot) => {
        const prepContainer = document.getElementById('prepList');
        const serveContainer = document.getElementById('serveList');
        
        if(!prepContainer || !serveContainer) return;

        prepContainer.innerHTML = '';
        serveContainer.innerHTML = '';

        const currentServingIds = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            const id = doc.id;
            const displayId = data.queueNum ? `#${String(data.queueNum).padStart(6, '0')}` : '...';

            // PREPARING
            if (data.status === 'pending' || data.status === 'confirmed') {
                const div = document.createElement('div');
                div.className = 'prep-num';
                div.innerText = displayId;
                prepContainer.appendChild(div);
            }

            // NOW SERVING
            if (data.status === 'completed') {
                currentServingIds.push(id);
                
                const card = document.createElement('div');
                card.className = 'serve-card';
                
                // Flash if new
                if (!previousServingIds.includes(id)) {
                    card.classList.add('just-added');
                    playBell();
                }
                
                card.innerHTML = `
                    <div class="serve-num">${displayId}</div>
                    <div class="serve-label">Please Collect</div>
                `;
                serveContainer.appendChild(card);
            }
        });

        previousServingIds = currentServingIds;
    });
});


function playBell() {
    const audio = document.getElementById('bellSound');
    if(audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log("Sound blocked"));
    }
}