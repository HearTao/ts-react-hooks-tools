import * as React from 'react';

interface IProps {
    value: number;
}

export const Comp: React.FC<IProps> = props => {
    const getValue = (v: number) => props.value + v;
    /*[a]*/ const onClick = () => {
        const v = 1;
        console.log(getValue(v));
    }; /*[b]*/

    return <div onClick={onClick}>Foo</div>;
};
