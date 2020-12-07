import * as React from 'react';
import { outsideValue } from '../common';

const topLevelConstant = 1;

export const Comp: React.FC = () => {
    const [state] = React.useState(0);

    /*[a]*/ const onClick = () => {
        console.log(state, topLevelConstant, outsideValue);
    }; /*[b]*/

    return <div onClick={onClick}>Foo</div>;
};
