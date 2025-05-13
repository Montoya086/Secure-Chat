import React from 'react';
import useAuth from '../hooks/useAuth';

const Home: React.FC = () => {
  const { handleLogout } = useAuth();

  return (
    <div>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default Home;