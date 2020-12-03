import * as React from 'react'

interface IProps {
    foo: number
}

export const a: React.FC<IProps> = props => {

    const onClick = () => {
        console.log(props.foo)
    }

    return (
        <div onClick={onClick}>

        </div>
    )
}

