import { useMemo } from 'react';

export const Comp = () => {
    /*[a]*/ const value = 1 + 2 + 3; /*[b]*/
    const test = useMemo(() => 3 + 3, []);

    return (
        <div>
            <span>
                {value}
                {test}
            </span>
        </div>
    );
};
