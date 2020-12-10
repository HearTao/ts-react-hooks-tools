import * as React from 'react';

interface Props {
    value?: {
        foo?: number;
    };
}

export const Comp: React.FC<Props> = props => {
    /*[a]*/ const value = 1 + props.value?.foo ?? 0; /*[b]*/

    return (
        <div>
            <span>{value}</span>
        </div>
    );
};
