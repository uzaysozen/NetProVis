import React from 'react';
import {Card} from 'antd';
import GoogleButton from "react-google-button";
import LogoImage from "../../assets/NetProVis_Logo.png"; // Replace 'logo.png' with your actual logo file
import '../../styles/loginPage.css';

const LoginPage = ({signIn}) => {
    return (
        <div className="login-container">
            <Card className="login-card">
                <img src={LogoImage} alt="Logo" className="logo-image" width={150} height={150}/>
                <h1 className="login-title">NetProVis</h1>
                <h3 className="login-subtitle">A k8s cluster provisioning and management tool</h3>
                <div className="button-container">
                    <GoogleButton className="google-button" onClick={signIn}>
                        Sign In with Google
                    </GoogleButton>
                </div>
            </Card>
        </div>
    );
};

export default LoginPage;
