import * as React from 'react';

export const Comp: React.FC = () => {
    const undefinedProp = {
        undefined: 1
    };
    /*[a]*/ const value =
        1 + undefinedProp.undefined === undefined
            ? 'string literl'
            : null; /*[b]*/

    return (
        <div>
            <span>{value}</span>
        </div>
    );
};
