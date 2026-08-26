import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import {
  LayoutDashboard, Ticket, MonitorCog, Users, LogOut, Plus, Search,
  ShieldCheck, Activity, AlertTriangle, CheckCircle2, Menu, X,
  UserPlus, KeyRound, Pencil, Send, Mail, ArrowRight
} from "lucide-react";

type User = { id:number; name:string; email:string; role:string; department?:string };
type System = { id:number; system_code:string; system_name:string; department:string; location:string; status:string; ip_address?:string };
type TicketRow = {
  id:number; ticket_number:string; title:string; description:string;
  category:string; priority:string; status:string; system_code?:string;
  system_name?:string; creator_name:string; assignee_name?:string; assigned_to?:number;
  created_at:string; updated_at?:string; resolved_at?:string|null;
};

function formatDateTime(value?:string|null) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit"
  });
}
type TechUser = { id:number; name:string; role:string };
type Comment = { id:number; ticket_id:number; user_id:number; comment:string; created_at:string; user_name:string; role:string };
type UserRow = { id:number; name:string; email:string; role:string; department?:string; active:boolean; created_at:string };

const priorityClass: Record<string,string> = {
  LOW:"badge low", MEDIUM:"badge medium", HIGH:"badge high", CRITICAL:"badge critical"
};

const ROLE_LABEL: Record<string,string> = {
  EMPLOYEE: "Employee", TECHNICIAN: "Technician", ADMIN: "Administrator"
};

/* ---------------------------------- Auth ---------------------------------- */

function AuthPage({ onLogin }: { onLogin:(u:User, token:string)=>void }) {
  const [mode,setMode] = useState<"login"|"register">("login");

  return <div className="auth-page">
    <div className="auth-side">
      <div className="brand-mark"><ShieldCheck size={26}/></div>
      <h1>Service Desk</h1>
      <p>One place to raise, track and resolve operational issues — with your admin team notified the moment something needs attention.</p>
      <ul className="auth-points">
        <li><CheckCircle2 size={16}/> Raise a ticket in under a minute</li>
        <li><CheckCircle2 size={16}/> Admins are emailed instantly when you report an issue</li>
        <li><CheckCircle2 size={16}/> You're emailed the moment your ticket moves or resolves</li>
      </ul>
    </div>
    <div className="auth-form-wrap">
      <div className="auth-card">
        <div className="auth-tabs">
          <button className={mode==="login"?"auth-tab active":"auth-tab"} onClick={()=>setMode("login")}>Sign in</button>
          <button className={mode==="register"?"auth-tab active":"auth-tab"} onClick={()=>setMode("register")}>Create account</button>
        </div>
        {mode==="login" ? <LoginForm onLogin={onLogin}/> : <RegisterForm onLogin={onLogin} onDone={()=>setMode("login")}/>}
      </div>
    </div>
  </div>
}

function LoginForm({ onLogin }: { onLogin:(u:User, token:string)=>void }) {
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [error,setError] = useState("");
  const [loading,setLoading] = useState(false);

  async function submit(e:React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const data = await api("/auth/login",{method:"POST",body:JSON.stringify({email,password})});
      localStorage.setItem("token",data.token);
      localStorage.setItem("user",JSON.stringify(data.user));
      onLogin(data.user,data.token);
    } catch(err:any) { setError(err.message); }
    finally { setLoading(false); }
  }

  return <>
    <h2>Welcome back</h2>
    <p className="muted">Sign in with your work account.</p>
    <form onSubmit={submit}>
      <label>Work Email</label>
      <input value={email} onChange={e=>setEmail(e.target.value)} type="email" autoComplete="username" required autoFocus/>
      <label>Password</label>
      <input value={password} onChange={e=>setPassword(e.target.value)} type="password" autoComplete="current-password" required />
      {error && <div className="error">{error}</div>}
      <button className="primary full" disabled={loading}>{loading ? "Signing in..." : "Sign in"}<ArrowRight size={16}/></button>
    </form>
  </>
}

function RegisterForm({ onLogin, onDone }: { onLogin:(u:User, token:string)=>void; onDone:()=>void }) {
  const [name,setName] = useState("");
  const [department,setDepartment] = useState("");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [confirm,setConfirm] = useState("");
  const [error,setError] = useState("");
  const [loading,setLoading] = useState(false);

  async function submit(e:React.FormEvent) {
    e.preventDefault(); setError("");
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      const data = await api("/auth/register",{method:"POST",body:JSON.stringify({name,department,email,password})});
      localStorage.setItem("token",data.token);
      localStorage.setItem("user",JSON.stringify(data.user));
      onLogin(data.user,data.token);
      onDone();
    } catch(err:any) { setError(err.message); }
    finally { setLoading(false); }
  }

  return <>
    <h2>Create your account</h2>
    <p className="muted">Employees can self-register in seconds — no admin approval needed to sign in and start raising tickets.</p>
    <form onSubmit={submit}>
      <label>Full Name</label>
      <input value={name} onChange={e=>setName(e.target.value)} required placeholder="e.g. Priya Sharma" autoFocus/>
      <label>Department</label>
      <input value={department} onChange={e=>setDepartment(e.target.value)} required placeholder="e.g. Production, Quality, IT"/>
      <label>Work Email</label>
      <input value={email} onChange={e=>setEmail(e.target.value)} type="email" autoComplete="username" required />
      <label>Password</label>
      <input value={password} onChange={e=>setPassword(e.target.value)} type="password" minLength={8} autoComplete="new-password" required placeholder="At least 8 characters"/>
      <label>Confirm Password</label>
      <input value={confirm} onChange={e=>setConfirm(e.target.value)} type="password" minLength={8} autoComplete="new-password" required />
      {error && <div className="error">{error}</div>}
      <button className="primary full" disabled={loading}>{loading ? "Creating account..." : "Create account"}<ArrowRight size={16}/></button>
    </form>
    <p className="muted fine-print">New accounts are created as <strong>Employees</strong>. Need Technician or Admin access? Ask an administrator to update your role from the Users page.</p>
  </>
}

/* ---------------------------------- Shell ---------------------------------- */

export default function App() {
  const [user,setUser] = useState<User|null>(()=>JSON.parse(localStorage.getItem("user")||"null"));
  const [page,setPage] = useState("dashboard");
  const [mobile,setMobile] = useState(false);
  const [showChangePassword,setShowChangePassword] = useState(false);

  if (!user) return <AuthPage onLogin={(u)=>setUser(u)} />;

  const logout=()=>{localStorage.clear();setUser(null)};
  const nav = [
    ["dashboard","Dashboard",<LayoutDashboard size={18}/>],
    ["tickets","Tickets",<Ticket size={18}/>],
    ["systems","Systems",<MonitorCog size={18}/>],
    ...(user.role==="ADMIN" ? [["users","Users",<Users size={18}/>]] : [])
  ];

  return <div className="app-shell">
    <aside className={mobile?"sidebar open":"sidebar"}>
      <div className="sidebar-brand"><div className="small-logo"><Activity size={20}/></div><div><strong>Service Desk</strong><small>Operations Support</small></div></div>
      <div className="nav-title">Workspace</div>
      {nav.map(([key,label,icon])=><button key={String(key)} className={page===key?"nav-item active":"nav-item"} onClick={()=>{setPage(String(key));setMobile(false)}}>{icon}<span>{label}</span></button>)}
      <div className="sidebar-bottom">
        <div className="user-mini"><div className="avatar">{user.name.charAt(0)}</div><div><strong>{user.name}</strong><small>{ROLE_LABEL[user.role]||user.role}</small></div></div>
        <button className="nav-item" onClick={()=>setShowChangePassword(true)}><KeyRound size={18}/><span>Change Password</span></button>
        <button className="nav-item" onClick={logout}><LogOut size={18}/><span>Sign out</span></button>
      </div>
    </aside>

    <main className="main">
      <header className="topbar"><button className="mobile-menu" onClick={()=>setMobile(!mobile)}>{mobile?<X/>:<Menu/>}</button><div><strong>{page==="dashboard"?"Overview":page[0].toUpperCase()+page.slice(1)}</strong><span className="top-sub"> / Service Desk</span></div><div className="top-user"><span>{user.name}</span><span className="role-pill">{ROLE_LABEL[user.role]||user.role}</span></div></header>
      <div className="content">
        {page==="dashboard" && <Dashboard user={user} onNavigate={setPage}/>}
        {page==="tickets" && <Tickets user={user}/>}
        {page==="systems" && <Systems user={user}/>}
        {page==="users" && <UsersPage user={user}/>}
      </div>
    </main>
    {showChangePassword && <ChangePasswordModal onClose={()=>setShowChangePassword(false)}/>}
  </div>
}

function Dashboard({user,onNavigate}:{user:User,onNavigate:(page:string)=>void}) {
  const [summary,setSummary]=useState<any>(null);
  const [tickets,setTickets]=useState<TicketRow[]>([]);
  useEffect(()=>{ if(user.role!=="EMPLOYEE") api("/dashboard/summary").then(setSummary); api("/tickets").then(setTickets)},[user.role]);
  if(user.role==="EMPLOYEE") return <Tickets user={user} compactTitle="My Service Tickets"/>;
  return <div>
    <div className="page-head"><div><h2>Good day, {user.name.split(" ")[0]}</h2><p>Monitor systems and service operations across your organization.</p></div><button className="primary" onClick={()=>onNavigate("tickets")}><Plus size={17}/> New Ticket</button></div>
    <div className="stats">
      <Stat label="Active Systems" value={summary?.systems??"—"} icon={<MonitorCog/>}/>
      <Stat label="Open Tickets" value={summary?.openTickets??"—"} icon={<Ticket/>}/>
      <Stat label="Critical Issues" value={summary?.criticalTickets??"—"} icon={<AlertTriangle/>}/>
      <Stat label="Resolved Tickets" value={summary?.resolvedTickets??"—"} icon={<CheckCircle2/>}/>
    </div>
    <section className="panel"><div className="panel-head"><div><h3>Recent Service Tickets</h3><p>Latest incidents across your organization</p></div></div><TicketTable rows={tickets.slice(0,8)}/></section>
  </div>
}

function Stat({label,value,icon}:{label:string,value:any,icon:any}) {
  return <div className="stat"><div className="stat-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong></div></div>
}

/* --------------------------------- Tickets --------------------------------- */

function Tickets({user,compactTitle}:{user:User,compactTitle?:string}) {
  const [rows,setRows]=useState<TicketRow[]>([]);
  const [systems,setSystems]=useState<System[]>([]);
  const [technicians,setTechnicians]=useState<TechUser[]>([]);
  const [show,setShow]=useState(false);
  const [search,setSearch]=useState("");
  const [selected,setSelected]=useState<TicketRow|null>(null);
  const load=()=>api("/tickets").then(setRows);
  useEffect(()=>{
    load();
    api("/systems").then(setSystems);
    if(user.role!=="EMPLOYEE") api("/users/technicians").then(setTechnicians);
  },[user.role]);
  const filtered=useMemo(()=>rows.filter(t=>`${t.ticket_number} ${t.title} ${t.system_code}`.toLowerCase().includes(search.toLowerCase())),[rows,search]);

  return <div>
    <div className="page-head"><div><h2>{compactTitle||"Service Tickets"}</h2><p>Track, prioritize and resolve operational incidents.</p></div><button className="primary" onClick={()=>setShow(true)}><Plus size={17}/> Raise Ticket</button></div>
    <section className="panel">
      <div className="toolbar"><div className="search"><Search size={17}/><input placeholder="Search ticket, issue or system..." value={search} onChange={e=>setSearch(e.target.value)}/></div><span className="result-count">{filtered.length} tickets</span></div>
      <TicketTable rows={filtered} onOpen={setSelected}/>
    </section>
    {show&&<TicketModal systems={systems} onClose={()=>setShow(false)} onCreated={()=>{setShow(false);load()}}/>}
    {selected&&<TicketDetailModal ticket={selected} user={user} technicians={technicians} onClose={()=>setSelected(null)} onUpdated={()=>{setSelected(null);load()}}/>}
  </div>
}

function TicketTable({rows,onOpen}:{rows:TicketRow[],onOpen?:(t:TicketRow)=>void}) {
  if(!rows.length) return <div className="empty">No tickets found.</div>;
  return <div className="table-wrap"><table><thead><tr><th>Ticket</th><th>System</th><th>Issue</th><th>Priority</th><th>Status</th><th>Created by</th><th>Assigned to</th><th>Raised</th><th>Resolved</th></tr></thead><tbody>{rows.map(t=><tr key={t.id} className={onOpen?"clickable":""} onClick={()=>onOpen&&onOpen(t)}><td><strong>{t.ticket_number}</strong></td><td><span className="system-code">{t.system_code||"—"}</span><small>{t.system_name}</small></td><td><strong>{t.title}</strong><small>{t.category}</small></td><td><span className={priorityClass[t.priority]||"badge"}>{t.priority}</span></td><td><span className="status">{t.status.replace("_"," ")}</span></td><td>{t.creator_name}</td><td>{t.assignee_name||"—"}</td><td><small className="date-cell">{formatDateTime(t.created_at)}</small></td><td><small className="date-cell">{formatDateTime(t.resolved_at)}</small></td></tr>)}</tbody></table></div>
}

function TicketModal({systems,onClose,onCreated}:{systems:System[],onClose:()=>void,onCreated:()=>void}) {
  const [form,setForm]=useState({title:"",description:"",category:"Hardware",priority:"MEDIUM",system_id:""});
  const [error,setError]=useState("");
  const [saving,setSaving]=useState(false);
  async function submit(e:React.FormEvent){
    e.preventDefault();setError("");setSaving(true);
    try{await api("/tickets",{method:"POST",body:JSON.stringify({...form,system_id:Number(form.system_id)})});onCreated()}
    catch(e:any){setError(e.message)}
    finally{setSaving(false)}
  }
  return <Modal title="Raise Service Ticket" onClose={onClose}>
    <div className="mail-notice"><Mail size={14}/> Administrators are emailed automatically as soon as you submit this ticket.</div>
    <form onSubmit={submit} className="form-grid">
    <label>System<select required value={form.system_id} onChange={e=>setForm({...form,system_id:e.target.value})}><option value="">Select system</option>{systems.filter(s=>s.status==="ACTIVE").map(s=><option key={s.id} value={s.id}>{s.system_code} — {s.system_name}</option>)}</select></label>
    <label>Issue Title<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. CNC machine not connecting"/></label>
    <label>Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option>Hardware</option><option>Software</option><option>Network</option><option>Access</option><option>Other</option></select></label>
    <label>Priority<select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select></label>
    <label className="wide">Description<textarea required rows={5} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Describe the issue, symptoms and impact..."/></label>
    {error&&<div className="error wide">{error}</div>}<div className="modal-actions wide"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={saving}>{saving?"Submitting...":"Submit Ticket"}</button></div>
  </form></Modal>
}

function TicketDetailModal({ticket,user,technicians,onClose,onUpdated}:{ticket:TicketRow,user:User,technicians:TechUser[],onClose:()=>void,onUpdated:()=>void}) {
  const canManage = user.role==="ADMIN"||user.role==="TECHNICIAN";
  const [comments,setComments]=useState<Comment[]>([]);
  const [commentText,setCommentText]=useState("");
  const [status,setStatus]=useState(ticket.status);
  const [priority,setPriority]=useState(ticket.priority);
  const [assignedTo,setAssignedTo]=useState(ticket.assigned_to?String(ticket.assigned_to):"");
  const [saving,setSaving]=useState(false);
  const [posting,setPosting]=useState(false);
  const [error,setError]=useState("");

  const loadComments=()=>api(`/tickets/${ticket.id}/comments`).then(setComments);
  useEffect(()=>{loadComments()},[ticket.id]);

  async function saveChanges(){
    setSaving(true);setError("");
    try{
      await api(`/tickets/${ticket.id}`,{method:"PATCH",body:JSON.stringify({status,priority,assigned_to:assignedTo?Number(assignedTo):null})});
      onUpdated();
    }catch(e:any){setError(e.message)}
    finally{setSaving(false)}
  }

  async function addComment(e:React.FormEvent){
    e.preventDefault();
    if(!commentText.trim())return;
    setPosting(true);setError("");
    try{
      await api(`/tickets/${ticket.id}/comments`,{method:"POST",body:JSON.stringify({comment:commentText.trim()})});
      setCommentText("");
      await loadComments();
    }catch(e:any){setError(e.message)}
    finally{setPosting(false)}
  }

  const statusChanged = status !== ticket.status && ["IN_PROGRESS","RESOLVED","CLOSED"].includes(status);

  return <Modal title={`${ticket.ticket_number} — ${ticket.title}`} subtitle={`${ticket.system_code||"—"} · ${ticket.category}`} onClose={onClose}>
    <div className="ticket-detail">
      <div className="ticket-meta">
        <span className={priorityClass[ticket.priority]||"badge"}>{ticket.priority}</span>
        <span className="status">{ticket.status.replace("_"," ")}</span>
      </div>
      <p className="ticket-desc">{ticket.description}</p>
      <div className="ticket-submeta">
        <span>Raised by {ticket.creator_name}</span>
        <span>Assigned to {ticket.assignee_name||"Unassigned"}</span>
        <span>Raised on {formatDateTime(ticket.created_at)}</span>
        <span>Resolved on {formatDateTime(ticket.resolved_at)}</span>
      </div>

      {canManage && <div className="form-grid ticket-controls">
        <label>Status<select value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="OPEN">OPEN</option>
          <option value="IN_PROGRESS">IN PROGRESS</option>
          <option value="RESOLVED">RESOLVED</option>
          <option value="CLOSED">CLOSED</option>
        </select></label>
        <label>Priority<select value={priority} onChange={e=>setPriority(e.target.value)}>
          <option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option>
        </select></label>
        <label className="wide">Assign to<select value={assignedTo} onChange={e=>setAssignedTo(e.target.value)}>
          <option value="">Unassigned</option>
          {technicians.map(t=><option key={t.id} value={t.id}>{t.name} ({t.role})</option>)}
        </select></label>
        {statusChanged && <div className="mail-notice wide"><Mail size={14}/> {ticket.creator_name} will be emailed about this status change when you save.</div>}
        <div className="modal-actions wide" style={{borderTop:"none",paddingTop:0}}>
          <button type="button" className="primary" disabled={saving} onClick={saveChanges}>{saving?"Saving...":"Save Changes"}</button>
        </div>
      </div>}
      {error && <div className="error" style={{marginBottom:14}}>{error}</div>}

      <div className="comment-thread">
        <h4>Activity</h4>
        {!comments.length && <p className="muted">No comments yet.</p>}
        {comments.map(c=><div className="comment" key={c.id}>
          <div className="comment-head"><strong>{c.user_name}</strong><span className="role-pill">{ROLE_LABEL[c.role]||c.role}</span><small>{new Date(c.created_at).toLocaleString()}</small></div>
          <p>{c.comment}</p>
        </div>)}
      </div>
      <form onSubmit={addComment} className="comment-form">
        <textarea rows={2} placeholder="Add an update or note..." value={commentText} onChange={e=>setCommentText(e.target.value)} />
        <button className="primary" disabled={posting}><Send size={15}/></button>
      </form>
    </div>
  </Modal>
}

/* --------------------------------- Systems --------------------------------- */

function Systems({user}:{user:User}) {
  const [rows,setRows]=useState<System[]>([]);
  const [show,setShow]=useState(false);
  const [editing,setEditing]=useState<System|null>(null);
  const isAdmin = user.role==="ADMIN";
  const load=()=>api("/systems").then(setRows);
  useEffect(()=>{load()},[]);
  return <div><div className="page-head"><div><h2>Systems</h2><p>Manage the systems available for service-ticket reporting.</p></div>{isAdmin&&<button className="primary" onClick={()=>setShow(true)}><Plus size={17}/> Add System</button>}</div>
  <section className="panel"><div className="toolbar"><strong>{rows.length} registered systems</strong><span className="result-count">Admin configurable</span></div><div className="system-grid">{rows.map(s=><div className="system-card" key={s.id}><div className="system-top"><span className="system-code">{s.system_code}</span><span className={s.status==="ACTIVE"?"online":"offline"}>● {s.status}</span></div><h3>{s.system_name}</h3><p>{s.department} · {s.location}</p>{s.ip_address&&<small>IP {s.ip_address}</small>}{isAdmin&&<button className="icon-btn system-edit-btn" onClick={()=>setEditing(s)}><Pencil size={14}/></button>}</div>)}</div></section>
  {show&&<SystemModal onClose={()=>setShow(false)} onSaved={()=>{setShow(false);load()}}/>}
  {editing&&<SystemModal system={editing} onClose={()=>setEditing(null)} onSaved={()=>{setEditing(null);load()}}/>}
  </div>
}

function SystemModal({system,onClose,onSaved}:{system?:System,onClose:()=>void,onSaved:()=>void}) {
  const isEdit = Boolean(system);
  const [f,setF]=useState({
    system_code: system?.system_code || "",
    system_name: system?.system_name || "",
    department: system?.department || "Production",
    location: system?.location || "Production Line A",
    ip_address: system?.ip_address || "",
    status: system?.status || "ACTIVE"
  });
  const [error,setError]=useState("");
  const [saving,setSaving]=useState(false);
  async function submit(e:React.FormEvent){
    e.preventDefault();setError("");setSaving(true);
    try{
      if (isEdit) {
        const { system_name, department, location, ip_address, status } = f;
        await api(`/systems/${system!.id}`,{method:"PATCH",body:JSON.stringify({system_name,department,location,ip_address,status})});
      } else {
        await api("/systems",{method:"POST",body:JSON.stringify(f)});
      }
      onSaved();
    }
    catch(e:any){setError(e.message)}
    finally{setSaving(false)}
  }
  return <Modal title={isEdit?`Edit ${system!.system_code}`:"Add System"} onClose={onClose}><form onSubmit={submit} className="form-grid">
    <label>System Code<input required disabled={isEdit} value={f.system_code} onChange={e=>setF({...f,system_code:e.target.value})} placeholder="SYS-031"/></label>
    <label>System Name<input required value={f.system_name} onChange={e=>setF({...f,system_name:e.target.value})} placeholder="CNC Machine 31"/></label>
    <label>Department<input required value={f.department} onChange={e=>setF({...f,department:e.target.value})}/></label>
    <label>Location<input required value={f.location} onChange={e=>setF({...f,location:e.target.value})}/></label>
    <label>IP Address<input value={f.ip_address} onChange={e=>setF({...f,ip_address:e.target.value})} placeholder="192.168.1.131"/></label>
    <label>Status<select value={f.status} onChange={e=>setF({...f,status:e.target.value})}><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option><option value="MAINTENANCE">MAINTENANCE</option></select></label>
    {error&&<div className="error wide">{error}</div>}<div className="modal-actions wide"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={saving}>{saving?"Saving...":isEdit?"Save Changes":"Add System"}</button></div>
  </form></Modal>
}

/* ---------------------------------- Users ---------------------------------- */

function UsersPage({user}:{user:User}) {
  const [rows,setRows]=useState<UserRow[]>([]);
  const [showAdd,setShowAdd]=useState(false);
  const [editing,setEditing]=useState<UserRow|null>(null);
  const [search,setSearch]=useState("");
  const load=()=>api("/users").then(setRows);
  useEffect(()=>{load()},[]);
  const filtered = useMemo(()=>rows.filter(u=>`${u.name} ${u.email} ${u.department}`.toLowerCase().includes(search.toLowerCase())),[rows,search]);

  return <div>
    <div className="page-head"><div><h2>Employee Directory</h2><p>View and edit every employee, technician and administrator account.</p></div><button className="primary" onClick={()=>setShowAdd(true)}><UserPlus size={17}/> Add User</button></div>
    <section className="panel">
      <div className="toolbar"><div className="search"><Search size={17}/><input placeholder="Search name, email or department..." value={search} onChange={e=>setSearch(e.target.value)}/></div><span className="result-count">{filtered.length} of {rows.length} accounts</span></div>
      <div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Role</th><th>Status</th><th></th></tr></thead><tbody>
        {filtered.map(u=><tr key={u.id}>
          <td><strong>{u.name}</strong></td>
          <td>{u.email}</td>
          <td>{u.department||"—"}</td>
          <td><span className="role-pill">{ROLE_LABEL[u.role]||u.role}</span></td>
          <td><span className={u.active?"online":"offline"}>● {u.active?"Active":"Inactive"}</span></td>
          <td><button className="icon-btn" onClick={()=>setEditing(u)}><Pencil size={15}/></button></td>
        </tr>)}
      </tbody></table></div>
    </section>
    {showAdd&&<AddUserModal onClose={()=>setShowAdd(false)} onCreated={()=>{setShowAdd(false);load()}}/>}
    {editing&&<EditUserModal user={editing} currentUserId={user.id} onClose={()=>setEditing(null)} onSaved={()=>{setEditing(null);load()}}/>}
  </div>
}

function AddUserModal({onClose,onCreated}:{onClose:()=>void,onCreated:()=>void}) {
  const [f,setF]=useState({name:"",email:"",password:"",role:"EMPLOYEE",department:""});
  const [error,setError]=useState("");
  const [saving,setSaving]=useState(false);
  async function submit(e:React.FormEvent){
    e.preventDefault();setError("");setSaving(true);
    try{await api("/users",{method:"POST",body:JSON.stringify(f)});onCreated()}
    catch(e:any){setError(e.message)}
    finally{setSaving(false)}
  }
  return <Modal title="Add User" subtitle="Set a temporary password — the employee can change it after signing in." onClose={onClose}><form onSubmit={submit} className="form-grid">
    <label>Full Name<input required value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></label>
    <label>Work Email<input required type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})}/></label>
    <label>Temporary Password<input required type="password" minLength={8} value={f.password} onChange={e=>setF({...f,password:e.target.value})} placeholder="At least 8 characters"/></label>
    <label>Role<select value={f.role} onChange={e=>setF({...f,role:e.target.value})}><option value="EMPLOYEE">Employee</option><option value="TECHNICIAN">Technician</option><option value="ADMIN">Administrator</option></select></label>
    <label className="wide">Department<input value={f.department} onChange={e=>setF({...f,department:e.target.value})} placeholder="e.g. Production"/></label>
    {error&&<div className="error wide">{error}</div>}
    <div className="modal-actions wide"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={saving}>{saving?"Creating...":"Create User"}</button></div>
  </form></Modal>
}

function EditUserModal({user:u,currentUserId,onClose,onSaved}:{user:UserRow,currentUserId:number,onClose:()=>void,onSaved:()=>void}) {
  const [name,setName]=useState(u.name);
  const [email,setEmail]=useState(u.email);
  const [role,setRole]=useState(u.role);
  const [department,setDepartment]=useState(u.department||"");
  const [active,setActive]=useState(u.active);
  const [newPassword,setNewPassword]=useState("");
  const [error,setError]=useState("");
  const [resetMsg,setResetMsg]=useState("");
  const [saving,setSaving]=useState(false);
  const [resetting,setResetting]=useState(false);
  const isSelf = u.id===currentUserId;

  async function save(){
    setSaving(true);setError("");
    try{await api(`/users/${u.id}`,{method:"PATCH",body:JSON.stringify({name,email,role,department,active})});onSaved()}
    catch(e:any){setError(e.message)}
    finally{setSaving(false)}
  }
  async function resetPassword(e:React.FormEvent){
    e.preventDefault();setError("");setResetMsg("");
    if(newPassword.length<8){setError("Password must be at least 8 characters");return}
    setResetting(true);
    try{await api(`/users/${u.id}/reset-password`,{method:"POST",body:JSON.stringify({password:newPassword})});setResetMsg("Password updated.");setNewPassword("")}
    catch(e:any){setError(e.message)}
    finally{setResetting(false)}
  }

  return <Modal title={`Edit ${u.name}`} subtitle={u.email} onClose={onClose}>
    <div className="form-grid">
      <label>Full Name<input value={name} onChange={e=>setName(e.target.value)}/></label>
      <label>Work Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
      <label>Role<select value={role} onChange={e=>setRole(e.target.value)}><option value="EMPLOYEE">Employee</option><option value="TECHNICIAN">Technician</option><option value="ADMIN">Administrator</option></select></label>
      <label>Department<input value={department} onChange={e=>setDepartment(e.target.value)}/></label>
      <label className="wide checkbox-row"><input type="checkbox" checked={active} disabled={isSelf} onChange={e=>setActive(e.target.checked)}/> Account active{isSelf&&" — you can't deactivate your own account"}</label>
      {error&&<div className="error wide">{error}</div>}
      <div className="modal-actions wide"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button type="button" className="primary" disabled={saving} onClick={save}>{saving?"Saving...":"Save Changes"}</button></div>
    </div>
    <form onSubmit={resetPassword} className="form-grid section-divider">
      <label className="wide">Reset Password<input type="password" minLength={8} value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="New temporary password"/></label>
      {resetMsg&&<div className="wide success-text">{resetMsg}</div>}
      <div className="modal-actions wide"><button className="secondary" disabled={resetting}>{resetting?"Resetting...":"Set New Password"}</button></div>
    </form>
  </Modal>
}

function ChangePasswordModal({onClose}:{onClose:()=>void}) {
  const [currentPassword,setCurrentPassword]=useState("");
  const [newPassword,setNewPassword]=useState("");
  const [confirm,setConfirm]=useState("");
  const [error,setError]=useState("");
  const [success,setSuccess]=useState(false);
  const [saving,setSaving]=useState(false);

  async function submit(e:React.FormEvent){
    e.preventDefault();setError("");
    if(newPassword!==confirm){setError("New passwords do not match");return}
    if(newPassword.length<8){setError("New password must be at least 8 characters");return}
    setSaving(true);
    try{await api("/auth/change-password",{method:"POST",body:JSON.stringify({currentPassword,newPassword})});setSuccess(true)}
    catch(e:any){setError(e.message)}
    finally{setSaving(false)}
  }

  return <Modal title="Change Password" subtitle="" onClose={onClose}>
    {success ? <div className="form-grid">
      <div className="wide success-text" style={{padding:"10px 0"}}>Password updated successfully.</div>
      <div className="modal-actions wide"><button className="primary" onClick={onClose}>Done</button></div>
    </div> : <form onSubmit={submit} className="form-grid">
      <label className="wide">Current Password<input required type="password" autoComplete="current-password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/></label>
      <label>New Password<input required type="password" minLength={8} autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></label>
      <label>Confirm New Password<input required type="password" minLength={8} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
      {error&&<div className="error wide">{error}</div>}
      <div className="modal-actions wide"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={saving}>{saving?"Saving...":"Update Password"}</button></div>
    </form>}
  </Modal>
}

function Modal({title,subtitle,onClose,children}:{title:string,subtitle?:string,onClose:()=>void,children:any}) {
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><h3>{title}</h3><p>{subtitle===undefined?"Enter the required information below.":subtitle}</p></div><button className="icon-btn" onClick={onClose}><X/></button></div>{children}</div></div>
}
