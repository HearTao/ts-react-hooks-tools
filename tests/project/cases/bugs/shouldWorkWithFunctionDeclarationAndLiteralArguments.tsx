import * as React from 'react';

export const Comp: React.FC = () => {
    /*[a]*/function onClick () {
        console.log(arguments, 123);
    }/*[b]*/

    return <div onClick={onClick}>Foo</div>;
};
