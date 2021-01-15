import * as React from 'react';
import { getId } from '../common';

export const Comp: React.FC = () => {
    const value = getId();
    /*[a]*/ const onClick = () => {
        console.log(value.id);
    }; /*[b]*/

    return <div onClick={onClick}>Foo</div>;
};
