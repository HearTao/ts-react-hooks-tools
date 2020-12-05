import * as React from 'react';

export const Comp: React.FC = () => {
    const alreadyUsedMemo = React.useMemo(() => {
        return /*[a]*/ 1 + 2 /*[b]*/;
    }, []);

    return (
        <div>
            <span>{alreadyUsedMemo}</span>
        </div>
    );
};
