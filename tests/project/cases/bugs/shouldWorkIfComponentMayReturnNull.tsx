import * as React from 'react';

export const Comp: React.FC = () => {
    /*[a]*/ const value = 1 + 2 + 3; /*[b]*/

    if (Math.random() < 0.5) {
        return null;
    }

    return (
        <div>
            <span>{value}</span>
        </div>
    );
};
