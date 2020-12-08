import * as React from 'react';
import { CommonUnknownProps } from '../common';

export const Comp: React.FC<CommonUnknownProps> = props => {
    /*[a]*/ const onClick = () => {
        const v = {
            value: { foo: { a: props.value } }
        };
        console.log(v.value.foo.a);
    }; /*[b]*/

    return (
        <div onClick={onClick}>
            <span>Foo</span>
        </div>
    );
};
