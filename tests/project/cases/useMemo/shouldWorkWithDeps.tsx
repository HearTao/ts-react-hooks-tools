import * as React from 'react';

interface IProps {
    value: number;
}

export const Comp: React.FC<IProps> = props => {
    const value = 1 + 2 + 3 + props.value;

    return (
        <div>
            <span>{value}</span>
        </div>
    );
};
