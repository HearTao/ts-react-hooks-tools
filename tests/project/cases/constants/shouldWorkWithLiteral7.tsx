import * as React from 'react';

export const Comp: React.FC = () => {
    const ll = 1;
    const literal = 1 + ll;
    /*[a]*/ const value = 1 + literal; /*[b]*/

    return (
        <div>
            <span>{value}</span>
        </div>
    );
};
