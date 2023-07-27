import React, {useEffect, useState} from "react";
import {Layout, Menu, Dropdown, Avatar, Button, Input} from "antd";
import {
    BellFilled,
    DownOutlined,
    LogoutOutlined,
    RightSquareOutlined,
    SearchOutlined
} from "@ant-design/icons";
import LogoImage from "../../assets/NetProVis_Logo.png";
import '../../styles/Navbar.css'
import axios from "axios";

const {Header} = Layout;

const Navbar = ({signOut}) => {
    const [user, setUser] = useState([]);
    const [clusters, setClusters] = useState([]);
    const [clusterName, setClusterName] = useState([]);

    useEffect(() => {
        axios
            .get('http://localhost:8000/user_info')
            .then(response => {
                setUser(response.data);
            })
            .catch(error => {
                console.log('Error:', error);
            });

        axios
            .get('http://localhost:8000/clusters')
            .then(response => {
                setClusters(response.data);
                //console.log(response.data)
            })
            .catch(error => {
                console.log('Error:', error);
            });
    }, []);

    const goToConsole = () => {
        window.open('https://console.cloud.google.com/', '_blank');
    }

    const userMenu = (
        <Menu>
            <Menu.Item key="1" onClick={signOut}>
                <LogoutOutlined style={{marginRight: "10px"}}/>
                Sign out
            </Menu.Item>
            <Menu.Item key="2" onClick={goToConsole}>
                <RightSquareOutlined style={{marginRight: "10px"}}/>
                Go to console
            </Menu.Item>
        </Menu>
    );
    const handleClusterMenuClick = (cluster) => {
        axios
            .post('http://localhost:8000/set_cluster', {selected_cluster: JSON.stringify(cluster)})
            .then(response => {
                setClusterName(cluster.name)
                console.log(response.data)
            })
            .catch(error => {
                console.log('Error:', error);
            });
    };
    const clusterMenu = (
        <Menu>
            {clusters.map((cluster, index) => (
                <Menu.Item key={index + 1} onClick={() => handleClusterMenuClick(cluster)}>
                    {cluster.name}
                </Menu.Item>
            ))}
        </Menu>
    );

    return (
        <Header style={{backgroundColor: "#232323", height: "10%"}}>
            <div style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
                <div style={{display: "flex", alignItems: "center"}}>
                    <img src={LogoImage} alt="Logo" width={50} height={50} style={{marginRight: "8px"}}/>

                    <Dropdown overlay={clusterMenu} trigger={["click"]}>
                        <button
                            className="cluster-btn"
                            onClick={(e) => e.preventDefault()}>
                            {clusterName} <DownOutlined style={{marginLeft: "4px", fontSize: "20px"}}/>
                        </button>
                    </Dropdown>
                </div>
                <div style={{display: "flex", alignItems: "center", width: "700px"}}>
                    <SearchOutlined style={{color: "#aaaaaa", fontSize: "24px", marginRight: "8px"}}/>
                    <Input id="custom-input" placeholder="Search..."/>
                </div>
                <div style={{display: "flex", alignItems: "center"}}>
                    <Button type="text" style={{color: "#ffffff", fontSize: "16px", marginRight: "10px"}}>
                        <BellFilled style={{fontSize: "20px"}}/>
                    </Button>
                    <span style={{display: "block", fontSize: "14px", color: "#aaaaaa"}}>
                        {user.email}
                    </span>


                    <Dropdown overlay={userMenu} trigger={["click"]}>
                        <button
                            type="text"
                            className="avatar-btn"
                            onClick={(e) => e.preventDefault()}>
                            <Avatar size={40} style={{marginTop: "10px", marginLeft: "10px"}} src={user.picture}/>
                        </button>
                    </Dropdown>
                </div>
            </div>
        </Header>
    );
};

export default Navbar;
