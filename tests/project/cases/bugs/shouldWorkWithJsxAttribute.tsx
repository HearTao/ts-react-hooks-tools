import * as React from 'react';

export const Comp: React.FC = () => {
    const id = 'id' + Math.random();

    return (
        <div>
            <span id={id}>Foo</span>
        </div>
    );
};
