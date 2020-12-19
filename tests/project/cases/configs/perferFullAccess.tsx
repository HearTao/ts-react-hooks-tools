import * as React from 'react';

interface IProps {
    value: number;
}

export const Comp: React.FC<IProps> = props => {
    const value = {
        a: { b: 1 + props.value }
    };
    /*[a]*/ const onClick = () => {
        console.log(value.a.b);
    }; /*[b]*/

    return <div onClick={onClick}>Foo</div>;
};
