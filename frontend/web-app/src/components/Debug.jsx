// components/Debug.jsx
import React from 'react';
import { useSelector } from 'react-redux';

const Debug = () => {
  const auth = useSelector((state) => state.auth);
  
  React.useEffect(() => {
    console.log('Auth state updated:', auth);
  }, [auth]);
  
  return (
    <div style={{ display: 'none' }}>
      Debug: {JSON.stringify(auth)}
    </div>
  );
};

export default Debug;

// Thêm vào App.jsx
import Debug from './components/Debug';
// ...
<Provider store={store}>
  <Debug /> {/* Thêm dòng này */}
  <Router>
    {/* ... */}
  </Router>
</Provider>