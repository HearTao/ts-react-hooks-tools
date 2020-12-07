import * as React from 'react';

export const Comp: React.FC = () => {
    /*[a]*/ const alreadyUseCallback = React.useCallback(() => {
        console.log(123);
    }, []); /*[b]*/

    return <div onClick={alreadyUseCallback}>Foo</div>;
};
