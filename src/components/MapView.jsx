function MapView() {
  return (
    <div style={styles.map}>
      Map will appear here
    </div>
  );
}

const styles = {
  map: {
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#6b7280",
    fontSize: "18px"
  }
};

export default MapView;
