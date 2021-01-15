import * as React from 'react';

export const Comp: React.FC = () => {
    const literal = React.useCallback(() => ({}), []);
    /*[a]*/ const value = literal(); /*[b]*/

    return (
        <div>
            <span>{value}</span>
        </div>
    );
};
