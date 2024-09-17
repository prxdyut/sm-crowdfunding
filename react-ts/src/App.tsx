import { Route, Routes } from "react-router-dom";
import TopBar from "./components/TopBar";
import AboutPage from "./sections/AboutPage";
import AdminPage from "./sections/AdminPage";
import ContactPage from "./sections/ContactPage";
import ContributePage from "./sections/ContributePage";
import ContributorsPage from "./sections/ContributorsPage";
import HomePage from "./sections/HomePage";
import Whatsapp from "./sections/whatsappPage";

export default function App() {
  return (
    <div>
      <Routes>
        <Route path="/">
          <Route
            index
            element={
              <div>
                <TopBar />
                <HomePage />
                <AboutPage />
                <ContributorsPage />
                <ContributePage />
                <ContactPage />
              </div>
            }
          />
          <Route
            path="admin"
            element={
              <div>
                <AdminPage />
              </div>
            }
          />
          <Route
            path="whatsapp"
            element={
              <div>
                <Whatsapp />
              </div>
            }
          />
        </Route>
      </Routes>
    </div>
  );
}
