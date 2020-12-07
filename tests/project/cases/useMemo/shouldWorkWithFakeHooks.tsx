import * as React from 'react';
import { useMemo } from '../common';

console.log('should never call', useMemo);

export const Comp: React.FC = () => {
    /*[a]*/ const value = 1 + 2 + 3; /*[b]*/

    return (
        <div>
            <span>{value}</span>
        </div>
    );
};
