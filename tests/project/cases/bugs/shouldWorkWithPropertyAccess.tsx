import * as React from 'react';
import * as common from '../common';

export const Comp: React.FC<common.CommonProps> = props => {
    const { value } = props;

    /*[a]*/ const vv = value.find(Boolean) ?? 1; /*[b]*/

    return (
        <div>
            <span>{vv}</span>
        </div>
    );
};
