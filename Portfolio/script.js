const styleTitle = [
  'font-size: 20px',
  'font-family: monospace',
  'background: #0f172a',
  'color: #2563eb', // Your Royal Blue
  'padding: 10px 20px',
  'border: 3px solid #2563eb',
  'text-shadow: 0 0 10px #2563eb'
].join(';');

const styleBody = [
  'font-size: 12px',
  'font-family: monospace',
  'color: #94a3b8',
].join(';');
console.log('%cHINT: ↑ ↑ ↓ ↓ ← → ← → B A', 'color: #333; font-size: 8px;');
console.log('%c JOSE ROMEO STUDIO %c', styleTitle, '');
console.log('%cSystem Status: ONLINE \nSecurity Level: MAX \n\nLooking for the source code? \nLet\'s save you the trouble -> https://github.com/jromeo999', styleBody);// Data: Your Ecosystem
// I organized them based on my previous analysis of your links
const projects = [
    {
        title: "Svibe Ecosystem",
        type: "Internal Platform",
        desc: "Features attendance tracking, audio stations, HR integration, Global Announcements.",
        url: "https://svibe.netlify.app",
        icon: "fa-layer-group",
        credentials:"Create Account to Join in the fun",
        readme:"1. Create an acount.\n2. Test everything. \n3. Have Fun!"
    },
    {
        title: "Demo Clinic App",
        type: "Medical Portal",
        desc: "Digital triage system for employee medical requests and certificate validation.",
        url: "https://sosclinic.netlify.app",
        icon: "fa-user-nurse",
        credentials:"Email: demo@nurse.com | Pass: password123 or use Code: demo123",
        readme: "This app demonstrates complex form validation and triage logic. Submitting a form sends data to the Nurse for approval, See Live Status changes."
    },
    {
        title: "Marketplace",
        type: "Internal E-Commerce",
        desc: "A dedicated platform for internal trading and company merch redemption.",
        url: "https://sosmarketplace.netlify.app",
        icon: "fa-store",
        credentials:"Create Account to test as Buyer or Vendor",
        readme:"1. Create an acount.\n2. Test everything. \n3. Have Fun!"
    },
    {
        title: "Freedom Wall",
        type: "Social Engagement",
        desc: "An anonymous posting board with moderation tools to boost employee morale.",
        url: "https://sosfwall.netlify.app",
        icon: "fa-comments",
        credentials: "No login required for guest view",
        readme:"Post what you feel for everyone to see! \n Let them know who you are or post anonymously."
    },
    {
        title: "EOD Tracker",
        type: "Data Visualization",
        desc: "Replaces Excel sheets with a dynamic dashboard for daily performance reporting.",
        url: "https://eodtracker.netlify.app",
        icon: "fa-chart-line",
        credentials: "Code: 9999",
        readme:"Suitable for VA Companies w/ remote personnels.\nSay goodbye to monthly Subscriptions! \nTo Test:\n1. Login to see Manager Dashboard. \n2. Create Accounts/Departments. \n3. Add Roles, customize their specific tasks. \n4. Assign Members to Accounts and choose from roles you created. \n5. Create default Codes for their logins. \n6. Test created agent codes to check what Agent view looks like. \n\n Monitor their tasks output monthly, annually via Trends buttons."
    },
    {
        title: "Lecker Burger",
        type: "Brand Identity",
        desc: "High-performance landing page for a boutique burger brand focused on conversion.",
        url: "https://leckerburger.netlify.app",
        icon: "fa-burger",
        credentials:"User: admin@leckerburger.ph | Pass: admin101",
        readme:"Ready to have your very own fastfood setup?\n 1. Login as owner\n2. Test the Admin Mode Panel: \nAdd Menus, Pricing, Toggle Promos/Event if you have one. \n3. Check Open Dashboard. \n4. For Kitchen Display area load this site on a Tablet or a 2nd Monitor > leckerburger.netlify.app/kitchen.html \n5. Realtime sync, Visually pleasing. \n6. Everything you need for Sales Tracking is in it. \n\n Want it done your way? Feel free to reach out. Let's Connect! "       
    },
    {
        title:"PortaGo!",
        type: "Portfolio Helper",
        desc: "Non-techy? No idea how to use Canva? Want to have your own brand?",
        url: "https://portago.netlify.app",
        icon: "fa-suitcase",
        readme:"To test how it works: \n1. Click Prefill Sample Data. \n2. Click Next til you reach Design & Publish.\n3. Choose from multiple designs/templates. \n4. Follow Deploy instructions. \n4. Congratulations! You have your own Portfolio! \n\n Not liking the templates? Let's Connect and make it more specific for your taste."
    },
    {
        title:"J | ARCHIVE",
        type: "Movie archives",
        desc: "Can't afford Premium Streaming Platforms? Let's Make it your very own Personal Collection!",
        url: "https://j-hub.netlify.app",
        icon: "fa-film",
        credentials: "PM dev",
        readme:"Collection of favorit blockbust movies in one app.\n Share them with your friends.\n *For Optimal use of the app use Brave Browser.\n\nIf you want to test admin view and how to save your movies. \nJust Reach Out!"
    },
    
    {
        title:"TEACHING LOAD 2026",
        type: "Personal Profiles",
        desc: "Tired of posting updates via Facebook? Don't want to bore your students to death? Check this one out.",
        url: "https://vcaballesteachingload.netlify.app",
        icon: "fa-calendar"
    },
    {
        title:"Tom Racho Tattoo Studio",
        type: "Personal Profiles",
        desc: "Want to showcase your passion? Your Skills? Let's show it to everyone.",
        url: "https://tomrachotattoo.netlify.app",
        icon: "fa-user"
    },
];  

// 1. Render Projects
// 1. Render Projects
const grid = document.getElementById('project-grid');

// NOTICE: Added ', index' inside the parentheses
projects.forEach((proj, index) => {
    
    // ... (Your existing button logic for credsBtn/readmeBtn) ...
    // COPY YOUR EXISTING BUTTON LOGIC HERE
    const credsBtn = proj.credentials 
        ? `<button class="btn-mini key-btn" onclick="copyCreds('${proj.credentials}')" title="Get Credentials"><i class="fa-solid fa-key"></i></button>` 
        : '';
    
    const readmeBtn = proj.readme 
        ? `<button class="btn-mini readme-btn" onclick="openReadme('${proj.title}', \`${proj.readme}\`)" title="Read Manual"><i class="fa-solid fa-file-lines"></i></button>` 
        : '';

    const card = document.createElement('div');
    card.className = 'project-card hidden-scroll';
    
    // NEW: THE STAGGER CALCULATION
    // Each card waits 150ms longer than the previous one
    // e.g., Card 1: 0ms, Card 2: 150ms, Card 3: 300ms...
    // Change to a smaller delay or cap it
    card.style.transitionDelay = `${Math.min(index * 100, 500)}ms`;

    card.innerHTML = `
        <div class="card-header">
            <i class="fa-solid ${proj.icon} folder-icon"></i>
            <span class="project-type">${proj.type}</span>
        </div>
        
        <div class="project-header-row">
            <h3>${proj.title}</h3>
            <div class="header-actions">
                ${credsBtn}
                ${readmeBtn}
            </div>
        </div>
        
        <p>${proj.desc}</p>
        <div class="card-actions">
            <button class="btn-test" onclick="openPreview('${proj.url}')">
                <i class="fa-solid fa-play"></i> Live Test
            </button>
        </div>
    `;
    grid.appendChild(card);
});
window.copyCreds = (text) => {
    // Copy to clipboard
    navigator.clipboard.writeText(text).then(() => {
        // Show "System Notification" (Success)
        showNotification('success', 'Access Key Copied', text);
    }).catch(err => {
        // Fallback: Just show it if copy fails
        showNotification('info', 'Credentials', text);
    });
};

// 2. README LOGIC
const readmeModal = document.getElementById('readme-modal');
const closeReadme = document.getElementById('close-readme');

window.openReadme = (title, text) => {
    document.getElementById('readme-title-header').innerText = title + " // MANUAL";
    document.getElementById('readme-title').innerText = title;
    document.getElementById('readme-text').innerText = text; // Uses innerText to respect line breaks
    
    readmeModal.classList.add('active');
    document.body.style.overflow = 'hidden';
};

// Close Readme Logic
closeReadme.addEventListener('click', () => {
    readmeModal.classList.remove('active');
    document.body.style.overflow = 'auto';
});

// Close when clicking outside (works for both modals)
readmeModal.addEventListener('click', (e) => {
    if (e.target === readmeModal) closeReadme.click();
});

// 2. Modal Logic (The "Live Preview" Twist)
const modal = document.getElementById('preview-modal');
const iframe = document.getElementById('site-frame');
const modalUrl = document.getElementById('modal-url');
const closeBtn = document.getElementById('close-modal');
const newTabBtn = document.getElementById('open-new-tab');

window.openPreview = (url) => {
    const modal = document.getElementById('preview-modal');
    const iframe = document.getElementById('site-frame');
    const modalUrl = document.getElementById('modal-url');
    const newTabBtn = document.getElementById('open-new-tab');

    if (modal && iframe) {
        modal.classList.add('active');
        iframe.src = url;
        
        // Update URL bar text
        if (modalUrl) modalUrl.textContent = url;
        
        // Lock background scrolling
        document.body.style.overflow = 'hidden';
        
        // Setup "Open in New Tab" button
        if (newTabBtn) {
            newTabBtn.onclick = () => window.open(url, '_blank');
        }
    }
};

// Function to close modal
closeBtn.addEventListener('click', () => {
    modal.classList.remove('active');
    iframe.src = ''; // Stop audio/video playing
    document.body.style.overflow = 'auto';
});

// Close if clicked outside
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeBtn.click();
    }
});

// 3. Scroll Animations (Intersection Observer)
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            // Element entered viewport: Play Animation
            entry.target.classList.add('show-scroll');
        } else {
            // Element left viewport: Reset Animation
            // This ensures it plays again next time you see it
            entry.target.classList.remove('show-scroll');
        }
    });
});

const hiddenElements = document.querySelectorAll('.hidden-scroll');
hiddenElements.forEach((el) => observer.observe(el));
// --- NOTIFICATION SYSTEM ---
function showNotification(type, title, message) {
    const container = document.getElementById('notification-container');
    
    // Create the toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Icon selection
    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-check-circle';
    if (type === 'error') iconClass = 'fa-circle-exclamation';
    
    toast.innerHTML = `
        <i class="fa-solid ${iconClass} toast-icon"></i>
        <div class="toast-content">
            <span class="toast-title">${title}</span>
            <span class="toast-msg">${message}</span>
        </div>
    `;
    
    container.appendChild(toast);
    
    // Remove after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.4s ease forwards';
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 4000);
}

// Add this at the very end of script.js
// FIND THIS BLOCK AT THE BOTTOM OF YOUR JS
window.addEventListener('load', () => {
    
    // 1. Your existing "System Online" notification
    setTimeout(() => {
        showNotification('info', 'System Online', 'Portfolio modules loaded successfully.');
    }, 1000);

    // 2. PASTE YOUR NEW CODE HERE (I tweaked the logic to match your variables)
    setTimeout(() => {
        // We check if 'isChatInitialized' is false AND if the window still has 'hidden-chat'
        if (!isChatInitialized && chatWindow.classList.contains('hidden-chat')) {
            
            // Add a visual cue class
            chatLauncher.classList.add('attention-seeker');
            
            // Optional: Play a subtle sound?
            // new Audio('assets/sounds/ping.mp3').play();
            
            // Remove the animation after 3 seconds so it doesn't look broken
            setTimeout(() => {
                chatLauncher.classList.remove('attention-seeker');
            }, 3000);
        }
    }, 7000); // 7 Seconds delay
});
// --- HERO PARALLAX EFFECT ---
const heroSection = document.getElementById('hero');
const nodes = document.querySelectorAll('.tech-node');

heroSection.addEventListener('mousemove', (e) => {
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    
    // Move the nodes slightly based on mouse position
    nodes.forEach((node, index) => {
        // Calculate a unique speed for each node based on its index
        const speed = (index + 1) * 20; 
        
        const moveX = (window.innerWidth / 2 - e.clientX) / speed;
        const moveY = (window.innerHeight / 2 - e.clientY) / speed;
        
        node.style.transform = `translate(${moveX}px, ${moveY}px)`;
    });
});
// --- SMART FAB LOGIC ---
const fab = document.getElementById('smart-fab');
const fabIcon = fab.querySelector('i');

// Get all main structural elements
// We select sections AND the footer so we know when to stop
const landmarks = document.querySelectorAll('section, footer');

function updateFabState() {
    // Math to detect if we are near the bottom
    // (ScrollY + Window Height) >= (Total Doc Height - small buffer)
    const scrollPosition = window.scrollY + window.innerHeight;
    const documentHeight = document.body.offsetHeight;
    const isAtBottom = scrollPosition >= (documentHeight - 50);

    if (isAtBottom) {
        fab.classList.add('up-mode');
        // We don't change the icon class, we just rotate the button via CSS
        // It looks cooler (animated flip)
    } else {
        fab.classList.remove('up-mode');
    }
}

function handleFabClick() {
    // If we are at the bottom (Up Mode), go to top
    if (fab.classList.contains('up-mode')) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }

    // Otherwise, find the NEXT landmark
    const currentScroll = window.scrollY;
    
    // Find the first section that starts *after* our current view (+ buffer)
    let nextTarget = null;
    
    for (const landmark of landmarks) {
        // 100px buffer to ensure we don't just scroll 5px
        if (landmark.offsetTop > (currentScroll + 100)) {
            nextTarget = landmark;
            break; // Found it, stop looking
        }
    }

    if (nextTarget) {
        // Scroll to it (minus nav height for padding)
        const targetPosition = nextTarget.offsetTop - 80; 
        window.scrollTo({ top: targetPosition, behavior: 'smooth' });
    } else {
        // If no next target found (weird edge case), just go to bottom
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
}

// Listeners
window.addEventListener('scroll', updateFabState);
fab.addEventListener('click', handleFabClick);
// ==========================================
//  EMAILJS TRANSMISSION LOGIC (FIXED)
// ==========================================

const contactForm = document.getElementById('contact-form');
const submitBtn = document.getElementById('submit-btn');

if (contactForm) {
    contactForm.addEventListener('submit', function(event) {
        event.preventDefault(); // Stop page refresh

        // --- 1. CONFIGURATION (PASTE KEYS HERE) ---
        const serviceID = 'Contact US';      // PASTE YOUR SERVICE ID
        const templateID = 'template_ri91rcg';    // PASTE YOUR TEMPLATE ID
        const publicKey = '_vpMAL03l1qt9rrgS';   // PASTE YOUR PUBLIC KEY HERE

        // --- 2. UI Loading State ---
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML = 'TRANSMITTING... <i class="fa-solid fa-spinner fa-spin"></i>';
        submitBtn.disabled = true;

        // --- 3. Send the Data Packet ---
        // Notice we pass 'publicKey' as the 4th argument now!
        emailjs.sendForm(serviceID, templateID, this, publicKey)
            .then(() => {
                // SUCCESS
                console.log('SUCCESS!');
                submitBtn.innerHTML = 'DATA SENT <i class="fa-solid fa-check"></i>';
                submitBtn.style.backgroundColor = '#10B981';
                contactForm.reset();
                showNotification('success', 'Transmission Complete', 'Your message has been delivered. Keep your inbox open for a response from Dev. \n Have a nice Day!');

                setTimeout(() => {
                    submitBtn.innerHTML = originalBtnText;
                    submitBtn.style.backgroundColor = '';
                    submitBtn.disabled = false;
                }, 3000);

            }, (error) => {
                // ERROR
                console.log('FAILED...', error);
                // Alert the specific error to the console so we know what's wrong
                alert("Error: " + JSON.stringify(error)); 
                
                submitBtn.innerHTML = 'ERROR <i class="fa-solid fa-triangle-exclamation"></i>';
                submitBtn.style.backgroundColor = '#EF4444';
                showNotification('error', 'Transmission Failed', 'Check console for details.');

                setTimeout(() => {
                    submitBtn.innerHTML = originalBtnText;
                    submitBtn.style.backgroundColor = '';
                    submitBtn.disabled = false;
                }, 3000);
            });
    });
}
// ==========================================
//  SMART CHATBOT LOGIC (v2 - With Email Capture)
// ==========================================

const chatLauncher = document.getElementById('chat-launcher');
const chatWindow = document.querySelector('.chat-window');
const closeChat = document.getElementById('close-chat');
const chatInput = document.getElementById('chat-input');
const sendChatBtn = document.getElementById('send-chat-btn');
const chatBody = document.getElementById('chat-body');

// STATE VARIABLES
let isChatInitialized = false;
let chatMode = 'menu'; // 'menu', 'awaiting_email', 'active_chat'
let visitorEmail = ''; // To store their email
let inactivityTimer;
const TIMEOUT_LIMIT = 5 * 60 * 1000; // 5 Minutes (in milliseconds)

// --- THE BRAIN (Script) ---
const botScript = {
    start: {
        msg: "System Online. Welcome to Jose Romeo Studio. Accessing protocols... What data do you require?",
        options: [
            { label: "🛠️ Services", next: "services" },
            { label: "📍 Location", next: "location" },
            { label: "💰 Rates", next: "rates" },
            { label: "📅 Book Consultation", next: "booking_check" }, // Leads to the new check
            { label: "Connect via Socials 👇", action: "scroll_footer_highlight" }
        ]
    },
    services: {
        msg: "I architect Ecosystems. Specializing in:\n\n> Web App Development (React/Vue/JS)\n> Internal Tools (HR/Attendance Systems)\n> Custom Dashboards (EOD Trackers)\n> Automation Workflows",
        options: [
            { label: "See Portfolio", action: "scroll_work" },
            { label: "Back to Menu", next: "start" },
            { label: "Let's Build!", next: "booking_check" }, // Also leads here now
            { label: "Connect via Socials 👇", action: "scroll_footer_highlight" }
        ]
    },
    location: {
        msg: "Base of Operations: Philippines 🇵🇭.\nOperable via Remote Protocol globally. \nTimezone: GMT+8.",
        options: [
            { label: "Back to Menu", next: "start" },
            { label: "Contact Agent", next: "booking_check" }
        ]
    },
    rates: {
        msg: "Rates depend on complexity (Ecosystem vs Simple Site).\n\nStandard Range: Project-based or Hourly Retainer available. \n\nI offer value-based pricing—you pay for the solution, not just the code.",
        options: [
            { label: "Get a Quote", next: "booking_check" },
            { label: "Back to Menu", next: "start" }
        ]
    },

    // --- THE FIX: SMOOTHER TRANSITION ---
    booking_check: {
        // We use a question here so the user knows they MUST answer
        msg: "I am currently accepting new projects for Q1 2026. \n\nWould you like to open a priority ticket to discuss your requirements directly with Jose?",
        options: [
            { label: "✅ Yes, Open Ticket", next: "init_live_chat" },
            { label: "❌ No, Just Browsing", next: "start" }
        ]
    },

    init_live_chat: {
        msg: "Understood. 📝\n\nPlease enter your **EMAIL ADDRESS** below so I can send the consultation details.",
        action: "ask_email"
    },
    
    post_email_options: {
        msg: "Ticket Created. 📨 \n\nI have notified Jose. Is there anything else you need?",
        options: [
            { label: "Back to Menu", next: "start" },
            { label: "No, close chat", next: "farewell" }
        ]
    },
    farewell: {
        msg: "Session Terminated. Have a productive day.",
        options: [
            { label: "Connect via Socials 👇", action: "scroll_footer_highlight" }
        ]
    }
};

// --- CORE FUNCTIONS ---

chatLauncher.addEventListener('click', () => {
    chatWindow.classList.toggle('hidden-chat');
    document.querySelector('.notification-badge').style.display = 'none';
    
    if (!isChatInitialized) {
        setTimeout(() => runScript('start'), 500);
        isChatInitialized = true;
    }
    
    // NEW: Start tracking time
    if (!chatWindow.classList.contains('hidden-chat')) {
        startInactivityTimer();
    } else {
        stopInactivityTimer();
    }
});

closeChat.addEventListener('click', () => {
    chatWindow.classList.add('hidden-chat');
    stopInactivityTimer(); // Stop counting if they closed it manually
});

// 2. The Script Runner
function runScript(nodeKey) {
    const node = botScript[nodeKey];
    addMessage(node.msg, 'bot');

    if (node.action === 'ask_email') {
        enableInput("Enter your email address...");
        chatMode = 'awaiting_email'; 
        return;
    }
    
    // Direct Action Trigger (for nodes without buttons)
    if (node.action === 'scroll_work') {
        document.getElementById('work').scrollIntoView({ behavior: 'smooth' });
        return;
    }

    if (node.options) {
        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'chat-options';
        
        node.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'option-chip';
            btn.innerText = opt.label;
            
            // --- THE CRITICAL FIXES ARE HERE ---
            btn.onclick = (e) => {
                e.stopPropagation(); // 1. PREVENTS CHAT FROM CLOSING
                
                startInactivityTimer(); 
                addMessage(opt.label, 'user');
                optionsDiv.remove();
                
                setTimeout(() => {
                    // Logic flow
                    if (opt.next) runScript(opt.next);
                    
                    if (opt.action) {
                        if (opt.action === 'ask_email') {
                            // 1. First, show the bot message
                            addMessage(botScript.init_live_chat.msg, 'bot');
                            
                            // 2. Add a tiny delay before unlocking the input
                            // This prevents the user from feeling rushed or "hung up"
                            setTimeout(() => {
                                enableInput("name@company.com");
                                chatMode = 'awaiting_email';
                            }, 800);
                            
                        } else {
                            // 2. TRIGGERS THE SCROLL FUNCTION
                            runScriptByAction(opt.action);
                        }
                    }
                }, 600);
            };
            optionsDiv.appendChild(btn);
        });
        chatBody.appendChild(optionsDiv);
        scrollToBottom();
    }
}

// 3. INPUT HANDLER (The Brain Switch)
function handleInputSubmission() {
    const text = chatInput.value.trim();
    if (!text) return;

    addMessage(text, 'user');
    chatInput.value = '';
    startInactivityTimer();
    
    // A) WAITING FOR EMAIL
    if (chatMode === 'awaiting_email') {
        // Simple validation check
        if (text.includes('@') && text.includes('.')) {
            visitorEmail = text; // SAVE THE EMAIL!
            
            // NEW: Success response emphasizes the "Trade"
            setTimeout(() => {
                addMessage(`✅ **Slot Reserved** for: ${visitorEmail} \n\nYou now have a direct line. Please briefly describe your project below...`, 'bot');
                chatInput.placeholder = "Describe your project...";
                chatMode = 'active_chat'; // Switch to real chat mode
            }, 500);
        } else {
            // Error response
            setTimeout(() => {
                addMessage("❌ Invalid Protocol. Please enter a valid email to reserve your slot.", 'bot');
            }, 500);
        }
        return;
    }

    // B) ACTIVE CHAT (Sending Message)
    if (chatMode === 'active_chat') {
        sendToEmailJS(text);
    }
}


// 4. EMAILJS SENDER
async function sendToEmailJS(msg) {
    // Show Loading
    const loadingId = 'loading-' + Date.now();
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'msg bot';
    loadingDiv.id = loadingId;
    loadingDiv.innerHTML = `<p><i class="fa-solid fa-spinner fa-spin"></i> Transmitting...</p>`;
    chatBody.appendChild(loadingDiv);
    scrollToBottom();

    // EMAILJS CONFIG
    const serviceID = 'Contact US';      
    const templateID = 'template_ri91rcg';    
    const publicKey = '_vpMAL03l1qt9rrgS';   

    const params = {
        user_name: "Live Chat Visitor",
        user_email: visitorEmail, // USE THE CAPTURED EMAIL HERE!
        message: "CHAT LOG: " + msg
    };

    try {
        await emailjs.send(serviceID, templateID, params, publicKey);
        document.getElementById(loadingId).remove();
        addMessage("Transmission received. Jose will respond via email shortly.", "bot");
        setTimeout(() => runScript('post_email_options'), 1000);
    } catch (error) {
        document.getElementById(loadingId).remove();
        addMessage("Transmission Failed. Please use the Contact Form below.", "bot");
        console.error(error);
    }
}

// UI Helpers
function enableInput(placeholderText) {
    chatInput.disabled = false;
    sendChatBtn.disabled = false;
    chatInput.placeholder = placeholderText;
    chatInput.focus();
}

function addMessage(text, type) {
    const div = document.createElement('div');
    div.className = `msg ${type}`;
    div.innerHTML = `<p>${text.replace(/\n/g, '<br>')}</p>`;
    chatBody.appendChild(div);
    scrollToBottom();
}

function scrollToBottom() {
    chatBody.scrollTop = chatBody.scrollHeight;
}

// Listeners
sendChatBtn.addEventListener('click', handleInputSubmission);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleInputSubmission();
});
function runScriptByAction(action) {
    // SCROLL TO WORK
    if (action === 'scroll_work') {
        const workSection = document.getElementById('work');
        if(workSection) {
            workSection.scrollIntoView({ behavior: 'smooth' });
            setTimeout(() => runScript('start'), 2000);
        }
    }
    
    // SCROLL TO FOOTER (With Hard Reset)
    if (action === 'scroll_footer_highlight') {
        const footer = document.querySelector('footer');
        const socials = document.querySelector('.socials'); 
        const chatWindow = document.querySelector('.chat-window');
        
        // 1. SCROLL FIRST
        if(footer) footer.scrollIntoView({ behavior: 'smooth' });
        
        // 2. HIDE & WIPE (Execute immediately after scroll starts)
        setTimeout(() => {
            // Close the window
            if(chatWindow) chatWindow.classList.add('hidden-chat');
            
            // Kill the timer
            stopInactivityTimer();
            
            // FORCE WIPE: Find the element directly and empty it
            const chatBodyEl = document.getElementById('chat-body');
            if(chatBodyEl) {
                chatBodyEl.innerHTML = ''; // This deletes all HTML inside
            }
            
            // Reset Global Variables
            isChatInitialized = false;
            chatMode = 'menu';
            visitorEmail = '';
            
            // Bring back the Red Badge for next time
            const badge = document.querySelector('.notification-badge');
            if(badge) badge.style.display = 'flex';
            
        }, 100); // Only 100ms wait
        
        // 3. FLASH HIGHLIGHT (Waits for scroll to land)
        setTimeout(() => {
            if(socials) {
                socials.classList.add('highlight-flash');
                setTimeout(() => socials.classList.remove('highlight-flash'), 3000); 
            }
        }, 1000); 
    }
}



function startInactivityTimer() {
    // Clear any existing timer so we don't have duplicates
    clearTimeout(inactivityTimer);
    
    // Start a new 5-minute countdown
    inactivityTimer = setTimeout(() => {
        // TIMEOUT REACHED!
        handleSessionTimeout();
    }, TIMEOUT_LIMIT);
}

function stopInactivityTimer() {
    clearTimeout(inactivityTimer);
}

function handleSessionTimeout() {
    // 1. Send the Warning
    addMessage("System Idle. No input received for 5 minutes. Terminating session...", "bot");
    
    // 2. Lock Input
    chatInput.disabled = true;
    sendChatBtn.disabled = true;
    
    // 3. Wait 3 seconds, then HARD RESET
    setTimeout(() => {
        // Close the window
        chatWindow.classList.add('hidden-chat');
        
        // Wipe Data
        chatBody.innerHTML = ''; 
        isChatInitialized = false; 
        chatMode = 'menu';
        visitorEmail = '';
        
        // Reset Toggle Button (Optional: show notification badge again?)
        // document.querySelector('.notification-badge').style.display = 'flex';
        
    }, 3000);
}
const cvMenu = document.getElementById('cv-menu');

window.toggleCvMenu = (e) => {
    e.preventDefault(); // Stop jump to top
    e.stopPropagation(); // Stop click from bubbling to document
    cvMenu.classList.toggle('active');
};

// Close dropdown if clicking anywhere else on screen
document.addEventListener('click', (e) => {
    if (!cvMenu.contains(e.target) && e.target.id !== 'cv-trigger') {
        cvMenu.classList.remove('active');
    }
});
const cvSidePanel = document.getElementById('cv-side-panel');
const panelOverlay = document.getElementById('panel-overlay');
const cvIframe = document.getElementById('cv-iframe');
window.openCvPanel = () => {
    const cvIframe = document.getElementById('cv-iframe');
    const cvSidePanel = document.getElementById('cv-side-panel');
    const panelOverlay = document.getElementById('panel-overlay');

    // ADDED PARAMETERS:
    // #toolbar=0   -> Hides the top toolbar
    // #navpanes=0  -> Hides the side navigation (thumbnails)
    // #scrollbar=0 -> Hides the main scrollbar (optional, but '0' lets your custom CSS handle it if supported)
    // #view=FitH   -> Keeps the "Fit Width" logic
    
    const pdfPath = "assets/cv/my-resume.pdf#toolbar=0&navpanes=0&scrollbar=0&view=FitH"; 

    cvIframe.src = pdfPath; 
    
    // Slide in
    cvSidePanel.classList.add('active');
    panelOverlay.classList.add('active');
    
    // Stop body scroll
    document.body.style.overflow = 'hidden';
};


// 3. CLOSE SIDE PANEL
window.closeCvPanel = () => {
    cvSidePanel.classList.remove('active');
    panelOverlay.classList.remove('active');
    document.body.style.overflow = 'auto';
    
    // Clear src to stop memory usage
    setTimeout(() => { cvIframe.src = ""; }, 500);
};

// 4. CONNECT FROM PANEL
window.connectFromCv = () => {
    closeCvPanel();
    // Use your existing "Scroll & Highlight" logic
    // We assume runScriptByAction exists from previous steps
    // Or just manually do it:
    document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
};
document.addEventListener('click', (event) => {
    // 1. Check if chat is currently open
    const isChatOpen = !chatWindow.classList.contains('hidden-chat');
    
    // 2. Check where the user clicked
    // .contains() returns true if the click was inside that element
    const clickedInsideChat = chatWindow.contains(event.target);
    const clickedLauncher = chatLauncher.contains(event.target);
    
    // 3. The Logic:
    // IF chat is open
    // AND click was NOT inside the chat window
    // AND click was NOT on the launcher button (which handles its own toggle)
    if (isChatOpen && !clickedInsideChat && !clickedLauncher) {
        
        // Minimize the window
        chatWindow.classList.add('hidden-chat');
        
        // CRITICAL: Stop the "Are you there?" timer
        // This ensures the bot won't interrupt you later
        stopInactivityTimer();
    }
});
document.addEventListener('contextmenu', (e) => {
    e.preventDefault(); // Stop Right Click
    // Optional: Alert them
    // alert("System Secured. Source code is restricted.");
});

document.onkeydown = function(e) {
    // Block F12 (DevTools)
    if(e.keyCode == 123) {
        return false;
    }
    // Block Ctrl+U (View Source)
    if(e.ctrlKey && e.keyCode == 'U'.charCodeAt(0)) {
        return false;
    }
    // Block Ctrl+Shift+I (Inspect)
    if(e.ctrlKey && e.shiftKey && e.keyCode == 'I'.charCodeAt(0)) {
        return false;
    }
};
const secretCode = [
    'ArrowUp', 'ArrowUp', 
    'ArrowDown', 'ArrowDown', 
    'ArrowLeft', 'ArrowRight', 
    'ArrowLeft', 'ArrowRight', 
    'b', 'a'
];
let inputSequence = [];

window.addEventListener('keydown', (e) => {
    inputSequence.push(e.key);
    
    // Keep array same length as secret code
    inputSequence.splice(-secretCode.length - 1, inputSequence.length - secretCode.length);

    // Check if match
    if (inputSequence.join('') === secretCode.join('')) {
        // TRIGGER THE EFFECT
        
        // 1. Show "God Mode" Notification
        showNotification('success', 'CHEAT CODE ENABLED', 'God Mode: Infinite Coffee ☕ Activated');
        
        // 2. Play a sound (Optional, if you want to be annoying)
        // const audio = new Audio('https://www.myinstants.com/media/sounds/metal-gear-solid-alert.mp3');
        // audio.play();

        // 3. Matrix Mode (Just for fun)
        document.body.style.fontFamily = "'Courier New', monospace";
        document.documentElement.style.setProperty('--primary', '#22c55e'); // Matrix Green
        
        // Reset sequence so they can do it again
        inputSequence = [];
    }
});
function toggleLogs() {
    const logs = document.getElementById('experience-data');
    const icon = document.getElementById('log-icon');
    const text = document.getElementById('log-text');
    
    // Toggle the class
    if (logs.classList.contains('logs-hidden')) {
        // OPEN IT
        logs.classList.remove('logs-hidden');
        logs.classList.add('logs-visible');
        
        // Update Visuals
        text.innerText = "SYSTEM_LOGS_DECRYPTED";
        text.style.color = "var(--primary)";
        icon.classList.remove('fa-caret-down');
        icon.classList.add('fa-caret-up');
        
        // Optional: Scroll to it slightly
        setTimeout(() => {
             logs.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);

    } else {
        // CLOSE IT
        logs.classList.add('logs-hidden');
        logs.classList.remove('logs-visible');
        
        // Reset Visuals
        text.innerText = "LOAD_SYSTEM_LOGS (EXPERIENCE)";
        text.style.color = "";
        icon.classList.remove('fa-caret-up');
        icon.classList.add('fa-caret-down');
    }
}