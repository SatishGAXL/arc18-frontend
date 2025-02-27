import { HashRouter as Router, Route, Routes, NavLink } from "react-router-dom";
import "./assets/App.css"
import { Seller } from "./components/Seller";
import { Buyer } from "./components/Buyer";
import { Layout } from "antd";
const { Content } = Layout;

function App() {
  return (
    <Router>
      <div className="Nav">
        <NavLink to="/seller">Seller</NavLink>
        <NavLink to="/buyer">Buyer</NavLink>
      </div>
      <Layout>
        <Content style={{backgroundColor:"white"}}>
          <Routes>
            <Route path="/seller" element={<Seller />} />
            <Route path="/buyer" element={<Buyer />} />
          </Routes>
        </Content>
      </Layout>
    </Router>
  );
}

export default App;
