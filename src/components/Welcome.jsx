import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trash2, 
  LogOut, 
  Plus, 
  Search, 
  MoreHorizontal,
  FolderOpen,
  Edit2,
  RefreshCcw,
  X
} from 'lucide-react';
import { getProjects, saveProjects } from '../data/storage';
import ProjectPreview from './ProjectPreview';

const Welcome = ({ username, onLogout, onOpenProject }) => {
  const [activeTab, setActiveTab] = useState('projects');
  const [projects, setProjects] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    getProjects(username).then(data => {
      setProjects(data);
      setIsLoaded(true);
    });
  }, [username]);

  useEffect(() => {
    if (isLoaded) {
      saveProjects(username, projects);
    }
  }, [projects, username, isLoaded]);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'rename'
  const [projectNameInput, setProjectNameInput] = useState('');
  const [projectToEdit, setProjectToEdit] = useState(null);
  
  // Dropdown state
  const [activeDropdown, setActiveDropdown] = useState(null);
  const dropdownRef = useRef(null);

  const sidebarItems = [
    { id: 'projects', icon: FolderOpen, label: 'Projects' },
    { id: 'trash', icon: Trash2, label: 'Trash' },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setProjectNameInput('');
    setIsModalOpen(true);
  };

  const openRenameModal = (project) => {
    setModalMode('rename');
    setProjectNameInput(project.name);
    setProjectToEdit(project);
    setIsModalOpen(true);
    setActiveDropdown(null);
  };

  const handleModalSubmit = (e) => {
    e.preventDefault();
    if (!projectNameInput.trim()) return;

    if (modalMode === 'create') {
      const colors = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      
      const newProject = {
        id: Date.now(),
        name: projectNameInput.trim(),
        date: 'Just now',
        color: randomColor,
        isTrash: false
      };
      
      setProjects([newProject, ...projects]);
      setActiveTab('projects');
    } else if (modalMode === 'rename' && projectToEdit) {
      setProjects(projects.map(p => 
        p.id === projectToEdit.id ? { ...p, name: projectNameInput.trim() } : p
      ));
    }
    
    setIsModalOpen(false);
  };

  const moveToTrash = (id) => {
    setProjects(projects.map(p => p.id === id ? { ...p, isTrash: true } : p));
    setActiveDropdown(null);
  };

  const restoreProject = (id) => {
    setProjects(projects.map(p => p.id === id ? { ...p, isTrash: false } : p));
    setActiveDropdown(null);
  };

  const deletePermanently = (id) => {
    setProjects(projects.filter(p => p.id !== id));
    setActiveDropdown(null);
  };

  const toggleDropdown = (e, id) => {
    e.stopPropagation();
    setActiveDropdown(activeDropdown === id ? null : id);
  };

  const activeProjects = projects.filter(p => !p.isTrash);
  const trashProjects = projects.filter(p => p.isTrash);

  return (
    <div className="flex h-screen bg-slate-900 text-slate-300 font-sans w-full overflow-hidden text-left relative">
      {/* Sidebar */}
      <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col flex-shrink-0 z-10">
        {/* Logo */}
        <div className="p-6">
          <h2 className="text-2xl tracking-wide flex items-center">
            <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">Flow</span>
            <span className="font-light text-white">Tasks</span>
          </h2>
        </div>

        {/* User Profile */}
        <div className="px-6 pb-6 mb-2 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg">
              {username.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-semibold text-white">{username}</div>
              <div className="text-xs text-slate-400">Free Plan</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-blue-500/10 text-blue-400' 
                    : 'hover:bg-slate-700/50 hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-slate-700 space-y-1">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-red-400 hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Log out</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full bg-slate-900 z-0">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-slate-800 flex-shrink-0">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Search projects..." 
              className="w-full bg-slate-800 border border-slate-700 rounded-full py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
          <button 
            onClick={openCreateModal}
            className="bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/20"
          >
            <Plus size={18} />
            New Project
          </button>
        </header>

        {/* Workspace Area */}
        <main className="flex-1 overflow-y-auto p-8" onClick={() => setActiveDropdown(null)}>
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-white capitalize">{activeTab}</h1>
          </div>

          {activeTab === 'projects' && (
            <>
              {activeProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                  <FolderOpen size={48} className="mb-4 opacity-50" />
                  <p className="text-lg">No active projects</p>
                  <p className="text-sm mb-6">Click "New Project" to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-8">
                  <AnimatePresence>
                    {activeProjects.map((project) => (
                      <motion.div
                        key={project.id}
                        onClick={() => onOpenProject(project)}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="group bg-slate-800 border border-slate-700 rounded-xl overflow-visible hover:border-slate-500 transition-all hover:shadow-xl cursor-pointer relative"
                      >
                        {/* Project Cover Preview */}
                        <ProjectPreview projectId={project.id} color={project.color} />
                        
                        {/* Project Info */}
                        <div className="p-4 rounded-b-xl">
                          <div className="flex items-start justify-between relative">
                            <div>
                              <h3 className="text-white font-medium mb-1 group-hover:text-blue-400 transition-colors">{project.name}</h3>
                              <p className="text-xs text-slate-500">{project.date}</p>
                            </div>
                            <div className="relative" ref={activeDropdown === project.id ? dropdownRef : null}>
                              <button 
                                onClick={(e) => toggleDropdown(e, project.id)}
                                className={`text-slate-500 hover:text-white p-1 rounded hover:bg-slate-700 transition-colors ${activeDropdown === project.id ? 'opacity-100 bg-slate-700 text-white' : 'opacity-0 group-hover:opacity-100'}`}
                              >
                                <MoreHorizontal size={16} />
                              </button>
                              
                              {/* Dropdown Menu */}
                              <AnimatePresence>
                                {activeDropdown === project.id && (
                                  <motion.div 
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.1 }}
                                    className="absolute right-0 top-8 w-40 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden"
                                  >
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); openRenameModal(project); }}
                                      className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
                                    >
                                      <Edit2 size={14} /> Rename
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); moveToTrash(project.id); }}
                                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-700 hover:text-red-300 flex items-center gap-2"
                                    >
                                      <Trash2 size={14} /> Move to Trash
                                    </button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </>
          )}

          {activeTab === 'trash' && (
            <>
              {trashProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                  <Trash2 size={48} className="mb-4 opacity-50" />
                  <p className="text-lg">Trash is empty</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-8">
                  <AnimatePresence>
                    {trashProjects.map((project) => (
                      <motion.div
                        key={project.id}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="group bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-visible hover:border-slate-600 transition-all cursor-pointer relative opacity-80 hover:opacity-100"
                      >
                        <ProjectPreview projectId={project.id} color={project.color} isTrash={true} />
                        
                        <div className="p-4 rounded-b-xl">
                          <div className="flex items-start justify-between relative">
                            <div>
                              <h3 className="text-slate-300 font-medium mb-1 line-through">{project.name}</h3>
                              <p className="text-xs text-slate-500">Deleted</p>
                            </div>
                            <div className="relative" ref={activeDropdown === project.id ? dropdownRef : null}>
                              <button 
                                onClick={(e) => toggleDropdown(e, project.id)}
                                className={`text-slate-500 hover:text-white p-1 rounded hover:bg-slate-700 transition-colors ${activeDropdown === project.id ? 'opacity-100 bg-slate-700 text-white' : 'opacity-0 group-hover:opacity-100'}`}
                              >
                                <MoreHorizontal size={16} />
                              </button>
                              
                              <AnimatePresence>
                                {activeDropdown === project.id && (
                                  <motion.div 
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.1 }}
                                    className="absolute right-0 top-8 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden"
                                  >
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); restoreProject(project.id); }}
                                      className="w-full text-left px-4 py-2 text-sm text-emerald-400 hover:bg-slate-700 hover:text-emerald-300 flex items-center gap-2"
                                    >
                                      <RefreshCcw size={14} /> Restore Project
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); deletePermanently(project.id); }}
                                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-700 hover:text-red-300 flex items-center gap-2"
                                    >
                                      <X size={14} /> Delete Permanently
                                    </button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-700">
                <h3 className="text-xl font-bold text-white">
                  {modalMode === 'create' ? 'Create New Project' : 'Rename Project'}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleModalSubmit} className="p-6">
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={projectNameInput}
                    onChange={(e) => setProjectNameInput(e.target.value)}
                    placeholder="e.g. Website Redesign"
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    autoFocus
                  />
                </div>
                
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!projectNameInput.trim()}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {modalMode === 'create' ? 'Create Project' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Welcome;
