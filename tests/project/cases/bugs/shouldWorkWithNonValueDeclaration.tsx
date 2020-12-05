import * as React from 'react';

export const Comp: React.FC = () => {
    const record: Record<'a' | 'b', string> = { a: '', b: '' };

    /*[a]*/ const value = record.a + record.b; /*[b]*/

    return (
        <div>
            <span>{value}</span>
        </div>
    );
};
