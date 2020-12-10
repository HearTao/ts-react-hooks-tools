import * as React from 'react';

export const Comp = () => {
    const value = () => [1, 2, 3];

    return (
        <div>
            <span>{value()[0]}</span>
        </div>
    );
};
