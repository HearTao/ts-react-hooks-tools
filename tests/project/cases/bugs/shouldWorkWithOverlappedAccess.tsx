import * as React from 'react';

export const Comp: React.FC = () => {
    const v = {
        undefined: 1
    };

    /*[a]*/ const onClick = () => {
        console.log(v, v.undefined);
    }; /*[b]*/

    return <div onClick={onClick}>Foo</div>;
};
