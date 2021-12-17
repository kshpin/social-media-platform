import React from "react";
import { useState } from "react";
import SystemMessage from "../auxiliaryMessages/SystemMessage";
import Post from "./Post";

export default function NewPostPrompt() {
    let [title, setTitle] = useState("");
    let [username, setUsername] = useState("");
    let [content, setContent] = useState("");
    let [created, setCreated] = useState(false);
    let [error, setError] = useState();

    function handleTitleChange(event) {
        setTitle(event.target.value);
    }

    function handleUsernameChange(event) {
        setUsername(event.target.value);
    }

    function handleContentChange(event) {
        setContent(event.target.value);
    }

    function handleSubmit(event) {
        setCreated(false);
        setError(null);

        (async () => {
            try {
                let newPostResp = await fetch(`/posts`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        title,
                        username,
                        content,
                    }),
                });

                if (newPostResp.status !== 201) {
                    throw new Error(
                        `New post error, status: ${
                            newPostResp.status
                        }, message: ${await newPostResp.text()}`
                    );
                }
            } catch (err) {
                setError("Could not make new post: " + err.message);
            }
        })();

        setTitle("");
        setUsername("");
        setContent("");
        setCreated(true);
        event.preventDefault();
    }

    if (error) {
        return <SystemMessage error={error} />;
    }

    if (created) {
        return (
            <SystemMessage
                header={"Post Created!"}
                message={"Refresh the page to see it"}
            />
        );
    }

    let promptInfo = {
        title,
        handleTitleChange,
        username,
        handleUsernameChange,
        content,
        handleContentChange,
        handleSubmit,
    };

    return <Post prompt={promptInfo} />;
}
