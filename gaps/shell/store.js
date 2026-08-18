/* Storage.
   One interface over three backends, tried in order:
     1. window.storage  - the Claude artifact API, if present
     2. localStorage    - the real answer on bennorris.com
     3. memory          - private browsing, or storage denied
   Modules never learn which one they got. `Store.ok` is false only when
   nothing was actually persisted, which the shell surfaces as "session only".
*/

const PREFIX = "gaps:";
const memory = new Map();

function localWorks(){
  try{
    const k = PREFIX + "__probe";
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return true;
  }catch(e){ return false; }
}

const backend = (() => {
  if(typeof window !== "undefined" && window.storage && typeof window.storage.set === "function") return "artifact";
  if(typeof localStorage !== "undefined" && localWorks()) return "local";
  return "memory";
})();

export const Store = {
  ok: backend !== "memory",
  backend,

  async load(key){
    try{
      if(backend === "artifact"){
        const r = await window.storage.get(key);
        return r && r.value ? JSON.parse(r.value) : null;
      }
      if(backend === "local"){
        const v = localStorage.getItem(PREFIX + key);
        return v ? JSON.parse(v) : null;
      }
      return memory.get(key) ?? null;
    }catch(e){
      return null;                       // absent or unreadable is not a failure
    }
  },

  async save(key, value){
    const json = JSON.stringify(value);
    try{
      if(backend === "artifact"){
        await window.storage.set(key, json);
      }else if(backend === "local"){
        localStorage.setItem(PREFIX + key, json);
      }else{
        memory.set(key, value);
        this.ok = false;
        return false;
      }
      this.ok = true;
      return true;
    }catch(e){
      memory.set(key, value);            // never lose the person's work
      this.ok = false;
      return false;
    }
  },

  async remove(key){
    try{
      if(backend === "artifact") await window.storage.delete(key);
      else if(backend === "local") localStorage.removeItem(PREFIX + key);
      memory.delete(key);
      return true;
    }catch(e){ return false; }
  }
};
