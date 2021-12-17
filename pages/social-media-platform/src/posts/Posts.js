import Post from "./Post";

import React from "react";

export default function Posts({ posts }) {
    return (
        <div className="Posts">
            {posts.map((post, i) => (
                <Post post={post} key={i} />
            ))}
        </div>
    );
}
