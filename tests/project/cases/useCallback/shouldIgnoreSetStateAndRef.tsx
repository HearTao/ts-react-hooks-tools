import * as React from 'react';

export const Comp: React.FC = () => {
    const [state, setState] = React.useState(1);

    const refs = React.useRef(2);

    /*[a]*/ const onClick = () => {
        setState(prev => prev + refs.current);
    }; /*[b]*/

    return <div onClick={onClick}>{state}</div>;
};
