import PostView from "./PostView";

import React from "react";

export default function PostList({ posts }) {
    return (
        <div className="Posts">
            {posts.map((post, i) => (
                <PostView post={post} key={i} />
            ))}
        </div>
    );
}
