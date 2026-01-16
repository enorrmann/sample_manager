import { SampleProvider } from './context/SampleContext';
import { Layout } from './components/Layout';
import './App.css';

function App() {
  return (
    <SampleProvider>
      <Layout />
    </SampleProvider>
  );
}

export default App;
