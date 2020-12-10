import * as React from 'react';

interface Props {
    value: {
        foo: string;
    };
}

export const Comp: React.FC<Props> = props => {
    /*[a]*/ const foo = (v: keyof Props['value']) => {
        console.log(props.value[v]);
    }; /*[b]*/

    const onClick = () => {
        foo('foo');
    };

    return <div onClick={onClick}>Foo</div>;
};
