import React from "react";
import {Layout, Menu, Dropdown, Avatar, Button, Input} from "antd";
import {
    BellFilled,
    DownOutlined,
    LogoutOutlined,
    RightSquareOutlined,
    SearchOutlined,
    UserOutlined
} from "@ant-design/icons";
import LogoImage from "../../assets/NetProVis_Logo.png";
import '../../styles/navbar.css'

const {Header} = Layout;

const Navbar = ({signOut}) => {
    const userMenu = (
        <Menu>
            <Menu.Item key="1" onClick={signOut}>
                <LogoutOutlined style={{marginRight: "10px"}}/>
                Sign out
            </Menu.Item>
            <Menu.Item key="2">
                <RightSquareOutlined style={{marginRight: "10px"}}/>
                Go to console
            </Menu.Item>
        </Menu>
    );

    const clusterMenu = (
        <Menu>
            <Menu.Item key="1">cluster-1</Menu.Item>
            <Menu.Item key="2">cluster-2</Menu.Item>
        </Menu>
    );

    return (
        <Header style={{backgroundColor: "#232323", height: "8vh"}}>
            <div style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
                <div style={{display: "flex", alignItems: "center"}}>
                    <img src={LogoImage} alt="Logo" width={50} height={50} style={{marginRight: "8px"}}/>

                    <Dropdown overlay={clusterMenu} trigger={["click"]}>
                        <a
                            className="ant-dropdown-link"
                            onClick={(e) => e.preventDefault()}
                            style={{color: "#ffffff", marginLeft: "8px", fontSize: "20px", fontWeight: "bold"}}
                        >
                           Your Cluster <DownOutlined style={{marginLeft: "4px", fontSize: "20px"}}/>
                        </a>
                    </Dropdown>
                </div>
                <div style={{display: "flex", alignItems: "center", width: "700px"}}>
                    <SearchOutlined style={{color: "#aaaaaa", fontSize: "24px", marginRight: "8px"}}/>
                    <Input id="custom-input" placeholder="Search..." />
                </div>
                <div style={{display: "flex", alignItems: "center"}}>
                    <Button type="text" style={{color: "#ffffff", fontSize: "16px", marginRight: "10px"}}>
                        <BellFilled style={{fontSize: "20px"}}/>
                    </Button>
                   <span style={{ color: "#ffffff", fontSize: "16px", marginRight: "10px", marginTop: "-5px" }}>
                      Account Name
                      <span style={{ display: "block", fontSize: "12px", color: "#aaaaaa", marginTop: "-45px" }}>
                        account@gmail.com
                      </span>
                    </span>


                    <Dropdown overlay={userMenu} trigger={["click"]}>
                        <a
                            className="ant-dropdown-link"
                            onClick={(e) => e.preventDefault()}
                            style={{color: "#ffffff", marginTop: "-12px" }}
                        >
                            <Avatar size={55} icon={<UserOutlined/>}/>
                        </a>
                    </Dropdown>
                </div>
            </div>
        </Header>
    );
};

export default Navbar;
