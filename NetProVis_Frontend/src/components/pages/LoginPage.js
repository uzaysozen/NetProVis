import React from 'react';
import { Card } from 'antd';
import GoogleButton from 'react-google-button';
import LogoImage from '../../assets/NetProVis_Logo.png';
import '../../styles/LoginPage.css';

const LoginPage = ({ signIn }) => {
    return (
        <div className="login-container">
            <Card className="login-card">
                <img src={LogoImage} alt="Logo" className="logo-image" width={200} height={200} />
                <h1 className="login-title">Welcome to NetProVis</h1>
                <h3 className="login-subtitle">A Kubernetes Cluster Provisioning and Management Tool</h3>
                <div className="button-container">
                    <GoogleButton className="google-button" type="dark" onClick={signIn}>
                        Sign In with Google
                    </GoogleButton>
                </div>
            </Card>
        </div>
    );
};

export default LoginPage;
