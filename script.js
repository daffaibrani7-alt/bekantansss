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
    
    // Load from localStorage or use defaults
    const savedPeople = localStorage.getItem('bekantans_people');
    window.people = savedPeople ? JSON.parse(savedPeople) : [...DEFAULT_PEOPLE];

    const savedCashData = localStorage.getItem('bekantans_cash_data');
    window.cashData = savedCashData ? JSON.parse(savedCashData) : {};

    window.travelData = [
        { id: 1, name: 'Nusa Penida', location: 'Bali, Indonesia', duration: '3 Days', cost: 1500000, date: '2024-05-10', image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4' },
        { id: 2, name: 'Borobudur Temple', location: 'Yogyakarta, Indonesia', duration: '2 Days', cost: 750000, date: '2024-05-20', image: 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272' },
        { id: 3, name: 'Raja Ampat', location: 'West Papua, Indonesia', duration: '5 Days', cost: 3500000, date: '2024-06-15', image: 'https://images.unsplash.com/photo-1516690561799-46d8f74f9abf' }
    ];

    function saveState() {
        localStorage.setItem('bekantans_people', JSON.stringify(window.people));
        localStorage.setItem('bekantans_cash_data', JSON.stringify(window.cashData));
        localStorage.setItem('bekantans_travel_data', JSON.stringify(window.travelData));
    }

    // --- Selectors ---
    const landingView = document.getElementById('landing-view');
    const mainView = document.getElementById('main-view');
    const cashView = document.getElementById('cash-fund-view');
    const travelView = document.getElementById('travel-view');
    const travelDetailsView = document.getElementById('travel-details-view');
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
    function showView(viewName) {
        [landingView, mainView, cashView, travelView, travelDetailsView].forEach(v => v?.classList.add('hidden'));
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
        }
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
                    <input type="text" id="m-dest-duration" placeholder="e.g. 3 Days">
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
            <div class="details-hero" style="background-image: url('${dest.image}')">
                <div class="details-hero-overlay"></div>
                <button class="back-btn" onclick="window.showView('travel')">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    Back to Journal
                </button>
                <div class="details-hero-content">
                    <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 2rem;">
                        <div>
                            <h1>${dest.name}</h1>
                            <div class="details-meta">
                                <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> ${dest.location}</span>
                                <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> ${dest.duration}</span>
                                <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> ${dest.date}</span>
                            </div>
                        </div>
                        <div class="details-expense-badge">
                            <div class="badge-icon">
                                <span style="font-weight: 900; font-size: 1.1rem; letter-spacing: -0.5px;">Rp</span>
                            </div>
                            <div class="badge-text">
                                <span class="badge-label">Total Expense</span>
                                <span class="badge-amount">${formatRupiah(dest.cost)}</span>
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
                    <div class="empty-state">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        <h3>No Itinerary Yet</h3>
                        <p>Plan your daily activities and schedules here.</p>
                        <button class="action-btn-pill" style="margin-top: 1rem;">+ Add Activity</button>
                    </div>
                </div>
                <div class="album-view hidden">
                    <div class="empty-state">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                        <h3>Album is Empty</h3>
                        <p>Upload memories and photos from your trip to ${dest.name}.</p>
                        <button class="action-btn-pill" style="margin-top: 1rem;">+ Upload Photos</button>
                    </div>
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
    };

    window.removePerson = function(id) {
        window.people = window.people.filter(p => p.id !== Number(id));
        window.items.forEach(item => {
            item.assignees = item.assignees.filter(pId => pId !== Number(id));
        });
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

    window.calculate = function() {
        const personDetails = {};
        window.people.forEach(p => personDetails[p.id] = { total: 0, items: [] });

        window.items.forEach(item => {
            if (item.assignees.length > 0) {
                const sharePrice = item.price; 
                item.assignees.forEach(pId => {
                    if (personDetails[pId]) {
                        personDetails[pId].total += sharePrice;
                        personDetails[pId].items.push({ name: item.name, price: sharePrice });
                    }
                });
            }
        });

        if (individualResults) {
            individualResults.innerHTML = '';
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
                individualResults.appendChild(card);
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

        cashList.innerHTML = '';
        let totalCollected = 0;

        console.log('Rendering Cash Fund for', monthKey, 'with', window.people.length, 'people');

        window.people.forEach(person => {
            if (!person || !person.name) return;
            
            const isPaid = window.cashData[monthKey][person.id] || false;
            if (isPaid) totalCollected += CASH_TARGET;

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
            const duration = document.getElementById('m-dest-duration').value.trim() || '1 Day';
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
        }
        modalOverlay.classList.add('hidden');
        renderPeople();
        renderItems();
        renderCashFund();
        renderTravelJournal();
    };

    modalCancel.onclick = () => modalOverlay.classList.add('hidden');

    document.getElementById('prev-month').onclick = () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCashFund(); };
    document.getElementById('next-month').onclick = () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCashFund(); };

    // Delegation for dynamic elements
    document.addEventListener('click', (e) => {
        if (e.target.closest('.delete-dest-btn')) {
            const id = Number(e.target.closest('.delete-dest-btn').dataset.id);
            window.travelData = window.travelData.filter(d => d.id !== id);
            saveState();
            renderTravelJournal();
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

    // --- Init ---
    renderPeople();
    renderItems();
    renderCashFund();
    showView('landing');
});
