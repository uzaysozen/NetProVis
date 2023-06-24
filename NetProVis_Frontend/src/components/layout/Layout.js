import React from "react";
import Sidebar from "./Sidebar";
import {Layout} from "antd";
import Navbar from "./Navbar";

const MainLayout = ({children, signOut}) => {
    return (
        <Layout style={{ height: '100vh', overflow: "auto"}}>
            <Sidebar/>
            <Layout style={{ height: '100vh' }}>
                <Navbar signOut={signOut}/>
                <Layout>{children}</Layout>
            </Layout>
        </Layout>
    );
}

export default MainLayout;