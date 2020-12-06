import React, { useMemo } from 'react';

export const Comp: React.FC = () => {
    const foo = useMemo(() => 123, []);
    /*[a]*/ const value = 1 + 2 + 3; /*[b]*/

    return (
        <div>
            <span>
                {value}
                {foo}
            </span>
        </div>
    );
};
