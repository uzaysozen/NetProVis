import React, { useState } from 'react';
import { AlertFilled, BookFilled, ClockCircleFilled, CodepenSquareFilled, EnvironmentFilled, FlagFilled, HomeFilled, MenuOutlined, SettingFilled } from '@ant-design/icons';
import { Menu, Button, Divider } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import '../../styles/Sidebar.css';
import Sider from 'antd/es/layout/Sider';

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <Sider trigger={null} collapsible collapsed={collapsed} style={{ background: '#232323', borderRight: '#aaaaaa solid 1px' }}>
      <Button
        className="hamburger-button"
        type="text"
        icon={collapsed ? <MenuOutlined className="hamburger-icon" style={{ fontSize: '35px' }} /> :
          <MenuOutlined className="hamburger-icon" style={{ fontSize: '35px' }} />}
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
        <Menu.Item key="/dashboard" icon={<HomeFilled />}>
          <Link to="/dashboard">Dashboard</Link>
        </Menu.Item>
        <Menu.Item key="/pods" icon={<CodepenSquareFilled />}>
          <Link to="/pods">CNF Pods</Link>
        </Menu.Item>
        <Menu.Item key="/tasks" icon={<BookFilled />}>
          <Link to="/tasks">Tasks</Link>
        </Menu.Item>
        <Menu.Item key="/reports" icon={<FlagFilled />}>
          <Link to="/reports">Reports</Link>
        </Menu.Item>
        <Menu.Item key="/history" icon={<ClockCircleFilled />}>
          <Link to="/history">History</Link>
        </Menu.Item>
        <Menu.Item key="/alerts" icon={<AlertFilled />}>
          <Link to="/alerts">Alerts</Link>
        </Menu.Item>
        <Menu.Item key="/map" icon={<EnvironmentFilled />}>
          <Link to="/map">Map</Link>
        </Menu.Item>
        <Menu.Item key="/settings" icon={<SettingFilled />}>
          <Link to="/settings">Settings</Link>
        </Menu.Item>
      </Menu>
    </Sider>
  );
};

export default Sidebar;
