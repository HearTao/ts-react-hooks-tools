import * as React from 'react';

interface IProps {
    value: number;
}

export const Comp: React.FC<IProps> = props => {
    const v = 1 + 2 + 3 + props.value;

    /*[a]*/ const value = v as 6; /*[b]*/

    return (
        <div>
            <span>{value}</span>
        </div>
    );
};
