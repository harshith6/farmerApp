// Minimal SPA logic
const state = { view: 'dashboard', userId: 'user1', items: [], cart: [] };

const el = sel => document.querySelector(sel);
const viewRoot = el('#view');

function setView(v){ state.view = v; render(); document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('active', b.dataset.view===v)); }

async function fetchItems(){ const res = await fetch('/api/items'); state.items = await res.json(); }

function fmt(n){ return n.toString(); }

async function render(){
  if(state.view==='dashboard'){
    const user = await (await fetch('/api/user/'+state.userId)).json();
    viewRoot.innerHTML = `
      <div class="card center">
        <div class="small">Your Carbon Points</div>
        <h2>${fmt(user.points)}</h2>
        <div class="small muted">Equivalent to ${(user.points/10).toFixed(1)} kg CO2</div>
      </div>
      <div class="card">
        <div class="u-row"><strong>Available Items</strong><span class="badge">${state.items.length}</span></div>
        <div class="cart-list">${state.items.map(it=>`<div class="product"><div><strong>${it.name}</strong><div class="small muted">${it.description||''}</div></div><div><div class="small">${it.price} pts</div><button class="btn" data-add="${it.id}">Add</button></div></div>`).join('')}</div>
      </div>
    `;
    viewRoot.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{ addToCart(b.dataset.add); });
    return;
  }

  if(state.view==='upload'){
    viewRoot.innerHTML = `
      <div class="card">
        <strong>Upload planting image</strong>
        <form id="uploadForm" class="mt">
          <input type="file" name="image" accept="image/*" required />
          <div style="height:8px"></div>
          <button class="btn">Upload</button>
        </form>
        <div id="uploadResult"></div>
      </div>
    `;
    el('#uploadForm').onsubmit = async (e)=>{
      e.preventDefault();
      const f = new FormData(e.target);
      f.append('userId', state.userId);
      const res = await fetch('/api/upload', { method:'POST', body:f });
      const data = await res.json();
      if(res.ok){
        document.getElementById('uploadResult').innerHTML = `<div class=\"card\"><div class=\"small\">Uploaded</div><img class=\"preview\" src=\"${data.upload.file}\" /><div class=\"small\">Earned ${data.upload.points} pts</div></div>`;
        await fetchItems();
      } else {
        document.getElementById('uploadResult').innerText = data.error || 'Upload failed';
      }
    };
    return;
  }

  if(state.view==='market'){
    await fetchItems();
    viewRoot.innerHTML = `
      <div class="card"><strong>Marketplace</strong></div>
      <div class="card">${state.items.map(it=>`<div class=\"product\"><div><strong>${it.name}</strong><div class=\"small muted\">${it.description||''}</div></div><div><div class=\"small\">${it.price} pts</div><button class=\"btn\" data-add=\"${it.id}\">Add</button></div></div>`).join('')}</div>
    `;
    viewRoot.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>addToCart(b.dataset.add));
    return;
  }

  if(state.view==='farmer'){
    viewRoot.innerHTML = `
      <div class="card"><strong>Farmer - Add Item</strong>
        <form id="itemForm">
          <input name="name" placeholder="Name" required />
          <input name="price" placeholder="Price (pts)" required />
          <input name="description" placeholder="Short description" />
          <div style="height:8px"></div>
          <button class="btn">Add Item</button>
        </form>
        <div id="itemResult"></div>
      </div>
    `;
    el('#itemForm').onsubmit = async (e)=>{
      e.preventDefault();
      const body = { name: e.target.name.value, price: e.target.price.value, description: e.target.description.value };
      const res = await fetch('/api/items', { method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
      const data = await res.json();
      if(res.ok){ document.getElementById('itemResult').innerText = 'Item added'; await fetchItems(); } else { document.getElementById('itemResult').innerText = data.error || 'Failed'; }
    };
    return;
  }

  if(state.view==='cart'){
    const user = await (await fetch('/api/user/'+state.userId)).json();
    viewRoot.innerHTML = `
      <div class="card"><strong>Your Cart</strong></div>
      <div class="card">
        <div class="cart-list">${state.cart.map(ci=>{ const it = state.items.find(x=>x.id===ci); return `<div class=\"product\"><div><strong>${it.name}</strong></div><div><div class=\"small\">${it.price} pts</div><button class=\"btn\" data-rm=\"${it.id}\">Remove</button></div></div>` }).join('')}</div>
        <div style="height:8px"></div>
        <div class="u-row"><div class="small">Total:</div><div class="badge">${totalCart()} pts</div></div>
        <div style="height:8px"></div>
        <div class="u-row"><button class="btn" id="checkout">Checkout with points</button><div class="small muted">You have ${user.points} pts</div></div>
      </div>
    `;
    viewRoot.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{ removeFromCart(b.dataset.rm); });
    el('#checkout').onclick = ()=>{ checkout(user); };
    return;
  }
}

function addToCart(id){ state.cart.push(id); alert('Added to cart'); render(); }
function removeFromCart(id){ state.cart = state.cart.filter(x=>x!==id); render(); }
function totalCart(){ return state.cart.reduce((s,id)=>{ const it = state.items.find(x=>x.id===id); return s + (it?it.price:0); },0); }

async function checkout(user){ const total = totalCart(); if(user.points < total){ alert('Not enough points'); return; }
  // deduct points locally by calling a fake endpoint - we'll simulate by uploading a dummy record via /api/upload? not necessary
  // For demo, call a backend-less flow: update user via GET then modify local display
  // In this simple app we directly call a backend file write by reusing /api/upload? No. So we perform a minimal client-side patch using fetch to server not implemented: instead we show success and clear cart and tell user to refresh.
  // But we can simulate by calling a special checkout endpoint - it's not implemented; we'll instead call a small endpoint by creating it via XHR to /api/checkout if available.
  const res = await fetch('/api/checkout', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId: state.userId, total }) });
  if(res.ok){ alert('Order placed'); state.cart = []; await fetchItems(); render(); } else { const d = await res.json(); alert(d.error || 'Checkout failed'); }
}

// Navigation
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>setView(b.dataset.view));

// Initial load
(async ()=>{ await fetchItems(); render(); })();

// Listen for potential server-sent changes
window.addEventListener('focus', ()=>{ fetchItems().then(()=>{ if(state.view==='dashboard' || state.view==='market') render(); }); });
