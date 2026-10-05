import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Layout, 
  FileText, 
  Square, 
  Circle, 
  Triangle, 
  Hexagon, 
  Plus,
  Trash2,
  Edit2,
  X,
  Save
} from 'lucide-react';
import { getNotes, saveNotes } from '../data/storage';

const ProjectWorkspace = ({ project, onBack }) => {
  const [activeSidebarTab, setActiveSidebarTab] = useState('notes'); // 'layouts' or 'notes'
  
  // Notes state
  const [notes, setNotes] = useState(() => getNotes(project.id));

  useEffect(() => {
    saveNotes(project.id, notes);
  }, [notes, project.id]);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteInput, setNoteInput] = useState('');
  const [noteTitleInput, setNoteTitleInput] = useState('');

  const handleCreateNote = () => {
    const newNote = {
      id: Date.now(),
      title: 'New Note',
      content: '',
      date: new Date().toLocaleDateString()
    };
    setNotes([newNote, ...notes]);
    setEditingNoteId(newNote.id);
    setNoteTitleInput(newNote.title);
    setNoteInput(newNote.content);
    setActiveSidebarTab('notes');
  };

  const handleSaveNote = (id) => {
    setNotes(notes.map(n => 
      n.id === id ? { ...n, title: noteTitleInput, content: noteInput } : n
    ));
    setEditingNoteId(null);
  };

  const handleDeleteNote = (id) => {
    setNotes(notes.filter(n => n.id !== id));
    if (editingNoteId === id) {
      setEditingNoteId(null);
    }
  };

  const handleEditNote = (note) => {
    setEditingNoteId(note.id);
    setNoteTitleInput(note.title);
    setNoteInput(note.content);
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-300 font-sans w-full overflow-hidden text-left relative">
      {/* Sidebar Navigation (Left-most small bar) */}
      <div className="w-16 bg-slate-800 border-r border-slate-700 flex flex-col items-center py-4 z-20">
        <button 
          onClick={onBack}
          className="p-3 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl mb-6 transition-colors"
          title="Back to Projects"
        >
          <ArrowLeft size={20} />
        </button>
        
        <div className="flex flex-col gap-2 w-full px-2">
          <button 
            onClick={() => setActiveSidebarTab(activeSidebarTab === 'layouts' ? null : 'layouts')}
            className={`p-3 w-full flex justify-center rounded-xl transition-colors ${
              activeSidebarTab === 'layouts' ? 'bg-blue-500/10 text-blue-400' : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
            title="Layouts"
          >
            <Layout size={20} />
          </button>
          <button 
            onClick={() => setActiveSidebarTab(activeSidebarTab === 'notes' ? null : 'notes')}
            className={`p-3 w-full flex justify-center rounded-xl transition-colors ${
              activeSidebarTab === 'notes' ? 'bg-blue-500/10 text-blue-400' : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
            title="Notes"
          >
            <FileText size={20} />
          </button>
        </div>
      </div>

      {/* Expandable Sidebar Content */}
      {activeSidebarTab && (
        <div className="w-80 bg-slate-800 border-r border-slate-700 flex flex-col z-10 shadow-xl">
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-700 flex-shrink-0">
            <h2 className="text-lg font-bold text-white capitalize">{activeSidebarTab}</h2>
            {activeSidebarTab === 'notes' && (
              <button 
                onClick={handleCreateNote}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700 transition-colors"
                title="Create Note"
              >
                <Plus size={18} />
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {activeSidebarTab === 'layouts' && (
              <div className="text-slate-400 text-center mt-10">
                <Layout size={40} className="mx-auto mb-4 opacity-50" />
                <p>Layout options will appear here.</p>
              </div>
            )}
            
            {activeSidebarTab === 'notes' && (
              <div className="space-y-4">
                {notes.length === 0 ? (
                  <div className="text-center text-slate-500 mt-10">
                    <p>No notes yet.</p>
                    <button 
                      onClick={handleCreateNote}
                      className="text-blue-400 hover:text-blue-300 text-sm mt-2 font-medium"
                    >
                      Create your first note
                    </button>
                  </div>
                ) : (
                  notes.map(note => (
                    <div key={note.id} className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
                      {editingNoteId === note.id ? (
                        <div className="p-3">
                          <input 
                            type="text"
                            value={noteTitleInput}
                            onChange={(e) => setNoteTitleInput(e.target.value)}
                            className="w-full bg-slate-800 text-white font-medium px-3 py-2 rounded-lg mb-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Note Title"
                          />
                          <textarea 
                            value={noteInput}
                            onChange={(e) => setNoteInput(e.target.value)}
                            className="w-full bg-slate-800 text-slate-300 text-sm px-3 py-2 rounded-lg mb-3 min-h-[120px] resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Write your note here..."
                          />
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => {
                                if (!note.content && !note.title.trim()) handleDeleteNote(note.id);
                                else setEditingNoteId(null);
                              }}
                              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={() => handleSaveNote(note.id)}
                              className="px-3 py-1.5 text-xs bg-blue-600 text-white hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-1"
                            >
                              <Save size={14} /> Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 group">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-medium text-white truncate pr-2">{note.title}</h3>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => handleEditNote(note)}
                                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button 
                                onClick={() => handleDeleteNote(note.id)}
                                className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-slate-700"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-slate-400 whitespace-pre-wrap mb-3 line-clamp-3">
                            {note.content || "Empty note..."}
                          </p>
                          <div className="text-xs text-slate-500">{note.date}</div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Canvas Area */}
      <div className="flex-1 bg-slate-900 relative">
        {/* Canvas header */}
        <div className="absolute top-0 left-0 right-0 h-16 flex items-center px-6 pointer-events-none">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${project.color} opacity-80`} />
            <h1 className="text-xl font-bold text-white">{project.name}</h1>
          </div>
        </div>
        
        {/* Canvas placeholder */}
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center text-slate-600">
            <div className="w-64 h-64 border-2 border-dashed border-slate-700 rounded-2xl flex items-center justify-center mb-4 mx-auto">
              Canvas Area
            </div>
            <p>Drag shapes from the bottom bar to build your flow.</p>
          </div>
        </div>

        {/* Bottom Navbar (Figma style) */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="bg-slate-800 border border-slate-700 shadow-2xl rounded-2xl p-2 flex items-center gap-2">
            <button className="p-3 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-all hover:-translate-y-1 group relative" title="Square">
              <Square size={22} />
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">Square</span>
            </button>
            <button className="p-3 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-all hover:-translate-y-1 group relative" title="Circle">
              <Circle size={22} />
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">Circle</span>
            </button>
            <button className="p-3 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-all hover:-translate-y-1 group relative" title="Triangle">
              <Triangle size={22} />
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">Triangle</span>
            </button>
            <button className="p-3 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-all hover:-translate-y-1 group relative" title="Hexagon">
              <Hexagon size={22} />
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">Hexagon</span>
            </button>
            <div className="w-px h-8 bg-slate-700 mx-1"></div>
            <button className="p-3 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-all hover:-translate-y-1 group relative" title="Text Node">
              <span className="font-serif font-bold text-lg leading-none flex items-center justify-center h-[22px]">T</span>
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">Text</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectWorkspace;
