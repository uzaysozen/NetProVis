import React from 'react';
import {Spin} from "antd";
import {LoadingOutlined} from "@ant-design/icons";

const TasksPage = () => {

    return (
        <div style={{
            backgroundColor: "#232323",
            color: "white",
            minHeight: "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center"
        }}>
            <LoadingOutlined
                style={{
                    fontSize: 80,
                }}
                spin
            />
            <span style={{marginLeft: "20px", fontSize: "30px"}}>Loading...</span>
        </div>
    );
}

export default TasksPage;
