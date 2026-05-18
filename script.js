document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    const DEFAULT_PEOPLE = [
        { id: 1, name: 'Daffa', color: 'linear-gradient(135deg, #6366f1, #a855f7)' },
        { id: 2, name: 'Desintha', color: 'linear-gradient(135deg, #f43f5e, #fb7185)' },
        { id: 3, name: 'Krisna', color: 'linear-gradient(135deg, #10b981, #34d399)' },
        { id: 4, name: 'Okta', color: 'linear-gradient(135deg, #f59e0b, #fbbf24)' },
        { id: 5, name: 'Pahotan', color: 'linear-gradient(135deg, #0ea5e9, #38bdf8)' },
        { id: 6, name: 'Rama', color: 'linear-gradient(135deg, #8b5cf6, #c084fc)' },
        { id: 7, name: 'Yusuf', color: 'linear-gradient(135deg, #ec4899, #f472b6)' }
    ];

    window.items = [];
    
    // --- Firebase Initialization ---
    // PASTE YOUR FIREBASE CONFIG HERE
    const firebaseConfig = {
        apiKey: "AIzaSyBIYyNVsi1AqUgvafEk183OAuswbKTVMGQ",
        authDomain: "bekantans.firebaseapp.com",
        databaseURL: "https://bekantans-default-rtdb.asia-southeast1.firebasedatabase.app/",
        projectId: "bekantans",
        storageBucket: "bekantans.firebasestorage.app",
        messagingSenderId: "261202389756",
        appId: "1:261202389756:web:1bc231f87a45d3cd624579",
        measurementId: "G-G71HS3VVQC"
    };

    // Initialize Firebase if not already initialized
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.database();

    // Data State
    window.people = [...DEFAULT_PEOPLE];
    window.items = [];
    window.billTitle = 'Trip Bill';
    window.billPayerId = null;
    window.cashData = {};
    window.travelData = [];
    window.wheelParticipants = [];
    window.travelFilter = 'all';
    window.currentAlbumDestId = null;
    window.currentPhotoIndex = 0;

    function saveState() {
        // Normalize travelData: Remove heavy album data from the main state sync
        const sanitizedTravelData = window.travelData.map(dest => {
            const { album, ...metadata } = dest;
            return metadata;
        });

        const state = {
            people: window.people,
            items: window.items,
            cashData: window.cashData,
            travelData: sanitizedTravelData,
            wheelParticipants: window.wheelParticipants,
            userProfiles: window.userProfiles,
            billTitle: window.billTitle || 'Trip Bill',
            billPayerId: window.billPayerId !== undefined ? window.billPayerId : null
        };
        
        // Save to Firebase (Main Metadata)
        db.ref('bekantans_data').set(state).catch(err => {
            console.error('Firebase Save Error:', err);
        });
        
        // Save to LocalCache (with limited album data to save space)
        try {
            const lightState = {
                ...state,
                travelData: window.travelData.map(dest => ({
                    ...dest,
                    album: (dest.album || []).slice(0, 50) // Cache only first 50 photos for speed
                }))
            };
            localStorage.setItem('bekantans_cache', JSON.stringify(lightState));
        } catch (e) {
            console.warn('LocalStorage Cache failed:', e);
        }
    }

    // New helper to save individual albums separately (supporting 1000+ photos)
    window.saveAlbum = function(destId, album) {
        if (!destId) return;
        // Sanitize: filter out blob URLs
        const cleanAlbum = (album || []).filter(url => !url.startsWith('blob:'));
        
        db.ref('albums/' + destId).set(cleanAlbum).catch(err => {
            console.error('Album Save Error:', err);
        });
    };

    // --- Initial Cache Load ---
    const cachedData = localStorage.getItem('bekantans_cache');
    if (cachedData) {
        try {
            const data = JSON.parse(cachedData);
            window.people = (data.people && data.people.length > 0) ? data.people : [...DEFAULT_PEOPLE];
            window.items = (data.items && data.items.length > 0) ? data.items.map(i => ({...i, assignees: i.assignees || []})) : [];
            window.cashData = data.cashData || {};
            window.userProfiles = data.userProfiles || null; // Will fallback later if needed
            window.billTitle = data.billTitle || 'Trip Bill';
            window.billPayerId = (data.billPayerId !== undefined) ? data.billPayerId : null;
            
            
            // Clean up travelData from cache (remove blob URLs)
            window.travelData = (data.travelData || []).map(dest => ({
                ...dest,
                album: dest.album ? dest.album.filter(url => !url.startsWith('blob:')) : []
            }));
            
            window.wheelParticipants = data.wheelParticipants || [];
            
            // Initial render from cache
            renderPeople();
            renderItems();
            renderCashFund();
            renderTravelJournal();
        } catch (e) {
            console.error('Cache load failed:', e);
        }
    }

    const avatarsContainer = document.getElementById('people-avatars');
    const itemsList = document.getElementById('items-list');
    const individualResults = document.getElementById('individual-results');
    const stickyTotalDisplay = document.getElementById('sticky-total');
    
    const cashList = document.getElementById('cash-people-list');
    const monthDisplay = document.getElementById('current-month-display');
    const totalCollectedDisplay = document.getElementById('total-cash-collected');
    const calculateBtn = document.getElementById('calculate-btn');
    
    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    const modalCancel = document.getElementById('modal-cancel');
    const modalSave = document.getElementById('modal-save');

    const landingView = document.getElementById('landing-view');
    const mainView = document.getElementById('main-view');
    const cashView = document.getElementById('cash-fund-view');
    const travelView = document.getElementById('travel-journal-view');
    const travelDetailsView = document.getElementById('travel-details-view');
    const splitResultsView = document.getElementById('split-results-view');
    const fullResultsGrid = document.getElementById('full-results-grid');
    const navHome = document.getElementById('nav-home');
    const navSplit = document.getElementById('nav-split');
    const navCash = document.getElementById('nav-cash');
    const navTravel = document.getElementById('nav-travel');
    const navWheel = document.getElementById('nav-wheel');
    const navLogo = document.getElementById('nav-logo');
    const spinWheelView = document.getElementById('spin-wheel-view');
    const fileInput = document.getElementById('bill-image');
    const coinContainer = document.getElementById('coin-container');
    const loginView = document.getElementById('login-view');
    const navbar = document.querySelector('.navbar');
    const homeView = document.getElementById('home-view');

    // --- Navigation & Core Helpers ---
    window.showView = function(viewName) {
        const AUTH_KEY = 'bekantans_auth';
        // If not logged in, force login view
        if (sessionStorage.getItem(AUTH_KEY) !== 'true') {
            if (loginView) loginView.classList.remove('hidden');
            if (navbar) navbar.classList.add('hidden');
            [homeView, landingView, mainView, cashView, travelView, travelDetailsView, splitResultsView, spinWheelView, document.getElementById('profile-view')].forEach(v => v?.classList.add('hidden'));
            return;
        }

        const profileView = document.getElementById('profile-view');
        [homeView, landingView, mainView, cashView, travelView, travelDetailsView, splitResultsView, spinWheelView, profileView].forEach(v => v?.classList.add('hidden'));
        [navHome, navSplit, navCash, navTravel, navWheel].forEach(n => n?.classList.remove('active'));
        document.body.classList.remove('cash-fund-active');
        document.body.classList.remove('travel-journal-active');
        document.body.classList.remove('spin-wheel-active');
        document.body.classList.remove('profile-active');
        document.body.classList.remove('home-active');

        if (viewName === 'home') {
            if (homeView) homeView.classList.remove('hidden');
            if (navHome) navHome.classList.add('active');
            document.body.classList.add('home-active');
            if (typeof renderHomeDashboard === 'function') renderHomeDashboard();
        } else if (viewName === 'split') {
            mainView.classList.remove('hidden');
            navSplit.classList.add('active');
            if (typeof renderPeople === 'function') renderPeople();
            if (typeof renderItems === 'function') renderItems();
        } else if (viewName === 'cash') {
            cashView.classList.remove('hidden');
            navCash.classList.add('active');
            document.body.classList.add('cash-fund-active');
            if (typeof renderCashFund === 'function') renderCashFund();
        } else if (viewName === 'travel') {
            travelView.classList.remove('hidden');
            navTravel.classList.add('active');
            document.body.classList.add('travel-journal-active');
            if (typeof renderTravelJournal === 'function') renderTravelJournal();
            if (typeof initTravelFilter === 'function') initTravelFilter();
        } else if (viewName === 'wheel') {
            spinWheelView.classList.remove('hidden');
            navWheel.classList.add('active');
            document.body.classList.add('spin-wheel-active');
            if (window.initWheel) window.initWheel();
        } else if (viewName === 'landing') {
            landingView.classList.remove('hidden');
            navSplit.classList.add('active');
        } else if (viewName === 'split-results') {
            splitResultsView.classList.remove('hidden');
            navSplit.classList.add('active');
        } else if (viewName === 'profile') {
            if (profileView) {
                profileView.classList.remove('hidden');
                document.body.classList.add('profile-active');
                const currentUser = sessionStorage.getItem(USER_KEY) || 'Guest';
                const profileData = (window.userProfiles && window.userProfiles[currentUser]) ? window.userProfiles[currentUser] : { title: 'Bekantans Squad', photo: currentUser.charAt(0).toUpperCase() };
                
                document.getElementById('profile-username').textContent = currentUser;
                const handleEl = document.querySelector('.profile-handle');
                if (handleEl) handleEl.textContent = '@' + currentUser.toLowerCase().replace(/\s+/g, '') + '_member';
                
                const titleBadge = document.getElementById('profile-title-badge');
                if (titleBadge) titleBadge.textContent = profileData.title;

                const largeAvatar = profileView.querySelector('.large-avatar');
                if (largeAvatar) {
                    largeAvatar.className = 'profile-avatar large-avatar'; // Reset classes
                    if (profileData.photo && profileData.photo.length > 3) {
                        largeAvatar.innerHTML = `<img src="${profileData.photo}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                    } else {
                        largeAvatar.innerHTML = profileData.photo || currentUser.charAt(0).toUpperCase();
                    }
                    if (profileData.borderTheme && profileData.borderTheme !== 'none') {
                        largeAvatar.classList.add(`avatar-theme-${profileData.borderTheme}`);
                    }
                }

                if (typeof updateNavAvatar === 'function') updateNavAvatar();

                // Calculate and update stats
                const trips = window.travelData ? window.travelData.length : 0;
                const photos = window.travelData ? window.travelData.reduce((sum, dest) => sum + (dest.album ? dest.album.length : 0), 0) : 0;
                const totalSpent = window.travelData ? window.travelData.filter(d => !d.isWishlist).reduce((sum, dest) => sum + (Number(dest.cost) || 0), 0) : 0;
                
                const formatShortNumber = (num) => {
                    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
                    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
                    return num.toString();
                };

                const elTrips = document.getElementById('profile-trips');
                const elPhotos = document.getElementById('profile-photos');
                const elSpent = document.getElementById('profile-spent');
                
                if (elTrips) elTrips.textContent = trips;
                if (elPhotos) elPhotos.textContent = photos;
                if (elSpent) elSpent.textContent = 'Rp ' + formatShortNumber(totalSpent);

                // Render Profile Trips Grid
                const profileTripsGrid = document.getElementById('profile-trips-grid');
                if (profileTripsGrid) {
                    const sortedTrips = (window.travelData || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date));
                    let html = '';
                    sortedTrips.forEach(dest => {
                        const dateBadge = typeof formatDate === 'function' ? formatDate(dest.date, 'badge') : {day: '', month: '', year: ''};
                        html += `
                            <div class="destination-card glass-card" onclick="window.showView('travel'); window.viewDestination(event, ${dest.id});">
                                <div class="dest-image" style="background-image: url('${dest.image}')">
                                    ${dest.isWishlist ? `
                                        <div class="wishlist-badge">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                                            Wishlist
                                        </div>
                                    ` : ''}
                                    <div class="dest-date-premium">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                        <span class="dd-day">${dateBadge.day}</span>
                                        <span class="dd-month">${dateBadge.month}</span>
                                        <span class="dd-year">${dateBadge.year}</span>
                                    </div>
                                </div>
                                <div class="dest-info">
                                    <div class="dest-meta-header">
                                        <div class="dest-meta-row">
                                            <div class="dest-location">
                                                <div class="meta-icon-box">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                                </div>
                                                <span>${dest.location}</span>
                                            </div>
                                            <div class="dest-duration">
                                                <div class="meta-icon-box">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                                </div>
                                                <span>${dest.duration.includes('Days') && parseInt(dest.duration) === 1 ? '1 Day' : dest.duration}</span>
                                            </div>
                                        </div>
                                        <h3 class="dest-name">${dest.name}</h3>
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                    profileTripsGrid.innerHTML = html || `<div class="empty-state" style="grid-column: 1 / -1;">No trips found yet. Start planning!</div>`;
                }
            }
        }
    }

    // Attach Click Handlers early (AFTER showView is defined)
    if (navLogo) navLogo.onclick = () => window.showView('home');
    if (navHome) navHome.onclick = (e) => { e.preventDefault(); window.showView('home'); };
    if (navSplit) navSplit.onclick = (e) => { e.preventDefault(); window.showView('split'); };
    if (navCash) navCash.onclick = (e) => { e.preventDefault(); window.showView('cash'); };
    if (navTravel) navTravel.onclick = (e) => { e.preventDefault(); window.showView('travel'); };
    if (navWheel) navWheel.onclick = (e) => { e.preventDefault(); window.showView('wheel'); };


    // --- Authentication ---
    const AUTH_KEY = 'bekantans_auth';
    const USER_KEY = 'bekantans_user';
    const VALID_ACCOUNTS = [
        { user: 'Daffa', pass: 'Daffa' },
        { user: 'Okta', pass: 'Okta' },
        { user: 'Desintha', pass: 'Desintha' },
        { user: 'Rama', pass: 'Rama' },
        { user: 'Yusuf', pass: 'Yusuf' },
        { user: 'Krisna', pass: 'Krisna' },
        { user: 'Pahotan', pass: 'Pahotan' },
        { user: 'bekantans', pass: 'trip2026' } // Keep the admin one for backup
    ];

    function getDefaultProfiles() {
        const p = {};
        VALID_ACCOUNTS.forEach(acc => {
            p[acc.user] = {
                username: acc.user,
                password: acc.pass,
                title: 'Bekantans Squad',
                photo: acc.user.charAt(0).toUpperCase()
            };
        });
        return p;
    }

    if (!window.userProfiles) window.userProfiles = getDefaultProfiles();

    window.handleLogin = () => {
        const userInput = document.getElementById('login-username').value;
        const passInput = document.getElementById('login-password').value;
        const errorMsg = document.getElementById('login-error');

        let profile = Object.values(window.userProfiles || {}).find(acc => 
            acc.username.toLowerCase() === userInput.toLowerCase() && acc.password === passInput
        );

        if (!profile) {
            // Fallback for hardcoded admin or unregistered missing profiles
            const fallback = VALID_ACCOUNTS.find(acc => acc.user.toLowerCase() === userInput.toLowerCase() && acc.pass === passInput);
            if (fallback) {
                profile = { username: fallback.user, password: fallback.pass, title: 'Bekantans Squad', photo: fallback.user.charAt(0).toUpperCase() };
                window.userProfiles[profile.username] = profile;
                saveState();
            }
        }

        if (profile) {
            sessionStorage.setItem(AUTH_KEY, 'true');
            sessionStorage.setItem(USER_KEY, profile.username);
            loginView.classList.add('hidden');
            navbar.classList.remove('hidden');
            
            // Update Avatar Initial
            const navAvatar = document.querySelector('.nav-avatar');
            if (navAvatar) {
                if (profile.photo && profile.photo.length > 3) {
                    navAvatar.innerHTML = `<img src="${profile.photo}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                } else {
                    navAvatar.innerHTML = profile.photo || profile.username.charAt(0).toUpperCase();
                }
            }

            showView('home');
            
            // Re-render to ensure data is visible
            renderTravelJournal();
        } else {
            errorMsg.classList.remove('hidden');
            setTimeout(() => {
                errorMsg.classList.add('hidden');
            }, 3000);
        }
    };

    // Check auth on load
    const loggedInUser = sessionStorage.getItem(USER_KEY);
    if (sessionStorage.getItem(AUTH_KEY) === 'true') {
        if (loginView) loginView.classList.add('hidden');
        if (navbar) navbar.classList.remove('hidden');
        if (loggedInUser) {
            const navAvatar = document.querySelector('.nav-avatar');
            if (navAvatar) navAvatar.textContent = loggedInUser.charAt(0).toUpperCase();
        }
        showView('home');
    } else {
        if (loginView) loginView.classList.remove('hidden');
        if (navbar) navbar.classList.add('hidden');
        // Prevent seeing other views while not logged in
        document.querySelectorAll('main > section').forEach(sec => sec.classList.add('hidden'));
    }

    window.updateNavAvatar = () => {
        const currentUser = sessionStorage.getItem(USER_KEY);
        if (!currentUser) return;
        const navAvatars = document.querySelectorAll('.nav-avatar');
        navAvatars.forEach(el => {
            el.className = 'nav-avatar'; // reset classes
            if (window.userProfiles && window.userProfiles[currentUser]) {
                const profile = window.userProfiles[currentUser];
                if (profile.photo && profile.photo.length > 3) {
                    el.innerHTML = `<img src="${profile.photo}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                    el.style.background = 'transparent';
                } else {
                    el.innerHTML = currentUser.charAt(0).toUpperCase();
                    el.style.background = ''; // reset to default css
                }
                if (profile.borderTheme && profile.borderTheme !== 'none') {
                    el.classList.add(`avatar-theme-${profile.borderTheme}`);
                }
            } else {
                el.innerHTML = currentUser.charAt(0).toUpperCase();
            }
        });
    };

    window.handleLogout = () => {
        sessionStorage.removeItem(AUTH_KEY);
        sessionStorage.removeItem(USER_KEY);
        window.location.reload();
    };

    window.showProfile = () => {
        showView('profile');
    };

    let currentDate = new Date();
    let currentModalAction = '';
    const CASH_TARGET = 100000;

    window.changeTarget = (monthKey) => {
        const currentTarget = window.cashData[monthKey].target || CASH_TARGET;
        modalTitle.textContent = 'Set Monthly Target';
        modalContent.innerHTML = `
            <div class="input-group">
                <label>Target Amount (Rp) for ${monthKey}</label>
                <input type="number" id="m-target-amount" value="${currentTarget}" autofocus>
                <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem;">This will be used to calculate contributions for this specific month.</p>
            </div>
        `;
        currentModalAction = 'change-target-' + monthKey;
        modalOverlay.classList.remove('hidden');
        document.getElementById('m-target-amount').focus();
    };

    window.resetCashLedger = () => {
        if (confirm('Are you sure you want to reset the entire cash ledger? This will clear all recorded payments across all months.')) {
            window.cashData = {};
            saveState();
            renderCashFund();
        }
    };

    const avatarColors = [
        'linear-gradient(135deg, #6366f1, #a855f7)', 
        'linear-gradient(135deg, #f43f5e, #fb7185)', 
        'linear-gradient(135deg, #10b981, #34d399)', 
        'linear-gradient(135deg, #f59e0b, #fbbf24)', 
        'linear-gradient(135deg, #0ea5e9, #38bdf8)', 
        'linear-gradient(135deg, #8b5cf6, #c084fc)', 
        'linear-gradient(135deg, #ec4899, #f472b6)'
    ];

    // --- Helpers ---
    function formatRupiah(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    }

    function formatDate(dateStr, format = 'full') {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (format === 'badge') {
            return {
                day: date.getDate(),
                month: date.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(),
                year: date.getFullYear()
            };
        }
        const options = { day: 'numeric', month: 'short', year: 'numeric' };
        return date.toLocaleDateString('en-GB', options);
    }


    // Add CSS for travel journal background if not exists
    if (!document.getElementById('travel-bg-style')) {
        const style = document.createElement('style');
        style.id = 'travel-bg-style';
        style.innerHTML = `
            body.travel-journal-active {
                background: #000;
                overflow-x: hidden;
            }
            body.travel-journal-active::before {
                content: '';
                position: fixed;
                inset: 0;
                background: 
                    radial-gradient(circle at 20% 30%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
                    radial-gradient(circle at 80% 70%, rgba(168, 85, 247, 0.15) 0%, transparent 50%);
                filter: blur(80px);
                animation: bgMove 20s infinite alternate ease-in-out;
                z-index: -1;
            }
            @keyframes bgMove {
                from { transform: scale(1) rotate(0deg); }
                to { transform: scale(1.2) rotate(5deg); }
            }
        `;
        document.head.appendChild(style);
    }

    window.customConfirm = function(message, onConfirm, hideCancel = false) {
        modalTitle.textContent = 'Confirmation';
        modalContent.innerHTML = `<p style="padding: 1.5rem 0; font-size: 1.1rem; line-height: 1.6; opacity: 0.9; text-align: center;">${message}</p>`;
        modalSave.textContent = 'Confirm';
        modalSave.style.background = '#ff4757';
        modalSave.style.display = 'block';
        
        if (hideCancel) {
            modalCancel.style.display = 'none';
        } else {
            modalCancel.style.display = 'block';
        }
        
        const modalActions = document.querySelector('.modal-actions');
        if (modalActions) modalActions.style.display = 'flex';
        
        currentModalAction = 'confirm';
        window.confirmCallback = onConfirm;
        modalOverlay.classList.remove('hidden');
    };

    window.closeModal = () => {
        modalOverlay.classList.add('hidden');
        const modalActions = document.querySelector('.modal-actions');
        if (modalActions) modalActions.style.display = 'flex';
        
        const saveBtn = document.getElementById('modal-save');
        saveBtn.textContent = 'Save';
        saveBtn.style.background = '';
        saveBtn.disabled = false;
    };

    // Scroll Handler for Navbar (uses global navbar)
    window.onscroll = () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    };

    if (calculateBtn) {
        calculateBtn.onclick = () => {
            window.showView('split-results');
            window.calculate('full');
        };
    }

    const directAddItemBtn = document.getElementById('direct-add-item');
    if (directAddItemBtn) {
        directAddItemBtn.onclick = () => {
            const nameInput = document.getElementById('direct-item-name');
            const priceInput = document.getElementById('direct-item-price');
            const name = nameInput.value.trim();
            const price = parseFloat(priceInput.value);

            if (name && !isNaN(price) && price > 0) {
                const newItem = {
                    id: Date.now(),
                    name: name,
                    price: price,
                    assignees: [] // No one assigned by default
                };
                window.items.push(newItem);
                
                // Clear inputs
                nameInput.value = '';
                priceInput.value = '';
                
                // Update state and render
                saveState();
                if (typeof window.renderItems === 'function') window.renderItems();
                if (typeof window.calculate === 'function') window.calculate('inline');
                if (typeof window.renderHomeDashboard === 'function') window.renderHomeDashboard();
            } else {
                alert('Please enter a valid item name and price.');
            }
        };
    }


    // --- Core Functions ---
    window.renderHomeDashboard = function() {
        const currentUser = sessionStorage.getItem(USER_KEY) || 'Guest';
        const greetingEl = document.getElementById('home-greeting');
        if (greetingEl) {
            greetingEl.textContent = `Welcome back, ${currentUser}!`;
        }

        // My Debt Card
        const myDebtContainer = document.getElementById('home-my-debt-container');
        if (myDebtContainer && window.items && window.people) {
            const me = window.people.find(p => p.name.toLowerCase() === currentUser.toLowerCase());
            let myDebt = 0;
            let myItemsHtml = '';
            if (me) {
                window.items.forEach(item => {
                    if (item.assignees && item.assignees.includes(me.id)) {
                        const share = item.price / item.assignees.length;
                        myDebt += share;
                        myItemsHtml += `
                            <div style="display: flex; justify-content: space-between; padding: 0.8rem 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                                <span style="color: white; font-weight: 500;">${item.name}</span>
                                <span style="font-weight: 700; color: #fca5a5;">${formatRupiah(share)}</span>
                            </div>
                        `;
                    }
                });
            }

            const payer = window.billPayerId !== null ? window.people.find(p => p.id === window.billPayerId) : null;
            const payerName = payer ? payer.name : '';

            if (window.billPayerId !== null && me && me.id === window.billPayerId) {
                // Calculate how much others owe you
                let totalOwedToMe = 0;
                window.people.forEach(p => {
                    if (p.id !== me.id) {
                        window.items.forEach(item => {
                            if (item.assignees && item.assignees.includes(p.id)) {
                                totalOwedToMe += item.price / item.assignees.length;
                            }
                        });
                    }
                });

                if (totalOwedToMe > 0) {
                    const billName = window.billTitle || 'Trip Bill';
                    myDebtContainer.innerHTML = `
                        <div class="home-debt-alert-card animate-fade-in" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(5, 150, 105, 0.02)); border-color: rgba(16, 185, 129, 0.2);">
                            <div class="debt-card-glow" style="background: radial-gradient(circle at top left, rgba(16, 185, 129, 0.15), transparent 70%);"></div>
                            <div class="debt-card-inner">
                                <div class="debt-alert-left">
                                    <div class="debt-icon-container" style="background: rgba(16, 185, 129, 0.12); border-color: rgba(16, 185, 129, 0.25); color: #34d399;">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                    </div>
                                    <div class="debt-meta">
                                        <span class="debt-alert-tag" style="background: rgba(16, 185, 129, 0.15); color: #34d399;">YOU PAID THIS BILL</span>
                                        <h2 class="debt-alert-title">Squad owes you <span class="debt-alert-amount" style="color: #34d399;">${formatRupiah(totalOwedToMe)}</span> for <span style="color: white; font-weight: 700;">${billName}</span></h2>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    myDebtContainer.innerHTML = `
                        <div class="home-no-debt-card animate-fade-in">
                            <div class="no-debt-inner">
                                <span class="no-debt-icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                    </svg>
                                </span>
                                <div class="no-debt-meta">
                                    <h3>You are all settled!</h3>
                                    <p>No active debts in the squad.</p>
                                </div>
                            </div>
                        </div>
                    `;
                }
            } else {
                if (myDebt > 0) {
                    const actionTagText = payer ? `OWED TO ${payerName.toUpperCase()}` : `ACTION REQUIRED`;
                    const titleText = payer ? `You owe <span class="debt-alert-amount">${formatRupiah(myDebt)}</span> to ${payerName}` : `You owe <span class="debt-alert-amount">${formatRupiah(myDebt)}</span>`;
                    
                    myDebtContainer.innerHTML = `
                        <div class="home-debt-alert-card animate-fade-in">
                            <div class="debt-card-glow"></div>
                            <div class="debt-card-inner">
                                <div class="debt-alert-left">
                                    <div class="debt-icon-container">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                                    </div>
                                    <div class="debt-meta">
                                        <span class="debt-alert-tag">${actionTagText}</span>
                                        <h2 class="debt-alert-title">${titleText}</h2>
                                    </div>
                                </div>
                                <div class="debt-alert-actions">
                                    <button class="primary-btn small-btn glass-btn" onclick="document.getElementById('my-debt-details').classList.toggle('hidden')">Breakdown</button>
                                    <button class="primary-btn small-btn pay-gradient-btn" onclick="alert('Payment integration coming soon!');">Pay Now</button>
                                </div>
                            </div>
                            <div id="my-debt-details" class="hidden my-debt-details-container">
                                <h4 class="breakdown-title">Bill Breakdown</h4>
                                <div class="breakdown-list">
                                    ${myItemsHtml}
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    myDebtContainer.innerHTML = `
                        <div class="home-no-debt-card animate-fade-in">
                            <div class="no-debt-inner">
                                <span class="no-debt-icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                    </svg>
                                </span>
                                <div class="no-debt-meta">
                                    <h3>You are all settled!</h3>
                                    <p>No active debts in the squad.</p>
                                </div>
                            </div>
                        </div>
                    `;
                }
            }
        }

        // Active Members (Upgraded Squad Roster with exact debts/settled indicators)
        const membersContainer = document.getElementById('home-active-members');
        if (membersContainer && window.people) {
            membersContainer.innerHTML = '';
            
            const payer = window.billPayerId !== null ? window.people.find(p => p.id === window.billPayerId) : null;

            window.people.forEach(person => {
                // Calculate their specific share
                let personShare = 0;
                if (window.items) {
                    window.items.forEach(item => {
                        if (item.assignees && item.assignees.includes(person.id)) {
                            personShare += item.price / item.assignees.length;
                        }
                    });
                }
                
                const wrapper = document.createElement('div');
                wrapper.className = 'home-member-row-premium';
                
                const leftSide = document.createElement('div');
                leftSide.className = 'home-member-left';

                const avatar = document.createElement('div');
                avatar.className = 'participant-avatar';

                let photoHtml = `<span class="avatar-initial">${person.name.charAt(0).toUpperCase()}</span>`;
                let bgStyle = `background: ${person.color || avatarColors[0]};`;

                if (window.userProfiles && window.userProfiles[person.name]) {
                    const profile = window.userProfiles[person.name];
                    if (profile.photo && profile.photo.length > 3) {
                        photoHtml = `<img src="${profile.photo}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                        bgStyle = `background: transparent;`;
                    }
                    if (profile.borderTheme && profile.borderTheme !== 'none') {
                        avatar.classList.add(`avatar-theme-${profile.borderTheme}`);
                    }
                }

                avatar.style = bgStyle;
                avatar.innerHTML = photoHtml;
                
                const meta = document.createElement('div');
                meta.className = 'home-member-meta';
                
                const nameLabel = document.createElement('span');
                nameLabel.className = 'home-member-name-bold';
                nameLabel.textContent = person.name;
                
                const roleLabel = document.createElement('span');
                roleLabel.className = 'home-member-role';
                roleLabel.textContent = person.name.toLowerCase() === currentUser.toLowerCase() ? 'You (Organizer)' : 'Squad Member';

                meta.appendChild(nameLabel);
                meta.appendChild(roleLabel);
                
                leftSide.appendChild(avatar);
                leftSide.appendChild(meta);

                // Right side status badge
                const statusBadge = document.createElement('div');
                if (payer) {
                    if (person.id === payer.id) {
                        // Calculate total owed to payer
                        let totalOwedToPayer = 0;
                        window.people.forEach(p => {
                            if (p.id !== payer.id) {
                                window.items.forEach(item => {
                                    if (item.assignees && item.assignees.includes(p.id)) {
                                        totalOwedToPayer += item.price / item.assignees.length;
                                    }
                                });
                            }
                        });
                        statusBadge.className = 'home-member-status-badge settled-status';
                        statusBadge.innerHTML = `<span class="status-indicator-dot green-dot"></span> Paid Bill (Owed ${formatRupiah(totalOwedToPayer)})`;
                    } else if (personShare > 0) {
                        statusBadge.className = 'home-member-status-badge debt-status';
                        statusBadge.innerHTML = `<span class="status-indicator-dot red-dot"></span> Owes ${formatRupiah(personShare)} to ${payer.name}`;
                    } else {
                        statusBadge.className = 'home-member-status-badge settled-status';
                        statusBadge.innerHTML = `<span class="status-indicator-dot green-dot"></span> Settled`;
                    }
                } else {
                    if (personShare > 0) {
                        statusBadge.className = 'home-member-status-badge debt-status';
                        statusBadge.innerHTML = `<span class="status-indicator-dot red-dot"></span> Owes ${formatRupiah(personShare)}`;
                    } else {
                        statusBadge.className = 'home-member-status-badge settled-status';
                        statusBadge.innerHTML = `<span class="status-indicator-dot green-dot"></span> Settled`;
                    }
                }

                wrapper.appendChild(leftSide);
                wrapper.appendChild(statusBadge);
                membersContainer.appendChild(wrapper);
            });
            
            // Update Squad count
            const squadCountEl = document.getElementById('home-squad-count');
            if (squadCountEl) {
                squadCountEl.textContent = `${window.people.length} Members`;
            }
        }

        // Split Bill Latest Total & Live Transactions Ledger
        const splitTotalEl = document.getElementById('home-split-total');
        if (splitTotalEl && window.items) {
            const totalBill = window.items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
            splitTotalEl.textContent = formatRupiah(totalBill);
            
            // Dynamically show bill title on ledger card
            window.syncBillMetadataUI();
        }

        // Render dynamic transaction ledger list
        const ledgerListEl = document.getElementById('home-ledger-transactions');
        if (ledgerListEl && window.items) {
            ledgerListEl.innerHTML = '';
            
            // Get last 3 items in reverse order (newest first)
            const lastItems = [...window.items].slice(-3).reverse();
            
            if (lastItems.length === 0) {
                ledgerListEl.innerHTML = `
                    <div class="no-transactions-placeholder">
                        <span>No transactions recorded yet</span>
                    </div>
                `;
            } else {
                lastItems.forEach(item => {
                    const row = document.createElement('div');
                    row.className = 'ledger-transaction-row';
                    
                    // Determine beautiful outline SVG based on name keywords
                    let icon = `
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <!-- Letter R -->
                            <path d="M4 6v12"></path>
                            <path d="M4 6h5a3 3 0 0 1 0 6H4"></path>
                            <path d="M8 12l4 6"></path>
                            <!-- Letter p -->
                            <path d="M15 10v8"></path>
                            <path d="M15 10h4a2.5 2.5 0 0 1 0 5h-4"></path>
                        </svg>`;
                    const nameLower = item.name.toLowerCase();
                    if (nameLower.includes('mie') || nameLower.includes('indomie') || nameLower.includes('food') || nameLower.includes('makan') || nameLower.includes('telor') || nameLower.includes('udang')) {
                        icon = `
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 2c1.66 0 3 1.34 3 3v7H9V5c0-1.66 1.34-3 3-3z"></path>
                                <path d="M5 12h14v2a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4v-2z"></path>
                                <path d="M12 18v4M9 22h6"></path>
                            </svg>`;
                    } else if (nameLower.includes('minum') || nameLower.includes('kopi') || nameLower.includes('drink') || nameLower.includes('coffee') || nameLower.includes('puding')) {
                        icon = `
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
                                <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
                                <line x1="6" y1="2" x2="6" y2="4"></line>
                                <line x1="10" y1="2" x2="10" y2="4"></line>
                                <line x1="14" y1="2" x2="14" y2="4"></line>
                            </svg>`;
                    } else if (nameLower.includes('hotel') || nameLower.includes('lodging') || nameLower.includes('penginapan') || nameLower.includes('stay')) {
                        icon = `
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c084fc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                <polyline points="9 22 9 12 15 12 15 22"></polyline>
                            </svg>`;
                    } else if (nameLower.includes('bensin') || nameLower.includes('travel') || nameLower.includes('tiket') || nameLower.includes('ticket') || nameLower.includes('grab') || nameLower.includes('gojek') || nameLower.includes('adventure')) {
                        icon = `
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                                <polyline points="2 17 12 22 22 17"></polyline>
                                <polyline points="2 12 12 17 22 12"></polyline>
                            </svg>`;
                    }
                    
                    const leftPart = document.createElement('div');
                    leftPart.className = 'transaction-left';
                    
                    const iconBox = document.createElement('div');
                    iconBox.className = 'transaction-icon';
                    iconBox.innerHTML = icon;
                    
                    const meta = document.createElement('div');
                    meta.className = 'transaction-meta';
                    
                    const nameLabel = document.createElement('span');
                    nameLabel.className = 'transaction-name';
                    nameLabel.textContent = item.name;
                    
                    const assigneesLabel = document.createElement('span');
                    assigneesLabel.className = 'transaction-assignees';
                    const splitCount = item.assignees ? item.assignees.length : 0;
                    assigneesLabel.textContent = splitCount > 0 ? `Split with ${splitCount} people` : `Unassigned`;
                    
                    meta.appendChild(nameLabel);
                    meta.appendChild(assigneesLabel);
                    leftPart.appendChild(iconBox);
                    leftPart.appendChild(meta);
                    
                    const rightPart = document.createElement('div');
                    rightPart.className = 'transaction-right';
                    rightPart.textContent = formatRupiah(item.price);
                    
                    row.appendChild(leftPart);
                    row.appendChild(rightPart);
                    ledgerListEl.appendChild(row);
                });
            }
        }

        // Cash Fund Total
        const cashTotalEl = document.getElementById('home-cash-total');
        if (cashTotalEl && window.cashData) {
            let totalCash = 0;
            for (const monthKey in window.cashData) {
                const mData = window.cashData[monthKey];
                if (mData.collected) {
                    totalCash += Object.values(mData.collected).reduce((a, b) => a + Number(b), 0);
                }
            }
            cashTotalEl.textContent = formatRupiah(totalCash);
        }

        // Total Trips
        const tripsTotalEl = document.getElementById('home-trips-total');
        if (tripsTotalEl && window.travelData) {
            tripsTotalEl.textContent = window.travelData.length;
        }
    };
    window.syncBillMetadataUI = function() {
        const summaryBillName = document.getElementById('summary-bill-name');
        if (summaryBillName) {
            summaryBillName.textContent = window.billTitle || 'Trip Bill';
        }

        const titleInput = document.getElementById('bill-title-input');
        if (titleInput) {
            // Only update input value if the user is NOT actively typing in it
            if (document.activeElement !== titleInput) {
                titleInput.value = window.billTitle !== undefined ? window.billTitle : 'Trip Bill';
            }
            if (!titleInput.oninput) {
                titleInput.oninput = () => {
                    window.billTitle = titleInput.value; // Preserve spaces and empty states while typing
                    saveState();
                    if (typeof window.renderHomeDashboard === 'function') {
                        window.renderHomeDashboard();
                    }
                };
            }
        }

        // Custom Dropdown Handling
        const dropdownContainer = document.getElementById('payer-custom-dropdown');
        const dropdownTrigger = document.getElementById('payer-dropdown-trigger');
        const selectedText = document.getElementById('payer-dropdown-selected-text');
        const dropdownMenu = document.getElementById('payer-dropdown-menu');

        if (dropdownContainer && dropdownTrigger && selectedText && dropdownMenu) {
            // Setup trigger toggle click listener (only once)
            if (!dropdownTrigger.onclick) {
                dropdownTrigger.onclick = (e) => {
                    e.stopPropagation();
                    dropdownContainer.classList.toggle('active');
                };
                
                // Document click outside to close dropdown
                document.addEventListener('click', () => {
                    dropdownContainer.classList.remove('active');
                });
            }

            // Find current payer name
            const activePayer = window.billPayerId !== null ? window.people.find(p => p.id === window.billPayerId) : null;
            selectedText.textContent = activePayer ? activePayer.name : '-- Select Payer --';

            // Populate options inside menu
            dropdownMenu.innerHTML = '';
            
            // "-- Select Payer --" option
            const defaultOpt = document.createElement('div');
            defaultOpt.className = 'custom-dropdown-option';
            if (window.billPayerId === null) defaultOpt.classList.add('selected');
            defaultOpt.textContent = '-- Select Payer --';
            defaultOpt.onclick = (e) => {
                e.stopPropagation();
                window.billPayerId = null;
                selectedText.textContent = '-- Select Payer --';
                dropdownContainer.classList.remove('active');
                saveState();
                if (typeof window.renderHomeDashboard === 'function') window.renderHomeDashboard();
                if (typeof window.calculate === 'function') window.calculate('inline');
            };
            dropdownMenu.appendChild(defaultOpt);

            // Roster Options
            window.people.forEach(person => {
                const opt = document.createElement('div');
                opt.className = 'custom-dropdown-option';
                if (window.billPayerId === person.id) opt.classList.add('selected');
                opt.textContent = person.name;
                opt.onclick = (e) => {
                    e.stopPropagation();
                    window.billPayerId = person.id;
                    selectedText.textContent = person.name;
                    dropdownContainer.classList.remove('active');
                    saveState();
                    if (typeof window.renderHomeDashboard === 'function') window.renderHomeDashboard();
                    if (typeof window.calculate === 'function') window.calculate('inline');
                };
                dropdownMenu.appendChild(opt);
            });
        }
    };

    window.renderPeople = function() {
        if (!avatarsContainer) return;
        avatarsContainer.innerHTML = '';
        const header = document.getElementById('participant-header');
        if (header) header.textContent = `Participant (${window.people.length})`;

        window.people.forEach(person => {
            const avatar = document.createElement('div');
            avatar.className = 'participant-avatar';
            avatar.dataset.name = person.name;
            
            // Check if person has a profile photo
            let photoHtml = `<span class="avatar-initial">${person.name.charAt(0).toUpperCase()}</span>`;
            let bgStyle = `background: ${person.color || avatarColors[0]};`;
            
            if (window.userProfiles && window.userProfiles[person.name]) {
                const profile = window.userProfiles[person.name];
                if (profile.photo && profile.photo.length > 3) {
                    photoHtml = `<img src="${profile.photo}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                    bgStyle = `background: transparent;`;
                }
                if (profile.borderTheme && profile.borderTheme !== 'none') {
                    avatar.classList.add(`avatar-theme-${profile.borderTheme}`);
                }
            }
            
            avatar.style = bgStyle;
            avatar.innerHTML = `
                ${photoHtml}
                <button type="button" class="delete-avatar" data-id="${person.id}">×</button>
            `;
            avatarsContainer.appendChild(avatar);
        });

        const addBtn = document.createElement('button');
        addBtn.className = 'add-avatar-btn';
        addBtn.textContent = '+';
        addBtn.onclick = () => window.addPerson();
        avatarsContainer.appendChild(addBtn);
        
        window.syncBillMetadataUI();
    };

    window.addPerson = () => {
        modalTitle.textContent = 'Add Person';
        modalContent.innerHTML = `
            <div class="input-group">
                <label>Name</label>
                <input type="text" id="m-person-name" placeholder="Participant Name" autofocus>
            </div>
        `;
        currentModalAction = 'add-person';
        modalOverlay.classList.remove('hidden');
        document.getElementById('m-person-name').focus();
    };

    window.addDestination = () => {
        modalTitle.textContent = 'New Adventure';
        modalContent.innerHTML = `
            <div class="form-section-premium">
                <div class="input-group">
                    <label><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> Trip Title</label>
                    <input type="text" id="m-dest-name" placeholder="Where are you going?" autofocus>
                </div>
                <div class="input-group">
                    <label><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg> Location</label>
                    <input type="text" id="m-dest-location" placeholder="City, Country">
                </div>
                
                <div class="input-grid-responsive">
                    <div class="input-group">
                        <label><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Duration</label>
                        <input type="text" id="m-dest-duration" placeholder="e.g. 3 Days">
                    </div>
                    <div class="input-group">
                        <label><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> Date</label>
                        <input type="date" id="m-dest-date">
                    </div>
                </div>

                <div class="input-group">
                    <label><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"/></svg> Total Cost (Rp)</label>
                    <input type="number" id="m-dest-cost" placeholder="Estimated Budget">
                </div>

                <div class="input-group">
                    <label style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.6rem;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> Assignees / Travelers</label>
                    <div class="assignees-selector-widget" style="display: flex; flex-wrap: wrap; gap: 0.8rem; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 1rem;">
                        ${Object.keys(window.userProfiles || {}).map(user => {
                            const profile = window.userProfiles[user];
                            let themeClass = '';
                            if (profile.borderTheme && profile.borderTheme !== 'none') {
                                themeClass = ` avatar-theme-${profile.borderTheme}`;
                            }
                            let photoHtml = '';
                            if (profile.photo && profile.photo.length > 2) {
                                photoHtml = `<img src="${profile.photo}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                            } else {
                                const initial = profile.photo || user.charAt(0).toUpperCase();
                                photoHtml = `<span style="font-weight: 700; font-size: 0.75rem; color: white;">${initial}</span>`;
                            }
                            return `
                                <div class="assignee-select-chip" data-username="${user}" onclick="this.classList.toggle('active')" style="display: flex; align-items: center; background: rgba(255, 255, 255, 0.03); border: 1.5px solid rgba(255, 255, 255, 0.08); border-radius: 100px; padding: 0.4rem 0.8rem 0.4rem 0.4rem; cursor: pointer; transition: all 0.3s; user-select: none; position: relative; gap: 0.5rem;">
                                    <div class="profile-avatar ${themeClass}" style="width: 28px; height: 28px; font-size: 0.75rem; background: var(--accent-gradient); display: flex; align-items: center; justify-content: center; position: relative;">
                                        ${photoHtml}
                                    </div>
                                    <span style="font-size: 0.85rem; font-weight: 600; color: rgba(255, 255, 255, 0.6);">${user}</span>
                                    <div class="select-check-dot" style="width: 8px; height: 8px; border-radius: 50%; background: transparent; border: 1.5px solid rgba(255, 255, 255, 0.3); transition: all 0.3s;"></div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <div class="wishlist-toggle-premium" onclick="this.classList.toggle('active'); const cb = document.getElementById('m-dest-wishlist'); cb.checked = !cb.checked;">
                    <input type="checkbox" id="m-dest-wishlist" hidden>
                    <div class="toggle-track">
                        <div class="toggle-thumb"></div>
                    </div>
                    <span>Add to Wishlist</span>
                </div>

                <div class="input-group">
                    <label><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg> Cover Photo</label>
                    <div class="image-upload-wrapper" id="image-upload-wrapper" onclick="document.getElementById('m-dest-image-file').click()">
                        <div class="upload-placeholder" id="upload-placeholder">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                            <span>Choose Trip Photo</span>
                        </div>
                        <img id="image-preview" class="hidden" src="" alt="Preview">
                        <input type="file" id="m-dest-image-file" accept="image/*" hidden onchange="window.previewImage(event)">
                    </div>
                </div>
            </div>
        `;
        currentModalAction = 'add-destination';
        modalOverlay.classList.remove('hidden');
        document.getElementById('m-dest-name').focus();
    };

    window.previewImage = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('upload-placeholder').classList.add('hidden');
                const preview = document.getElementById('image-preview');
                preview.src = e.target.result;
                preview.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    };
    window.editDestination = (id) => {
        const dest = window.travelData.find(d => d.id === id);
        if (!dest) return;
        
        modalTitle.textContent = 'Edit Adventure';
        modalContent.innerHTML = `
            <div class="form-section-premium">
                <div class="input-group">
                    <label><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> Trip Title</label>
                    <input type="text" id="m-dest-name" value="${dest.name}" autofocus>
                </div>
                <div class="input-group">
                    <label><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg> Location</label>
                    <input type="text" id="m-dest-location" value="${dest.location}">
                </div>
                
                <div class="input-grid-responsive">
                    <div class="input-group">
                        <label><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Duration</label>
                        <input type="text" id="m-dest-duration" value="${dest.duration}">
                    </div>
                    <div class="input-group">
                        <label><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> Date</label>
                        <input type="date" id="m-dest-date" value="${dest.date}">
                    </div>
                </div>

                <div class="input-group">
                    <label><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"/></svg> Total Cost (Rp)</label>
                    <input type="number" id="m-dest-cost" value="${dest.cost}">
                </div>

                <div class="input-group">
                    <label style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.6rem;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> Assignees / Travelers</label>
                    <div class="assignees-selector-widget" style="display: flex; flex-wrap: wrap; gap: 0.8rem; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 1rem;">
                        ${Object.keys(window.userProfiles || {}).map(user => {
                            const profile = window.userProfiles[user];
                            let themeClass = '';
                            if (profile.borderTheme && profile.borderTheme !== 'none') {
                                themeClass = ` avatar-theme-${profile.borderTheme}`;
                            }
                            let photoHtml = '';
                            if (profile.photo && profile.photo.length > 2) {
                                photoHtml = `<img src="${profile.photo}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                            } else {
                                const initial = profile.photo || user.charAt(0).toUpperCase();
                                photoHtml = `<span style="font-weight: 700; font-size: 0.75rem; color: white;">${initial}</span>`;
                            }
                            
                            const isSelected = (dest.assignees || (dest.assignee ? [dest.assignee] : [])).includes(user);
                            const activeClass = isSelected ? 'active' : '';
                            
                            return `
                                <div class="assignee-select-chip ${activeClass}" data-username="${user}" onclick="this.classList.toggle('active')" style="display: flex; align-items: center; background: rgba(255, 255, 255, 0.03); border: 1.5px solid rgba(255, 255, 255, 0.08); border-radius: 100px; padding: 0.4rem 0.8rem 0.4rem 0.4rem; cursor: pointer; transition: all 0.3s; user-select: none; position: relative; gap: 0.5rem;">
                                    <div class="profile-avatar ${themeClass}" style="width: 28px; height: 28px; font-size: 0.75rem; background: var(--accent-gradient); display: flex; align-items: center; justify-content: center; position: relative;">
                                        ${photoHtml}
                                    </div>
                                    <span style="font-size: 0.85rem; font-weight: 600; color: rgba(255, 255, 255, 0.6);">${user}</span>
                                    <div class="select-check-dot" style="width: 8px; height: 8px; border-radius: 50%; background: transparent; border: 1.5px solid rgba(255, 255, 255, 0.3); transition: all 0.3s;"></div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <div class="wishlist-toggle-premium ${dest.isWishlist ? 'active' : ''}" onclick="this.classList.toggle('active'); const cb = document.getElementById('m-dest-wishlist'); cb.checked = !cb.checked;">
                    <input type="checkbox" id="m-dest-wishlist" ${dest.isWishlist ? 'checked' : ''} hidden>
                    <div class="toggle-track">
                        <div class="toggle-thumb"></div>
                    </div>
                    <span>Mark as Wishlist</span>
                </div>

                <div class="input-group">
                    <label><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg> Cover Photo</label>
                    <div class="image-upload-wrapper" onclick="document.getElementById('m-dest-image-file').click()">
                        <div class="upload-placeholder hidden" id="upload-placeholder">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                            <span>Change Photo</span>
                        </div>
                        <img id="image-preview" src="${dest.image}" alt="Preview" style="display: block; width: 100%; border-radius: 12px;">
                        <input type="file" id="m-dest-image-file" accept="image/*" hidden onchange="window.previewImage(event)">
                    </div>
                </div>
            </div>
        `;
        currentModalAction = 'edit-destination-' + id;
        modalOverlay.classList.remove('hidden');
    };


    window.viewDestination = (event, id) => {
        if (event.target.closest('.dest-actions')) return;

        const dest = window.travelData.find(d => d.id === id);
        if (!dest) return;
        
        let assigneeHtml = '';
        const assignees = dest.assignees || (dest.assignee ? [dest.assignee] : []);
        if (assignees.length > 0) {
            let avatarsHtml = '';
            const displayAssignees = assignees.filter(u => window.userProfiles && window.userProfiles[u]);
            
            if (displayAssignees.length > 0) {
                displayAssignees.forEach((user, index) => {
                    const profile = window.userProfiles[user];
                    let themeClass = '';
                    if (profile.borderTheme && profile.borderTheme !== 'none') {
                        themeClass = ` avatar-theme-${profile.borderTheme}`;
                    }
                    
                    let photoHtml = '';
                    if (profile.photo && profile.photo.length > 2) {
                        photoHtml = `<img src="${profile.photo}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                    } else {
                        const initial = profile.photo || user.charAt(0).toUpperCase();
                        photoHtml = `<span style="font-weight: 700; font-size: 0.9rem; color: white;">${initial}</span>`;
                    }
                    
                    avatarsHtml += `
                        <div class="profile-avatar ${themeClass}" style="width: 38px; height: 38px; font-size: 0.9rem; background: var(--accent-gradient); display: flex; align-items: center; justify-content: center; position: relative; margin-left: ${index === 0 ? '0' : '-12px'}; border: 2.5px solid #0f0f19; border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.4); z-index: ${10 - index};">
                            ${photoHtml}
                        </div>
                    `;
                });
                
                assigneeHtml = `
                    <div class="details-assignee animate-fade-in" style="display: flex; align-items: center; background: rgba(255,255,255,0.06); padding: 0.4rem 1rem 0.4rem 0.4rem; border-radius: 100px; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(10px); margin-bottom: 0.2rem; gap: 0.4rem;">
                        <div style="display: flex; align-items: center; margin-left: 8px;">
                            ${avatarsHtml}
                        </div>
                        <div style="display: flex; flex-direction: column; margin-left: 0.4rem; text-align: left;">
                            <span style="font-size: 0.7rem; font-weight: 600; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.5px;">Travelers</span>
                            <span style="font-size: 0.9rem; font-weight: 700; color: white; line-height: 1.1; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                ${displayAssignees.join(', ')}
                            </span>
                        </div>
                    </div>
                `;
            }
        }

        const detailsView = document.getElementById('travel-details-view');
        detailsView.innerHTML = `
            <div class="details-hero" style="--hero-bg: url('${dest.image}')">
                <div class="details-hero-overlay"></div>
                <button class="back-btn" onclick="window.showView('travel')">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    Back to Journal
                </button>
                <div class="details-hero-content">
                    <h1>${dest.name}</h1>
                    <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 2rem;">
                        <div class="details-meta">
                            <span><div class="meta-icon-circle"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></div> ${dest.location}</span>
                            <span><div class="meta-icon-circle duration"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></div> ${dest.duration.includes('Days') && parseInt(dest.duration) === 1 ? '1 Day' : dest.duration}</span>
                            <span><div class="meta-icon-circle date"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div> ${formatDate(dest.date)}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 1.2rem; flex-wrap: wrap;">
                            ${assigneeHtml}
                            <div class="details-expense-badge">
                                <div class="badge-icon">
                                    <span style="font-weight: 900; font-size: 1.2rem; letter-spacing: -0.5px;">Rp</span>
                                </div>
                                <div class="badge-text">
                                    <span class="badge-label">Total Expense</span>
                                    <span class="badge-amount" style="font-size: 1.6rem; font-weight: 900; color: white; line-height: 1;">${formatRupiah(dest.cost)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="details-tabs">
                <button class="details-tab active">Itinerary</button>
                <button class="details-tab">Album</button>
            </div>
            <div class="details-body">
                <div class="itinerary-view">
                    <!-- Itinerary will be injected here -->
                </div>
                <div class="album-view hidden">
                    <!-- Album will be injected here -->
                </div>
            </div>
        `;
        
        // Store current ID for on-demand album loading
        detailsView.dataset.id = id;

        const tabs = detailsView.querySelectorAll('.details-tab');
        const views = detailsView.querySelectorAll('.details-body > div');
        
        tabs.forEach((tab, index) => {
            tab.onclick = () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                views.forEach(v => v.classList.add('hidden'));
                views[index].classList.remove('hidden');
                
                // If switching to Album tab, fetch album data on-demand
                if (tab.textContent === 'Album') {
                    window.loadAlbum(id);
                }
            };
        });

        // Initialize Itinerary
        renderItinerary(dest);
        
        document.querySelectorAll('main > section').forEach(sec => sec.classList.add('hidden'));
        detailsView.classList.remove('hidden');
    };

    // Helper to load album on-demand
    window.loadAlbum = function(destId) {
        const albumView = document.querySelector('.album-view');
        if (!albumView) return;

        albumView.innerHTML = `
            <div class="loading-state" style="padding: 3rem; text-align: center;">
                <div class="spinner" style="margin: 0 auto 1rem;"></div>
                <p>Loading Album...</p>
            </div>
        `;

        db.ref('albums/' + destId).once('value').then(snapshot => {
            const albumData = snapshot.val() || [];
            const dest = window.travelData.find(d => d.id === destId);
            if (dest) {
                dest.album = albumData;
                window.renderAlbum(dest);
            }
        }).catch(err => {
            console.error('Failed to load album:', err);
            albumView.innerHTML = '<p style="text-align:center; padding:2rem;">Error loading album.</p>';
        });
    };

    window.selectedPhotos = new Set();
    let touchTimer = null;
    let isDragSelecting = false;
    let initialTouchX = 0;
    let initialTouchY = 0;

    window.renderAlbum = function(dest) {
        const albumView = document.querySelector('.album-view');
        if (!albumView) return;

        const photos = dest.album || [];
        const isAnySelected = window.selectedPhotos.size > 0;
        
        // Update Global Selection Toolbar
        const globalToolbar = document.getElementById('global-selection-toolbar');
        if (globalToolbar) {
            if (isAnySelected) {
                globalToolbar.classList.remove('hidden');
                document.getElementById('selection-count-pill').textContent = window.selectedPhotos.size;
                
                const actionsContainer = document.getElementById('selection-toolbar-actions');
                actionsContainer.innerHTML = `
                    <button class="btn-toolbar btn-toolbar-download" onclick="window.bulkDownload(${dest.id})">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        <span class="toolbar-label">Download</span>
                    </button>
                    <button class="btn-toolbar btn-toolbar-delete" onclick="window.bulkDelete(${dest.id})">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        <span class="toolbar-label">Delete</span>
                    </button>
                `;
                
                document.getElementById('selection-cancel-btn').onclick = () => window.clearSelection(dest.id);
            } else {
                globalToolbar.classList.add('hidden');
            }
        }

        let html = `
            <div class="album-header">
                <div class="photo-count-badge">
                    <div class="count-icon-box">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    </div>
                    <div class="count-info-stack">
                        <div class="count-value">${photos.length}</div>
                        <div class="count-text">Photos</div>
                    </div>
                </div>
                
                <input type="file" id="album-upload-input" hidden accept="image/*" multiple onchange="window.handleAlbumUpload(event, ${dest.id})">
                <button class="action-btn-pill" onclick="document.getElementById('album-upload-input').click()">+ Upload Photos</button>
            </div>
        `;

        if (photos.length === 0) {
            html += `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    <h3>Album is Empty</h3>
                    <p>No photos uploaded yet for this destination.</p>
                </div>
            `;
        } else {
            html += '<div class="album-grid" id="photo-album-grid">';
            photos.forEach((photo, index) => {
                const isSelected = window.selectedPhotos.has(index);
                html += `
                    <div class="album-item ${isSelected ? 'selected' : ''}" 
                         data-index="${index}"
                         ontouchstart="window.handlePhotoTouchStart(event, ${dest.id}, ${index})"
                         ontouchmove="window.handlePhotoTouchMove(event, ${dest.id})"
                         ontouchend="window.handlePhotoTouchEnd(event, ${dest.id})">
                        <div class="photo-checkbox" onclick="event.stopPropagation(); window.toggleSelection(${dest.id}, ${index})"></div>
                        <img src="${photo}" alt="Trip Photo" onclick="if(!window.isLongPressing) window.openFullscreen(${dest.id}, ${index})">
                        <div class="photo-overlay" onclick="if(!window.isLongPressing) window.openFullscreen(${dest.id}, ${index})">
                            <button class="photo-btn" onclick="event.stopPropagation(); window.downloadPhoto('${photo}', 'trip-photo-${index}.png')" title="Download">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            </button>
                            <button class="photo-btn delete-photo" onclick="event.stopPropagation(); window.deletePhoto(${dest.id}, ${index})" title="Delete">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                            </button>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }
        albumView.innerHTML = html;
    };

    window.isLongPressing = false;

    window.handlePhotoTouchStart = function(e, destId, index) {
        if (window.innerWidth > 900) { // Only mobile (simulated or real)
            initialTouchX = e.touches[0].clientX;
            initialTouchY = e.touches[0].clientY;
            window.isLongPressing = false;
            isDragSelecting = false;

            touchTimer = setTimeout(() => {
                window.isLongPressing = true;
                isDragSelecting = true;
                if (!window.selectedPhotos.has(index)) {
                    window.toggleSelection(destId, index);
                }
                if (navigator.vibrate) navigator.vibrate(50);
            }, 500);
        }
    };

    window.handlePhotoTouchMove = function(e, destId) {
        if (!touchTimer && !isDragSelecting) return;

        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;

        if (!isDragSelecting) {
            const dist = Math.sqrt(Math.pow(touchX - initialTouchX, 2) + Math.pow(touchY - initialTouchY, 2));
            if (dist > 10) {
                clearTimeout(touchTimer);
                touchTimer = null;
            }
            return;
        }

        e.preventDefault();
        const element = document.elementFromPoint(touchX, touchY);
        const item = element?.closest('.album-item');
        
        if (item) {
            const index = parseInt(item.dataset.index);
            if (!window.selectedPhotos.has(index)) {
                window.toggleSelection(destId, index);
            }
        }
    };

    window.handlePhotoTouchEnd = function() {
        clearTimeout(touchTimer);
        touchTimer = null;
        isDragSelecting = false;
        setTimeout(() => { window.isLongPressing = false; }, 50);
    };

    window.toggleSelection = (destId, index) => {
        const dest = window.travelData.find(d => d.id === destId);
        if (!dest) return;
        if (window.selectedPhotos.has(index)) {
            window.selectedPhotos.delete(index);
        } else {
            window.selectedPhotos.add(index);
        }
        renderAlbum(dest);
    };

    window.clearSelection = (destId) => {
        window.selectedPhotos.clear();
        const dest = window.travelData.find(d => d.id === destId);
        renderAlbum(dest);
    };

    window.showConfirmModal = function(title, message, onConfirm) {
        modalTitle.textContent = title;
        modalContent.innerHTML = `
            <div class="modal-content-premium">
                <div class="modal-warning-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                </div>
                <p>${message}</p>
                <div class="modal-actions-premium">
                    <button class="btn-modal btn-modal-cancel" id="modal-confirm-cancel">Cancel</button>
                    <button class="btn-modal btn-modal-confirm" id="modal-confirm-ok">OK</button>
                </div>
            </div>
        `;
        
        // Hide default modal actions to prevent doubling
        const defaultActions = document.querySelector('.modal-actions');
        if (defaultActions) defaultActions.style.display = 'none';
        
        modalOverlay.classList.remove('hidden');
        
        const cancelBtn = document.getElementById('modal-confirm-cancel');
        const okBtn = document.getElementById('modal-confirm-ok');
        
        const close = () => {
            window.closeModal();
            cancelBtn.removeEventListener('click', close);
            okBtn.removeEventListener('click', confirmAction);
        };
        
        const confirmAction = () => {
            onConfirm();
            close();
        };
        
        cancelBtn.addEventListener('click', close);
        okBtn.addEventListener('click', confirmAction);
    };

    // Reset Ledger with custom modal
    window.resetLedger = () => {
        window.showConfirmModal(
            'Reset Ledger',
            'Are you sure you want to reset the entire cash ledger? This will clear all recorded payments across all months.',
            () => {
                window.cashData = {};
                saveState();
                renderCashFund();
            }
        );
    };

    window.bulkDelete = (destId) => {
        window.showConfirmModal(
            'Delete Photos',
            `Are you sure you want to delete ${window.selectedPhotos.size} selected photos? This action cannot be undone.`,
            () => {
                const dest = window.travelData.find(d => d.id === destId);
                if (dest && dest.album) {
                    const newAlbum = dest.album.filter((_, index) => !window.selectedPhotos.has(index));
                    dest.album = newAlbum;
                    window.selectedPhotos.clear();
                    window.saveAlbum(destId, dest.album);
                    renderAlbum(dest);
                }
            }
        );
    };

    window.bulkDownload = (destId) => {
        const dest = window.travelData.find(d => d.id === destId);
        if (dest && dest.album) {
                    window.selectedPhotos.forEach(index => {
                window.downloadPhoto(dest.album[index], `trip-photo-${index}.png`);
            });
        }
    };

    window.handleAlbumUpload = async (event, destId) => {
        const dest = window.travelData.find(d => d.id === destId);
        if (!dest) return;
        
        const files = Array.from(event.target.files);
        if (!files.length) return;

        // Cloudinary Config
        const CLOUD_NAME = 'dtdhkgfic';
        const UPLOAD_PRESET = 'tclcfwwr';
        const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

        // Show loading state
        const uploadBtn = document.querySelector('.action-btn-pill');
        const originalBtnText = uploadBtn.innerHTML;
        uploadBtn.disabled = true;
        
        if (!dest.album) dest.album = [];
        const startIndex = dest.album.length;
        let uploadedCount = 0;

        // 1. Optimistic UI: Add local blob URLs immediately
        const tempUrls = files.map(file => URL.createObjectURL(file));
        dest.album.push(...tempUrls);
        renderAlbum(dest);

        // 2. Parallel Uploads
        const uploadPromises = files.map(async (file, i) => {
            try {
                // Compression for stability
                const dataUrl = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsDataURL(file);
                });

                let fileToUpload = file;
                try {
                    const compressedBase64 = await compressImage(dataUrl, 2000, 0.85);
                    const res = await fetch(compressedBase64);
                    fileToUpload = await res.blob();
                } catch (e) { console.warn('Compression skipped', e); }

                const formData = new FormData();
                formData.append('file', fileToUpload);
                formData.append('upload_preset', UPLOAD_PRESET);

                const response = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
                if (!response.ok) throw new Error('Upload failed');

                const data = await response.json();
                
                // Replace temp URL with real URL in the live state
                const realIndex = startIndex + i;
                dest.album[realIndex] = data.secure_url;
                
                // Revoke object URL
                URL.revokeObjectURL(tempUrls[i]);
                
                uploadedCount++;
                uploadBtn.innerHTML = `<span class="spinner"></span> ${uploadedCount}/${files.length}`;
                
                // Re-render UI only (don't save to Firebase yet to avoid race conditions)
                renderAlbum(dest);
            } catch (error) {
                console.error('Upload error:', error);
                // Fallback: if upload fails, we keep the blob or could remove it. 
                // For now, let's just leave it so the user sees it failed.
            }
        });

        // Wait for all uploads to complete before persisting to Firebase
        await Promise.all(uploadPromises);
        
        // Final save: Separate metadata and album storage
        saveState();
        window.saveAlbum(destId, dest.album);
        
        renderAlbum(dest);
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = originalBtnText;
        event.target.value = ''; // Reset input
    };

    async function compressImage(dataUrl, maxWidth, quality) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = dataUrl;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth || height > maxWidth) {
                    if (width > height) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    } else {
                        width *= maxWidth / height;
                        height = maxWidth;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
        });
    }

    window.openFullscreen = (destId, index) => {
        const dest = window.travelData.find(d => String(d.id) === String(destId));
        if (!dest || !dest.album) return;

        window.currentAlbumDestId = destId;
        window.currentPhotoIndex = index;

        const overlay = document.getElementById('lightbox-overlay');
        const img = document.getElementById('lightbox-img');
        const indexDisplay = document.getElementById('lightbox-index');
        const downloadBtn = document.getElementById('lightbox-download');
        const deleteBtn = document.getElementById('lightbox-delete');

        // Update content
        img.src = dest.album[index];
        if (indexDisplay) {
            indexDisplay.textContent = `${index + 1} / ${dest.album.length}`;
        }

        // Wire actions
        downloadBtn.onclick = () => window.downloadPhoto(dest.album[index], `trip-photo-${index}.png`);
        if (deleteBtn) {
            deleteBtn.onclick = () => {
                window.deletePhoto(destId, index);
                window.closeFullscreen();
            };
        }

        overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    };

    window.closeFullscreen = () => {
        const overlay = document.getElementById('lightbox-overlay');
        overlay.classList.add('hidden');
        document.body.style.overflow = '';
    };

    window.navigateFullscreen = (direction) => {
        const dest = window.travelData.find(d => d.id === window.currentAlbumDestId);
        if (!dest || !dest.album) return;

        let newIndex = window.currentPhotoIndex + direction;
        if (newIndex < 0) newIndex = dest.album.length - 1;
        if (newIndex >= dest.album.length) newIndex = 0;

        window.openFullscreen(window.currentAlbumDestId, newIndex);
    };

    // Close on escape key
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') window.closeFullscreen();
        if (e.key === 'ArrowLeft') window.navigateFullscreen(-1);
        if (e.key === 'ArrowRight') window.navigateFullscreen(1);
    });

    // Touch Swipe Support
    let touchStartX = 0;
    let touchEndX = 0;
    
    const lightboxOverlay = document.getElementById('lightbox-overlay');
    if (lightboxOverlay) {
        lightboxOverlay.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        lightboxOverlay.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });
    }

    function handleSwipe() {
        const threshold = 50;
        if (touchEndX < touchStartX - threshold) {
            // Swiped Left -> Next
            window.navigateFullscreen(1);
        }
        if (touchEndX > touchStartX + threshold) {
            // Swiped Right -> Prev
            window.navigateFullscreen(-1);
        }
    }

    window.deletePhoto = (destId, photoIndex) => {
        window.showConfirmModal(
            'Delete Photo',
            'Are you sure you want to delete this photo?',
            () => {
                const dest = window.travelData.find(d => d.id === destId);
                if (dest && dest.album) {
                    dest.album.splice(photoIndex, 1);
                    window.saveAlbum(destId, dest.album);
                    renderAlbum(dest);
                }
            }
        );
    };

    window.downloadPhoto = (dataUrl, filename) => {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    window.renderItinerary = function(dest) {
        const itineraryView = document.querySelector('.itinerary-view');
        if (!itineraryView) return;

        const duration = parseInt(dest.duration) || 0;
        let html = '<div class="itinerary-timeline">';
        
        if (duration === 0) {
            html += `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    <h3>No Days Added</h3>
                    <p>Start your journey by adding the first day!</p>
                </div>
            `;
        } else {
            for (let i = 1; i <= duration; i++) {
                const dayActivities = (dest.itinerary || []).filter(act => act.day === i);
                
                html += `
                    <div class="itinerary-day-card glass-card">
                        <div class="day-header">
                            <h3>Day ${i}</h3>
                            <div style="display: flex; gap: 0.8rem; align-items: center;">
                                <button class="action-btn-pill" onclick="window.addActivity(${dest.id}, ${i})">+ Add Activity</button>
                                <button class="action-btn-icon delete" onclick="window.deleteDay(${dest.id}, ${i})" title="Delete Day">×</button>
                            </div>
                        </div>
                        <div class="day-activities">
                            ${dayActivities.length > 0 ? dayActivities.map(act => `
                                <div class="activity-item">
                                    <span class="activity-time">${act.time}</span>
                                    <span class="activity-text">${act.text}</span>
                                </div>
                            `).join('') : '<p class="no-activities">No activities planned for this day.</p>'}
                        </div>
                    </div>
                `;
            }
        }
        
        html += `
            <div class="add-day-container">
                <button class="primary-btn" onclick="window.addDay(${dest.id})">+ Add Day</button>
            </div>
        </div>`;
        itineraryView.innerHTML = html;
    };

    window.addDay = (destId) => {
        const dest = window.travelData.find(d => d.id === destId);
        if (dest) {
            const currentDays = parseInt(dest.duration) || 0;
            dest.duration = `${currentDays + 1} Days`;
            saveState();
            renderItinerary(dest);
            renderTravelJournal();
        }
    };

    window.deleteDay = (destId, day) => {
        window.customConfirm(`Are you sure you want to delete Day ${day}? This will remove all activities on this day.`, () => {
            const dest = window.travelData.find(d => d.id === destId);
            if (dest) {
                const currentDays = parseInt(dest.duration) || 0;
                if (currentDays <= 1) return;

                if (dest.itinerary) {
                    dest.itinerary = dest.itinerary.filter(act => act.day !== day);
                    dest.itinerary.forEach(act => {
                        if (act.day > day) act.day--;
                    });
                }
                
                dest.duration = `${currentDays - 1} Days`;
                saveState();
                renderItinerary(dest);
                renderTravelJournal();
            }
        });
    };

    window.addActivity = (destId, day) => {
        modalTitle.textContent = `Add Activity - Day ${day}`;
        modalContent.innerHTML = `
            <div class="input-group">
                <label>Time</label>
                <input type="text" id="m-act-time" placeholder="e.g. 08:00" autofocus>
            </div>
            <div class="input-group">
                <label>Activity</label>
                <input type="text" id="m-act-text" placeholder="e.g. Breakfast at Hotel">
            </div>
        `;
        currentModalAction = `add-activity-${destId}-${day}`;
        modalOverlay.classList.remove('hidden');
        document.getElementById('m-act-time').focus();
    };

    window.removePerson = function(id) {
        window.people = window.people.filter(p => p.id !== Number(id));
        window.items.forEach(item => {
            item.assignees = item.assignees.filter(pId => pId !== Number(id));
        });
        document.documentElement.style.setProperty('--hero-bg', 'none');
        saveState();
        renderPeople();
        renderItems();
        renderCashFund();
    };

    window.renderItems = function() {
        if (!itemsList) return;
        itemsList.innerHTML = '';
        window.items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'item-card dash-card';
            card.innerHTML = `
                <div class="item-header-row">
                    <div class="item-info">
                        <div class="item-name-row">
                            <span class="item-qty">1x</span>
                            <span class="item-name">${item.name}</span>
                        </div>
                        <div class="item-price-tag">${formatRupiah(item.price)}</div>
                    </div>
                    <div class="item-actions">
                        <button class="action-btn-pill edit-item-btn" data-id="${item.id}">Edit</button>
                        <button class="action-btn-icon delete delete-item-btn" data-id="${item.id}">×</button>
                    </div>
                </div>
                <div class="item-assign-tags">
                    ${window.people.map(person => {
                        const assignees = item.assignees || [];
                        const isActive = assignees.includes(person.id);
                        return `
                            <div class="assign-tag ${isActive ? 'active' : ''}" 
                                 data-item-id="${item.id}" data-person-id="${person.id}">
                                ${person.name}
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
            itemsList.appendChild(card);
        });
        window.calculate();
    };

    window.calculate = function(target = 'inline') {
        const personDetails = {};
        window.people.forEach(p => personDetails[p.id] = { total: 0, items: [] });

        window.items.forEach(item => {
            const assignees = item.assignees || [];
            if (assignees.length > 0) {
                const sharePrice = item.price / assignees.length; 
                assignees.forEach(pId => {
                    if (personDetails[pId]) {
                        personDetails[pId].total += sharePrice;
                        personDetails[pId].items.push({ name: item.name, price: sharePrice });
                    }
                });
            }
        });

        const targetGrid = target === 'full' ? fullResultsGrid : individualResults;

        if (targetGrid) {
            targetGrid.innerHTML = '';
            window.people.forEach(person => {
                const details = personDetails[person.id];
                if (!details || details.total === 0) return;

                let photoHtml = person.name.charAt(0).toUpperCase();
                let bgStyle = `background: ${person.color}`;

                let themeClass = '';
                if (window.userProfiles && window.userProfiles[person.name]) {
                    const profile = window.userProfiles[person.name];
                    if (profile.photo && profile.photo.length > 3) {
                        photoHtml = `<img src="${profile.photo}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                        bgStyle = `background: transparent;`;
                    }
                    if (profile.borderTheme && profile.borderTheme !== 'none') {
                        themeClass = ` avatar-theme-${profile.borderTheme}`;
                    }
                }

                const card = document.createElement('div');
                card.className = 'receipt-card glass-card';
                card.innerHTML = `
                    <div class="receipt-header">
                        <div class="receipt-avatar${themeClass}" style="${bgStyle}">${photoHtml}</div>
                        <div class="receipt-header-info">
                            <span class="receipt-person-name">${person.name}</span>
                            <div class="receipt-total-row">
                                <span class="receipt-total-label">TOTAL</span>
                                <span class="receipt-total-amount">${formatRupiah(details.total)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="receipt-divider"></div>
                    <div class="receipt-body">
                        ${details.items.map(i => `
                            <div class="receipt-row">
                                <span class="r-item-name">1x ${i.name}</span>
                                <span class="r-item-price">${formatRupiah(i.price)}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
                targetGrid.appendChild(card);
            });
        }
        
        if (stickyTotalDisplay) {
            const sum = window.items.reduce((acc, i) => acc + i.price, 0);
            stickyTotalDisplay.textContent = formatRupiah(sum);
        }
    };

    // --- Cash Fund ---
    function renderCashFund() {
        if (!cashList || !monthDisplay) {
            console.error('Cash Fund elements not found');
            return;
        }

        const monthKey = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        monthDisplay.textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        if (!window.cashData[monthKey]) window.cashData[monthKey] = {};
        if (!window.cashData[monthKey].target) window.cashData[monthKey].target = CASH_TARGET;

        const currentTarget = window.cashData[monthKey].target;
        const targetInfo = document.getElementById('cash-target-info');
        const targetCard = document.getElementById('stat-card-target');
        if (targetInfo) {
            targetInfo.innerHTML = formatRupiah(currentTarget);
        }
        if (targetCard) {
            targetCard.style.cursor = 'pointer';
            targetCard.onclick = () => window.changeTarget(monthKey);
        }

        cashList.innerHTML = '';
        let totalCollected = 0;
        
        // Calculate cumulative total from all months up to the current one
        Object.keys(window.cashData).forEach(mKey => {
            if (mKey <= monthKey) {
                const monthTarget = window.cashData[mKey].target || CASH_TARGET;
                Object.entries(window.cashData[mKey]).forEach(([key, isPaid]) => {
                    if (key !== 'target' && isPaid === true) {
                        totalCollected += monthTarget;
                    }
                });
            }
        });

        console.log('Rendering Cash Fund for', monthKey, 'with', window.people.length, 'people. Cumulative Total:', totalCollected);

        window.people.forEach(person => {
            if (!person || !person.name) return;
            
            const isPaid = window.cashData[monthKey][person.id] || false;
            // (The individual card status still reflects the current month)

            const card = document.createElement('div');
            card.className = `cash-person-card ${isPaid ? 'paid' : 'unpaid'}`;
            const initial = person.name.charAt(0).toUpperCase();
            
            // Check if person has a profile photo
            let photoHtml = initial;
            let bgStyle = `background: ${person.color || avatarColors[0]};`;
            
            let themeClass = '';
            if (window.userProfiles && window.userProfiles[person.name]) {
                const profile = window.userProfiles[person.name];
                if (profile.photo && profile.photo.length > 3) {
                    photoHtml = `<img src="${profile.photo}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                    bgStyle = `background: transparent;`;
                }
                if (profile.borderTheme && profile.borderTheme !== 'none') {
                    themeClass = ` avatar-theme-${profile.borderTheme}`;
                }
            }
            
            card.innerHTML = `
                <div class="cash-person-info">
                    <div class="cash-avatar${themeClass}" style="${bgStyle}">${photoHtml}</div>
                    <div class="cash-details">
                        <span class="name">${person.name}</span>
                        <span class="status">${isPaid ? 'Paid' : 'Unpaid'}</span>
                    </div>
                </div>
                <div class="cash-action" style="display: flex; gap: 0.8rem; align-items: center;">
                    <button class="pay-toggle ${isPaid ? 'btn-unpay' : 'btn-pay'}" data-id="${person.id}">
                        ${isPaid ? 'Paid' : 'Pay Now'}
                    </button>
                </div>
                <button class="action-btn-icon delete delete-person-btn" data-id="${person.id}">×</button>
            `;
            cashList.appendChild(card);
        });

        if (totalCollectedDisplay) totalCollectedDisplay.textContent = formatRupiah(totalCollected);
    }

    // --- Travel Journal ---
    function renderTravelJournal() {
        const destGrid = document.getElementById('destination-grid');
        const travelTotalDisplay = document.getElementById('total-travel-cost');
        if (!destGrid) return;

        let totalCost = 0;
        const filteredData = window.travelData.filter(dest => {
            if (window.travelFilter === 'all') return true;
            if (window.travelFilter === 'wishlist') return dest.isWishlist === true;
            return true;
        }).sort((a, b) => new Date(b.date) - new Date(a.date));

        // Build HTML as a single string to optimize performance and prevent flicker
        let html = '';
        filteredData.forEach(dest => {
            if (!dest.isWishlist) totalCost += dest.cost;
            
            const dateBadge = formatDate(dest.date, 'badge');
            
            let assigneeHtml = '';
            const assignees = dest.assignees || (dest.assignee ? [dest.assignee] : []);
            if (assignees.length > 0) {
                let avatarsHtml = '';
                const displayAssignees = assignees.filter(u => window.userProfiles && window.userProfiles[u]);
                
                if (displayAssignees.length > 0) {
                    displayAssignees.forEach((user, index) => {
                        const profile = window.userProfiles[user];
                        let themeClass = '';
                        if (profile.borderTheme && profile.borderTheme !== 'none') {
                            themeClass = ` avatar-theme-${profile.borderTheme}`;
                        }
                        
                        let photoHtml = '';
                        if (profile.photo && profile.photo.length > 2) {
                            photoHtml = `<img src="${profile.photo}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                        } else {
                            const initial = profile.photo || user.charAt(0).toUpperCase();
                            photoHtml = `<span style="font-weight: 700; font-size: 0.75rem; color: white;">${initial}</span>`;
                        }
                        
                        avatarsHtml += `
                            <div class="profile-avatar ${themeClass}" style="width: 26px; height: 26px; font-size: 0.7rem; background: var(--accent-gradient); display: flex; align-items: center; justify-content: center; position: relative; margin-left: ${index === 0 ? '0' : '-8px'}; border: 2px solid #0f0f19; border-radius: 50%; box-shadow: 0 4px 10px rgba(0,0,0,0.3); z-index: ${10 - index};">
                                ${photoHtml}
                            </div>
                        `;
                    });
                    
                    assigneeHtml = `
                        <div class="dest-assignee-badge" title="Travelers: ${displayAssignees.join(', ')}" style="display: flex; align-items: center; background: rgba(255,255,255,0.03); padding: 0.3rem 0.6rem 0.3rem 0.4rem; border-radius: 100px; border: 1px solid rgba(255,255,255,0.05); backdrop-filter: blur(5px); gap: 0.4rem;">
                            <div style="display: flex; align-items: center;">
                                ${avatarsHtml}
                            </div>
                            <span class="assignee-name" style="font-size: 0.75rem; font-weight: 600; color: rgba(255,255,255,0.7); max-width: 85px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-left: 0.2rem; margin-right: 0.4rem;">
                                ${displayAssignees.length === 1 ? displayAssignees[0] : `${displayAssignees.length} Travelers`}
                            </span>
                        </div>
                    `;
                }
            }

            html += `
                <div class="destination-card glass-card" onclick="window.viewDestination(event, ${dest.id})">
                    <div class="dest-image" style="background-image: url('${dest.image}')">
                        ${dest.isWishlist ? `
                            <div class="wishlist-badge">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                                Wishlist
                            </div>
                        ` : ''}
                        <div class="dest-date-premium">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            <span class="dd-day">${dateBadge.day}</span>
                            <span class="dd-month">${dateBadge.month}</span>
                            <span class="dd-year">${dateBadge.year}</span>
                        </div>
                        <div class="dest-actions">
                            <button class="action-btn-icon edit edit-dest-btn" data-id="${dest.id}">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                            </button>
                            <button class="action-btn-icon delete delete-dest-btn" data-id="${dest.id}">×</button>
                        </div>
                    </div>
                    <div class="dest-info">
                        <div class="dest-meta-header">
                            <div class="dest-meta-row">
                                <div class="dest-location">
                                    <div class="meta-icon-box">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                    </div>
                                    <span>${dest.location}</span>
                                </div>
                                <div class="dest-duration">
                                    <div class="meta-icon-box">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                    </div>
                                    <span>${dest.duration.includes('Days') && parseInt(dest.duration) === 1 ? '1 Day' : dest.duration}</span>
                                </div>
                            </div>
                            <h3 class="dest-name">${dest.name}</h3>
                        </div>
                        <div class="dest-footer" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                            <div class="dest-cost-box">
                                <span class="dest-cost-label">Total Cost</span>
                                <div class="dest-cost-value">${formatRupiah(dest.cost)}</div>
                            </div>
                            ${assigneeHtml}
                        </div>
                    </div>
                </div>
            `;
        });

        destGrid.innerHTML = html || `<div class="empty-state">No destinations found.</div>`;
        if (travelTotalDisplay) travelTotalDisplay.textContent = formatRupiah(totalCost);
        
        const totalDestDisplay = document.getElementById('total-destinations-count');
        if (totalDestDisplay) totalDestDisplay.textContent = filteredData.length || 0;
    }

    function initTravelFilter() {
        const slider = document.getElementById('travel-filter-slider');
        if (!slider) return;

        const options = slider.querySelectorAll('.filter-option');
        options.forEach(opt => {
            opt.onclick = () => {
                const filter = opt.dataset.filter;
                window.travelFilter = filter;
                
                options.forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                slider.setAttribute('data-active', filter);
                
                renderTravelJournal();
            };
        });

        // Sync visual state
        options.forEach(o => {
            if (o.dataset.filter === window.travelFilter) {
                o.classList.add('active');
            } else {
                o.classList.remove('active');
            }
        });
        slider.setAttribute('data-active', window.travelFilter);
    }

    // --- Events ---
    modalSave.onclick = () => {
        if (currentModalAction === 'add-person') {
            const name = document.getElementById('m-person-name').value.trim();
            if (name) {
                const color = avatarColors[window.people.length % avatarColors.length];
                window.people.push({ id: Date.now(), name, color });
                saveState();
            }
        } else if (currentModalAction === 'add-item') {
            const name = document.getElementById('m-item-name').value.trim();
            const price = parseFloat(document.getElementById('m-item-price').value) || 0;
            if (name) {
                window.items.push({ id: Date.now(), name, price, assignees: [] });
            }
        } else if (currentModalAction === 'add-destination') {
            const name = document.getElementById('m-dest-name').value.trim();
            const location = document.getElementById('m-dest-location').value.trim();
            const duration = document.getElementById('m-dest-duration').value.trim() || '0 Days';
            const cost = parseFloat(document.getElementById('m-dest-cost').value) || 0;
            const date = document.getElementById('m-dest-date').value || new Date().toISOString().split('T')[0];
            const isWishlist = document.getElementById('m-dest-wishlist').checked;
            
            const assigneeChips = document.querySelectorAll('.assignee-select-chip.active');
            const assignees = Array.from(assigneeChips).map(chip => chip.dataset.username);
            const fileInput = document.getElementById('m-dest-image-file');

            const saveBtn = document.getElementById('modal-save');
            saveBtn.innerHTML = '<span class="spinner"></span> Saving...';
            saveBtn.disabled = true;

            const saveDest = (imgUrl) => {
                if (name) {
                    window.travelData.push({ 
                        id: Date.now(), 
                        name: name, 
                        location: location || 'Unknown Location', 
                        duration: duration, 
                        cost: cost, 
                        date: date, 
                        image: imgUrl,
                        isWishlist: isWishlist,
                        assignee: assignees[0] || '',
                        assignees: assignees
                    });
                    saveState();
                }
                window.closeModal();
                renderTravelJournal();
            };

            if (fileInput && fileInput.files && fileInput.files[0]) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    // Compress cover photo to 1200px for storage efficiency
                    try {
                        const compressed = await compressImage(e.target.result, 1200, 0.8);
                        saveDest(compressed);
                    } catch (err) {
                        saveDest(e.target.result);
                    }
                };
                reader.readAsDataURL(fileInput.files[0]);
                return;
            } else {
                saveDest('https://images.unsplash.com/photo-1436491865332-7a61a109cc05');
                return;
            }
        } else if (currentModalAction.startsWith('edit-destination-')) {
            const id = Number(currentModalAction.split('-')[2]);
            const destIndex = window.travelData.findIndex(d => d.id === id);
            if (destIndex === -1) return;

            const name = document.getElementById('m-dest-name').value.trim();
            const location = document.getElementById('m-dest-location').value.trim();
            const duration = document.getElementById('m-dest-duration').value.trim() || '1 Day';
            const cost = parseFloat(document.getElementById('m-dest-cost').value) || 0;
            const date = document.getElementById('m-dest-date').value || new Date().toISOString().split('T')[0];
            const isWishlist = document.getElementById('m-dest-wishlist').checked;
            
            const assigneeChips = document.querySelectorAll('.assignee-select-chip.active');
            const assignees = Array.from(assigneeChips).map(chip => chip.dataset.username);
            const fileInput = document.getElementById('m-dest-image-file');

            const saveBtn = document.getElementById('modal-save');
            saveBtn.innerHTML = '<span class="spinner"></span> Saving...';
            saveBtn.disabled = true;

            const saveDest = (imgUrl) => {
                if (name) {
                    window.travelData[destIndex] = {
                        ...window.travelData[destIndex],
                        name: name, 
                        location: location || 'Unknown Location', 
                        duration: duration, 
                        cost: cost, 
                        date: date, 
                        image: imgUrl,
                        isWishlist: isWishlist,
                        assignee: assignees[0] || '',
                        assignees: assignees
                    };
                    saveState();
                }
                window.closeModal();
                renderTravelJournal();
            };

            if (fileInput && fileInput.files && fileInput.files[0]) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const compressed = await compressImage(e.target.result, 1200, 0.8);
                        saveDest(compressed);
                    } catch (err) {
                        saveDest(e.target.result);
                    }
                };
                reader.readAsDataURL(fileInput.files[0]);
                return;
            } else {
                saveDest(window.travelData[destIndex].image);
                return;
            }
        } else if (currentModalAction.startsWith('add-activity-')) {
            const parts = currentModalAction.split('-');
            const destId = Number(parts[2]);
            const day = Number(parts[3]);
            const time = document.getElementById('m-act-time').value.trim();
            const text = document.getElementById('m-act-text').value.trim();
            
            if (time && text) {
                const dest = window.travelData.find(d => d.id === destId);
                if (dest) {
                    if (!dest.itinerary) dest.itinerary = [];
                    dest.itinerary.push({ day, time, text });
                    saveState();
                    renderItinerary(dest);
                }
            }
        } else if (currentModalAction.startsWith('change-target-')) {
            const monthKey = currentModalAction.replace('change-target-', '');
            const newTarget = parseFloat(document.getElementById('m-target-amount').value);
            if (!isNaN(newTarget)) {
                window.cashData[monthKey].target = newTarget;
                saveState();
            }
        } else if (currentModalAction.startsWith('edit-item-')) {
            const id = Number(currentModalAction.split('-')[2]);
            const item = window.items.find(i => i.id === id);
            if (item) {
                const newName = document.getElementById('edit-item-name').value.trim();
                const newPrice = parseFloat(document.getElementById('edit-item-price').value);
                if (newName && !isNaN(newPrice) && newPrice > 0) {
                    item.name = newName;
                    item.price = newPrice;
                    saveState();
                    renderItems();
                    if (typeof window.renderHomeDashboard === 'function') {
                        window.renderHomeDashboard();
                    }
                } else {
                    alert('Please enter a valid item name and price.');
                    return;
                }
            }
        } else if (currentModalAction === 'confirm') {
            if (window.confirmCallback) window.confirmCallback();
        }
        modalOverlay.classList.add('hidden');
        const saveBtn = document.getElementById('modal-save');
        saveBtn.textContent = 'Save';
        saveBtn.style.background = '';
        renderPeople();
        renderItems();
        renderCashFund();
        renderTravelJournal();
    };

    modalCancel.onclick = window.closeModal;

    document.getElementById('prev-month').onclick = () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCashFund(); };
    document.getElementById('next-month').onclick = () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCashFund(); };

    // Edit Item modal form builder
    window.editItem = function(id) {
        const item = window.items.find(i => i.id === id);
        if (!item) return;
        
        modalTitle.textContent = 'Edit Item';
        modalContent.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 1.2rem; padding: 1rem 0;">
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <label style="font-weight: 700; font-size: 0.9rem; color: rgba(255, 255, 255, 0.75);">Item Name</label>
                    <input type="text" id="edit-item-name" value="${item.name}" 
                           style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 14px; padding: 0.9rem 1.1rem; color: white; font-size: 1rem; outline: none; transition: all 0.3s;"
                           onfocus="this.style.borderColor='#6366f1';" onblur="this.style.borderColor='rgba(255,255,255,0.1)';">
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <label style="font-weight: 700; font-size: 0.9rem; color: rgba(255, 255, 255, 0.75);">Price (IDR)</label>
                    <input type="number" id="edit-item-price" value="${item.price}" 
                           style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 14px; padding: 0.9rem 1.1rem; color: white; font-size: 1rem; outline: none; transition: all 0.3s;"
                           onfocus="this.style.borderColor='#6366f1';" onblur="this.style.borderColor='rgba(255,255,255,0.1)';">
                </div>
            </div>
        `;
        modalSave.textContent = 'Save Changes';
        modalSave.style.background = 'linear-gradient(135deg, #6366f1, #a855f7)';
        modalSave.style.display = 'block';
        modalCancel.style.display = 'block';
        
        currentModalAction = 'edit-item-' + id;
        modalOverlay.classList.remove('hidden');
    };

    // Delegation for dynamic elements
    document.addEventListener('click', (e) => {
        if (e.target.closest('.edit-item-btn')) {
            const id = Number(e.target.closest('.edit-item-btn').dataset.id);
            window.editItem(id);
        }
        if (e.target.closest('.delete-item-btn')) {
            const id = Number(e.target.closest('.delete-item-btn').dataset.id);
            window.customConfirm('Are you sure you want to delete this item?', () => {
                window.items = window.items.filter(i => i.id !== id);
                saveState();
                renderItems();
                if (typeof window.renderHomeDashboard === 'function') {
                    window.renderHomeDashboard();
                }
            });
        }
        if (e.target.closest('.delete-dest-btn')) {
            const id = Number(e.target.closest('.delete-dest-btn').dataset.id);
            window.customConfirm('Are you sure you want to delete this destination?', () => {
                window.travelData = window.travelData.filter(d => d.id !== id);
                saveState();
                renderTravelJournal();
            });
        }
        if (e.target.closest('.edit-dest-btn')) {
            const id = Number(e.target.closest('.edit-dest-btn').dataset.id);
            window.editDestination(id);
        }
        if (e.target.closest('.delete-avatar') || e.target.closest('.delete-person-btn')) {
            const btn = e.target.closest('.delete-avatar') || e.target.closest('.delete-person-btn');
            window.removePerson(btn.dataset.id);
        }
        if (e.target.closest('.assign-tag')) {
            const tag = e.target.closest('.assign-tag');
            const item = window.items.find(i => i.id === Number(tag.dataset.itemId));
            const pId = Number(tag.dataset.personId);
            if (!item.assignees) item.assignees = [];
            const idx = item.assignees.indexOf(pId);
            if (idx > -1) item.assignees.splice(idx, 1);
            else item.assignees.push(pId);
            
            // Persist assigned state immediately to local & cloud databases
            saveState();
            
            // Update items render list and calculations
            renderItems();
            
            // Sync Home dashboard stats live
            if (typeof window.renderHomeDashboard === 'function') {
                window.renderHomeDashboard();
            }
        }
        if (e.target.closest('.pay-toggle')) {
            const btn = e.target.closest('.pay-toggle');
            const monthKey = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
            const pId = Number(btn.dataset.id);
            window.cashData[monthKey][pId] = !window.cashData[monthKey][pId];
            saveState();
            renderCashFund();
        }
    });

    window.startManual = () => {
        window.items = [];
        showView('split');
    };

    // --- Coin Animation ---
    function createCoin() {
        if (!coinContainer) return;
        const coin = document.createElement('div');
        coin.className = 'floating-coin';
        coin.textContent = 'Rp';
        const startX = Math.random() * window.innerWidth;
        const startY = window.innerHeight + 100;
        const tx = (Math.random() - 0.5) * 400;
        const ty = -(window.innerHeight + 200);
        const size = 30 + Math.random() * 40;
        const duration = 5 + Math.random() * 10;
        coin.style.left = `${startX}px`;
        coin.style.top = `${startY}px`;
        coin.style.width = `${size}px`;
        coin.style.height = `${size}px`;
        coin.style.setProperty('--tx', `${tx}px`);
        coin.style.setProperty('--ty', `${ty}px`);
        coin.style.animationDuration = `${duration}s`;
        coinContainer.appendChild(coin);
        setTimeout(() => coin.remove(), duration * 1000);
    }

    setInterval(() => {
        if (coinContainer && coinContainer.children.length < 30) createCoin();
    }, 1500);



    // --- Receipt Upload & OCR Mock ---
    const billImageInput = document.getElementById('bill-image');
    const ocrStatus = document.getElementById('ocr-status');
    const ocrError = document.getElementById('ocr-error');

    if (billImageInput) {
        billImageInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Show loader
            const heroContent = document.getElementById('hero-main-content');
            if (heroContent) heroContent.classList.add('hidden');
            ocrStatus.classList.remove('hidden');

            // Simulate OCR Processing
            setTimeout(() => {
                // Mock detected items
                const mockItems = [
                    { id: Date.now() + 1, name: 'Premium Wagyu Burger', price: 125000, assignees: [] },
                    { id: Date.now() + 2, name: 'Truffle Fries', price: 45000, assignees: [] },
                    { id: Date.now() + 3, name: 'Iced Lychee Tea', price: 35000, assignees: [] },
                    { id: Date.now() + 4, name: 'Service Charge (10%)', price: 20500, assignees: [] }
                ];

                window.items = mockItems;
                ocrStatus.classList.add('hidden');
                if (heroContent) heroContent.classList.remove('hidden');
                
                showView('split');
            }, 2500);
        };
    }

    // --- Init & Sync ---
    // --- Init & Sync ---
    let lastDataString = '';

    db.ref('bekantans_data').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const currentDataString = JSON.stringify(data);
            if (currentDataString === lastDataString) return; // Skip if no real changes
            
            // Detect which part changed for targeted rendering
            const peopleChanged = JSON.stringify(data.people) !== JSON.stringify(window.people);
            const itemsChanged = JSON.stringify(data.items) !== JSON.stringify(window.items);
            const cashChanged = JSON.stringify(data.cashData) !== JSON.stringify(window.cashData);
            const travelChanged = JSON.stringify(data.travelData) !== JSON.stringify(window.travelData);
            const wheelChanged = JSON.stringify(data.wheelParticipants) !== JSON.stringify(window.wheelParticipants);
            const profilesChanged = JSON.stringify(data.userProfiles) !== JSON.stringify(window.userProfiles);

            window.people = (data.people && data.people.length > 0) ? data.people : window.people;
            window.items = (data.items && data.items.length > 0) ? data.items : window.items;
            window.cashData = data.cashData || {};
            if (data.userProfiles) window.userProfiles = data.userProfiles;
            
            // Update travelData while preserving any locally loaded albums
            const remoteTravelData = data.travelData || [];
            window.travelData = remoteTravelData.map(remoteDest => {
                const localDest = window.travelData.find(ld => ld.id === remoteDest.id);
                // Keep the existing album in memory if it exists locally
                return {
                    ...remoteDest,
                    album: localDest ? localDest.album : []
                };
            });
            
            window.wheelParticipants = data.wheelParticipants || [];
            window.billTitle = data.billTitle || 'Trip Bill';
            window.billPayerId = (data.billPayerId !== undefined) ? data.billPayerId : null;
            if (typeof syncBillMetadataUI === 'function') syncBillMetadataUI();
            
            lastDataString = currentDataString;

            // Targeted Re-rendering
            if (profilesChanged) {
                window.refreshAllAvatars();
                if (!mainView.classList.contains('hidden')) renderPeople();
                if (!cashView.classList.contains('hidden')) renderCashFund();
            }

            if (peopleChanged) {
                if (!mainView.classList.contains('hidden')) {
                    if (!profilesChanged) renderPeople();
                    renderItems();
                }
                if (!cashView.classList.contains('hidden') && !profilesChanged) renderCashFund();
                if (!spinWheelView.classList.contains('hidden')) window.initWheel();
            } else if (itemsChanged) {
                if (!mainView.classList.contains('hidden')) renderItems();
            }
            
            if (cashChanged) {
                if (!cashView.classList.contains('hidden')) renderCashFund();
            }

            if (wheelChanged) {
                if (!spinWheelView.classList.contains('hidden')) window.initWheel();
            }
            
            if (travelChanged) {
                // If in details view, update it but don't close it
                if (!travelDetailsView.classList.contains('hidden') && window.currentAlbumDestId) {
                    const activeDest = window.travelData.find(d => d.id === window.currentAlbumDestId);
                    if (activeDest) {
                        // We don't want to full-render the details view as it might disrupt interaction
                        // But we should update the album if it's the album tab
                        const albumGrid = document.getElementById('album-grid');
                        if (albumGrid) renderAlbum(activeDest);
                    }
                }
                
                // Only render the main list if we are looking at it
                if (!travelView.classList.contains('hidden')) renderTravelJournal();
            }
        }
    });

    showView('landing');

    // --- Spin Wheel Logic ---
    let currentRotation = 0;
    let isSpinning = false;

    window.initWheel = function() {
        const canvas = document.getElementById('wheel-canvas');
        const container = document.getElementById('wheel-container');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        // Use selected participants or show an empty/placeholder wheel
        const people = window.wheelParticipants || [];
        
        const size = canvas.width;
        const center = size / 2;
        const radius = size / 2 - 5;

        ctx.clearRect(0, 0, size, size);

        if (people.length === 0) {
            // Draw Empty Wheel Placeholder with Purple Theme
            ctx.beginPath();
            ctx.arc(center, center, radius, 0, 2 * Math.PI);
            const emptyGrad = ctx.createRadialGradient(center, center, 0, center, center, radius);
            emptyGrad.addColorStop(0, 'rgba(99, 102, 241, 0.15)');
            emptyGrad.addColorStop(1, 'rgba(79, 70, 229, 0.05)');
            ctx.fillStyle = emptyGrad;
            ctx.fill();
            
            // Dashed Border
            ctx.setLineDash([10, 10]);
            ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.setLineDash([]); // Reset
            
            // Central Icon-like circles
            ctx.beginPath();
            ctx.arc(center, center, 60, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(168, 85, 247, 0.1)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.stroke();
            return;
        }

        const sliceAngle = (2 * Math.PI) / people.length;

        people.forEach((person, i) => {
            const angle = i * sliceAngle;
            
            // Draw slice
            ctx.beginPath();
            ctx.moveTo(center, center);
            ctx.arc(center, center, radius, angle, angle + sliceAngle);
            ctx.closePath();
            
            // Background color for slice with gradient
            const colors = [
                ['#6366f1', '#4f46e5'], // Indigo
                ['#a855f7', '#9333ea'], // Purple
                ['#f43f5e', '#e11d48'], // Rose
                ['#10b981', '#059669'], // Emerald
                ['#f59e0b', '#d97706'], // Amber
                ['#0ea5e9', '#0284c7'], // Sky
                ['#ec4899', '#db2777']  // Pink
            ];
            const colorPair = colors[i % colors.length];
            const grad = ctx.createRadialGradient(center, center, 0, center, center, radius);
            grad.addColorStop(0, colorPair[0]);
            grad.addColorStop(1, colorPair[1]);
            ctx.fillStyle = grad;
            ctx.fill();
            
            // Slice border
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Text
            ctx.save();
            ctx.translate(center, center);
            ctx.rotate(angle + sliceAngle / 2);
            ctx.textAlign = 'right';
            ctx.fillStyle = 'white';
            ctx.font = 'bold 22px Outfit';
            ctx.fillText(person.name, radius - 45, 10);
            ctx.restore();
        });

        // Add inner gloss effect
        ctx.beginPath();
        ctx.arc(center, center, radius, 0, 2 * Math.PI);
        const gloss = ctx.createRadialGradient(center, center, radius * 0.7, center, center, radius);
        gloss.addColorStop(0, 'rgba(0,0,0,0)');
        gloss.addColorStop(1, 'rgba(0,0,0,0.3)');
        ctx.fillStyle = gloss;
        ctx.fill();
    };

    function updateWheelStateClasses() {
        const btn = document.querySelector('.assign-wheel-btn');
        if (btn) {
            if (window.wheelParticipants.length === 0) {
                btn.classList.add('guide-pulse');
            } else {
                btn.classList.remove('guide-pulse');
            }
        }
    }


    window.manageWheelParticipants = () => {
        modalTitle.textContent = 'Manage Wheel Names';
        
        let html = `
            <div class="input-group">
                <label>Wheel Participants</label>
                <div style="display: flex; gap: 0.8rem; flex-wrap: wrap;">
                    <div style="flex: 1; display: flex; gap: 0.5rem;">
                        <input type="text" id="m-wheel-name" placeholder="Enter name..." autofocus>
                        <button class="primary-btn small-btn" onclick="window.addWheelPerson()">Add</button>
                    </div>
                    <button class="secondary-btn small-btn" onclick="window.syncWheelFromPeople()" style="background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.2); color: #818cf8;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"></path></svg>
                        Sync All Participants
                    </button>
                </div>
            </div>
            <div class="wheel-people-list mt-2" style="max-height: 300px; overflow-y: auto; padding-right: 0.5rem;">
        `;
        
        if (window.wheelParticipants.length === 0) {
            html += '<p style="text-align: center; color: var(--text-muted); padding: 1rem;">No names added yet.</p>';
        } else {
            window.wheelParticipants.forEach(person => {
                html += `
                    <div class="wheel-person-card" style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); padding: 0.8rem 1.2rem; border-radius: 12px; margin-bottom: 0.5rem; border: 1px solid rgba(255,255,255,0.05);">
                        <span style="font-weight: 700;">${person.name}</span>
                        <button class="action-btn-icon delete" onclick="window.removeWheelPerson(${person.id})" style="width: 28px; height: 28px;">×</button>
                    </div>
                `;
            });
        }
        html += '</div>';

        modalContent.innerHTML = html;
        modalSave.textContent = 'Done';
        modalSave.style.display = 'block';
        modalCancel.style.display = 'block';
        currentModalAction = 'manage-wheel-done';
        modalOverlay.classList.remove('hidden');
        const input = document.getElementById('m-wheel-name');
        if (input) input.focus();
    };

    window.syncWheelFromPeople = () => {
        if (window.people.length === 0) {
            alert('No participants found in the main list. Add them in the Split Bill or Cash Fund menu first.');
            return;
        }
        
        // Merge without duplicates based on name
        const currentNames = new Set(window.wheelParticipants.map(p => p.name.toLowerCase()));
        window.people.forEach(p => {
            if (!currentNames.has(p.name.toLowerCase())) {
                window.wheelParticipants.push({ id: Date.now() + Math.random(), name: p.name });
            }
        });
        
        saveState();
        window.initWheel();
        window.manageWheelParticipants(); // Re-render modal
    };

    window.addWheelPerson = () => {
        const input = document.getElementById('m-wheel-name');
        const name = input.value.trim();
        if (name) {
            window.wheelParticipants.push({ id: Date.now(), name });
            saveState();
            window.initWheel();
            window.manageWheelParticipants(); // Re-render modal
        }
    };

    window.removeWheelPerson = (id) => {
        window.wheelParticipants = window.wheelParticipants.filter(p => p.id !== id);
        saveState();
        window.initWheel();
        window.manageWheelParticipants(); // Re-render modal
    };

    const spinBtn = document.getElementById('wheel-spin-btn');
    if (spinBtn) {
        spinBtn.onclick = () => {
            if (isSpinning) return;
            if (window.wheelParticipants.length === 0) {
                window.customConfirm('Please assign participants to the wheel first!', () => window.manageWheelParticipants(), true);
                return;
            }

            isSpinning = true;
            const canvas = document.getElementById('wheel-canvas');
            const container = document.getElementById('wheel-container');
            const wrapper = container.parentElement;
            
            // Capture current rotation from computed style to avoid jumping
            const style = window.getComputedStyle(canvas);
            const matrix = style.transform || style.webkitTransform || 'none';
            let currentAngle = 0;
            
            if (matrix !== 'none') {
                const values = matrix.split('(')[1].split(')')[0].split(',');
                const a = parseFloat(values[0]);
                const b = parseFloat(values[1]);
                currentAngle = Math.round(Math.atan2(b, a) * (180 / Math.PI));
            }
            
            // Lock the current rotation and remove idle animation
            canvas.style.transition = 'none';
            canvas.style.transform = `rotate(${currentAngle}deg)`;
            container.classList.remove('idle-spin');
            container.classList.add('is-spinning');
            if (wrapper) wrapper.classList.add('is-spinning');
            
            // Force reflow to ensure the "none" transition is applied
            canvas.offsetHeight;

            // Prepare for the big spin
            canvas.style.transition = 'transform 5s cubic-bezier(0.15, 0, 0.15, 1)';
            const extraDegrees = 2000 + Math.random() * 2000; 
            currentRotation = currentAngle + extraDegrees;
            
            canvas.style.transform = `rotate(${currentRotation}deg)`;

            spinBtn.style.pointerEvents = 'none';
            spinBtn.style.opacity = '0.5';

            setTimeout(() => {
                isSpinning = false;
                spinBtn.style.pointerEvents = 'auto';
                spinBtn.style.opacity = '1';
                container.classList.remove('is-spinning');
                if (wrapper) wrapper.classList.remove('is-spinning');
                
                const actualDegrees = currentRotation % 360;
                const sliceAngle = 360 / (window.wheelParticipants.length || 1);
                
                const pointerAngle = 270;
                let winningAngle = (pointerAngle - actualDegrees) % 360;
                if (winningAngle < 0) winningAngle += 360;
                
                const winnerIndex = Math.floor(winningAngle / sliceAngle);
                const winner = window.wheelParticipants[winnerIndex];

                // Show result in a POPUP modal
                modalTitle.textContent = 'WE HAVE A WINNER!';
                const modalElement = document.querySelector('.modal');
                if (modalElement) modalElement.classList.add('winner-modal');
                
                modalContent.innerHTML = `
                    <div style="text-align: center; padding: 1.5rem 0;">
                        <div class="winner-label" style="margin-bottom: 1rem; color: var(--accent-primary); letter-spacing: 4px; font-weight: 800;">CONGRATULATIONS</div>
                        <div class="winner-name animate-winner">${winner ? winner.name : 'Unknown'}</div>
                        <button class="primary-btn" onclick="window.resetWheel()" style="width: 100%; padding: 1.2rem;">Spin Again</button>
                    </div>
                `;
                modalSave.style.display = 'none';
                modalCancel.style.display = 'none';
                modalOverlay.classList.remove('hidden');

                // Success effect
                window.createSuccessCoins();

                // Resume idle spin after a delay
                setTimeout(() => {
                    if (!isSpinning) {
                        canvas.style.setProperty('--current-rotation', `${currentRotation}deg`);
                        container.classList.add('idle-spin');
                    }
                }, 3000);
            }, 5000);
        };
    }

    window.resetWheel = () => {
        modalOverlay.classList.add('hidden');
        const modalElement = document.querySelector('.modal');
        if (modalElement) modalElement.classList.remove('winner-modal');
        window.initWheel();
    };

    window.createSuccessCoins = () => {
        for(let i=0; i<20; i++) {
            setTimeout(() => {
                if (typeof createCoin === 'function') createCoin();
            }, i * 100);
        }
    };

    // --- Custom Profile Photo Cropper Logic ---
    let cropDragActive = false;
    let cropStartX = 0;
    let cropStartY = 0;
    let cropImgLeft = 0;
    let cropImgTop = 0;
    let cropCurrentScale = 1;
    let cropBaseScale = 1;
    let originalImageEl = null;

    const cropperModal = document.getElementById('cropper-modal');
    const cropperImage = document.getElementById('cropper-image');
    const cropZoomSlider = document.getElementById('crop-zoom-slider');
    const cropWorkArea = document.getElementById('crop-work-area');

    function updateCropperImageTransform() {
        if (cropperImage) {
            cropperImage.style.transform = `translate(${cropImgLeft}px, ${cropImgTop}px) scale(${cropCurrentScale})`;
        }
    }

    if (cropWorkArea && cropperImage && cropZoomSlider) {
        // Drag Events
        cropWorkArea.addEventListener('mousedown', (e) => {
            cropDragActive = true;
            cropStartX = e.clientX - cropImgLeft;
            cropStartY = e.clientY - cropImgTop;
            cropWorkArea.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', (e) => {
            if (!cropDragActive) return;
            cropImgLeft = e.clientX - cropStartX;
            cropImgTop = e.clientY - cropStartY;
            
            // Constrain movement so they don't drag the image completely out of the circle!
            const boxSize = 260;
            const scaledWidth = originalImageEl ? (originalImageEl.width * cropCurrentScale) : boxSize;
            const scaledHeight = originalImageEl ? (originalImageEl.height * cropCurrentScale) : boxSize;
            
            cropImgLeft = Math.min(boxSize / 2, Math.max(boxSize / 2 - scaledWidth, cropImgLeft));
            cropImgTop = Math.min(boxSize / 2, Math.max(boxSize / 2 - scaledHeight, cropImgTop));
            
            updateCropperImageTransform();
        });

        window.addEventListener('mouseup', () => {
            cropDragActive = false;
            cropWorkArea.style.cursor = 'grab';
        });

        // Touch support for Mobile
        cropWorkArea.addEventListener('touchstart', (e) => {
            cropDragActive = true;
            const touch = e.touches[0];
            cropStartX = touch.clientX - cropImgLeft;
            cropStartY = touch.clientY - cropImgTop;
        });

        window.addEventListener('touchmove', (e) => {
            if (!cropDragActive) return;
            const touch = e.touches[0];
            cropImgLeft = touch.clientX - cropStartX;
            cropImgTop = touch.clientY - cropStartY;
            
            const boxSize = 260;
            const scaledWidth = originalImageEl ? (originalImageEl.width * cropCurrentScale) : boxSize;
            const scaledHeight = originalImageEl ? (originalImageEl.height * cropCurrentScale) : boxSize;
            cropImgLeft = Math.min(boxSize / 2, Math.max(boxSize / 2 - scaledWidth, cropImgLeft));
            cropImgTop = Math.min(boxSize / 2, Math.max(boxSize / 2 - scaledHeight, cropImgTop));
            
            updateCropperImageTransform();
        });

        window.addEventListener('touchend', () => {
            cropDragActive = false;
        });

        // Zoom Slider Events
        cropZoomSlider.addEventListener('input', () => {
            const oldScale = cropCurrentScale;
            cropCurrentScale = parseFloat(cropZoomSlider.value);
            
            const boxSize = 260;
            const centerX = boxSize / 2;
            const centerY = boxSize / 2;
            
            const relX = centerX - cropImgLeft;
            const relY = centerY - cropImgTop;
            
            cropImgLeft = centerX - (relX / oldScale) * cropCurrentScale;
            cropImgTop = centerY - (relY / oldScale) * cropCurrentScale;
            
            updateCropperImageTransform();
        });
    }

    window.closeCropper = () => {
        if (cropperModal) {
            cropperModal.style.opacity = '0';
            cropperModal.style.pointerEvents = 'none';
            cropperModal.style.visibility = 'hidden';
        }
        const fileInput = document.getElementById('edit-profile-photo-upload');
        if (fileInput) fileInput.value = '';
    };

    window.saveCroppedPhoto = () => {
        if (!originalImageEl) return;
        
        const canvas = document.createElement('canvas');
        const canvasSize = 250;
        const cropBoxSize = 260;
        canvas.width = canvasSize;
        canvas.height = canvasSize;
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvasSize, canvasSize);
        
        const ratio = canvasSize / cropBoxSize;
        
        const targetLeft = cropImgLeft * ratio;
        const targetTop = cropImgTop * ratio;
        const targetWidth = originalImageEl.width * cropCurrentScale * ratio;
        const targetHeight = originalImageEl.height * cropCurrentScale * ratio;
        
        ctx.drawImage(originalImageEl, targetLeft, targetTop, targetWidth, targetHeight);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        window.tempProfilePhotoBase64 = dataUrl;
        
        const previewEl = document.getElementById('edit-profile-photo-preview');
        if (previewEl) {
            previewEl.innerHTML = `<img src="${dataUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        }
        
        window.closeCropper();
    };

    window.handleProfilePhotoUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                originalImageEl = img;
                
                const boxSize = 260;
                const scaleX = boxSize / img.width;
                const scaleY = boxSize / img.height;
                cropBaseScale = Math.max(scaleX, scaleY);
                
                cropperImage.style.width = img.width + 'px';
                cropperImage.style.height = img.height + 'px';
                
                cropImgLeft = (boxSize - img.width * cropBaseScale) / 2;
                cropImgTop = (boxSize - img.height * cropBaseScale) / 2;
                cropCurrentScale = cropBaseScale;
                
                cropZoomSlider.min = cropBaseScale;
                cropZoomSlider.max = cropBaseScale * 4;
                cropZoomSlider.step = 0.001;
                cropZoomSlider.value = cropBaseScale;
                
                cropperImage.src = img.src;
                updateCropperImageTransform();
                
                if (cropperModal) {
                    cropperModal.style.opacity = '1';
                    cropperModal.style.pointerEvents = 'auto';
                    cropperModal.style.visibility = 'visible';
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
        
        const menu = document.getElementById('edit-photo-options-menu');
        if (menu) menu.classList.add('hidden');
        const removeBtn = document.getElementById('edit-remove-photo-btn');
        if (removeBtn) removeBtn.style.display = 'block';
    };

    window.handleDirectPhotoUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const currentUser = sessionStorage.getItem('bekantans_user');
        if (!currentUser || !window.userProfiles || !window.userProfiles[currentUser]) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 250;
                const MAX_HEIGHT = 250;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                } else {
                    if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                window.userProfiles[currentUser].photo = dataUrl;
                saveState();
                showView('profile'); // Re-render to show immediately
                window.refreshAllAvatars();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
        
        // Hide menu after selecting
        const menu = document.getElementById('photo-options-menu');
        if (menu) menu.classList.add('hidden');
    };

    window.togglePhotoMenu = (event) => {
        if (event) event.stopPropagation();
        const menu = document.getElementById('photo-options-menu');
        if (menu) menu.classList.toggle('hidden');
    };

    window.removeProfilePhoto = () => {
        const currentUser = sessionStorage.getItem('bekantans_user');
        if (!currentUser || !window.userProfiles || !window.userProfiles[currentUser]) return;
        
        // Reset photo to username initial
        window.userProfiles[currentUser].photo = currentUser.charAt(0).toUpperCase();
        saveState();
        showView('profile');
        window.refreshAllAvatars();
        
        const menu = document.getElementById('photo-options-menu');
        if (menu) menu.classList.add('hidden');
    };

    document.addEventListener('click', (e) => {
        const menu = document.getElementById('photo-options-menu');
        if (menu && !menu.classList.contains('hidden')) {
            const wrapper = document.querySelector('.profile-avatar-wrapper');
            if (wrapper && !wrapper.contains(e.target)) {
                menu.classList.add('hidden');
            }
        }
        
        const editMenu = document.getElementById('edit-photo-options-menu');
        if (editMenu && !editMenu.classList.contains('hidden')) {
            const editWrapper = document.getElementById('edit-profile-photo-preview')?.parentElement;
            if (editWrapper && !editWrapper.contains(e.target)) {
                editMenu.classList.add('hidden');
            }
        }
    });

    window.toggleEditPhotoMenu = (event) => {
        if (event) event.stopPropagation();
        const menu = document.getElementById('edit-photo-options-menu');
        if (menu) menu.classList.toggle('hidden');
    };

    window.removeEditProfilePhoto = () => {
        const currentUser = sessionStorage.getItem('bekantans_user');
        if (!currentUser) return;
        
        // Use initial letter
        const initial = currentUser.charAt(0).toUpperCase();
        window.tempProfilePhotoBase64 = initial;
        
        const previewEl = document.getElementById('edit-profile-photo-preview');
        if (previewEl) {
            previewEl.innerHTML = initial;
        }
        
        const removeBtn = document.getElementById('edit-remove-photo-btn');
        if (removeBtn) removeBtn.style.display = 'none';
        
        const menu = document.getElementById('edit-photo-options-menu');
        if (menu) menu.classList.add('hidden');
    };

    window.refreshAllAvatars = () => {
        if (typeof updateNavAvatar === 'function') updateNavAvatar();
        if (typeof renderPeople === 'function') renderPeople();
        if (typeof renderItems === 'function') renderItems();
        if (typeof renderCashFund === 'function') renderCashFund();
        if (typeof renderHomeDashboard === 'function') renderHomeDashboard();
        if (typeof renderTravelJournal === 'function') renderTravelJournal();
        
        // Also update destination details view if it's currently open
        const travelDetailsView = document.getElementById('travel-details-view');
        if (travelDetailsView && !travelDetailsView.classList.contains('hidden') && window.currentAlbumDestId) {
            // Fake an event or check if we can safely re-trigger view
            const dummyEvent = { target: { closest: () => null } };
            window.viewDestination(dummyEvent, window.currentAlbumDestId);
        }
    };

    window.openProfileEdit = () => {
        const currentUser = sessionStorage.getItem('bekantans_user');
        if (!currentUser || !window.userProfiles || !window.userProfiles[currentUser]) return;
        const profile = window.userProfiles[currentUser];

        window.tempProfilePhotoBase64 = profile.photo || '';
        const previewEl = document.getElementById('edit-profile-photo-preview');
        if (previewEl) {
            const hasPhoto = profile.photo && profile.photo.length > 3;
            if (hasPhoto) {
                previewEl.innerHTML = `<img src="${profile.photo}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
            } else {
                previewEl.innerHTML = profile.photo || profile.username.charAt(0).toUpperCase();
            }
            
            const removeBtn = document.getElementById('edit-remove-photo-btn');
            if (removeBtn) {
                removeBtn.style.display = hasPhoto ? 'block' : 'none';
            }
        }
        document.getElementById('edit-profile-username').value = profile.username;
        document.getElementById('edit-profile-password').value = ''; // Don't show password
        document.getElementById('edit-profile-confirm-password').value = ''; // Reset confirm password

        // Border Theme Setup
        window.tempProfileBorder = profile.borderTheme || 'none';
        const borderSelector = document.getElementById('border-theme-selector');
        if (borderSelector) {
            const themes = [
                { id: 'none', label: 'None' },
                { id: 'cat_white', label: 'White Cat' },
                { id: 'frog', label: 'Green Frog' },
                { id: 'angel_pink', label: 'Pink Angel' },
                { id: 'fox', label: 'Orange Fox' },
                { id: 'angel_blue', label: 'Blue Angel' },
                { id: 'witch', label: 'Witch' },
                { id: 'cat_dark', label: 'Dark Cat' },
                { id: 'angel_royal', label: 'Royal Angel' }
            ];
            
            let html = '';
            themes.forEach(theme => {
                const isActive = window.tempProfileBorder === theme.id ? 'active' : '';
                html += `
                    <div class="border-theme-btn-wrapper" onclick="window.selectBorderTheme('${theme.id}')">
                        <div class="border-theme-btn avatar-theme-${theme.id} ${isActive}" id="border-btn-${theme.id}"></div>
                        <div class="border-theme-label">${theme.label}</div>
                    </div>
                `;
            });
            borderSelector.innerHTML = html;
        }

        document.getElementById('profile-modal-overlay').classList.remove('hidden');
    };

    window.selectBorderTheme = (themeId) => {
        window.tempProfileBorder = themeId;
        const buttons = document.querySelectorAll('.border-theme-btn');
        buttons.forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.getElementById(`border-btn-${themeId}`);
        if (activeBtn) activeBtn.classList.add('active');
        
        // Preview on the edit modal avatar
        const previewEl = document.getElementById('edit-profile-photo-preview');
        if (previewEl) {
            // Remove previous theme classes
            previewEl.className = 'profile-avatar large-avatar';
            previewEl.classList.add(`avatar-theme-${themeId}`);
        }
    };

    window.saveProfileEdit = () => {
        const currentUser = sessionStorage.getItem('bekantans_user');
        if (!currentUser || !window.userProfiles || !window.userProfiles[currentUser]) return;

        const photo = window.tempProfilePhotoBase64;
        const newUsername = document.getElementById('edit-profile-username').value.trim();
        const newPass = document.getElementById('edit-profile-password').value;
        const confirmPass = document.getElementById('edit-profile-confirm-password').value;

        if (!newUsername) {
            alert('Username cannot be empty.');
            return;
        }

        if (newPass && newPass !== confirmPass) {
            alert('New passwords do not match! Please confirm your new password correctly.');
            return;
        }

        const profile = window.userProfiles[currentUser];

        // If username changes, we need to create a new key and delete the old
        if (newUsername.toLowerCase() !== currentUser.toLowerCase()) {
            // Check if username already taken by someone else
            if (window.userProfiles[newUsername]) {
                alert('Username already exists!');
                return;
            }
            window.userProfiles[newUsername] = { ...profile, username: newUsername };
            delete window.userProfiles[currentUser];
            sessionStorage.setItem('bekantans_user', newUsername);
            
            const personObj = window.people.find(p => p.name === currentUser);
            if (personObj) {
                personObj.name = newUsername;
            }
        } else {
            // Re-assign in case capitalization changed
            window.userProfiles[newUsername] = profile;
        }

        const updatedProfile = window.userProfiles[newUsername];
        updatedProfile.photo = photo || newUsername.charAt(0).toUpperCase();
        updatedProfile.borderTheme = window.tempProfileBorder || 'none';
        
        if (newPass) {
            updatedProfile.password = newPass;
        }

        document.getElementById('profile-modal-overlay').classList.add('hidden');
        saveState();
        showView('profile'); // Re-render profile view
        window.refreshAllAvatars();
    };

});
