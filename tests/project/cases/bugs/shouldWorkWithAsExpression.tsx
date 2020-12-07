import * as React from 'react';

export const Comp: React.FC = () => {
    const v = 1 + 2 + 3;

    /*[a]*/ const value = v as 6; /*[b]*/

    return (
        <div>
            <span>{value}</span>
        </div>
    );
};
