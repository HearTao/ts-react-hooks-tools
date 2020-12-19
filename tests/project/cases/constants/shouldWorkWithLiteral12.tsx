import * as React from 'react';

export const Comp: React.FC = () => {
    const literal = () => ({});
    /*[a]*/ const value = literal(); /*[b]*/

    return (
        <div>
            <span>{value}</span>
        </div>
    );
};
