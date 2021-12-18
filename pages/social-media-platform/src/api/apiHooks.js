import { useState, useEffect } from "react";

export function useRequest(request, params) {
    let [result, setResult] = useState();
    let [error, setError] = useState();
    let [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        setError(null);
        setResult(null);

        // fetch data from server
        (async () => {
            try {
                let result = await request(params);

                setResult(result);
                setLoading(false);
            } catch (err) {
                setError("Could not process request");
                console.error(err);
                setLoading(false);
            }
        })();
    }, [setResult, setError, setLoading, params, request]);

    return {
        result,
        error,
        loading,
    };
}
