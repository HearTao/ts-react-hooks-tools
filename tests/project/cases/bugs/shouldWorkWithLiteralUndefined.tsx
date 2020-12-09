import * as React from 'react';

export const Comp: React.FC = () => {
    const v = {
        undefined: 1
    };
    /*[a]*/ const value = v.undefined ? undefined : null; /*[b]*/

    return (
        <div>
            <span>{value}</span>
        </div>
    );
};
