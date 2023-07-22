import React, { useEffect, useState } from 'react';
import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom';
import LoginPage from "./components/pages/LoginPage";
import DashboardPage from "./components/pages/DashboardPage";
import { useGoogleLogin, useGoogleLogout } from 'react-google-login';
import {gapi} from "gapi-script";
import axios from "axios";
import './styles/App.css';
import PodsPage from "./components/pages/PodsPage";
import MainLayout from "./components/layout/Layout";
import TasksPage from "./components/pages/TasksPage";
import ReportsPage from "./components/pages/ReportsPage";
import HistoryPage from "./components/pages/HistoryPage";
import AlertsPage from "./components/pages/AlertsPage";
import MapPage from "./components/pages/MapPage";
import SettingsPage from "./components/pages/SettingsPage";
import LoadingScreen from "./components/screens/LoadingScreen";

const clientId = "450951674669-go10vbr709gg2t15s141qeab5kc1snqa.apps.googleusercontent.com";

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const onSuccess = (response) => {
    // Handle successful login
    setLoggedIn(true);
    const currentUser = gapi.auth2.getAuthInstance().currentUser.get();
    const authResponse = currentUser.getAuthResponse(true);
    console.log(authResponse);
    const token = authResponse.access_token;
    axios.post('http://localhost:8000/authenticate', {value: token})
        .then(r => console.log(r))
  };

  const onLogoutSuccess = () => {
    // Handle successful logout
    setLoggedIn(false);
    localStorage.removeItem('selectedProject')
  };

  const { signIn } = useGoogleLogin({
    onSuccess,
    clientId,
    isSignedIn: true,
    scope: 'https://www.googleapis.com/auth/cloud-platform'
  });

  const { signOut } = useGoogleLogout({
    onLogoutSuccess,
    clientId,
  });

  useEffect(() => {
    const loadGapi = async () => {
      await new Promise((resolve, reject) => {
        gapi.load('auth2', resolve);
      });

      const auth2 = await gapi.auth2.getAuthInstance({ clientId });
      if (auth2) {
        const res = auth2.isSignedIn.get();
        setLoggedIn(res);
        setIsLoading(false); // Set loading state to false when authentication check is complete
      } else {
        setLoggedIn(false)
        setIsLoading(false); // Set loading state to false when authentication check is complete
      }



    };
    loadGapi();
  }, []);

  if (isLoading) {
    return <LoadingScreen />; // Replace with your loading screen component
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route exact path="/" element={ loggedIn ? <Navigate to="/dashboard" /> : <LoginPage signIn={signIn} />}/>
        <Route path="/dashboard" element={loggedIn ?  <MainLayout signOut={signOut} children={<DashboardPage/>} /> : <Navigate to="/" />} />
        <Route path="/pods" element={loggedIn ?  <MainLayout signOut={signOut} children={<PodsPage/>} /> : <Navigate to="/" />} />
        <Route path="/tasks" element={loggedIn ?  <MainLayout signOut={signOut} children={<TasksPage/>} /> : <Navigate to="/" />} />
        <Route path="/reports" element={loggedIn ?  <MainLayout signOut={signOut} children={<ReportsPage/>} /> : <Navigate to="/" />} />
        <Route path="/history" element={loggedIn ?  <MainLayout signOut={signOut} children={<HistoryPage/>} />: <Navigate to="/" />} />
        <Route path="/alerts" element={loggedIn ?  <MainLayout signOut={signOut} children={<AlertsPage/>} /> : <Navigate to="/" />} />
        <Route path="/map" element={loggedIn ?  <MainLayout signOut={signOut} children={<MapPage/>} /> : <Navigate to="/" />} />
        <Route path="/settings" element={loggedIn ?  <MainLayout signOut={signOut} children={<SettingsPage/>} /> : <Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
