import React, { useState } from 'react';
import { Menu, Button, Divider } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import '../../styles/Sidebar.css';
import Sider from 'antd/es/layout/Sider';
import {
  faBars,
  faChartLine,
  faCubes, faFilePdf,
  faGauge,
  faGear,
  faListCheck
} from "@fortawesome/free-solid-svg-icons";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <Sider trigger={null} collapsible collapsed={collapsed} style={{ background: '#232323', borderRight: '#524b4a solid 1px' }}>
      <Button
        className="hamburger-button"
        type="text"
        icon={collapsed ? <FontAwesomeIcon icon={faBars} className="hamburger-icon" style={{ fontSize: '35px' }}/> :
          <FontAwesomeIcon icon={faBars} className="hamburger-icon" style={{ fontSize: '28px' }}/> }
        onClick={() => setCollapsed(!collapsed)}
      />
      <Divider className="white-divider" />
      <Menu
        theme="dark"
        mode="inline"
        defaultSelectedKeys={['1']}
        className="custom-menu"
        selectedKeys={[location.pathname]} // Highlight the active menu item based on the current URL
      >
        <Menu.Item key="/dashboard" icon={<FontAwesomeIcon icon={faGauge}/>}>
          <Link to="/dashboard">Dashboard</Link>
        </Menu.Item>
        <Menu.Item key="/pods" icon={<FontAwesomeIcon icon={faCubes}/>}>
          <Link to="/pods">Workloads</Link>
        </Menu.Item>
        <Menu.Item key="/tasks" icon={<FontAwesomeIcon icon={faListCheck}/>}>
          <Link to="/tasks">Tasks</Link>
        </Menu.Item>
        <Menu.Item key="/reports" icon={<FontAwesomeIcon icon={faFilePdf}/>}>
          <Link to="/reports">Reports</Link>
        </Menu.Item>
        <Menu.Item key="/threshold" icon={<FontAwesomeIcon icon={faChartLine}/>}>
          <Link to="/threshold">Threshold Stats</Link>
        </Menu.Item>
        <Menu.Item key="/settings" icon={<FontAwesomeIcon icon={faGear}/>}>
          <Link to="/settings">Settings</Link>
        </Menu.Item>
      </Menu>
    </Sider>
  );
};

export default Sidebar;
