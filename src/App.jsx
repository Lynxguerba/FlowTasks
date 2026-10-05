import { useState, useEffect } from 'react';
import Login from './components/Login';
import Welcome from './components/Welcome';
import ProjectWorkspace from './components/ProjectWorkspace';
import { getCurrentUser, saveCurrentUser } from './data/storage';
import './App.css';

function App() {
  const [loggedInUser, setLoggedInUser] = useState(getCurrentUser());
  const [activeProject, setActiveProject] = useState(null);

  const handleLogin = (username) => {
    setLoggedInUser(username);
    saveCurrentUser(username);
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    saveCurrentUser(null);
    setActiveProject(null);
  };

  return (
    <>
      {loggedInUser ? (
        activeProject ? (
          <ProjectWorkspace 
            project={activeProject} 
            onBack={() => setActiveProject(null)} 
          />
        ) : (
          <Welcome 
            username={loggedInUser} 
            onLogout={handleLogout} 
            onOpenProject={(project) => setActiveProject(project)}
          />
        )
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </>
  );
}

export default App;
