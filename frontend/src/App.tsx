import { BrowserRouter } from "react-router-dom";
import AppShell from "./pages/AppShell";

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
