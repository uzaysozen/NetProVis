import React, { useEffect, useState } from 'react';
import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom';
import LoginPage from "./components/pages/LoginPage";
import DashboardPage from "./components/pages/DashboardPage";
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
import NotFoundPage from "./components/screens/NotFoundPage";

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check login status from the API endpoint
    checkLoginStatus();
  }, []);

  const checkLoginStatus = () => {
    // Make an API request to your backend to check the login status
    axios
      .get('http://localhost:8000/auth_status')
      .then(response => {
        setLoggedIn(response.data.authenticated);
        setIsLoading(false);
      })
      .catch(error => {
        console.log('Error:', error);
        setIsLoading(false);
      });
  };

  const signIn = () => {
    setIsLoading(true);
    axios.post('http://localhost:8000/login')
      .then(response => {
        checkLoginStatus()
        setIsLoading(false);
      })
      .catch(error => {
        console.log('Error:', error);
        setIsLoading(false);
      });
  }

  const signOut = () => {
    setIsLoading(true);
    axios.post('http://localhost:8000/logout')
      .then(response => {
        checkLoginStatus()
        setIsLoading(false);
        localStorage.removeItem('selectedProject')
      })
      .catch(error => {
        console.log('Error:', error);
        setIsLoading(false);
      });

  }

  if (isLoading) {
    return <LoadingScreen loadingText={'Loading...'}/>; // Replace with your loading screen component
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route exact path="/" element={loggedIn ? <Navigate to="/dashboard" /> : <LoginPage signIn={signIn} />} />
        <Route path="/dashboard" element={loggedIn ? <MainLayout signOut={signOut} children={<DashboardPage />} /> : <Navigate to="/" />} />
        <Route path="/pods" element={loggedIn ? <MainLayout signOut={signOut} children={<PodsPage />} /> : <Navigate to="/" />} />
        <Route path="/tasks" element={loggedIn ? <MainLayout signOut={signOut} children={<TasksPage />} /> : <Navigate to="/" />} />
        <Route path="/reports" element={loggedIn ? <MainLayout signOut={signOut} children={<ReportsPage />} /> : <Navigate to="/" />} />
        <Route path="/history" element={loggedIn ? <MainLayout signOut={signOut} children={<HistoryPage />} /> : <Navigate to="/" />} />
        <Route path="/alerts" element={loggedIn ? <MainLayout signOut={signOut} children={<AlertsPage />} /> : <Navigate to="/" />} />
        <Route path="/map" element={loggedIn ? <MainLayout signOut={signOut} children={<MapPage />} /> : <Navigate to="/" />} />
        <Route path="/settings" element={loggedIn ? <MainLayout signOut={signOut} children={<SettingsPage />} /> : <Navigate to="/" />} />
        {/* 404 Not Found Page */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
