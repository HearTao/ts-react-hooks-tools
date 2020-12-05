import * as React from 'react';

const renderSomething = () => <div>Bar</div>;

export const Comp: React.FC = () => {
    return (
        <div>
            <span>{renderSomething()}</span>
        </div>
    );
};
