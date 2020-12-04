import * as React from 'react';

interface IProps {
    foo: number;
}

let b = 1;

enum Enum {
    A,
    B
}

export const a: React.FC<IProps> = props => {
    const [state, setState] = React.useState('');
    const ref = React.useRef<HTMLDivElement>(null);

    const value = props.foo + 1 + b;

    const alert = () => {
        window.alert('foo' + state + a);
        console.log(Enum.A, Enum.B);
    };

    const onClick = () => {
        console.log(props.foo);
        alert();
        setState('1');
        console.log(props.foo, state, ref.current);
    };

    return (
        <div onClick={onClick}>
            <span>{value}</span>
            <p>123</p>
        </div>
    );
};
