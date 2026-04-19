import React from 'react';
import { AuthProvider } from './context/AuthContext';
import AuthExample from './components/AuthExample';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AuthExample />
    </AuthProvider>
  );
};

export default App;
