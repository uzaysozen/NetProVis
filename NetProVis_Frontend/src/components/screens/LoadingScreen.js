import React from 'react';
import {LoadingOutlined} from "@ant-design/icons";

const LoadingScreen = ({loadingText}) => {

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
            <span style={{marginLeft: "20px", fontSize: "30px"}}>{loadingText}</span>
        </div>
    );
}

export default LoadingScreen;
