import * as React from 'react';

interface State {
    count: number;
}

type Action = (s: State, action: { type: string }) => State;

export const Comp: React.FC = () => {
    const [state, dispatch] = React.useReducer<Action, State>(
        (state, action) => {
            switch (action.type) {
                case 'increment':
                    return { count: state.count + 1 };
                case 'decrement':
                    return { count: state.count - 1 };
                default:
                    throw new Error();
            }
        },
        undefined,
        () => ({ count: 0 })
    );

    /*[a]*/ const onClick = () => {
        console.log(123);
        dispatch({ type: 'decrement' });
    }; /*[b]*/

    return <div onClick={onClick}>{state}</div>;
};
