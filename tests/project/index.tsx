import * as React from 'react';

interface IProps {
    foo: number;
}

const b = {
    aaaa: 1
};

const { aaaa } = b;

const render = () => {
    return <div />;
};
class C {}
function func() {}

enum Enum {
    A,
    B
}

export const a: React.FC<IProps> = props => {
    const [state, setState] = React.useState('');
    const ref = React.useRef<HTMLDivElement>(null);

    const value = props.foo + 1 + b.aaaa;

    const alert = () => {
        window.alert('foo' + state);
        console.log(Enum.A, Enum.B, b, aaaa);
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
