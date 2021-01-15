import * as React from 'react';

export const Comp: React.FC = () => {
    // prettier-ignore
    const literal = 1 + (1);
    /*[a]*/ const value = 1 + literal; /*[b]*/

    return (
        <div>
            <span>{value}</span>
        </div>
    );
};
