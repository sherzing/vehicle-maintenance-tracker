import { Container, Navbar } from 'react-bootstrap'
import './App.css'

function App() {
  return (
    <>
      <Navbar bg="dark" variant="dark" className="mb-4">
        <Container>
          <Navbar.Brand>Vehicle Maintenance Tracker</Navbar.Brand>
        </Container>
      </Navbar>

      <Container>
        <div className="text-center mt-5">
          <h1>Welcome to Vehicle Maintenance Tracker</h1>
          <p className="lead">
            Setup in progress. Authentication and features coming soon.
          </p>
        </div>
      </Container>
    </>
  )
}

export default App
