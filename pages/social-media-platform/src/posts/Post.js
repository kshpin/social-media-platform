import React from "react";
import "./Post.css";

export default function Post({ post }) {
    return (
        <div className="Post">
            <div className="PostComponent Title">{post.title}</div>
            <div className="PostComponent Username">{post.username}</div>
            <p className="PostComponent Content">{post.content}</p>
        </div>
    );
}
