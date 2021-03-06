import { useCallback } from "react";

import React from "react";
import { useState } from "react";
import { api } from "../api/api";
import SystemMessage from "../auxiliaryMessages/SystemMessage";
import PostEdit from "./PostEdit";

const EMPTY_POST = {
    title: "",
    username: "",
    content: "",
};

export default function NewPostPrompt() {
    let [newPost, setNewPost] = useState(EMPTY_POST);

    let [created, setCreated] = useState(false);
    let [error, setError] = useState();

    let handleSubmit = useCallback(
        async (post) => {
            setCreated(false);
            setError(null);

            try {
                await api.posts.add({ post });
            } catch (err) {
                setError("Could not make new post");
                console.error(err);
                return;
            }

            setCreated(true);
            setNewPost(EMPTY_POST);
        },
        [setCreated, setError, setNewPost]
    );

    return (
        <div>
            {created && (
                <SystemMessage
                    header={"Post Created!"}
                    message={"Refresh the page to see it"}
                />
            )}
            {error && <SystemMessage error={error} />}
            <PostEdit post={newPost} onSubmit={handleSubmit} />
        </div>
    );
}
