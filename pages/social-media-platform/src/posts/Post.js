import React from "react";
import "./Post.css";

export default function Post({ post, prompt }) {
    if (prompt) {
        return (
            <form className="Post Prompt" onSubmit={prompt.handleSubmit}>
                <input
                    className="PostComponent Title Prompt"
                    type="text"
                    placeholder="New post title"
                    value={prompt.title}
                    onChange={prompt.handleTitleChange}
                />

                <br />

                <input
                    className="PostComponent Username Prompt"
                    type="text"
                    placeholder="username"
                    value={prompt.username}
                    onChange={prompt.handleUsernameChange}
                />

                <br />

                <textarea
                    className="PostComponent Content Prompt"
                    placeholder="Post content"
                    value={prompt.content}
                    onChange={prompt.handleContentChange}
                />

                <br />

                <input type="submit" value="Post" />
            </form>
        );
    }

    return (
        <div className="Post">
            <div className="PostComponent Title">{post.title}</div>
            <div className="PostComponent Username">{post.username}</div>
            <p className="PostComponent Content">{post.content}</p>
        </div>
    );
}
