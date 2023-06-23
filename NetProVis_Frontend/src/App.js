import React, { useEffect, useState } from 'react';
import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom';
import LoginPage from "./components/auth/loginPage";
import DashboardPage from "./components/pages/dashboard";
import { useGoogleLogin, useGoogleLogout } from 'react-google-login';
import {gapi} from "gapi-script";
import axios from "axios";
import './styles/App.css';
import PodsPage from "./components/pages/pods";
import MainLayout from "./components/layout/layout";
import TasksPage from "./components/pages/tasks";
import ReportsPage from "./components/pages/reports";
import HistoryPage from "./components/pages/hist";
import AlertsPage from "./components/pages/alerts";
import MapPage from "./components/pages/map";
import SettingsPage from "./components/pages/settings";

const clientId = "450951674669-go10vbr709gg2t15s141qeab5kc1snqa.apps.googleusercontent.com";

function App() {
  const [loggedIn, setLoggedIn] = useState(false);

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

      const auth2 = await gapi.auth2.init({ clientId });
      setLoggedIn(auth2.isSignedIn.get());
    };
    loadGapi();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route exact path="/" element={loggedIn ? <Navigate to="/dashboard" /> : <LoginPage signIn={signIn} />} />
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
