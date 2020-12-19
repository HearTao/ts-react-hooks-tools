import * as React from 'react';

interface IProps {
    value: number;
}

export const Comp: React.FC<IProps> = props => {
    const getValue = () => props.value;
    /*[a]*/ const onClick = () => {
        console.log(getValue());
    }; /*[b]*/

    return <div onClick={onClick}>Foo</div>;
};
