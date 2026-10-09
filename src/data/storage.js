// Local storage wrapper changed to API wrapper
// The API is served by the Vite dev server

// Current user is still stored in localStorage so the client remembers who is logged in
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

const fetchData = async (username, key, defaultValue) => {
  try {
    const res = await fetch('/api/data');
    const allData = await res.json();
    if (allData[username] && allData[username][key]) {
      return allData[username][key];
    }
  } catch (err) {
    console.error('Error fetching data:', err);
  }
  return defaultValue;
};

const saveData = async (username, key, data) => {
  try {
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, key, data })
    });
  } catch (err) {
    console.error('Error saving data:', err);
  }
};

export const getProjects = async (username) => {
  return await fetchData(username, 'projects', []);
};

export const saveProjects = async (username, projects) => {
  await saveData(username, 'projects', projects);
};

export const getNotes = async (projectId) => {
  // We use projectId as the "username" for simplicity, or we can namespace it.
  // Wait, let's prefix projectId with 'project_' so it doesn't collide with users.
  return await fetchData(`project_${projectId}`, 'notes', []);
};

export const saveNotes = async (projectId, notes) => {
  await saveData(`project_${projectId}`, 'notes', notes);
};

export const getCanvas = async (projectId) => {
  return await fetchData(`project_${projectId}`, 'canvas', { nodes: [], connections: [] });
};

export const saveCanvas = async (projectId, canvasData) => {
  await saveData(`project_${projectId}`, 'canvas', canvasData);
};

export const getTodos = async (projectId) => {
  return await fetchData(`project_${projectId}`, 'todos', []);
};

export const saveTodos = async (projectId, todos) => {
  await saveData(`project_${projectId}`, 'todos', todos);
};
