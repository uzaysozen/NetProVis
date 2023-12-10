import React, { useEffect, useState } from 'react';
import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom';
import LoginPage from "./components/pages/LoginPage";
import DashboardPage from "./components/pages/DashboardPage";
import axios from "axios";
import './styles/App.css';
import WorkloadsPage from "./components/pages/WorkloadsPage";
import MainLayout from "./components/layout/Layout";
import TasksPage from "./components/pages/TasksPage";
import ReportsPage from "./components/pages/ReportsPage";
import ThresholdStatsPage from "./components/pages/ThresholdStatsPage";
import ProjectPage from "./components/pages/ProjectPage";
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
        localStorage.removeItem("selectedProject");
        localStorage.removeItem("clusterName");
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
        <Route path="/pods" element={loggedIn ? <MainLayout signOut={signOut} children={<WorkloadsPage />} /> : <Navigate to="/" />} />
        <Route path="/tasks" element={loggedIn ? <MainLayout signOut={signOut} children={<TasksPage />} /> : <Navigate to="/" />} />
        <Route path="/reports" element={loggedIn ? <MainLayout signOut={signOut} children={<ReportsPage />} /> : <Navigate to="/" />} />
        <Route path="/threshold" element={loggedIn ? <MainLayout signOut={signOut} children={<ThresholdStatsPage />} /> : <Navigate to="/" />} />
        <Route path="/project" element={loggedIn ? <MainLayout signOut={signOut} children={<ProjectPage />} /> : <Navigate to="/" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
