import * as React from 'react'

interface IProps {
    foo: number
}

export const a: React.FC<IProps> = props => {

    const alert = () => {
        window.alert('foo')
    }

    const onClick = () => {
        console.log(props.foo)
        alert()
    }

    return (
        <div onClick={onClick}>

        </div>
    )
}

