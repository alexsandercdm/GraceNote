import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("index.tsx module loaded");

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  state: { hasError: boolean; error: any };
  
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("React Error Boundary Caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-50 text-red-900 h-screen">
          <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
          <pre className="bg-white p-4 rounded border border-red-200 overflow-auto">
            {this.state.error?.toString()}
          </pre>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

const root = ReactDOM.createRoot(rootElement);
console.log("Mounting React App...");
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);