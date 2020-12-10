import * as React from 'react';

export const Comp = () => {
    const value = (a?: number) => [1, 2, 3, a];

    return (
        <div>
            <span>{value(1)[0]}</span>
        </div>
    );
};
