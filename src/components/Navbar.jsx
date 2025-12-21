import { NavLink } from "react-router-dom";

function Navbar() {
  return (
    <header style={styles.wrapper}>
      <div style={styles.navbar}>
        <div style={styles.left}>⏱️ WAITLY</div>

        <nav style={styles.center}>
          <NavLink to="/" style={styles.link}>
            Home
          </NavLink>
          <NavLink to="" style={styles.link}>
            Join Queue
          </NavLink>
          <NavLink to="" style={styles.link}>
            Add Wait Time
          </NavLink>
        </nav>

        <div style={styles.right}>👤</div>
      </div>
    </header>
  );
}

const styles = {
  wrapper: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #e5e7eb"
  },
  navbar: {
    maxWidth: "1200px",
    margin: "0 auto",
    height: "60px",
    padding: "0 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  },
  left: {
    fontWeight: "700",
    fontSize: "18px"
  },
  center: {
    display: "flex",
    gap: "24px"
  },
  link: {
    textDecoration: "none",
    color: "#374151",
    fontWeight: "500"
  },
  right: {
    fontSize: "18px",
    cursor: "pointer"
  }
};

export default Navbar;
