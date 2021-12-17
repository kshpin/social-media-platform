import "./App.css";

import React from "react";
import { usePosts } from "./posts/postHooks";
import LoadingMessage from "./auxiliaryMessages/LoadingMessage";
import SystemMessage from "./auxiliaryMessages/SystemMessage";
import Posts from "./posts/Posts";
import NewPostPrompt from "./posts/NewPostPrompt";

function App() {
    let postsData = usePosts("user-1");

    if (postsData.loading) {
        return <LoadingMessage />;
    }

    if (postsData.error) {
        return <SystemMessage error={postsData.error} />;
    }

    return (
        <div className="App">
            <Posts posts={postsData.list} />
            <NewPostPrompt />
        </div>
    );
}

export default App;
