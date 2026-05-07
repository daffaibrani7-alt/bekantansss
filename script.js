document.addEventListener('DOMContentLoaded', () => {
    // State
    window.items = [
        { id: 1, name: 'Indomie Banglades Biasa N Puding Telor', price: 33000, assignees: [] },
        { id: 2, name: 'Indomie Banglades Biasa', price: 18000, assignees: [] },
        { id: 3, name: 'Mie Aceh Udang', price: 35000, assignees: [] }
    ];
    window.people = [];

    // Selectors
    const landingView = document.getElementById('landing-view');
    const mainView = document.getElementById('main-view');
    const statusMsg = document.getElementById('ocr-status');
    const statusText = document.getElementById('status-text');
    const fileInput = document.getElementById('bill-image');
    console.log('Selectors initialized:', { landingView, mainView, statusMsg, fileInput });
    
    const itemsList = document.getElementById('items-list');
    const peopleList = document.getElementById('people-list');
    const avatarsContainer = document.getElementById('people-avatars');
    const individualResults = document.getElementById('individual-results');
    const grandTotalDisplay = document.getElementById('grand-total');
    const taxInput = document.getElementById('tax');
    const serviceInput = document.getElementById('service');
    const coinContainer = document.getElementById('coin-container');
    
    const addItemBtn = document.getElementById('add-item-btn');
    const addPersonBtn = document.getElementById('add-person-btn');
    const directAddBtn = document.getElementById('direct-add-person');
    const directInput = document.getElementById('direct-person-input');
    
    const directItemBtn = document.getElementById('direct-add-item');
    const directItemName = document.getElementById('direct-item-name');
    const directItemPrice = document.getElementById('direct-item-price');

    const calculateBtn = document.getElementById('calculate-btn');
    
    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    const modalCancel = document.getElementById('modal-cancel');
    const modalSave = document.getElementById('modal-save');
    
    // Navigation
    const navSplit = document.getElementById('nav-split');
    const navCash = document.getElementById('nav-cash');
    const navTravel = document.getElementById('nav-travel');
    const cashView = document.getElementById('cash-fund-view');
    const travelView = document.getElementById('travel-view');
    const destGrid = document.getElementById('destination-grid');
    const travelTotalDisplay = document.getElementById('total-travel-cost');
    const monthDisplay = document.getElementById('current-month-display');
    const cashList = document.getElementById('cash-people-list');
    const totalCollectedDisplay = document.getElementById('total-cash-collected');

    // Cash Fund State
    let currentDate = new Date();
    window.cashData = {}; // Format: { "2024-04": { personId: true/false } }
    const CASH_TARGET = 100000;

    // Travel Data
    window.travelData = [
        { id: 1, name: 'Bali - Nusa Penida', cost: 1500000, date: '2024-05-10', image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4' },
        { id: 2, name: 'Yogyakarta - Borobudur', cost: 750000, date: '2024-05-20', image: 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272' }
    ];

    // --- Navigation Logic ---
    function showView(viewName) {
        // Hide all
        landingView.classList.add('hidden');
        mainView.classList.add('hidden');
        cashView.classList.add('hidden');
        travelView.classList.add('hidden');
        
        // Remove active classes
        navSplit.classList.remove('active');
        navCash.classList.remove('active');
        navTravel.classList.remove('active');
        document.body.classList.remove('cash-fund-active');

        if (viewName === 'split') {
            mainView.classList.remove('hidden');
            navSplit.classList.add('active');
        } else if (viewName === 'cash') {
            cashView.classList.remove('hidden');
            navCash.classList.add('active');
            document.body.classList.add('cash-fund-active');
            renderCashFund();
        } else if (viewName === 'travel') {
            travelView.classList.remove('hidden');
            navTravel.classList.add('active');
            renderTravelJournal();
        } else if (viewName === 'landing') {
            landingView.classList.remove('hidden');
            navSplit.classList.add('active'); // Keep Split Bill as the main context
        }
    }

    const navLogo = document.getElementById('nav-logo');
    if (navLogo) {
        navLogo.onclick = () => showView('landing');
    }

    if (navSplit) {
        navSplit.onclick = (e) => {
            e.preventDefault();
            showView('landing');
        };
    }

    if (navCash) {
        navCash.onclick = (e) => {
            e.preventDefault();
            showView('cash');
        };
    }

    if (navTravel) {
        navTravel.onclick = (e) => {
            e.preventDefault();
            showView('travel');
        };
    }
    function formatRupiah(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    }

    window.renderPeople = function() {
        if (!avatarsContainer) return;

        avatarsContainer.innerHTML = '';
        const header = document.getElementById('participant-header');
        if (header) {
            header.textContent = `Participant (${window.people.length})`;
        }
        window.people.forEach(person => {
            const initial = person.name.charAt(0).toUpperCase();
            
            const avatar = document.createElement('div');
            avatar.className = 'participant-avatar';
            avatar.style.background = person.color || avatarColors[0];
            avatar.setAttribute('data-name', person.name);
            avatar.innerHTML = `
                <span class="avatar-initial">${initial}</span>
                <button type="button" class="delete-avatar" data-id="${person.id}">×</button>
            `;
            
            avatarsContainer.appendChild(avatar);
        });

        // Add the "+" button
        const addBtn = document.createElement('button');
        addBtn.className = 'add-avatar-btn';
        addBtn.textContent = '+';
        addBtn.onclick = (e) => {
            e.preventDefault();
            window.addPerson();
        };
        avatarsContainer.appendChild(addBtn);
    }

    // Delegation for delete person
    if (avatarsContainer) {
        avatarsContainer.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.delete-avatar');
            if (deleteBtn) {
                e.preventDefault();
                e.stopPropagation();
                const personId = Number(deleteBtn.dataset.id);
                window.removePerson(personId);
            }
        });
    }

    // Delegation for item actions (Delete, Edit, Assign)
    if (itemsList) {
        itemsList.addEventListener('click', (e) => {
            // Delete Item
            const deleteBtn = e.target.closest('.delete-item-btn');
            if (deleteBtn) {
                e.preventDefault();
                const id = deleteBtn.dataset.id;
                window.deleteItem(id);
                return;
            }

            // Edit Item
            const editBtn = e.target.closest('.edit-item-btn');
            if (editBtn) {
                e.preventDefault();
                const id = editBtn.dataset.id;
                window.editItem(id);
                return;
            }

            // Toggle Assign
            const assignTag = e.target.closest('.assign-tag');
            if (assignTag) {
                e.preventDefault();
                const itemId = assignTag.dataset.itemId;
                const personId = assignTag.dataset.personId;
                window.toggleAssign(itemId, personId);
                return;
            }
        });
    }

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
                <div class="item-assign-tags" id="tags-${item.id}">
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
    }

    window.deleteItem = (id) => {
        try {
            const targetId = Number(id);
            console.log('Delete ID received:', id, 'Target ID:', targetId);
            
            window.items = window.items.filter(item => Number(item.id) !== targetId);
            console.log(`Deleted ID ${targetId}. Remaining: ${window.items.length}`);
            window.renderItems();
        } catch (err) {
            console.error('Delete error:', err);
            alert('Gagal menghapus item: ' + err.message);
        }
    };

    function showApp() {
        landingView.classList.add('hidden');
        mainView.classList.remove('hidden');
        document.body.style.overflow = 'auto';
        document.body.style.height = 'auto';
        window.renderPeople();
        window.renderItems();
    }

    window.startManual = () => {
        window.items = [];
        window.people = [];
        showApp();
        console.log('Started manual input mode');
    };

    window.toggleAssign = (itemId, personId) => {
        const tItemId = Number(itemId);
        const tPersonId = Number(personId);
        const item = window.items.find(i => i.id === tItemId);
        if (!item) return;
        const index = item.assignees.indexOf(tPersonId);
        if (index > -1) {
            item.assignees.splice(index, 1);
        } else {
            item.assignees.push(tPersonId);
        }
        renderItems();
    };

    window.removePerson = function(id) {
        const targetId = Number(id);
        console.log('removePerson called with ID:', targetId);
        window.people = window.people.filter(p => Number(p.id) !== targetId);
        window.items.forEach(item => {
            item.assignees = item.assignees.filter(pId => Number(pId) !== targetId);
        });
        window.renderPeople();
        window.renderItems();
    };

    window.calculate = function() {
        const personDetails = {};
        window.people.forEach(p => {
            personDetails[p.id] = { total: 0, items: [] };
        });

        window.items.forEach(item => {
            if (item.assignees.length > 0) {
                // Modified: Do not divide the price. Each assignee pays the full price of the item.
                const sharePrice = item.price;
                const shareCount = item.assignees.length;
                item.assignees.forEach(pId => {
                    if (personDetails[pId]) {
                        personDetails[pId].total += sharePrice;
                        personDetails[pId].items.push({
                            name: item.name,
                            price: sharePrice,
                            shareCount: shareCount
                        });
                    }
                });
            }
        });

        let totalBase = 0;
        Object.values(personDetails).forEach(d => totalBase += d.total);
        const grandTotal = totalBase;

        if (individualResults) {
            individualResults.innerHTML = '';
            window.people.forEach(person => {
                const details = personDetails[person.id];
                if (!details || details.total === 0) return;

                const initial = person.name.charAt(0).toUpperCase();
                const card = document.createElement('div');
                card.className = 'receipt-card glass-card';
                card.innerHTML = `
                    <div class="receipt-header">
                        <div class="receipt-avatar" style="background: ${person.color || 'var(--accent-primary)'}">${initial}</div>
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
                    <div class="receipt-divider"></div>
                    <div class="receipt-footer">
                        <span class="footer-text">Detail Pembayaran</span>
                        <svg class="footer-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </div>
                `;
                individualResults.appendChild(card);
            });
        }

        if (grandTotalDisplay) grandTotalDisplay.textContent = formatRupiah(grandTotal);
        
        const stickyTotalDisplay = document.getElementById('sticky-total');
        if (stickyTotalDisplay) {
            let sumOfAllItems = 0;
            window.items.forEach(item => sumOfAllItems += item.price);
            stickyTotalDisplay.textContent = formatRupiah(sumOfAllItems);
        }
    }

    window.editItem = (id) => {
        const targetId = Number(id);
        const item = window.items.find(i => i.id === targetId);
        modalTitle.textContent = 'Edit Item';
        modalContent.innerHTML = `
            <div class="input-group">
                <label>Item Name</label>
                <input type="text" id="m-item-name" value="${item.name}">
            </div>
            <div class="input-group">
                <label>Price (Rp)</label>
                <input type="number" id="m-item-price" value="${item.price}">
            </div>
        `;
        currentModalAction = `edit-${id}`;
        modalOverlay.classList.remove('hidden');
    };

    if (addItemBtn) {
        addItemBtn.onclick = () => {
            modalTitle.textContent = 'Add Item';
            modalContent.innerHTML = `
                <div class="input-group">
                    <label>Item Name</label>
                    <input type="text" id="m-item-name" placeholder="Example: Fried Noodles">
                </div>
                <div class="input-group">
                    <label>Price (Rp)</label>
                    <input type="number" id="m-item-price" placeholder="0">
                </div>
            `;
            currentModalAction = 'add-item';
            modalOverlay.classList.remove('hidden');
        };
    }

    const avatarColors = [
        'linear-gradient(135deg, #6366f1, #a855f7)', // Indigo
        'linear-gradient(135deg, #f43f5e, #fb7185)', // Rose
        'linear-gradient(135deg, #10b981, #34d399)', // Emerald
        'linear-gradient(135deg, #f59e0b, #fbbf24)', // Amber
        'linear-gradient(135deg, #0ea5e9, #38bdf8)', // Sky
        'linear-gradient(135deg, #8b5cf6, #c084fc)', // Violet
        'linear-gradient(135deg, #ec4899, #f472b6)'  // Pink
    ];

    window.addPerson = () => {
        modalTitle.textContent = 'Add Person';
        modalContent.innerHTML = `
            <div class="input-group">
                <label>Name</label>
                <input type="text" id="m-person-name" placeholder="Participant Name">
            </div>
        `;
        currentModalAction = 'add-person';
        modalOverlay.classList.remove('hidden');
    };

    if (addPersonBtn) {
        addPersonBtn.onclick = () => window.addPerson();
    }

    if (directAddBtn) {
        directAddBtn.onclick = () => {
            const name = directInput.value.trim();
            if (name) {
                const color = avatarColors[window.people.length % avatarColors.length];
                window.people.push({ id: Date.now(), name, color });
                directInput.value = '';
                window.renderPeople();
                window.renderItems();
            }
        };
        directInput.onkeyup = (e) => { if (e.key === 'Enter') directAddBtn.click(); };
    }

    if (directItemBtn) {
        directItemBtn.onclick = () => {
            const name = directItemName.value.trim();
            const price = parseFloat(directItemPrice.value) || 0;
            if (name && price > 0) {
                window.items.push({ id: Date.now(), name, price, assignees: [] });
                directItemName.value = '';
                directItemPrice.value = '';
                window.renderItems();
            }
        };
        directItemPrice.onkeyup = (e) => { if (e.key === 'Enter') directItemBtn.click(); };
        directItemName.onkeyup = (e) => { if (e.key === 'Enter') directItemPrice.focus(); };
    }

    window.showAssignModal = (itemId) => {
        const item = window.items.find(i => i.id === itemId);
        modalTitle.textContent = `Assign: ${item.name}`;
        modalContent.innerHTML = `
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">Select everyone who shared this item:</p>
            <div class="people-tags">
                ${window.people.map(p => `
                    <span class="person-tag ${item.assignees.includes(p.id) ? 'active' : ''}" 
                          onclick="this.classList.toggle('active')" data-id="${p.id}">
                        ${p.name}
                    </span>
                `).join('')}
            </div>
        `;
        currentModalAction = `assign-${itemId}`;
        modalOverlay.classList.remove('hidden');
    };

    modalSave.onclick = () => {
        if (currentModalAction === 'add-item') {
            const name = document.getElementById('m-item-name').value;
            const price = parseFloat(document.getElementById('m-item-price').value) || 0;
            if (name) {
                items.push({ id: Date.now(), name, price, assignees: [] });
            }
        } else if (currentModalAction === 'add-person') {
            const name = document.getElementById('m-person-name').value;
            if (name) {
                const color = avatarColors[window.people.length % avatarColors.length];
                window.people.push({ id: Date.now(), name, color });
            }
        } else if (currentModalAction.startsWith('edit-')) {
            const id = parseInt(currentModalAction.split('-')[1]);
            const item = items.find(i => i.id === id);
            item.name = document.getElementById('m-item-name').value;
            item.price = parseFloat(document.getElementById('m-item-price').value) || 0;
        } else if (currentModalAction.startsWith('assign-')) {
            const itemId = parseInt(currentModalAction.split('-')[1]);
            const item = items.find(i => i.id === itemId);
            const activeTags = modalContent.querySelectorAll('.person-tag.active');
            item.assignees = Array.from(activeTags).map(tag => parseInt(tag.dataset.id));
        }
        
        modalOverlay.classList.add('hidden');
        renderItems();
        renderPeople();
    };

    modalCancel.onclick = () => modalOverlay.classList.add('hidden');

    // --- OCR Integration ---
    async function processImage(file) {
        const heroElement = document.querySelector('.hero');
        const heroMainContent = document.getElementById('hero-main-content');
        const ocrStatus = document.getElementById('ocr-status');
        const statusText = document.getElementById('status-text');

        if (heroElement) heroElement.classList.add('loading');
        if (heroMainContent) heroMainContent.classList.add('hidden');
        if (ocrStatus) ocrStatus.classList.remove('hidden');
        if (statusText) statusText.innerText = "Reading receipt...";

        try {
            console.log('Starting OCR process...');
            const result = await Tesseract.recognize(file, 'eng');
            const text = result.data.text;
            console.log('OCR Result:', text);

            if (statusText) statusText.innerText = "Analyzing items...";
            const parsedItems = parseReceipt(text);
            
            if (parsedItems.length === 0) {
                showErrorState();
                return;
            }

            window.items = parsedItems;
            if (heroElement) heroElement.classList.remove('loading');
            if (ocrStatus) ocrStatus.classList.add('hidden');
            showApp();
        } catch (error) {
            console.error('OCR Error:', error);
            showErrorState();
        }

        function showErrorState() {
            if (heroElement) {
                heroElement.classList.remove('loading');
                heroElement.classList.add('error');
            }
            if (ocrStatus) ocrStatus.classList.add('hidden');
            const ocrError = document.getElementById('ocr-error');
            if (ocrError) ocrError.classList.remove('hidden');

            setTimeout(() => {
                if (ocrError) ocrError.classList.add('hidden');
                if (heroElement) heroElement.classList.remove('error');
                if (heroMainContent) heroMainContent.classList.remove('hidden');
            }, 3000);
        }
    }

    if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) await processImage(file);
        });
    }

    function parseReceipt(text) {
        const lines = text.split('\n');
        const parsed = [];
        const excludedKeywords = ['total', 'subtotal', 'tax', 'service', 'cash', 'change', 'discount', 'ppn', 'biaya'];

        lines.forEach(line => {
            const cleanLine = line.trim();
            if (cleanLine.length < 5) return;

            // Look for patterns like "Item Name 50.000" or "Item Name 50000"
            const priceMatch = cleanLine.match(/(\d[\d\.,\s]*\d)$/);
            if (priceMatch) {
                const priceStr = priceMatch[1].replace(/[^\d]/g, '');
                const price = parseFloat(priceStr);
                
                let name = cleanLine.replace(priceMatch[0], '').trim();
                name = name.replace(/[:\.\-]/g, '').trim();

                // Validation
                const isExcluded = excludedKeywords.some(kw => name.toLowerCase().includes(kw));
                
                if (price >= 1000 && name.length > 2 && !isExcluded) {
                    parsed.push({ 
                        id: Math.floor(Date.now() + Math.random() * 1000), 
                        name: name, 
                        price: price, 
                        assignees: [] 
                    });
                }
            }
        });
        return parsed;
    }

    // --- Coin Animation ---
    function createCoin() {
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
        if (coinContainer.children.length < 40) createCoin();
    }, 1500);

    // --- Cash Fund Rendering ---
    function renderCashFund() {
        if (!cashList || !monthDisplay) return;

        const monthKey = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        monthDisplay.textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

        if (!window.cashData[monthKey]) window.cashData[monthKey] = {};

        cashList.innerHTML = '';
        let totalCollected = 0;

        window.people.forEach(person => {
            const isPaid = window.cashData[monthKey][person.id] || false;
            if (isPaid) totalCollected += CASH_TARGET;

            const initial = person.name.charAt(0).toUpperCase();
            const card = document.createElement('div');
            card.className = `cash-person-card ${isPaid ? 'paid' : 'unpaid'}`;
            card.innerHTML = `
                <div class="cash-person-info">
                    <div class="cash-avatar" style="background: ${person.color || 'var(--accent-primary)'}">${initial}</div>
                    <div class="cash-details">
                        <span class="name">${person.name}</span>
                        <span class="status">${isPaid ? 'Paid' : 'Unpaid'}</span>
                    </div>
                </div>
                <div class="cash-action">
                    <button class="pay-toggle ${isPaid ? 'btn-unpay' : 'btn-pay'}" data-id="${person.id}">
                        ${isPaid ? 'Paid' : 'Pay Now'}
                    </button>
                </div>
            `;
            cashList.appendChild(card);
        });

        if (totalCollectedDisplay) totalCollectedDisplay.textContent = formatRupiah(totalCollected);

        // Add listeners to toggles
        cashList.querySelectorAll('.pay-toggle').forEach(btn => {
            btn.onclick = () => {
                const pId = Number(btn.dataset.id);
                window.cashData[monthKey][pId] = !window.cashData[monthKey][pId];
                renderCashFund();
            };
        });
    }

    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');

    if (prevMonthBtn) {
        prevMonthBtn.onclick = () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCashFund();
        };
    }

    if (nextMonthBtn) {
        nextMonthBtn.onclick = () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCashFund();
        };
    }

    // Initial render
    console.log('Script fully initialized');
    window.renderPeople();
    window.renderItems();
});
