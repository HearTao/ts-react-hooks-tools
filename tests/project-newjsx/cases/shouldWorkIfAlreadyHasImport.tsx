import { useCallback } from 'react';

export const Comp = () => {
    /*[a]*/ const value = 1 + 2 + 3; /*[b]*/

    const onClick = useCallback(() => {
        console.log(1);
    }, []);

    return (
        <div onClick={onClick}>
            <span>{value}</span>
        </div>
    );
};
