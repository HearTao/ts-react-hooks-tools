import * as React from 'react';

export const Comp: React.FC = () => {
    /*[a]*/ const value = a + a + b; /*[b]*/

    return (
        <div>
            <span>{value}</span>
        </div>
    );
};
