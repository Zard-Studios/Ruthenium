import React from 'react'
import { ThemeProvider } from './design-system/ThemeProvider'
import { Button } from '../../components'

function App() {
    return (
        <ThemeProvider>
            <div className="app">
                <h1>Ruthenium Browser</h1>
                <p>Multi-profile Firefox-based browser</p>
                <div className="mt-8 space-x-4">
                    <Button variant="primary">Get Started</Button>
                    <Button variant="outline">Learn More</Button>
                </div>
            </div>
        </ThemeProvider>
    )
}

export default App