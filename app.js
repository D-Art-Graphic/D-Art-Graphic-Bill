// State Management
// State Management
const safeStorage = {
    getItem: (key) => { 
        try { 
            const val = localStorage.getItem(key); 
            if (!val) return null;
            return JSON.parse(val);
        } catch(e) { 
            return null; 
        } 
    },
    setItem: (key, val) => { 
        try { 
            localStorage.setItem(key, JSON.stringify(val)); 
        } catch(e) {} 
    },
    removeItem: (key) => { 
        try { 
            localStorage.removeItem(key); 
        } catch(e) {} 
    }
};

let state = {
    inventory: safeStorage.getItem('dart_inventory') || [],
    bills: safeStorage.getItem('dart_bills') || [],
    users: safeStorage.getItem('dart_users') || [{ username: 'admin', password: 'admin', role: 'admin' }],
    cart: [],
    discount: 0
};
let currentUser = safeStorage.getItem('dart_currentUser') || null;

// Ensure admin password is 'admin' even if previously saved as '123'
const defaultAdmin = state.users.find(u => u.username === 'admin');
if (defaultAdmin && defaultAdmin.password === '123') {
    defaultAdmin.password = 'admin';
    safeStorage.setItem('dart_users', state.users);
}
if (currentUser && currentUser.username === 'admin' && currentUser.password === '123') {
    currentUser.password = 'admin';
    safeStorage.setItem('dart_currentUser', currentUser);
}

// Utilities
function saveState() {
    safeStorage.setItem('dart_inventory', state.inventory);
    safeStorage.setItem('dart_bills', state.bills);
    safeStorage.setItem('dart_users', state.users);
}

function generateId(prefix = 'ID') {
    return prefix + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

function formatCurrency(amount) {
    return 'Rs ' + parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    
    toast.innerHTML = `<i class="fas ${icon}"></i> <span style="font-weight:600">${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// Update Header Date/Time
function updateDateTime() {
    const now = new Date();
    document.getElementById('date-time').innerText = now.toLocaleString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}
setInterval(updateDateTime, 1000);
updateDateTime();

// DOM Elements
const views = document.querySelectorAll('.view');
const navLinks = document.querySelectorAll('.nav-links li');
const pageTitle = document.getElementById('page-title');

// Modals
const modalAddItem = document.getElementById('modal-add-item');
const modalBill = document.getElementById('modal-bill');
const modalLogin = document.getElementById('modal-login');
const modalAddUser = document.getElementById('modal-add-user');
const closeBtns = document.querySelectorAll('.close-modal');

// Authentication & Users
function initAuth() {
    if (!currentUser) {
        modalLogin.classList.add('active');
        document.querySelector('.sidebar').style.display = 'none';
        document.querySelector('.main-content').style.display = 'none';
    } else {
        document.querySelector('.sidebar').style.display = 'flex';
        document.querySelector('.main-content').style.display = 'flex';
        applyRolePermissions();
        renderDashboard();
    }
}

document.getElementById('form-login').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('login-username').value;
    const pass = document.getElementById('login-password').value;
    const found = state.users.find(u => u.username === user && u.password === pass);
    if (found) {
        currentUser = found;
        safeStorage.setItem('dart_currentUser', currentUser);
        modalLogin.classList.remove('active');
        document.querySelector('.sidebar').style.display = 'flex';
        document.querySelector('.main-content').style.display = 'flex';
        applyRolePermissions();
        renderDashboard();
    } else {
        showToast('Invalid Username or Password!', 'error');
    }
});

function applyRolePermissions() {
    document.getElementById('header-username').innerText = currentUser.username;
    if (currentUser.role !== 'admin') {
        document.getElementById('nav-users').style.display = 'none';
        document.getElementById('btn-add-item').style.display = 'none';
    } else {
        document.getElementById('nav-users').style.display = 'flex';
        document.getElementById('btn-add-item').style.display = 'inline-flex';
    }
}

document.getElementById('nav-logout').addEventListener('click', () => {
    currentUser = null;
    safeStorage.removeItem('dart_currentUser');
    window.location.reload();
});

// --- Navigation ---
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        const tab = link.getAttribute('data-tab');
        if (!tab) return;
        
        // Remove active class
        navLinks.forEach(l => l.classList.remove('active'));
        views.forEach(v => v.classList.remove('active'));
        
        // Add active class
        link.classList.add('active');
        document.getElementById(`view-${tab}`).classList.add('active');
        pageTitle.innerText = link.innerText;

        // Render current view
        if (tab === 'dashboard') renderDashboard();
        if (tab === 'inventory') renderInventory();
        if (tab === 'pos') renderPOS();
        if (tab === 'bills') renderBills();
        if (tab === 'profile') renderProfile();
        if (tab === 'users') renderUsers();
    });
});

closeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        modalAddItem.classList.remove('active');
        modalBill.classList.remove('active');
        modalAddUser.classList.remove('active');
    });
});

// --- Inventory ---
const btnAddItem = document.getElementById('btn-add-item');
const formItem = document.getElementById('form-item');
const inventoryTableBody = document.getElementById('inventory-table-body');

btnAddItem.addEventListener('click', () => {
    document.getElementById('item-id').value = '';
    formItem.reset();
    modalAddItem.classList.add('active');
});

formItem.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('item-id').value;
    const name = document.getElementById('item-name').value;
    const price = parseFloat(document.getElementById('item-price').value);
    const stockVal = document.getElementById('item-stock').value;
    const stock = stockVal === '' ? '' : parseInt(stockVal, 10);

    if (id) {
        // Edit existing
        const item = state.inventory.find(i => i.id === id);
        if (item) {
            item.name = name;
            item.price = price;
            item.stock = stock;
        }
    } else {
        // Add new
        state.inventory.push({
            id: generateId('ITM'),
            name,
            price,
            stock
        });
    }

    saveState();
    modalAddItem.classList.remove('active');
    showToast('Item saved successfully!', 'success');
    renderInventory();
    renderDashboard();
});

function editItem(id) {
    const item = state.inventory.find(i => i.id === id);
    if (item) {
        document.getElementById('item-id').value = item.id;
        document.getElementById('item-name').value = item.name;
        document.getElementById('item-price').value = item.price;
        document.getElementById('item-stock').value = item.stock === '' ? '' : item.stock;
        modalAddItem.classList.add('active');
    }
}

function deleteItem(id) {
    if (confirm('Are you sure you want to delete this item?')) {
        state.inventory = state.inventory.filter(i => i.id !== id);
        saveState();
        renderInventory();
        renderDashboard();
    }
}

function renderInventory() {
    inventoryTableBody.innerHTML = '';
    
    if (state.inventory.length === 0) {
        inventoryTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#94a3b8;">No items in inventory.</td></tr>`;
        return;
    }

    state.inventory.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span style="color:var(--text-secondary);font-size:0.85rem;">${item.id}</span></td>
            <td style="font-weight:500;">${item.name}</td>
            <td style="color:var(--secondary-color);">${formatCurrency(item.price)}</td>
            <td>
                <span class="table-badge ${item.stock === '' ? 'badge-good' : (item.stock <= 5 ? 'badge-low' : 'badge-good')}">
                    ${item.stock === '' ? 'Unlimited' : item.stock + ' in stock'}
                </span>
            </td>
            <td>
                ${currentUser && currentUser.role === 'admin' ? `
                <button class="btn btn-secondary btn-icon" onclick="editItem('${item.id}')" title="Edit"><i class="fas fa-pen"></i></button>
                <button class="btn btn-secondary btn-icon" style="color:var(--danger-color);" onclick="deleteItem('${item.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                ` : '<span style="color:var(--text-secondary);font-size:0.85rem;">View Only</span>'}
            </td>
        `;
        inventoryTableBody.appendChild(tr);
    });
}

// --- Dashboard ---
function renderDashboard() {
    const statRevenue = document.getElementById('stat-revenue');
    const statBills = document.getElementById('stat-bills');
    const statStockItems = document.getElementById('stat-stock-items');
    const statAdvBills = document.getElementById('stat-adv-bills');
    const statToCollect = document.getElementById('stat-to-collect');
    const recentBillsTable = document.getElementById('recent-bills-table');

    const totalRevenue = state.bills.reduce((acc, bill) => acc + bill.total, 0);
    const totalItems = state.inventory.length;

    let advBillsCount = 0;
    let toCollectSum = 0;
    state.bills.forEach(b => {
        if (b.balance > 0) {
            advBillsCount++;
            toCollectSum += b.balance;
        }
    });

    statRevenue.innerText = formatCurrency(totalRevenue);
    statBills.innerText = state.bills.length;
    statStockItems.innerText = totalItems;
    if (statAdvBills) statAdvBills.innerText = advBillsCount;
    if (statToCollect) statToCollect.innerText = formatCurrency(toCollectSum);

    // Recent 5 bills
    recentBillsTable.innerHTML = '';
    const recentBills = [...state.bills].reverse().slice(0, 5);

    if (recentBills.length === 0) {
        recentBillsTable.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#94a3b8;">No recent transactions.</td></tr>`;
        return;
    }

    function isBillDeletable(bill) {
        if (currentUser && currentUser.role === 'admin') return true;
        if (!bill.createdBy) return false;
        const billDate = new Date(bill.date);
        const now = new Date();
        return billDate.toDateString() === now.toDateString() && bill.createdBy === currentUser.username;
    }

    recentBills.forEach(bill => {
        const advanceStr = (bill.advance && bill.advance > 0) ? `${formatCurrency(bill.advance)}<br><small style="color:var(--text-secondary);">${bill.advanceMethod}</small>` : '-';
        const deletable = isBillDeletable(bill);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span style="color:var(--text-secondary);font-size:0.85rem;">${bill.id}</span></td>
            <td>${formatDate(bill.date)}</td>
            <td>${bill.items.reduce((acc, item) => acc + item.qty, 0)} items</td>
            <td>${advanceStr}</td>
            <td style="color:var(--primary-color);font-weight:600;">${formatCurrency(bill.total)}</td>
            <td>
                <button class="btn btn-secondary btn-icon" onclick="viewBill('${bill.id}')" title="View"><i class="fas fa-eye"></i></button>
                ${deletable ? `
                <button class="btn btn-secondary btn-icon" onclick="restoreBillToCart('${bill.id}')" title="Edit"><i class="fas fa-pen" style="color:var(--secondary-color);"></i></button>
                <button class="btn btn-secondary btn-icon" onclick="deleteBillAction('${bill.id}')" title="Delete"><i class="fas fa-trash" style="color:var(--danger-color);"></i></button>
                ` : ''}
            </td>
        `;
        recentBillsTable.appendChild(tr);
    });
}


// --- POS / Billing ---
const posItemList = document.getElementById('pos-item-list');
const posSearch = document.getElementById('pos-search');
const cartItemList = document.getElementById('cart-item-list');
const cartSubtotalEl = document.getElementById('cart-subtotal');
const cartDiscountEl = document.getElementById('cart-discount');
const cartAdvanceEl = document.getElementById('cart-advance');
const cartAdvanceMethodEl = document.getElementById('cart-advance-method');
const cartTotalEl = document.getElementById('cart-total');
const cartBalanceEl = document.getElementById('cart-balance');
const btnClearCart = document.getElementById('btn-clear-cart');
const btnGenerateBill = document.getElementById('btn-generate-bill');

function renderPOS() {
    renderPOSItems();
    renderCart();
}

function renderPOSItems(query = '') {
    posItemList.innerHTML = '';
    const filtered = state.inventory.filter(i => 
        i.name.toLowerCase().includes(query.toLowerCase()) || 
        i.id.toLowerCase().includes(query.toLowerCase())
    );

    if (filtered.length === 0) {
        posItemList.innerHTML = `<p style="color:var(--text-secondary);grid-column:1/-1;text-align:center;">No items found.</p>`;
        return;
    }

    filtered.forEach(item => {
        const el = document.createElement('div');
        el.className = 'pos-item-card';
        // Check if out of stock
        if (item.stock !== '' && item.stock <= 0) {
            el.style.opacity = '0.5';
            el.style.pointerEvents = 'none';
        }

        const iconStr = item.name.charAt(0).toUpperCase();
        
        el.innerHTML = `
            <div class="pos-item-icon">${iconStr}</div>
            <h4>${item.name}</h4>
            <div class="price">${formatCurrency(item.price)}</div>
            <div class="stock">${item.stock === '' ? 'Unlimited' : item.stock + ' available'}</div>
        `;
        
        el.addEventListener('click', () => addToCart(item));
        posItemList.appendChild(el);
    });
}

posSearch.addEventListener('input', (e) => {
    renderPOSItems(e.target.value);
});

function addToCart(item) {
    const existing = state.cart.find(c => c.item.id === item.id);
    if (existing) {
        if (item.stock === '' || existing.qty < item.stock) {
            existing.qty += 1;
            showToast('Added to cart', 'success');
        } else {
            showToast('Not enough stock!', 'error');
        }
    } else {
        if (item.stock === '' || item.stock > 0) {
            state.cart.push({ item, qty: 1 });
            showToast('Item added to cart', 'success');
        } else {
            showToast('Out of stock', 'error');
        }
    }
    renderCart();
}

function updateCartQty(itemId, change) {
    const index = state.cart.findIndex(c => c.item.id === itemId);
    if (index > -1) {
        const cartItem = state.cart[index];
        const newQty = cartItem.qty + change;
        
        if (newQty <= 0) {
            state.cart.splice(index, 1);
        } else if (cartItem.item.stock !== '' && newQty > cartItem.item.stock) {
            showToast('Not enough stock!', 'error');
        } else {
            cartItem.qty = newQty;
        }
    }
    renderCart();
}

cartDiscountEl.addEventListener('input', (e) => {
    state.discount = parseFloat(e.target.value) || 0;
    if (state.discount < 0) state.discount = 0;
    if (state.discount > 100) state.discount = 100;
    renderCart();
});

cartAdvanceEl.addEventListener('input', () => {
    renderCart();
});

function renderCart() {
    cartItemList.innerHTML = '';
    let subtotal = 0;

    if (state.cart.length === 0) {
        cartItemList.innerHTML = `<p style="color:var(--text-secondary);text-align:center;margin-top:2rem;">Cart is empty.</p>`;
    } else {
        state.cart.forEach(c => {
            const itemTotal = c.item.price * c.qty;
            subtotal += itemTotal;

            const el = document.createElement('div');
            el.className = 'cart-item';
            el.innerHTML = `
                <div class="cart-item-info">
                    <h4>${c.item.name}</h4>
                    <p>${formatCurrency(c.item.price)}</p>
                </div>
                <div class="cart-item-actions">
                    <button class="qty-btn" onclick="updateCartQty('${c.item.id}', -1)"><i class="fas fa-minus"></i></button>
                    <input type="text" class="qty-input" value="${c.qty}" readonly>
                    <button class="qty-btn" onclick="updateCartQty('${c.item.id}', 1)"><i class="fas fa-plus"></i></button>
                    <button class="remove-btn" onclick="updateCartQty('${c.item.id}', -999)"><i class="fas fa-times"></i></button>
                </div>
            `;
            cartItemList.appendChild(el);
        });
    }

    const discountAmount = subtotal * (state.discount / 100);
    const total = subtotal - discountAmount;
    
    let advance = parseFloat(cartAdvanceEl.value) || 0;
    if (advance < 0) advance = 0;
    const balance = total - advance;

    cartSubtotalEl.innerText = formatCurrency(subtotal);
    cartTotalEl.innerText = formatCurrency(total);
    cartBalanceEl.innerText = formatCurrency(balance > 0 ? balance : 0);
}

btnClearCart.addEventListener('click', () => {
    if(state.cart.length > 0 && confirm("Clear current bill?")) {
        state.cart = [];
        state.discount = 0;
        cartDiscountEl.value = 0;
        cartAdvanceEl.value = 0;
        cartAdvanceMethodEl.value = 'Cash';
        document.getElementById('cust-name').value = '';
        document.getElementById('cust-phone').value = '';
        renderCart();
    }
});

btnGenerateBill.addEventListener('click', () => {
    if (state.cart.length === 0) {
        showToast("The cart is empty. Please add items to generate a bill.", "error");
        return;
    }

    const custName = document.getElementById('cust-name').value.trim();
    const custPhone = document.getElementById('cust-phone').value.trim();

    let subtotal = 0;
    const billItems = state.cart.map(c => {
        const t = c.item.price * c.qty;
        subtotal += t;
        
        // Deduct stock
        const invItem = state.inventory.find(i => i.id === c.item.id);
        if (invItem && invItem.stock !== '') invItem.stock -= c.qty;

        return {
            id: c.item.id,
            name: c.item.name,
            price: c.item.price,
            qty: c.qty,
            total: t
        };
    });

    const discountAmount = subtotal * (state.discount / 100);
    const total = subtotal - discountAmount;
    const advance = parseFloat(cartAdvanceEl.value) || 0;
    const advanceMethod = cartAdvanceMethodEl.value || 'Cash';
    const balance = total - advance > 0 ? total - advance : 0;

    let nextInvoiceId = 220;
    if (state.bills.length > 0) {
        const validIds = state.bills
            .map(b => b.id.match(/^INV-(\d+)$/))
            .filter(m => m)
            .map(m => parseInt(m[1], 10));
        
        if (validIds.length > 0) {
            nextInvoiceId = Math.max(...validIds) + 1;
        } else {
            // fallback if there are old randomized IDs
            nextInvoiceId = 220 + state.bills.length;
        }
    }
    const newBillId = `INV-${nextInvoiceId}`;

    const newBill = {
        id: newBillId,
        date: new Date().toISOString(),
        customerName: custName,
        customerPhone: custPhone,
        items: billItems,
        subtotal,
        discountPercentage: state.discount,
        discountAmount,
        advance: advance,
        advanceMethod: advanceMethod,
        balance: balance,
        total,
        createdBy: currentUser ? currentUser.username : 'admin',
        day_ended: false
    };

    state.bills.push(newBill);
    saveState();

    // Reset Cart
    state.cart = [];
    state.discount = 0;
    cartDiscountEl.value = 0;
    cartAdvanceEl.value = 0;
    cartAdvanceMethodEl.value = 'Cash';
    document.getElementById('cust-name').value = '';
    document.getElementById('cust-phone').value = '';
    renderCart();

    showToast('Bill generated successfully!', 'success');

    // Show Bill
    showBillModal(newBill);
});


// --- All Bills ---
function renderBills() {
    const allBillsTableBody = document.getElementById('all-bills-table-body');
    allBillsTableBody.innerHTML = '';

    if (state.bills.length === 0) {
        allBillsTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#94a3b8;">No bills generated yet.</td></tr>`;
        return;
    }

    function isBillDeletable(bill) {
        if (currentUser && currentUser.role === 'admin') return true;
        if (!bill.createdBy) return false;
        const billDate = new Date(bill.date);
        const now = new Date();
        return billDate.toDateString() === now.toDateString() && bill.createdBy === currentUser.username;
    }

    const reversedBills = [...state.bills].reverse();
    reversedBills.forEach(bill => {
        const advanceStr = (bill.advance && bill.advance > 0) ? `${formatCurrency(bill.advance)}<br><small style="color:var(--text-secondary);">${bill.advanceMethod}</small>` : '-';
        const deletable = isBillDeletable(bill);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span style="color:var(--text-secondary);font-size:0.85rem;">${bill.id}</span></td>
            <td>${formatDate(bill.date)}</td>
            <td>${advanceStr}</td>
            <td style="color:var(--primary-color);font-weight:600;">${formatCurrency(bill.total)}</td>
            <td>
                <button class="btn btn-secondary btn-icon" onclick="viewBill('${bill.id}')" title="View Bill"><i class="fas fa-eye"></i></button>
                ${deletable ? `
                <button class="btn btn-secondary btn-icon" onclick="restoreBillToCart('${bill.id}')" title="Edit"><i class="fas fa-pen" style="color:var(--secondary-color);"></i></button>
                <button class="btn btn-secondary btn-icon" onclick="deleteBillAction('${bill.id}')" title="Delete"><i class="fas fa-trash" style="color:var(--danger-color);"></i></button>
                ` : ''}
            </td>
        `;
        allBillsTableBody.appendChild(tr);
    });
}

function restoreBillToCart(id) {
    if (state.cart.length > 0) {
        if (!confirm('Cart has items. Replace cart with an old bill to edit?')) return;
    }
    const index = state.bills.findIndex(b => b.id === id);
    if (index > -1) {
        const bill = state.bills[index];
        state.cart = [];
        bill.items.forEach(item => {
            const invItem = state.inventory.find(i => i.id === item.id);
            if(invItem) {
                if (invItem.stock !== '') invItem.stock += item.qty; // Restore stock so they can check out again
                state.cart.push({ item: invItem, qty: item.qty });
            }
        });
        state.discount = bill.discountPercentage || 0;
        cartDiscountEl.value = state.discount;
        cartAdvanceEl.value = bill.advance || 0;
        cartAdvanceMethodEl.value = bill.advanceMethod || 'Cash';
        document.getElementById('cust-name').value = bill.customerName || '';
        document.getElementById('cust-phone').value = bill.customerPhone || '';
        state.bills.splice(index, 1);
        saveState();
        document.querySelector('[data-tab="pos"]').click();
        renderCart();
        renderInventory();
        showToast('Bill restored. You can now edit and generate it again.', 'info');
    }
}

function deleteBillAction(id) {
    if (confirm('Delete this bill forever and restore stock?')) {
        const index = state.bills.findIndex(b => b.id === id);
        if (index > -1) {
            state.bills[index].items.forEach(item => {
                const invItem = state.inventory.find(i => i.id === item.id);
                if (invItem && invItem.stock !== '') invItem.stock += item.qty;
            });
            state.bills.splice(index, 1);
            saveState();
            renderBills();
            renderDashboard();
            renderProfile();
            showToast('Bill deleted!', 'success');
        }
    }
}

function viewBill(id) {
    const bill = state.bills.find(b => b.id === id);
    if (bill) {
        showBillModal(bill);
    }
}

// --- Bill Modal & PDF ---
function showBillModal(bill) {
    document.getElementById('print-bill-id').innerText = bill.id;
    document.getElementById('print-bill-date').innerText = formatDate(bill.date);
    document.getElementById('print-cust-name').innerText = bill.customerName || '-';
    document.getElementById('print-cust-phone').innerText = bill.customerPhone ? `${bill.customerPhone}` : '';
    
    const itemsTbody = document.getElementById('print-bill-items');
    itemsTbody.innerHTML = '';
    bill.items.forEach(item => {
        itemsTbody.innerHTML += `
            <tr>
                <td class="col-desc">${item.name}</td>
                <td class="col-qty">${item.qty}</td>
                <td class="col-price">${item.price.toFixed(2)}</td>
                <td class="col-amount">${item.total.toFixed(2)}</td>
            </tr>
        `;
    });

    document.getElementById('print-bill-subtotal').innerText = 'Rs ' + bill.subtotal.toFixed(2);
    
    const discountRow = document.getElementById('print-bill-discount-row');
    if (bill.discountAmount > 0) {
        discountRow.style.display = 'flex';
        document.getElementById('print-bill-discount').innerText = '- Rs ' + bill.discountAmount.toFixed(2) + ` (${bill.discountPercentage}%)`;
    } else {
        discountRow.style.display = 'none';
    }

    document.getElementById('print-bill-total').innerText = 'Rs ' + bill.total.toFixed(2);

    const advRow = document.getElementById('print-bill-advance-row');
    const balRow = document.getElementById('print-bill-balance-row');
    
    if (bill.advance > 0 && bill.balance > 0) {
        if (advRow) {
            advRow.style.display = 'flex';
            document.getElementById('print-bill-advance').innerText = 'Rs ' + bill.advance.toFixed(2);
        }
        if (balRow) {
            balRow.style.display = 'flex';
            document.getElementById('print-bill-balance').innerText = 'Rs ' + bill.balance.toFixed(2);
        }
    } else {
        if (advRow) advRow.style.display = 'none';
        if (balRow) balRow.style.display = 'none';
    }

    modalBill.classList.add('active');
}

document.getElementById('btn-print').addEventListener('click', () => {
    window.print();
});

document.getElementById('btn-download-pdf').addEventListener('click', () => {
    const element = document.getElementById('bill-print-area');
    const billId = document.getElementById('print-bill-id').innerText;
    
    const opt = {
        margin:       0,
        filename:     `bill_${billId}.pdf`,
        image:        { type: 'jpeg', quality: 1.0 },
        html2canvas:  { scale: 1, useCORS: true },
        jsPDF:        { unit: 'px', format: [1748, 2480], orientation: 'landscape' }
    };

    html2pdf().set(opt).from(element).save();
});

// Profile & Users Management
function renderProfile() {
    if(!currentUser) return;
    const myBills = state.bills.filter(b => b.createdBy === currentUser.username);
    
    let totalBusinessCalc = 0;
    myBills.forEach(b => { totalBusinessCalc += b.total; });

    let dailyCollection = 0;
    const activeDailyBills = myBills.filter(b => !b.day_ended);
    activeDailyBills.forEach(b => {
        if (b.advance > 0 && b.balance > 0) {
            dailyCollection += b.advance; // Only collected advance initially
        } else {
            dailyCollection += b.total; // Collected full amount
        }
    });

    const tbEl = document.getElementById('profile-total-business');
    const dcEl = document.getElementById('profile-daily-collection');
    if(tbEl) tbEl.innerText = formatCurrency(totalBusinessCalc);
    if(dcEl) dcEl.innerText = formatCurrency(dailyCollection);
}

document.getElementById('nav-end-day').addEventListener('click', () => {
    if(confirm("Are you sure you want to end the day? This will clear today's collections for your profile.")) {
        let changed = false;
        state.bills.forEach(b => {
             if(b.createdBy === currentUser.username && !b.day_ended) {
                 b.day_ended = true;
                 changed = true;
             }
        });
        if (changed) {
            saveState();
            renderProfile();
            showToast("Day Ended successfully! Daily collections reset.", "success");
        } else {
            showToast("No active daily collections to end.", "info");
        }
    }
});

// User Management
document.getElementById('btn-add-user').addEventListener('click', () => {
    document.getElementById('form-user').reset();
    document.getElementById('user-original-name').value = '';
    modalAddUser.classList.add('active');
});

document.getElementById('form-user').addEventListener('submit', (e) => {
    e.preventDefault();
    const originalName = document.getElementById('user-original-name').value;
    const name = document.getElementById('user-name').value.trim();
    const pass = document.getElementById('user-password').value.trim();
    const role = document.getElementById('user-role').value;
    
    if (originalName) {
        const u = state.users.find(x => x.username === originalName);
        if (u) {
            u.username = name;
            u.password = pass;
            u.role = role;
            if(currentUser.username === originalName) currentUser = u; // Update current user if editing self
        }
    } else {
        if (state.users.find(x => x.username === name)) {
            showToast('Username already exists', 'error');
            return;
        }
        state.users.push({ username: name, password: pass, role: role });
    }
    
    saveState();
    safeStorage.setItem('dart_currentUser', currentUser);
    modalAddUser.classList.remove('active');
    renderUsers();
    showToast('User saved successfully!', 'success');
});

window.editUser = function(username) {
    const u = state.users.find(x => x.username === username);
    if(u) {
        document.getElementById('user-original-name').value = u.username;
        document.getElementById('user-name').value = u.username;
        document.getElementById('user-password').value = u.password;
        document.getElementById('user-role').value = u.role;
        modalAddUser.classList.add('active');
    }
};

window.deleteUser = function(username) {
    if(confirm('Delete user?')) {
        state.users = state.users.filter(x => x.username !== username);
        saveState();
        renderUsers();
        showToast('User deleted', 'success');
    }
};

function renderUsers() {
    const tbody = document.getElementById('users-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    state.users.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:600;">${u.username}</td>
            <td><span class="table-badge ${u.role==='admin'?'badge-good':'badge-low'}">${u.role.toUpperCase()}</span></td>
            <td>
                <button class="btn btn-secondary btn-icon" onclick="editUser('${u.username}')"><i class="fas fa-pen"></i></button>
                ${u.username !== 'admin' ? `<button class="btn btn-secondary btn-icon" style="color:var(--danger-color);" onclick="deleteUser('${u.username}')"><i class="fas fa-trash"></i></button>` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Init Application
initAuth();
