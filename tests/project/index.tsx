import * as React from 'react'

interface IProps {
    foo: number
}

export const a: React.FC<IProps> = props => {

    const value = props.foo + 1

    const alert = () => {
        window.alert('foo')
    }

    const onClick = () => {
        console.log(props.foo)
        alert()
    }

    return (
        <div onClick={onClick}>
            <span>{value}</span>
            <p>123</p>
        </div>
    )
}

