import "./App.css";

import React from "react";
import LoadingMessage from "./auxiliaryMessages/LoadingMessage";
import SystemMessage from "./auxiliaryMessages/SystemMessage";
import Posts from "./posts/Posts";
import NewPostPrompt from "./posts/NewPostPrompt";
import { api } from "./api/api";
import { useRequest } from "./api/apiHooks";

function App() {
    let postsData = useRequest(api.posts.list);

    if (postsData.loading) {
        return <LoadingMessage />;
    }

    if (postsData.error) {
        return <SystemMessage error={postsData.error} />;
    }

    return (
        <div className="App">
            <Posts posts={postsData.result} />
            <NewPostPrompt />
        </div>
    );
}

export default App;
