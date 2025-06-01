import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import GlobeViewer from './components/GlobeViewer';

function App() {
  return (
    <Router>
      <Routes>
        {/* Route for specific map slugs or 'antipodal' */}
        <Route path="/:mapSlug" element={<GlobeViewer />} />
        {/* Default route: redirect / to /antipodal or your preferred default */}
        <Route path="/" element={<Navigate replace to="/antipodal" />} />
        {/* Catch-all for unknown paths, redirect to default or a 404 component */}
        <Route path="*" element={<Navigate replace to="/antipodal" />} />
      </Routes>
    </Router>
  );
}

export default App;