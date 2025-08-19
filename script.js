

// --- Data and State ---
let menu = [
    { name: 'Coffee', price: 2 },
    { name: 'Tea', price: 1.5 },
    { name: 'Sandwich', price: 3 },
    { name: 'Cake', price: 2.5 },
    { name: 'Espresso', price: 2.2 },
    { name: 'Cappuccino', price: 2.8 },
    { name: 'Latte', price: 3.0 },
    { name: 'Mocha', price: 3.2 },
    { name: 'Hot Chocolate', price: 2.7 },
    { name: 'Muffin', price: 2.0 },
    { name: 'Croissant', price: 2.3 },
    { name: 'Bagel', price: 2.1 },
    { name: 'Brownie', price: 2.4 },
    { name: 'Smoothie', price: 3.5 },
    { name: 'Iced Coffee', price: 2.9 }
];
let order = [];
let orderHistory = JSON.parse(sessionStorage.getItem('orderHistory') || '[]');
let darkMode = localStorage.getItem('caffepro_darkmode') === 'true';
const discountCodes = { 'WELCOME10': 0.1, 'SUMMER20': 0.2 };
let appliedDiscount = 0;

// --- DOM Elements ---
const menuList = document.getElementById('menu-list');
const menuSearch = document.getElementById('menu-search');
const orderForm = document.getElementById('order-form');
const itemSelect = document.getElementById('item');
const orderList = document.getElementById('order-list');
const totalDisplay = document.getElementById('total');
const clearOrderBtn = document.getElementById('clear-order');
const printReceiptBtn = document.getElementById('print-receipt');
const downloadReceiptBtn = document.getElementById('download-receipt');
const orderHistoryList = document.getElementById('order-history');
const toggleAdminBtn = document.getElementById('toggle-admin');
const adminMenuForm = document.getElementById('admin-menu-form');
const adminMenuItems = document.getElementById('admin-menu-items');
const newItemName = document.getElementById('new-item-name');
const newItemPrice = document.getElementById('new-item-price');
const discountInput = document.getElementById('discount');
const toggleDarkModeBtn = document.getElementById('toggle-darkmode');

// --- Menu Rendering & Search ---
function renderMenu(filter = '') {
    menuList.innerHTML = '';
    let filtered = menu.filter(m => m.name.toLowerCase().includes(filter.toLowerCase()));
    if (filtered.length === 0) {
        menuList.innerHTML = '<li style="color:#888;">No items found.</li>';
    }
    filtered.forEach(m => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${m.name}</span> <span class="price">$${m.price}</span>`;
        menuList.appendChild(li);
    });
    // Update order form select
    itemSelect.innerHTML = menu.map(m => `<option value="${m.name}">${m.name}</option>`).join('');
}
menuSearch.addEventListener('input', e => renderMenu(e.target.value));

// --- Admin Menu Edit ---
toggleAdminBtn.addEventListener('click', () => {
    adminMenuForm.style.display = adminMenuForm.style.display === 'none' ? 'block' : 'none';
    renderAdminMenu();
});
function renderAdminMenu() {
    adminMenuItems.innerHTML = '';
    menu.forEach((m, idx) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${m.name} ($${m.price})</span> <button data-idx="${idx}" class="remove-menu-item">🗑️</button>`;
        adminMenuItems.appendChild(li);
    });
    adminMenuItems.querySelectorAll('.remove-menu-item').forEach(btn => {
        btn.onclick = e => {
            menu.splice(btn.dataset.idx, 1);
            renderMenu(menuSearch.value);
            renderAdminMenu();
            showToast('Menu item removed', 'info');
        };
    });
}
adminMenuForm.addEventListener('submit', e => {
    e.preventDefault();
    const name = newItemName.value.trim();
    const price = parseFloat(newItemPrice.value);
    if (!name || isNaN(price) || price <= 0) return;
    if (menu.some(m => m.name.toLowerCase() === name.toLowerCase())) {
        showToast('Item already exists!', 'info');
        return;
    }
    menu.push({ name, price });
    renderMenu(menuSearch.value);
    renderAdminMenu();
    newItemName.value = '';
    newItemPrice.value = '';
    showToast('Menu item added!', 'success');
});

// --- Order Form & Discount ---
orderForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const item = itemSelect.value;
    const quantity = parseInt(document.getElementById('quantity').value);
    const discountCode = discountInput.value.trim().toUpperCase();
    if (!item || quantity < 1) {
        showToast('Please select a valid item and quantity.');
        return;
    }
    // Discount
    appliedDiscount = 0;
    if (discountCode) {
        if (discountCodes[discountCode]) {
            appliedDiscount = discountCodes[discountCode];
            showToast(`Discount code applied: ${discountCode} (${appliedDiscount * 100}% off)`, 'success');
        } else {
            showToast('Invalid discount code.', 'info');
        }
    }
    // Add to order
    const existing = order.find(o => o.item === item);
    if (existing) {
        existing.quantity += quantity;
    } else {
        order.push({ item, quantity });
    }
    displayOrder();
    showToast(`${quantity} x ${item} added to order!`, 'success');
    orderForm.reset();
    document.getElementById('quantity').value = 1;
});

clearOrderBtn.addEventListener('click', function() {
    order = [];
    appliedDiscount = 0;
    displayOrder();
    showToast('Order cleared.', 'info');
});

function displayOrder() {
    orderList.innerHTML = '';
    let total = 0;
    if (order.length === 0) {
        orderList.innerHTML = '<li style="color:#888;">No items in order.</li>';
        totalDisplay.textContent = '';
        return;
    }
    order.forEach(o => {
        const price = menu.find(m => m.name === o.item)?.price || 0;
        const li = document.createElement('li');
        li.innerHTML = `<span>${o.quantity} x ${o.item}</span> <span>$${(price * o.quantity).toFixed(2)}</span>`;
        orderList.appendChild(li);
        total += price * o.quantity;
    });
    if (appliedDiscount > 0) {
        const discountAmount = total * appliedDiscount;
        totalDisplay.innerHTML = `Discount: -$${discountAmount.toFixed(2)}<br><b>Total: $${(total - discountAmount).toFixed(2)}</b>`;
    } else {
        totalDisplay.textContent = 'Total: $' + total.toFixed(2);
    }
}

// --- Order History ---
function saveOrderToHistory() {
    if (order.length === 0) return;
    const now = new Date();
    const summary = order.map(o => `${o.quantity} x ${o.item}`).join(', ');
    let total = 0;
    order.forEach(o => {
        const price = menu.find(m => m.name === o.item)?.price || 0;
        total += price * o.quantity;
    });
    if (appliedDiscount > 0) total -= total * appliedDiscount;
    orderHistory.push({ summary, total: total.toFixed(2), time: now.toLocaleString() });
    sessionStorage.setItem('orderHistory', JSON.stringify(orderHistory));
    renderOrderHistory();
}
function renderOrderHistory() {
    orderHistoryList.innerHTML = '';
    if (orderHistory.length === 0) {
        orderHistoryList.innerHTML = '<li style="color:#888;">No orders yet.</li>';
        return;
    }
    orderHistory.slice().reverse().forEach(h => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${h.summary}</span> <span style="color:#4b2e05;font-weight:600;">$${h.total}</span> <span style="font-size:0.9em;color:#888;">${h.time}</span>`;
        orderHistoryList.appendChild(li);
    });
}

// Save to history when order is printed or downloaded
function handleOrderComplete() {
    saveOrderToHistory();
    order = [];
    appliedDiscount = 0;
    displayOrder();
}

// --- Print/Download Receipt ---
function getReceiptText() {
    let lines = ['CaffePro Receipt', '---------------------'];
    order.forEach(o => {
        const price = menu.find(m => m.name === o.item)?.price || 0;
        lines.push(`${o.quantity} x ${o.item} - $${(price * o.quantity).toFixed(2)}`);
    });
    let total = 0;
    order.forEach(o => {
        const price = menu.find(m => m.name === o.item)?.price || 0;
        total += price * o.quantity;
    });
    if (appliedDiscount > 0) {
        lines.push(`Discount: -$${(total * appliedDiscount).toFixed(2)}`);
        total -= total * appliedDiscount;
    }
    lines.push('Total: $' + total.toFixed(2));
    lines.push('Thank you for your order!');
    return lines.join('\n');
}
printReceiptBtn.addEventListener('click', function() {
    if (order.length === 0) return showToast('No items to print.');
    const w = window.open('', '', 'width=400,height=600');
    w.document.write(`<pre>${getReceiptText()}</pre>`);
    w.print();
    w.close();
    handleOrderComplete();
});
downloadReceiptBtn.addEventListener('click', function() {
    if (order.length === 0) return showToast('No items to download.');
    const blob = new Blob([getReceiptText()], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'caffepro_receipt.txt';
    a.click();
    handleOrderComplete();
});

// --- Dark/Light Mode ---
function setDarkMode(on) {
    document.body.classList.toggle('dark-mode', on);
    localStorage.setItem('caffepro_darkmode', on);
    toggleDarkModeBtn.textContent = on ? '☀️ Toggle Light Mode' : '🌙 Toggle Dark Mode';
}
toggleDarkModeBtn.addEventListener('click', () => {
    darkMode = !darkMode;
    setDarkMode(darkMode);
});
setDarkMode(darkMode);

// --- Toast notification for feedback ---
function showToast(message, type = 'default') {
    let toast = document.createElement('div');
    toast.textContent = message;
    toast.className = 'toast ' + type;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 1800);
}

// --- Toast styles ---
const style = document.createElement('style');
style.innerHTML = `
.toast {
    position: fixed;
    left: 50%;
    bottom: 40px;
    transform: translateX(-50%);
    background: #4b2e05;
    color: #fff;
    padding: 12px 28px;
    border-radius: 24px;
    font-size: 1.08em;
    opacity: 0;
    pointer-events: none;
    z-index: 9999;
    transition: opacity 0.3s, bottom 0.3s;
}
.toast.show {
    opacity: 1;
    bottom: 60px;
}
.toast.success { background: #388e3c; }
.toast.info { background: #1976d2; }
.dark-mode {
    background: #232323 !important;
    color: #f8fafc !important;
}
.dark-mode .card, .dark-mode .container, .dark-mode .contact-card {
    background: #2d2d2d !important;
    color: #f8fafc !important;
    box-shadow: 0 2px 12px rgba(0,0,0,0.25) !important;
}
.dark-mode .navbar, .dark-mode footer {
    background: #181818 !important;
    color: #fff !important;
}
.dark-mode .price { color: #ffe082 !important; }
.dark-mode .cta-btn { background: #b71c1c !important; color: #fff !important; }
.dark-mode .cta-btn:hover { background: #4b2e05 !important; }
.dark-mode input, .dark-mode select {
    background: #232323 !important;
    color: #fff !important;
    border: 1px solid #444 !important;
}
.dark-mode .toast { background: #333 !important; color: #ffe082 !important; }
`;
document.head.appendChild(style);

// --- Initial Render ---
renderMenu();
displayOrder();
renderOrderHistory();





