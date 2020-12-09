import * as React from 'react';

export const Comp: React.FC = () => {
    const memoizedValue = React.useMemo(() => 123, []);
    const memoizedFunction = React.useCallback(() => {
        console.log(456);
    }, []);

    /*[a]*/ const onClick = () => {
        console.log(memoizedValue);
        memoizedFunction();
    }; /*[b]*/

    return <div onClick={onClick}>Foo</div>;
};
