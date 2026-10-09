// App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import UploadPage from "./pages/UploadPage";
import ColumnSelectionPage from "./pages/ColumnSelectionPage";
import DashboardPage from "./pages/DashboardPage";
import ReportPage from "./pages/ReportPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/columns" element={<ColumnSelectionPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
