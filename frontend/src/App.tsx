import { useEffect, useState } from 'react';
import api from './services/api';

function App() {
  const [status, setStatus] = useState('checking...');

  useEffect(() => {
    api.get('/api/health')
      .then(res => setStatus(res.data.status))
      .catch(() => setStatus('failed to connect'));
  }, []);

  return <div>Backend status: {status}</div>;
}

export default App;