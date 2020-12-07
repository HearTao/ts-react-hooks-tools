import * as React from 'react';
import { outsideValue } from '../common';

const topLevelConstant = 1;

export const Comp: React.FC = () => {
    const [state] = React.useState(0);

    return (
        <div>
            <span>{state + topLevelConstant + outsideValue}</span>
        </div>
    );
};
