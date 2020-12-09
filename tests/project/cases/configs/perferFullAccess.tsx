import * as React from 'react';

export const Comp: React.FC = () => {
    const value = {
        a: { b: 1 }
    };
    /*[a]*/ const onClick = () => {
        console.log(value.a.b);
    }; /*[b]*/

    return <div onClick={onClick}>Foo</div>;
};
