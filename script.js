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

    window.items = [
        { id: 1, name: 'Indomie Banglades Biasa N Puding Telor', price: 33000, assignees: [] },
        { id: 2, name: 'Indomie Banglades Biasa', price: 18000, assignees: [] },
        { id: 3, name: 'Mie Aceh Udang', price: 35000, assignees: [] }
    ];
    
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
    window.people = [];
    window.items = [];
    window.cashData = {};
    window.travelData = [];

    function saveState() {
        db.ref('bekantans_data').set({
            people: window.people,
            items: window.items,
            cashData: window.cashData,
            travelData: window.travelData
        });
    }

    // --- Selectors ---
    const landingView = document.getElementById('landing-view');
    const mainView = document.getElementById('main-view');
    const cashView = document.getElementById('cash-fund-view');
    const travelView = document.getElementById('travel-view');
    const travelDetailsView = document.getElementById('travel-details-view');
    const splitResultsView = document.getElementById('split-results-view');
    const fullResultsGrid = document.getElementById('full-results-grid');
    const navSplit = document.getElementById('nav-split');
    const navCash = document.getElementById('nav-cash');
    const navTravel = document.getElementById('nav-travel');
    const navLogo = document.getElementById('nav-logo');

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

    const fileInput = document.getElementById('bill-image');
    const coinContainer = document.getElementById('coin-container');

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

    // --- Navigation ---
    window.showView = function(viewName) {
        [landingView, mainView, cashView, travelView, travelDetailsView, splitResultsView].forEach(v => v?.classList.add('hidden'));
        [navSplit, navCash, navTravel].forEach(n => n?.classList.remove('active'));
        document.body.classList.remove('cash-fund-active');
        document.body.classList.remove('travel-journal-active');

        if (viewName === 'split') {
            mainView.classList.remove('hidden');
            navSplit.classList.add('active');
            renderPeople();
            renderItems();
        } else if (viewName === 'cash') {
            cashView.classList.remove('hidden');
            navCash.classList.add('active');
            document.body.classList.add('cash-fund-active');
            renderCashFund();
        } else if (viewName === 'travel') {
            travelView.classList.remove('hidden');
            navTravel.classList.add('active');
            document.body.classList.add('travel-journal-active');
            renderTravelJournal();
        } else if (viewName === 'landing') {
            landingView.classList.remove('hidden');
            navSplit.classList.add('active');
        } else if (viewName === 'split-results') {
            splitResultsView.classList.remove('hidden');
            navSplit.classList.add('active');
        }
    }

    // Add CSS for travel journal background if not exists
    if (!document.getElementById('travel-bg-style')) {
    window.customConfirm = function(message, onConfirm) {
        modalTitle.textContent = 'Confirmation';
        modalContent.innerHTML = `<p style="padding: 1.5rem 0; font-size: 1.1rem; line-height: 1.6; opacity: 0.9; text-align: center;">${message}</p>`;
        const saveBtn = document.getElementById('modal-save');
        saveBtn.textContent = 'Confirm';
        saveBtn.style.background = '#ff4757';
        
        currentModalAction = 'confirm';
        window.confirmCallback = onConfirm;
        modalOverlay.classList.remove('hidden');
    };

    window.closeModal = () => {
        modalOverlay.classList.add('hidden');
        const saveBtn = document.getElementById('modal-save');
        saveBtn.textContent = 'Save';
        saveBtn.style.background = '';
    };

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

    // Scroll Handler for Navbar
    const navbar = document.querySelector('.navbar');
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

    navLogo.onclick = () => showView('landing');
    navSplit.onclick = (e) => { e.preventDefault(); showView('landing'); };
    navCash.onclick = (e) => { e.preventDefault(); showView('cash'); };
    navTravel.onclick = (e) => { e.preventDefault(); showView('travel'); };

    // --- Core Functions ---
    window.renderPeople = function() {
        if (!avatarsContainer) return;
        avatarsContainer.innerHTML = '';
        const header = document.getElementById('participant-header');
        if (header) header.textContent = `Participant (${window.people.length})`;

        window.people.forEach(person => {
            const avatar = document.createElement('div');
            avatar.className = 'participant-avatar';
            avatar.dataset.name = person.name;
            avatar.style.background = person.color || avatarColors[0];
            avatar.innerHTML = `
                <span class="avatar-initial">${person.name.charAt(0).toUpperCase()}</span>
                <button type="button" class="delete-avatar" data-id="${person.id}">×</button>
            `;
            avatarsContainer.appendChild(avatar);
        });

        const addBtn = document.createElement('button');
        addBtn.className = 'add-avatar-btn';
        addBtn.textContent = '+';
        addBtn.onclick = () => window.addPerson();
        avatarsContainer.appendChild(addBtn);
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
        modalTitle.textContent = 'Add Destination';
        modalContent.innerHTML = `
            <div class="input-group">
                <label>Destination Name</label>
                <input type="text" id="m-dest-name" placeholder="e.g. Nusa Penida" autofocus>
            </div>
            <div class="input-group">
                <label>Location</label>
                <input type="text" id="m-dest-location" placeholder="e.g. Bali, Indonesia">
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="input-group">
                    <label>Duration</label>
                    <input type="text" id="m-dest-duration" placeholder="e.g. 0 Days (Default)">
                </div>
                <div class="input-group">
                    <label>Date</label>
                    <input type="date" id="m-dest-date">
                </div>
            </div>
            <div class="input-group">
                <label>Total Cost (Rp)</label>
                <input type="number" id="m-dest-cost" placeholder="e.g. 1500000">
            </div>
            <div class="input-group">
                <label>Add Photos</label>
                <div class="image-upload-wrapper" id="image-upload-wrapper" onclick="document.getElementById('m-dest-image-file').click()">
                    <div class="upload-placeholder" id="upload-placeholder">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 8px; color: var(--accent-primary);"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        <span>Click to upload image</span>
                    </div>
                    <img id="image-preview" class="hidden" src="" alt="Preview">
                    <input type="file" id="m-dest-image-file" accept="image/*" hidden onchange="window.previewImage(event)">
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
        
        modalTitle.textContent = 'Edit Destination';
        modalContent.innerHTML = `
            <div class="input-group">
                <label>Destination Name</label>
                <input type="text" id="m-dest-name" value="${dest.name}" autofocus>
            </div>
            <div class="input-group">
                <label>Location</label>
                <input type="text" id="m-dest-location" value="${dest.location}">
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="input-group">
                    <label>Duration</label>
                    <input type="text" id="m-dest-duration" value="${dest.duration}">
                </div>
                <div class="input-group">
                    <label>Date</label>
                    <input type="date" id="m-dest-date" value="${dest.date}">
                </div>
            </div>
            <div class="input-group">
                <label>Total Cost (Rp)</label>
                <input type="number" id="m-dest-cost" value="${dest.cost}">
            </div>
            <div class="input-group">
                <label>Update Photo</label>
                <div class="image-upload-wrapper" id="image-upload-wrapper" onclick="document.getElementById('m-dest-image-file').click()">
                    <div class="upload-placeholder hidden" id="upload-placeholder">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 8px; color: var(--accent-primary);"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        <span>Click to update image</span>
                    </div>
                    <img id="image-preview" src="${dest.image}" alt="Preview">
                    <input type="file" id="m-dest-image-file" accept="image/*" hidden onchange="window.previewImage(event)">
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
                            <span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> ${dest.location}</span>
                            <span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> ${dest.duration}</span>
                            <span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> ${dest.date}</span>
                        </div>
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
        
        const tabs = detailsView.querySelectorAll('.details-tab');
        const views = detailsView.querySelectorAll('.details-body > div');
        
        tabs.forEach((tab, index) => {
            tab.onclick = () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                views.forEach(v => v.classList.add('hidden'));
                views[index].classList.remove('hidden');
            };
        });
        
        document.querySelectorAll('main > section').forEach(sec => sec.classList.add('hidden'));
        detailsView.classList.remove('hidden');
        renderItinerary(dest);
        renderAlbum(dest);
    };

    window.selectedPhotos = new Set();

    window.renderAlbum = function(dest) {
        const albumView = document.querySelector('.album-view');
        if (!albumView) return;

        const photos = dest.album || [];
        const isAnySelected = window.selectedPhotos.size > 0;
        
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
                
                ${isAnySelected ? `
                    <div class="selection-toolbar">
                        <div class="selection-info">
                            <div class="selection-count-pill">${window.selectedPhotos.size}</div>
                            <div class="selection-text">Selected</div>
                        </div>
                        <div class="toolbar-actions">
                            <button class="btn-toolbar btn-toolbar-download" onclick="window.bulkDownload(${dest.id})">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                Download
                            </button>
                            <button class="btn-toolbar btn-toolbar-delete" onclick="window.bulkDelete(${dest.id})">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                Delete
                            </button>
                            <button class="btn-toolbar btn-toolbar-cancel" onclick="window.clearSelection(${dest.id})">Cancel</button>
                        </div>
                    </div>
                ` : ''}

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
            html += '<div class="album-grid">';
            photos.forEach((photo, index) => {
                const isSelected = window.selectedPhotos.has(index);
                html += `
                    <div class="album-item ${isSelected ? 'selected' : ''}" onclick="window.toggleSelection(${dest.id}, ${index})">
                        <div class="photo-checkbox"></div>
                        <img src="${photo}" alt="Trip Photo">
                        <div class="photo-overlay">
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

    window.toggleSelection = (destId, index) => {
        if (window.selectedPhotos.has(index)) {
            window.selectedPhotos.delete(index);
        } else {
            window.selectedPhotos.add(index);
        }
        const dest = window.travelData.find(d => d.id === destId);
        renderAlbum(dest);
    };

    window.clearSelection = (destId) => {
        window.selectedPhotos.clear();
        const dest = window.travelData.find(d => d.id === destId);
        renderAlbum(dest);
    };

    window.bulkDelete = (destId) => {
        if (!confirm(`Delete ${window.selectedPhotos.size} selected photos?`)) return;
        const dest = window.travelData.find(d => d.id === destId);
        if (dest && dest.album) {
            // Filter out selected indices
            const newAlbum = dest.album.filter((_, index) => !window.selectedPhotos.has(index));
            dest.album = newAlbum;
            window.selectedPhotos.clear();
            saveState();
            renderAlbum(dest);
        }
    };

    window.bulkDownload = (destId) => {
        const dest = window.travelData.find(d => d.id === destId);
        if (dest && dest.album) {
            window.selectedPhotos.forEach(index => {
                window.downloadPhoto(dest.album[index], `trip-photo-${index}.png`);
            });
        }
    };

    window.handleAlbumUpload = (event, destId) => {
        const dest = window.travelData.find(d => d.id === destId);
        if (!dest) return;
        
        const files = event.target.files;
        if (!files.length) return;

        if (!dest.album) dest.album = [];

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                dest.album.push(e.target.result);
                saveState();
                renderAlbum(dest);
            };
            reader.readAsDataURL(file);
        });
    };

    window.deletePhoto = (destId, photoIndex) => {
        if (!confirm('Delete this photo from the album?')) return;
        const dest = window.travelData.find(d => d.id === destId);
        if (dest && dest.album) {
            dest.album.splice(photoIndex, 1);
            saveState();
            renderAlbum(dest);
        }
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
                        const isActive = item.assignees.includes(person.id);
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
            if (item.assignees.length > 0) {
                const sharePrice = item.price / item.assignees.length; 
                item.assignees.forEach(pId => {
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

                const card = document.createElement('div');
                card.className = 'receipt-card glass-card';
                card.innerHTML = `
                    <div class="receipt-header">
                        <div class="receipt-avatar" style="background: ${person.color}">${person.name.charAt(0).toUpperCase()}</div>
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
        if (targetInfo) {
            targetInfo.innerHTML = `
                ${formatRupiah(currentTarget)}
                <div class="edit-icon" title="Change Target">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                </div>
            `;
            targetInfo.style.cursor = 'pointer';
            targetInfo.onclick = () => window.changeTarget(monthKey);
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
            
            card.innerHTML = `
                <div class="cash-person-info">
                    <div class="cash-avatar" style="background: ${person.color || avatarColors[0]}">${initial}</div>
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
        console.log('renderTravelJournal called');
        const destGrid = document.getElementById('destination-grid');
        const travelTotalDisplay = document.getElementById('total-travel-cost');
        if (!destGrid) {
            console.error('destination-grid not found');
            return;
        }

        console.log('Rendering travel data:', window.travelData);
        destGrid.innerHTML = '';
        let totalCost = 0;

        window.travelData.forEach(dest => {
            totalCost += dest.cost;
            const card = document.createElement('div');
            card.className = 'destination-card glass-card';
            card.setAttribute('onclick', `window.viewDestination(event, ${dest.id})`);
            card.innerHTML = `
                <div class="dest-image" style="background-image: url('${dest.image}')">
                    <div class="dest-date">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        ${dest.date}
                    </div>
                    <div class="dest-actions">
                        <button class="action-btn-icon edit edit-dest-btn" data-id="${dest.id}">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                        </button>
                        <button class="action-btn-icon delete delete-dest-btn" data-id="${dest.id}">×</button>
                    </div>
                </div>
                <div class="dest-info">
                    <div>
                        <div class="dest-meta-row">
                            <div class="dest-location">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                ${dest.location}
                            </div>
                            <div class="dest-duration">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                ${dest.duration}
                            </div>
                        </div>
                        <h3 class="dest-name">${dest.name}</h3>
                    </div>
                    <div class="dest-footer">
                        <div class="dest-cost-box">
                            <span class="dest-cost-label">Total Cost</span>
                            <div class="dest-cost-value">${formatRupiah(dest.cost)}</div>
                        </div>
                    </div>
                </div>
            `;
            destGrid.appendChild(card);
        });

        if (travelTotalDisplay) travelTotalDisplay.textContent = formatRupiah(totalCost);
        
        // Count destinations
        const totalDestDisplay = document.getElementById('total-destinations-count');
        if (totalDestDisplay) {
            totalDestDisplay.textContent = window.travelData.length || 0;
        }
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
            const fileInput = document.getElementById('m-dest-image-file');

            const saveDest = (imgUrl) => {
                if (name) {
                    window.travelData.push({ 
                        id: Date.now(), 
                        name: name, 
                        location: location || 'Unknown Location', 
                        duration: duration, 
                        cost: cost, 
                        date: date, 
                        image: imgUrl 
                    });
                    saveState();
                }
                modalOverlay.classList.add('hidden');
                renderPeople();
                renderItems();
                renderCashFund();
                renderTravelJournal();
            };

            if (fileInput && fileInput.files && fileInput.files[0]) {
                const reader = new FileReader();
                reader.onload = (e) => saveDest(e.target.result);
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
            const fileInput = document.getElementById('m-dest-image-file');

            const saveDest = (imgUrl) => {
                if (name) {
                    window.travelData[destIndex] = {
                        ...window.travelData[destIndex],
                        name: name, location: location || 'Unknown Location', duration: duration, cost: cost, date: date, image: imgUrl
                    };
                    saveState();
                }
                modalOverlay.classList.add('hidden');
                renderTravelJournal();
            };

            if (fileInput && fileInput.files && fileInput.files[0]) {
                const reader = new FileReader();
                reader.onload = (e) => saveDest(e.target.result);
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

    // Delegation for dynamic elements
    document.addEventListener('click', (e) => {
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
            const idx = item.assignees.indexOf(pId);
            if (idx > -1) item.assignees.splice(idx, 1);
            else item.assignees.push(pId);
            renderItems();
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
    db.ref('bekantans_data').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            window.people = data.people || [];
            window.items = data.items || [];
            window.cashData = data.cashData || {};
            window.travelData = data.travelData || [];
            
            // Re-render everything when data changes
            renderPeople();
            renderItems();
            renderCashFund();
            renderTravelJournal();
        }
    });

    showView('landing');
});
