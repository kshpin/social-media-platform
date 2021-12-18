import { useCallback, useState, useEffect } from "react";

import React from "react";
import "./Post.css";

export default function PostEdit({ post, onSubmit }) {
    let [editPost, setEditPost] = useState();

    useEffect(() => {
        setEditPost(post);
    }, [post, setEditPost]);

    let handleChangeField = useCallback(
        (e) =>
            setEditPost((prev) => ({
                ...prev,
                [e.target.name]: e.target.value,
            })),
        [setEditPost]
    );

    let handleSubmit = useCallback(
        (event) => {
            onSubmit(editPost);
            event.preventDefault();
        },
        [editPost, onSubmit]
    );

    if (!editPost) return null;

    return (
        <form className="Post Prompt" onSubmit={handleSubmit}>
            <input
                className="PostComponent Title Prompt"
                type="text"
                placeholder="New post title"
                value={editPost.title}
                name="title"
                onChange={handleChangeField}
            />

            <br />

            <input
                className="PostComponent Username Prompt"
                type="text"
                placeholder="username"
                name="username"
                value={editPost.username}
                onChange={handleChangeField}
            />

            <br />

            <textarea
                className="PostComponent Content Prompt"
                placeholder="Post content"
                name="content"
                value={editPost.content}
                onChange={handleChangeField}
            />

            <br />

            <input type="submit" value="Post" />
        </form>
    );
}
