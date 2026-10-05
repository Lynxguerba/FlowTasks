// Local storage wrapper to simulate a database for the web app

export const getProjects = (username) => {
  const data = localStorage.getItem(`flowtasks_projects_${username}`);
  return data ? JSON.parse(data) : [];
};

export const saveProjects = (username, projects) => {
  localStorage.setItem(`flowtasks_projects_${username}`, JSON.stringify(projects));
};

export const getNotes = (projectId) => {
  const data = localStorage.getItem(`flowtasks_notes_${projectId}`);
  return data ? JSON.parse(data) : [];
};

export const saveNotes = (projectId, notes) => {
  localStorage.setItem(`flowtasks_notes_${projectId}`, JSON.stringify(notes));
};

export const getCanvas = (projectId) => {
  const data = localStorage.getItem(`flowtasks_canvas_${projectId}`);
  return data ? JSON.parse(data) : { nodes: [], connections: [] };
};

export const saveCanvas = (projectId, canvasData) => {
  localStorage.setItem(`flowtasks_canvas_${projectId}`, JSON.stringify(canvasData));
};

export const getCurrentUser = () => {
  return localStorage.getItem('flowtasks_current_user');
};

export const saveCurrentUser = (username) => {
  if (username) {
    localStorage.setItem('flowtasks_current_user', username);
  } else {
    localStorage.removeItem('flowtasks_current_user');
  }
};
