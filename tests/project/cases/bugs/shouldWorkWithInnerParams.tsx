import * as React from 'react';

enum Enum {
    A,
    B
}

export const Comp: React.FC = () => {
    const [state] = React.useState('A');

    /*[a]*/ const printEnum = (v: string) => {
        console.log(Enum[v]);
    }; /*[b]*/

    const onClick = () => {
        printEnum(state);
    };

    return (
        <div onClick={onClick}>
            <span>{state}</span>
        </div>
    );
};
