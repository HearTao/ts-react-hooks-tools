import * as React from 'react';

export const Comp: React.FC = () => {
    /*[a]*/ const onClick = () => {
        console.log(123);
    }; /*[b]*/

    return <div onClick={onClick}>Foo</div>;
};
