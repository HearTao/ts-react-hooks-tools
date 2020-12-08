import * as React from 'react';
import { CommonUnknownProps } from '../common';

export const Comp: React.FC<CommonUnknownProps> = props => {
    /*[a]*/ const value = 1 + 2 + props.value.foo.a; /*[b]*/

    return (
        <div>
            <span>{value}</span>
        </div>
    );
};
