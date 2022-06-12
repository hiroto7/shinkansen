import "bootstrap-icons/font/bootstrap-icons.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { Container, Nav, Navbar } from "react-bootstrap";
import { NavLink } from "react-router-dom";
import "./App.css";

const Header = () => (
  <Navbar variant="dark" bg="dark" expand="lg">
    <Container>
      <Navbar.Brand>JRE POINT特典チケットのレート計算</Navbar.Brand>
      <Navbar.Toggle aria-controls="basic-navbar-nav" />
      <Navbar.Collapse id="basic-navbar-nav">
        <Nav className="me-auto">
          <Nav.Link as={NavLink} end to="/">
            区間を指定して調べる
          </Nav.Link>
          <Nav.Link as={NavLink} end to="/ranking">
            ランキング
          </Nav.Link>
        </Nav>
        <Nav>
          <Nav.Link
            href="https://github.com/hiroto7/shinkansen"
            target="_blank"
            rel="noreferrer"
          >
            <i className="bi bi-github" /> GitHub
          </Nav.Link>
        </Nav>
      </Navbar.Collapse>
    </Container>
  </Navbar>
);

export default Header;
