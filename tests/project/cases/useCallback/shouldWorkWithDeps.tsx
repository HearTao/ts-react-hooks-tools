import * as React from 'react';

export const Comp: React.FC = () => {
    const value = 1 + 2 + 3;

    const [state] = React.useState(0);

    /*[a]*/ const onClick = () => {
        console.log(value, state);
    }; /*[b]*/

    return <div onClick={onClick}>Foo</div>;
};
