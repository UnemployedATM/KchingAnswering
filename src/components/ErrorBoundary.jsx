import { Component } from 'react';
import { AlertCircle } from 'lucide-react';

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full px-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-500 mb-6 max-w-xs">
            We hit an unexpected error. Please try refreshing.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="text-white rounded-xl px-6 py-3 font-semibold text-sm shadow-md active:scale-[0.98] transition-transform"
            style={{ backgroundColor: 'var(--brand)' }}
          >
            Refresh
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
