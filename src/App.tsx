import { HashRouter as Router, Route, Routes, NavLink } from "react-router-dom";
import "./assets/App.css"
import { Seller } from "./components/Seller";
import { Buyer } from "./components/Buyer";
import { Layout } from "antd";
const { Content } = Layout;

function App() {
  return (
    // Router setup
    <Router>
      {/* Navigation links */}
      <div className="Nav">
        <NavLink to="/seller">Seller</NavLink>
        <NavLink to="/buyer">Buyer</NavLink>
      </div>
      {/* Layout component */}
      <Layout>
        {/* Content area */}
        <Content style={{backgroundColor:"white"}}>
          {/* Routes configuration */}
          <Routes>
            {/* Seller route */}
            <Route path="/seller" element={<Seller />} />
            {/* Buyer route */}
            <Route path="/buyer" element={<Buyer />} />
          </Routes>
        </Content>
      </Layout>
    </Router>
  );
}

export default App;
