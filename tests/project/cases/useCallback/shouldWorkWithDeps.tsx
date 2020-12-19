import * as React from 'react';

interface IProps {
    value: number;
}

export const Comp: React.FC<IProps> = props => {
    const value = 1 + 2 + 3 + props.value;

    const [state] = React.useState(0);

    /*[a]*/ const onClick = () => {
        console.log(value, state);
    }; /*[b]*/

    return <div onClick={onClick}>Foo</div>;
};
