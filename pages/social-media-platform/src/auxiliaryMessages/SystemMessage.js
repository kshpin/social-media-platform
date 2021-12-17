import React from "react";
import "./SystemMessage.css";

export default function SystemMessage({ header, message, error }) {
    if (error) {
        return (
            <div className="SystemMessage Error">
                <h1>An error occurred</h1>
                <h3>{error}</h3>
            </div>
        );
    }

    return (
        <div className="SystemMessage">
            <h1>{header}</h1>
            <h3>{message}</h3>
        </div>
    );
}
