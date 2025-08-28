const { useState, useEffect } = React;

function useApi(path){
  const [data, setData] = useState(null);
  useEffect(()=>{ fetch(path).then(r=>r.json()).then(setData).catch(()=>{}); }, [path]);
  return [data, ()=>fetch(path).then(r=>r.json()).then(setData)];
}

function TopBar({ account, onLogout }){
  return (
    <header className="w-full max-w-xl bg-gradient-to-r from-slate-800 via-slate-900 to-emerald-800 rounded-xl p-4 shadow-lg mb-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <div className="text-emerald-300 text-sm font-semibold">CARBON POINTS</div>
          <div className="text-white text-base sm:text-2xl font-bold">Earn rewards for sustainable living</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm text-emerald-200">Welcome</div>
            <div className="text-white font-semibold">{account ? (account.role === 'farmer' ? 'Farmer' : 'User') : 'Guest'}</div>
          </div>
          {account && (
            <button onClick={onLogout} className="px-3 py-1 bg-slate-700 text-slate-200 rounded-md text-sm">Logout</button>
          )}
        </div>
      </div>
    </header>
  );
}

function TabButton({ label, active, onClick }){
  return (
  <button onClick={onClick} className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${active? 'bg-emerald-500 text-slate-900' : 'bg-slate-800 text-slate-300'}`}>
      {label}
    </button>
  );
}

function Badge({children}){ return (<span className="ml-2 inline-block bg-emerald-600 text-slate-900 text-xs px-2 py-0.5 rounded-full">{children}</span>); }

function Dashboard({ user, items, onView }){
  return (
    <div className="w-full max-w-xl">
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-2xl p-6 text-center text-slate-900 shadow-xl">
        <div className="text-sm">Your Carbon Points</div>
  <div className="text-4xl sm:text-5xl font-bold my-2">{user?.points ?? 0}</div>
        <div className="text-sm">Equivalent to {((user?.points ?? 0)/10).toFixed(1)} kg CO2 saved</div>
      </div>

      <div className="mt-4 bg-slate-800 rounded-xl p-4 shadow">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-slate-100 font-semibold">Farmers Marketplace</h3>
          <button className="text-sm text-emerald-300" onClick={()=>onView('market')}>View all</button>
        </div>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items?.slice(0,4).map(it=> (
            <div key={it.id} className="bg-gradient-to-br from-slate-700 to-slate-800 p-3 rounded-lg shadow-sm">
              <div className="font-semibold">{it.name}</div>
              <div className="text-xs text-slate-400">{it.description}</div>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-emerald-300 font-bold">{it.price} pts</div>
    <button className="px-3 py-1 bg-emerald-500 text-slate-900 rounded-lg text-sm" onClick={()=>onView && onView('market')}>View</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 bg-slate-800 rounded-xl p-4 shadow">
        <h3 className="text-slate-100 font-semibold mb-2">Leaderboard</h3>
        <ol className="space-y-2">
          <li className="flex justify-between text-sm"><span>1. Abhishek</span><span className="text-emerald-300">2450 pts</span></li>
          <li className="flex justify-between text-sm"><span>2. Slavin</span><span className="text-emerald-300">2100 pts</span></li>
          <li className="flex justify-between text-sm"><span>3. Rajeev</span><span className="text-emerald-300">1980 pts</span></li>
        </ol>
      </div>
    </div>
  );
}

function Upload({ onUploaded, account, userData }){
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState(null);
  const [uploads, setUploads] = useState([]);

  async function loadUploads(){
    if(!account) return;
    // prefer using parent-provided userData (which is cached/merged) so uploads persist across instances
    if (userData && Array.isArray(userData.uploads)) {
      setUploads(userData.uploads);
      return;
    }
    try{
      const res = await fetch('/api/user/'+account.id);
      const data = await res.json();
      setUploads(data.uploads || []);
    }catch(e){/*ignore*/}
  }

  useEffect(()=>{ loadUploads(); }, [account]);

  async function submit(e){
    e.preventDefault();
    if(!file) return setStatus('Select an image');
    setStatus('Uploading...');
    // convert file to data URL
    const toDataUrl = (file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    let dataUrl;
    try { dataUrl = await toDataUrl(file); } catch(e){ setStatus('Failed to read file'); return; }

    const res = await fetch('/api/upload', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ userId: account?.id || 'user1', filename: file.name, dataUrl }) });
    const data = await res.json();
    if(res.ok){
      setStatus('Uploaded: +' + (data.upload?.points || 0) + ' pts');
      // update parent and local state from returned user object when available
      if(onUploaded) await onUploaded(data.user);
      if (data.user && data.user.uploads) setUploads(data.user.uploads);
      else setUploads(u=> (u.concat([data.upload])) );
      // also update dashboard via parent refreshAll helper (pass user)
      try{ if(onUploaded) await onUploaded(data.user); }catch(e){}
    } else setStatus(data.error || 'Failed');
  }

  return (
    <div className="w-full max-w-xl">
      <div className="bg-slate-800 p-4 rounded-xl shadow">
        <h3 className="font-semibold mb-2">Upload planting image</h3>
        <form onSubmit={submit} className="space-y-3">
          <input type="file" accept="image/*" onChange={e=>setFile(e.target.files[0])} className="block w-full text-sm text-slate-200" />
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-emerald-500 rounded-lg text-slate-900 font-semibold">Upload</button>
            <div className="text-sm text-slate-400 self-center">{status}</div>
          </div>
        </form>
      </div>

      <div className="mt-4 bg-slate-800 p-3 rounded-xl shadow">
        <h4 className="font-semibold mb-2">Your uploads</h4>
        {uploads.length===0 && <div className="text-sm text-slate-400">No uploads yet</div>}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
          {uploads.map(u=> (
            <div key={u.id} className="bg-slate-700 p-2 rounded">
              <img src={u.file} className="w-full h-24 object-cover rounded" />
              <div className="text-xs text-slate-300 mt-1">+{u.points} pts</div>
              <div className="text-2xs text-slate-500">{new Date(u.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FarmerAdd({ onAdd }){
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [desc, setDesc] = useState('');
  const [msg, setMsg] = useState(null);
  async function submit(e){
    e.preventDefault();
    const res = await fetch('/api/items', { method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ name, price, description: desc }) });
    const data = await res.json();
    if(res.ok){ setMsg('Item added'); onAdd(); setName(''); setPrice(''); setDesc(''); } else setMsg(data.error || 'Failed');
  }
  return (
    <div className="w-full max-w-xl bg-slate-800 p-4 rounded-xl shadow">
      <h3 className="font-semibold mb-2">Farmer - Add Item</h3>
      <form onSubmit={submit} className="space-y-3">
        <input className="w-full p-2 rounded bg-slate-700 text-slate-100" placeholder="Name" value={name} onChange={e=>setName(e.target.value)} required />
        <input className="w-full p-2 rounded bg-slate-700 text-slate-100" placeholder="Price (pts)" value={price} onChange={e=>setPrice(e.target.value)} required />
        <input className="w-full p-2 rounded bg-slate-700 text-slate-100" placeholder="Description" value={desc} onChange={e=>setDesc(e.target.value)} />
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 bg-emerald-500 rounded-lg text-slate-900 font-semibold">Add Item</button>
          <div className="text-sm text-slate-400">{msg}</div>
        </div>
      </form>
    </div>
  );
}

function Marketplace({ items, onAdd }){
  return (
    <div className="w-full max-w-xl">
      <div className="grid gap-3">
        {items?.map(it=> (
          <div key={it.id} className="bg-slate-800 p-3 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <div className="font-semibold">{it.name}</div>
              <div className="text-sm text-slate-400">{it.description}</div>
            </div>
            <div className="text-right">
              <div className="text-emerald-300 font-bold">{it.price} pts</div>
              <button className="mt-2 px-3 py-1 bg-emerald-500 rounded-lg text-slate-900 text-sm" onClick={()=>onAdd(it.id)}>Add</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CartView({ items, cart, onRemove, onCheckout, user }){
  const total = cart.reduce((s,id)=>{ const it = items.find(x=>x.id===id); return s + (it?it.price:0); },0);
  return (
    <div className="w-full max-w-xl bg-slate-800 p-4 rounded-xl shadow">
      <h3 className="font-semibold mb-2">Your Cart</h3>
      <div className="space-y-2">
        {cart.map(id=>{ const it = items.find(x=>x.id===id); return (
          <div key={id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-700 p-2 rounded">
            <div>
              <div className="font-medium">{it.name}</div>
              <div className="text-sm text-slate-400">{it.description}</div>
            </div>
            <div className="text-right">
              <div className="text-emerald-300 font-bold">{it.price} pts</div>
              <button className="mt-2 text-xs text-slate-200" onClick={()=>onRemove(id)}>Remove</button>
            </div>
          </div>
        )})}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm text-slate-400">Total</div>
        <div className="text-emerald-300 font-bold">{total} pts</div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button className="px-4 py-2 bg-emerald-500 rounded-lg text-slate-900 font-semibold" onClick={()=>onCheckout(total)}>Checkout</button>
        <div className="text-sm text-slate-400">You have {user?.points ?? 0} pts</div>
      </div>
    </div>
  );
}

function Login({onLogin}){
  // Hardcoded demo users:
  // client -> id: user1, role: user
  // farmer -> id: farmer1, role: farmer
  return (
    <div className="w-full max-w-xl bg-slate-800 p-4 rounded-xl shadow text-center">
      <h2 className="text-xl font-bold text-emerald-300 mb-2">Select demo account</h2>
      <div className="flex gap-3 justify-center">
        <button className="px-4 py-2 bg-emerald-500 text-slate-900 rounded-lg font-semibold" onClick={()=>onLogin({ id: 'user1', role: 'user' })}>Client</button>
        <button className="px-4 py-2 bg-slate-700 text-slate-100 rounded-lg font-semibold" onClick={()=>onLogin({ id: 'farmer1', role: 'farmer' })}>Farmer</button>
      </div>
      <div className="text-sm text-slate-400 mt-3">This is a demo. Credentials are hardcoded.</div>
    </div>
  );
}

function App(){
  const [view, setView] = useState('dashboard');
  const [items, refreshItems] = useApi('/api/items');
  const [userData, setUserData] = useState(null);
  const [cart, setCart] = useState([]);
  const [account, setAccount] = useState(()=>{
    try{ return JSON.parse(localStorage.getItem('account')); }catch(e){ return null; }
  });

  useEffect(()=>{
    if(!account) return;
    // load cached user data first so UI is responsive
    try{
      const cached = JSON.parse(localStorage.getItem('userData_' + account.id));
      if (cached) setUserData(cached);
    }catch(e){}

    // then fetch server and merge with cache to avoid losing uploads from ephemeral writes
    fetch('/api/user/'+account.id).then(r=>r.json()).then(serverUser=>{
      try{
        const cached = JSON.parse(localStorage.getItem('userData_' + account.id)) || {};
        const map = {};
        const mergedUploads = [];
        (serverUser.uploads || []).concat(cached.uploads || []).forEach(u=>{ if(!map[u.id]){ map[u.id]=u; mergedUploads.push(u); } });
        const points = Math.max(Number(serverUser.points||0), Number(cached.points||0));
        const merged = {...serverUser, uploads: mergedUploads, points };
        setUserData(merged);
        localStorage.setItem('userData_' + account.id, JSON.stringify(merged));
      }catch(e){ setUserData(serverUser); }
    }).catch(()=>{});
  }, [account]);
  async function refreshAll(userParam){
    await refreshItems();
    if (userParam) {
      setUserData(userParam);
      try{ localStorage.setItem('userData_' + account.id, JSON.stringify(userParam)); }catch(e){}
    } else if (account) {
      const serverUser = await (await fetch('/api/user/'+account.id)).json();
      try{
        const cached = JSON.parse(localStorage.getItem('userData_' + account.id)) || {};
        const map = {};
        const mergedUploads = [];
        (serverUser.uploads || []).concat(cached.uploads || []).forEach(u=>{ if(!map[u.id]){ map[u.id]=u; mergedUploads.push(u); } });
        const points = Math.max(Number(serverUser.points||0), Number(cached.points||0));
        const merged = {...serverUser, uploads: mergedUploads, points };
        setUserData(merged);
        localStorage.setItem('userData_' + account.id, JSON.stringify(merged));
      }catch(e){ setUserData(serverUser); }
    }
  }

  useEffect(()=>{ refreshAll(); }, [account]);

  function onLogin(acc){ setAccount(acc); localStorage.setItem('account', JSON.stringify(acc)); setView('dashboard'); }
  function logout(){
    // Do not remove cached userData on logout so users returning to the app still see their points/uploads
    // (serverless storage is ephemeral; cache improves UX).
    setAccount(null);
    localStorage.removeItem('account');
    setUserData(null);
    setCart([]);
  }

  const [toast, setToast] = useState(null);
  function addToCart(id){ setCart(s=>[...s,id]); setToast('Added to cart'); setTimeout(()=>setToast(null), 1800); }
  function removeFromCart(id){ setCart(s=>s.filter(x=>x!==id)); }
  async function checkout(total){
    if(!account) return alert('Login first');
    const res = await fetch('/api/checkout', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId: account.id, total }) });
    const d = await res.json();
    if(res.ok){ alert('Order placed'); setCart([]); setUserData(u=>({...u, points: d.points})); } else alert(d.error || 'Checkout failed');
  }
  
  // update local cache when points change via checkout
  useEffect(()=>{
    if(!account || !userData) return;
    try{ localStorage.setItem('userData_' + account.id, JSON.stringify(userData)); }catch(e){}
  }, [userData]);

  // If not logged in, show Login
  if(!account) return (
    <div className="flex flex-col items-center gap-4">
      <TopBar />
      <Login onLogin={onLogin} />
      <div className="text-sm text-slate-500 mt-4">Choose Client to test uploads/marketplace, Farmer to add items.</div>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <TopBar account={account} userData={userData} onLogout={logout} />

      <div className="w-full max-w-xl px-2">
        <div className="flex gap-2 overflow-x-auto pb-2 items-center">
          <TabButton label="Dashboard" active={view==='dashboard'} onClick={()=>setView('dashboard')} />
          {account.role==='user' && <TabButton label="Upload" active={view==='upload'} onClick={()=>setView('upload')} />}
          <TabButton label="Marketplace" active={view==='market'} onClick={()=>setView('market')} />
          {account.role==='farmer' && <TabButton label="Farmer" active={view==='farmer'} onClick={()=>setView('farmer')} />}
          <div className="relative">
            <TabButton label="Cart" active={view==='cart'} onClick={()=>setView('cart')} />
            {cart.length>0 && <div className="absolute -top-1 -right-1"><Badge>{cart.length}</Badge></div>}
          </div>
        </div>
      </div>

      <div className="w-full flex justify-center">
        <div className="w-full max-w-xl px-2">
          {view==='dashboard' && <Dashboard user={userData} items={items||[]} onView={setView} />}
          {view==='upload' && account.role==='user' && <Upload onUploaded={refreshAll} account={account} userData={userData} />}
          {view==='farmer' && account.role==='farmer' && <FarmerAdd onAdd={refreshItems} />}
          {view==='market' && <Marketplace items={items||[]} onAdd={addToCart} />}
          {view==='cart' && <CartView items={items||[]} cart={cart} onRemove={removeFromCart} onCheckout={checkout} user={userData} />}
        </div>
      </div>

      <div className="text-xs text-slate-500 mt-4">Prototype - local demo</div>
      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-6 bg-slate-800 text-slate-100 px-4 py-2 rounded-lg shadow-lg">{toast}</div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
