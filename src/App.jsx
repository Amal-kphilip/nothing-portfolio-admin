import React, { useState, useEffect } from "react";
import { Loader2, Lock, Upload, Image as ImageIcon, Cpu, X, Edit, Trash2, RotateCcw } from "lucide-react";
import { createClient } from '@supabase/supabase-js'

// --- SUPABASE CONFIG ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// --- UTILS ---
const processImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7); 
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const GlobalStyles = () => (
  <style>{`
    @font-face { font-family: 'Ndot55'; src: url('Ndot55Caps-Regular.otf') format('opentype'); }
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&display=swap');
    :root { --nothing-red: #D71921; }
    body { font-family: 'Inter', sans-serif; background-color: #000; color: #fff; }
    .font-dot { font-family: 'Ndot55', monospace !important; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #D71921; }
  `}</style>
);

// --- MAIN ADMIN APP ---
export default function AdminApp() {
  const [activeTab, setActiveTab] = useState('projects');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState(false);

  // Edit State
  const [editingId, setEditingId] = useState(null);
  const [newProject, setNewProject] = useState({ title: '', brand: '', description: '', tags: '', link: '#' });
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  // Hero Image State
  const [heroPreview, setHeroPreview] = useState('');
  const [heroLoading, setHeroLoading] = useState(false);

  // 1. Check if logged in (from Supabase Session or Local Password)
  useEffect(() => {
     checkSession();
  }, []);

  const checkSession = async () => {
    // Check if session exists (if you used Supabase Auth)
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setIsAuthenticated(true);
      fetchProjects();
      fetchHeroConfig();
    }
  };

  const fetchProjects = async () => {
    const { data } = await supabase.from('portfolio_projects').select('*').order('created_at', { ascending: false });
    setProjects(data || []);
  };

  const fetchHeroConfig = async () => {
    const { data } = await supabase.from('site_config').select('value').eq('key', 'hero_image').single();
    if (data) setHeroPreview(data.value);
  };

const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const adminEmail = "amalkphilip2005@gmail.com"; 

    // This logs you into the Database properly
    const { error } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: passwordInput,
    });

    if (error) {
      console.error("Login Error:", error.message);
      setAuthError(true);
    } else {
      setIsAuthenticated(true);
      setAuthError(false);
      fetchProjects();
      fetchHeroConfig();
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setPasswordInput("");
  };

  const handleImageSelect = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const processedBase64 = await processImage(file);
      if (type === 'project') {
        setPreviewUrl(URL.createObjectURL(file));
        setSelectedImage(processedBase64);
      } else {
        setHeroPreview(processedBase64);
      }
    } catch (err) { console.error(err); }
  };

const saveHeroImage = async () => {
    if (!heroPreview) return;
    setHeroLoading(true);
    try {
      const { error } = await supabase
        .from('site_config')
        .upsert({ key: 'hero_image', value: heroPreview });
      
      if (error) throw error;
      alert("System Identity Updated Successfully!");
    } catch (error) {
      console.error(error);
      // THIS WILL SHOW YOU THE REAL REASON:
      alert("Error: " + (error.message || error.error_description || "Unknown error")); 
    } finally {
      setHeroLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const projectData = {
        ...newProject,
        tags: newProject.tags.split(',').map(t => t.trim()).filter(Boolean),
      };
      if (selectedImage) projectData.image_url = selectedImage;
      else if (!editingId) projectData.image_url = ''; 

      let data, error;
      if (editingId) {
        const res = await supabase.from('portfolio_projects').update(projectData).eq('id', editingId).select();
        data = res.data; error = res.error;
        if (!error && data) setProjects(prev => prev.map(p => p.id === editingId ? data[0] : p));
      } else {
        projectData.created_at = new Date().toISOString();
        const res = await supabase.from('portfolio_projects').insert([projectData]).select();
        data = res.data; error = res.error;
        if (!error && data) setProjects(prev => [data[0], ...prev]);
      }
      if (error) throw error;
      resetForm();
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setNewProject({ title: '', brand: '', description: '', tags: '', link: '#' });
    setSelectedImage(null);
    setPreviewUrl('');
    setEditingId(null);
  };

  const handleEditClick = (project) => {
    setEditingId(project.id);
    setNewProject({
        title: project.title,
        brand: project.brand,
        description: project.description || '',
        tags: project.tags ? project.tags.join(', ') : '',
        link: project.link || '#'
    });
    setPreviewUrl(project.image_url || '');
    setSelectedImage(null);
    setActiveTab('projects');
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete system record?")) return;
    setProjects(prev => prev.filter(p => p.id !== id));
    await supabase.from('portfolio_projects').delete().eq('id', id);
  };

  // --- LOGIN SCREEN ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <GlobalStyles />
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full border border-zinc-700 flex items-center justify-center mb-4 relative">
                <Lock size={24} className="text-white" />
                <div className="absolute top-0 right-0 w-3 h-3 bg-red-600 rounded-full animate-pulse" />
            </div>
            <h3 className="font-dot text-2xl text-white uppercase tracking-wider">ADMIN PORTAL</h3>
          </div>
          <form className="space-y-6" onSubmit={handleLogin}>
            <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="PASSCODE" className={`w-full p-4 bg-zinc-900 border ${authError ? 'border-red-600' : 'border-zinc-800'} text-white rounded-xl focus:border-white outline-none tracking-widest text-center placeholder:text-zinc-700`} autoFocus />
            {authError && <p className="text-xs text-red-500 text-center font-dot">INVALID CREDENTIALS</p>}
            <button type="submit" disabled={loading} className="w-full py-4 bg-white hover:bg-zinc-200 text-black rounded-full font-bold uppercase tracking-wider transition-colors">
              {loading ? "Verifying..." : "Unlock System"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- DASHBOARD ---
  return (
    <div className="min-h-screen bg-black text-zinc-200 font-sans p-4 md:p-8">
      <GlobalStyles />
      <div className="max-w-7xl mx-auto bg-black rounded-[2rem] border border-zinc-800 overflow-hidden flex flex-col min-h-[85vh] shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        {/* HEADER */}
        <div className="p-6 border-b border-zinc-800 flex flex-col md:flex-row justify-between items-center bg-zinc-900/50 gap-4">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-600 rounded-full" />
                <h3 className="font-dot text-xl uppercase tracking-wider">Manager</h3>
             </div>
             <div className="flex bg-black rounded-lg p-1 border border-zinc-800">
               <button onClick={() => setActiveTab('projects')} className={`px-4 py-1.5 text-xs font-mono uppercase rounded-md transition-colors ${activeTab === 'projects' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Projects</button>
               <button onClick={() => setActiveTab('system')} className={`px-4 py-1.5 text-xs font-mono uppercase rounded-md transition-colors ${activeTab === 'system' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>System Identity</button>
             </div>
          </div>
          <button onClick={handleLogout} className="text-xs font-mono text-red-500 hover:text-red-400 uppercase tracking-widest">Logout</button>
        </div>

        {/* CONTENT */}
        <div className="flex flex-col lg:flex-row flex-1">
          {activeTab === 'projects' ? (
            <>
              {/* LEFT: FORM */}
              <div className="p-8 w-full lg:w-1/3 border-b lg:border-b-0 lg:border-r border-zinc-800 bg-black">
                <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-2">
                    <h4 className="font-mono text-xs text-zinc-500 uppercase tracking-widest">{editingId ? "Edit Entry" : "New Entry"}</h4>
                    {editingId && <button onClick={resetForm} className="text-[10px] flex items-center gap-1 text-red-500 hover:text-red-400 uppercase font-mono"><RotateCcw size={12} /> Cancel</button>}
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                   <div className="space-y-2">
                    <label className="text-xs font-mono text-zinc-500">MEDIA ASSET</label>
                    <div className="relative group cursor-pointer">
                      <input type="file" accept="image/*" onChange={(e) => handleImageSelect(e, 'project')} className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" />
                      <div className={`h-40 rounded-2xl border border-dashed flex flex-col items-center justify-center transition-all ${previewUrl ? 'border-zinc-500 bg-zinc-900' : 'border-zinc-800 hover:border-zinc-600'}`}>
                        {previewUrl ? <img src={previewUrl} className="h-full w-full object-cover rounded-2xl opacity-50" /> : <div className="text-center p-4"><Upload className="text-zinc-600 mb-2 mx-auto" size={24} /><span className="text-[10px] text-zinc-600 font-mono uppercase">Upload</span></div>}
                      </div>
                    </div>
                  </div>
                  <input required value={newProject.title} onChange={e => setNewProject({...newProject, title: e.target.value})} placeholder="PROJECT TITLE" className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-sm focus:border-white transition-colors outline-none font-dot" />
                  <input required value={newProject.brand} onChange={e => setNewProject({...newProject, brand: e.target.value})} placeholder="CATEGORY" className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-sm focus:border-white transition-colors outline-none font-mono" />
                  <textarea required rows={3} value={newProject.description} onChange={e => setNewProject({...newProject, description: e.target.value})} placeholder="DESCRIPTION..." className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-sm focus:border-white transition-colors outline-none resize-none font-sans" />
                  <input value={newProject.tags} onChange={e => setNewProject({...newProject, tags: e.target.value})} placeholder="TAGS (A, B)" className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-sm focus:border-white transition-colors outline-none font-mono" />
                  <input value={newProject.link} onChange={e => setNewProject({...newProject, link: e.target.value})} placeholder="LINK URL" className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-sm focus:border-white transition-colors outline-none font-mono" />
                  <button type="submit" disabled={loading} className={`w-full py-3 ${editingId ? 'bg-red-600 text-white' : 'bg-white text-black'} rounded-xl font-bold font-dot uppercase tracking-wider flex items-center justify-center gap-2`}>
                    {loading ? <Loader2 className="animate-spin" size={16} /> : (editingId ? "UPDATE ENTRY" : "PUBLISH")}
                  </button>
                </form>
              </div>
              {/* RIGHT: LIST */}
              <div className="p-8 w-full lg:w-2/3 bg-zinc-950 overflow-y-auto max-h-[85vh]">
                 <div className="grid sm:grid-cols-2 gap-4">
                    {projects.map(p => (
                      <div key={p.id} className={`relative group border ${editingId === p.id ? 'border-red-600' : 'border-zinc-800'} bg-black rounded-2xl overflow-hidden hover:border-zinc-600 transition-colors`}>
                        <div className="h-32 bg-zinc-900 relative">
                          {p.image_url ? <img src={p.image_url} className="w-full h-full object-cover opacity-60 group-hover:opacity-100" /> : <div className="w-full h-full flex items-center justify-center text-zinc-800"><ImageIcon /></div>}
                          <div className="absolute top-2 right-2 flex gap-2">
                            <button onClick={() => handleEditClick(p)} className="p-2 bg-black text-white rounded-lg border border-zinc-800 hover:bg-zinc-900"><Edit size={14} /></button>
                            <button onClick={() => handleDelete(p.id)} className="p-2 bg-black text-red-500 rounded-lg border border-zinc-800 hover:bg-zinc-900"><Trash2 size={14} /></button>
                          </div>
                        </div>
                        <div className="p-4"><h5 className="font-dot font-bold text-sm text-white truncate uppercase">{p.title}</h5></div>
                      </div>
                    ))}
                 </div>
              </div>
            </>
          ) : (
             <div className="w-full p-12 flex flex-col items-center justify-center bg-zinc-950">
                <div className="max-w-md w-full text-center">
                   <h2 className="text-3xl font-dot text-white mb-8 uppercase">Update 3D Avatar</h2>
                   <div className="relative group cursor-pointer mb-8 mx-auto w-64 h-80 rounded-[3rem] border-2 border-dashed border-zinc-700 hover:border-red-600 transition-colors bg-black overflow-hidden flex items-center justify-center">
                      <input type="file" accept="image/*" onChange={(e) => handleImageSelect(e, 'hero')} className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" />
                      {heroPreview ? <img src={heroPreview} className="w-full h-full object-cover" /> : <Upload className="text-zinc-500" size={32} />}
                   </div>
                   <button onClick={saveHeroImage} disabled={heroLoading || !heroPreview} className="w-full py-4 bg-white text-black hover:bg-red-600 hover:text-white rounded-full font-bold font-dot uppercase tracking-wider transition-colors">
                      {heroLoading ? "Saving..." : "Save System Asset"}
                   </button>
                </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}