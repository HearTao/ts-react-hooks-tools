import * as React from 'react';

interface IProps {
    value: number;
}

export const Comp: React.FC<IProps> = props => {
    const id = 'id' + props.value;

    return (
        <div>
            <span id={id}>Foo</span>
        </div>
    );
};
