// IndexedDB storage: stores "questions" and "history"
let _db;
export const open=()=>_db||(_db=new Promise((res,rej)=>{const r=indexedDB.open('forma',1);
r.onupgradeneeded=()=>{r.result.createObjectStore('questions',{keyPath:'id'});r.result.createObjectStore('history',{keyPath:'id'})};
r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}));
const tx=async(s,m,f)=>{const d=await open();return new Promise((res,rej)=>{const t=d.transaction(s,m);const o=f(t.objectStore(s));t.oncomplete=()=>res(o&&o.result);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error)})};
export const all=s=>tx(s,'readonly',o=>o.getAll());
export const putMany=(s,a)=>tx(s,'readwrite',o=>{a.forEach(v=>o.put(v))});
export const delMany=(s,ks)=>tx(s,'readwrite',o=>{ks.forEach(k=>o.delete(k))});
export const clear=s=>tx(s,'readwrite',o=>o.clear());
